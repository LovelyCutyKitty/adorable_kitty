const $ = (s) => document.querySelector(s);
const state = { questions: [], quiz: [], index: 0, mode: '', answers: [], results: [], score: 0 };
const store = {
  get: (key, fallback) => JSON.parse(localStorage.getItem(`materials-maldda-${key}`) || JSON.stringify(fallback)),
  set: (key, value) => localStorage.setItem(`materials-maldda-${key}`, JSON.stringify(value)),
};
const keyOf = (q) => q.groupId || `${q.round}||${q.question}`;

async function loadQuestionData() {
  if (Array.isArray(window.MALDDA_QUESTIONS) && window.MALDDA_QUESTIONS.length) return window.MALDDA_QUESTIONS;
  if (!window.MALDDA_DATA_GZIP_B64) return [];
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser does not support gzip data decoding.');
  const binary = atob(window.MALDDA_DATA_GZIP_B64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : (parsed.questions || []);
}

function uniqueQuestions() {
  const byId = new Map();
  state.questions.forEach((q) => { if (!byId.has(keyOf(q))) byId.set(keyOf(q), q); });
  return [...byId.values()];
}
function sortRounds(list) {
  return [...list].sort((a,b) => {
    const [ay,ar] = a.split('-').map(Number), [by,br] = b.split('-').map(Number);
    return by-ay || br-ar;
  });
}
async function boot() {
  try {
    state.questions = await loadQuestionData();
    if (!state.questions.length) throw new Error('No question data');
    const rounds = sortRounds(new Set(state.questions.map((q) => q.round)));
    $('#roundSelect').innerHTML = rounds.map((r) => `<option value="${r}">${r}</option>`).join('');
    $('#dataStatus').textContent = `${rounds.at(-1)} ~ ${rounds[0]} · ${state.questions.length}개 대문항 · ${uniqueQuestions().length}개 고유 문제군`;
    updateStats();
  } catch (err) {
    console.error(err);
    $('#dataStatus').textContent = '문제 데이터를 불러오지 못했습니다. 파일을 다시 확인하세요.';
  }
}
function show(name) { ['homeView','quizView','summaryView'].forEach((id) => $(`#${id}`).classList.toggle('hidden', id !== name)); }
function updateStats() {
  $('#wrongCount').textContent = activeWrongs().length;
  $('#solvedCount').textContent = `${store.get('solvedCount',0).toLocaleString()}문제`;
  $('#uniqueCount').textContent = uniqueQuestions().length;
}
function activeWrongs() {
  const log = store.get('log',{}), memorized = store.get('memorized',[]);
  return uniqueQuestions().filter((q) => log[keyOf(q)]?.result === '오답' && !memorized.includes(keyOf(q)));
}
function frequentQuestions() {
  return uniqueQuestions().filter((q) => Number(q.frequency || 1) >= 2)
    .sort((a,b) => Number(b.frequency||1)-Number(a.frequency||1) || Number(a.id)-Number(b.id));
}
function shuffle(list) {
  const out=[...list];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function start(mode,list) {
  if (!list.length) return alert(mode === 'wrong' ? '현재 남아 있는 오답이 없습니다.' : '출제할 문제가 없습니다.');
  state.mode=mode; state.quiz=list; state.index=0; state.answers=Array(list.length).fill(''); state.results=[]; state.score=0;
  $('#modeLabel').textContent=({random:'전체 랜덤',frequent:'빈출 문제',wrong:'누적 오답',round:'회차 모드'})[mode];
  show('quizView'); renderQuestion();
}
function renderMeta(q) {
  $('#frequencyText').textContent = q.frequencyText || `${q.frequency || 1}회`;
  $('#appearancesText').textContent = q.appearances || q.round;
}
function renderQuestion() {
  const q=state.quiz[state.index], roundMode=state.mode==='round';
  $('#roundLabel').textContent = `${q.round} 회차`;
  $('#progressLabel').textContent=`${state.index+1} / ${state.quiz.length}`;
  $('#meterFill').style.width=`${((state.index+1)/state.quiz.length)*100}%`;
  renderMeta(q);
  $('#questionText').textContent=q.question;
  $('#answerInput').value=state.answers[state.index]; $('#answerInput').disabled=false;
  $('#submitButton').classList.remove('hidden'); $('#nextButton').classList.add('hidden');
  $('#resultBox').className='result hidden'; $('#afterAnswerActions').classList.add('hidden');
  if(roundMode){ $('#resultBox').textContent='답을 입력하고 제출하세요. 정답은 회차 종료 후 한 번에 공개됩니다.'; }
}
function normalize(s){return String(s||'').toLowerCase().replace(/^\d+\.\s*/,'').replace(/\([^)]*\)|\[[^\]]*\]/g,'').replace(/(및|와|과|의|을|를|은|는|이|가|에서|으로|로|에|도|만|하다|한다|하기|하는)/g,'').replace(/[^가-힣a-z0-9]/g,'');}
function tokens(s){return String(s||'').toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g,' ').split(/[\s,./:;'"“”‘’\-_/\\\r\n]+/).filter((x)=>x.length>1&&!['의','을','를','은','는','이','가','과','와','및','에','에서','으로','로','도','만','것'].includes(x));}
function similarity(a,b){if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return .85;const A=new Set([...a].slice(0,-1).map((_,i)=>a.slice(i,i+2))),B=new Set([...b].slice(0,-1).map((_,i)=>b.slice(i,i+2)));const U=new Set([...A,...B]);return U.size?[...A].filter(x=>B.has(x)).length/U.size:0;}
function variants(item){const out=[item,item.replace(/\([^)]*\)/g,'')];(item.match(/\(([^)]*)\)/g)||[]).forEach(x=>out.push(x.slice(1,-1)));return [...new Set(out.flatMap(x=>x.split('/')).map(x=>x.trim()).filter(Boolean))];}
function answerItems(text){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const numbered=lines.map(x=>x.match(/^\d+\.\s*(.+)$/)?.[1]).filter(Boolean);
  if(numbered.length)return [...new Set(numbered)];
  const meaningful=lines.filter(x=>!(/^[가-하]\.$/.test(x)));
  return meaningful.length>1?meaningful:String(text||'').replace(/[\r\n]+/g,',').split(',').map(x=>x.trim()).filter(Boolean);
}
function userItems(text){return String(text||'').replace(/[\r\n/]+/g,',').split(',').map(x=>x.replace(/^\d+\.\s*/,'').trim()).filter(Boolean);}
function requiredCount(question){return Number(String(question||'').match(/(\d+)\s*(?:가지만|가지|개|종류|가지를)/)?.[1])||null;}
function grade(q,user){
  const answers=answerItems(q.answer),users=userItems(user);
  const matched=answers.filter(a=>variants(a).some(v=>users.some(u=>{const an=normalize(v),un=normalize(u),at=tokens(v),ut=new Set(tokens(u));const overlap=at.length?at.filter(x=>ut.has(x)).length/at.length:0,sim=similarity(an,un);return sim>=.7||overlap>=.6||(sim>=.5&&overlap>=.4);})));
  const needed=requiredCount(q.question), target=needed||answers.length, correct=answers.length>=2?matched.length>=Math.min(target,answers.length):matched.length>0;
  return {correct,matched,missed:answers.filter(x=>!matched.includes(x)),count:matched.length,total:Math.min(target,answers.length)};
}
function log(q,result,gradeResult,user,countAttempt=true){const all=store.get('log',{});all[keyOf(q)]={result,user,date:new Date().toISOString(),...gradeResult};store.set('log',all);if(countAttempt)store.set('solvedCount',store.get('solvedCount',0)+1);}
function submit(){
  const q=state.quiz[state.index],user=$('#answerInput').value;state.answers[state.index]=user;
  $('#answerInput').disabled=true;$('#submitButton').classList.add('hidden');$('#nextButton').classList.remove('hidden');$('#afterAnswerActions').classList.remove('hidden');
  if(state.mode==='round'){ $('#resultBox').textContent='답이 저장되었습니다. 회차 종료 후 정답과 판정이 공개됩니다.';$('#resultBox').className='result';return; }
  const result=grade(q,user);state.results[state.index]=result;if(result.correct)state.score++;log(q,result.correct?'정답':'오답',result,user);
  if(state.mode==='frequent'){const done=store.get('frequentDone',[]);if(!done.includes(keyOf(q)))store.set('frequentDone',[...done,keyOf(q)]);}
  const text=result.correct?`정답입니다. (${result.count}/${result.total})`:`오답입니다. (${result.count}/${result.total} 맞음)\n\n빠진 항목:\n${result.missed.map(x=>`- ${x}`).join('\n')}\n\n[정답]\n${q.answer}`;
  $('#resultBox').textContent=text;$('#resultBox').className=`result ${result.correct?'ok':'no'}`;
}
function next(){if(state.index<state.quiz.length-1){state.index++;renderQuestion();}else finish();}
function finish(){
  if(state.mode==='round'){state.results=state.quiz.map((q,i)=>grade(q,state.answers[i]));state.score=state.results.filter(r=>r.correct).length;state.quiz.forEach((q,i)=>log(q,state.results[i].correct?'정답':'오답',state.results[i],state.answers[i]));}
  $('#summaryMode').textContent=$('#modeLabel').textContent;$('#summaryScore').textContent=`${state.score} / ${state.quiz.length}`;$('#summaryText').textContent=`정답률 ${Math.round(state.score/state.quiz.length*100)}%`;$('#roundResults').classList.toggle('hidden',state.mode!=='round');
  if(state.mode==='round')$('#roundResults').innerHTML=state.quiz.map((q,i)=>`<details class="round-result card"><summary>${i+1}. ${q.round} <span class="tag">${state.results[i].correct?'정답':'오답'} ${state.results[i].count}/${state.results[i].total}</span></summary><p><b>빈도</b>\n${escapeHTML(q.frequencyText||`${q.frequency}회`)}\n\n<b>출제년도·회차</b>\n${escapeHTML(q.appearances||q.round)}\n\n<b>문제</b>\n${escapeHTML(q.question)}\n\n<b>내 답</b>\n${escapeHTML(state.answers[i]||'(미입력)')}\n\n<b>정답</b>\n${escapeHTML(q.answer)}</p></details>`).join('');
  updateStats();show('summaryView');
}
function escapeHTML(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
function manual(result){const q=state.quiz[state.index],user=state.answers[state.index];log(q,result,{correct:true,count:1,total:1},user,false);if(result==='정답'){const m=store.get('memorized',[]).filter(x=>x!==keyOf(q));store.set('memorized',m);alert('정답으로 기록했습니다.');}else{const m=store.get('memorized',[]);if(!m.includes(keyOf(q)))store.set('memorized',[...m,keyOf(q)]);alert('암기완료 처리했습니다.');}updateStats();}
document.addEventListener('click',(e)=>{const button=e.target.closest('.mode-card'),mode=button?.dataset.mode;if(!mode)return;
  if(mode==='random')start(mode,shuffle(uniqueQuestions()).slice(0,12));
  if(mode==='frequent'){const done=store.get('frequentDone',[]),all=frequentQuestions(),q=all.filter(x=>!done.includes(keyOf(x)));start(mode,q.length?q:all);}
  if(mode==='wrong')start(mode,activeWrongs());
  if(mode==='round')$('#roundPicker').classList.remove('hidden');
});
$('#startRoundButton').onclick=()=>start('round',state.questions.filter(q=>q.round===$('#roundSelect').value));
$('#submitButton').onclick=submit;$('#nextButton').onclick=next;$('#backButton').onclick=()=>{updateStats();show('homeView');};
$('#summaryHomeButton').onclick=()=>show('homeView');$('#correctButton').onclick=()=>manual('정답');$('#memorizedButton').onclick=()=>manual('암기');
$('#resetButton').onclick=()=>{if(confirm('이 기기의 오답·빈출 진도·누적 풀이를 모두 초기화할까요?')){['log','memorized','frequentDone','solvedCount'].forEach(x=>localStorage.removeItem(`materials-maldda-${x}`));updateStats();}};
boot();
