const $ = (s) => document.querySelector(s);
const state = { questions: [], quiz: [], index: 0, mode: '', answers: [], results: [], score: 0 };
const store = {
  get: (key, fallback) => JSON.parse(localStorage.getItem(`maldda-${key}`) || JSON.stringify(fallback)),
  set: (key, value) => localStorage.setItem(`maldda-${key}`, JSON.stringify(value)),
};
const keyOf = (q) => `${q.round}||${q.question}`;

async function boot() {
  try {
    state.questions = window.MALDDA_QUESTIONS;
    if (!Array.isArray(state.questions) || !state.questions.length) throw new Error('No question data');
    $('#dataStatus').textContent = '14-1 ~ 26-2 말따먹기 기출문제';
    const rounds = [...new Set(state.questions.map((q) => q.round))].sort().reverse();
    $('#roundSelect').innerHTML = rounds.map((r) => `<option value="${r}">${r}</option>`).join('');
    updateStats();
  } catch { $('#dataStatus').textContent = '문제 데이터를 불러오지 못했습니다. 파일을 다시 확인하세요.'; }
}

function show(name) { ['homeView','quizView','summaryView'].forEach((id) => $(`#${id}`).classList.toggle('hidden', id !== name)); }
function updateStats() {
  const wrong = activeWrongs();
  $('#wrongCount').textContent = wrong.length;
  $('#solvedCount').textContent = `${store.get('solvedCount', 0).toLocaleString()}문제`;
}
function activeWrongs() {
  const log = store.get('log', {}); const memorized = store.get('memorized', []);
  return state.questions.filter((q) => log[keyOf(q)]?.result === '오답' && !memorized.includes(keyOf(q)));
}
function frequentQuestions() {
  const byId = new Map(); state.questions.filter((q) => q.frequency >= 2).forEach((q) => { if (!byId.has(q.id)) byId.set(q.id, q); });
  return [...byId.values()].sort((a,b) => b.frequency - a.frequency || Number(a.id) - Number(b.id));
}
function shuffle(list) { return [...list].sort(() => Math.random() - .5); }
function start(mode, list) {
  if (!list.length) return alert(mode === 'wrong' ? '현재 남아 있는 오답이 없습니다.' : '출제할 문제가 없습니다.');
  state.mode = mode; state.quiz = list; state.index = 0; state.answers = Array(list.length).fill(''); state.results = []; state.score = 0;
  $('#modeLabel').textContent = ({random:'전체 랜덤', frequent:'빈출 문제', wrong:'누적 오답', round:'회차 모드'})[mode];
  show('quizView'); renderQuestion();
}
function renderQuestion() {
  const q = state.quiz[state.index], roundMode = state.mode === 'round';
  $('#roundLabel').textContent = state.mode === 'frequent' ? `빈출 문제 · ${q.frequency}회 출제` : `${q.round} 회차`;
  $('#progressLabel').textContent = `${state.index + 1} / ${state.quiz.length}`;
  $('#meterFill').style.width = `${(state.index / state.quiz.length) * 100}%`;
  $('#questionText').textContent = q.question;
  $('#answerInput').value = state.answers[state.index]; $('#answerInput').disabled = false;
  $('#submitButton').classList.remove('hidden'); $('#nextButton').classList.add('hidden'); $('#resultBox').className = 'result hidden'; $('#afterAnswerActions').classList.add('hidden');
  if (roundMode) $('#resultBox').textContent = '답을 입력하고 제출하세요. 정답은 회차 종료 후 한 번에 공개됩니다.';
}
function normalize(s) { return s.toLowerCase().replace(/^\d+\.\s*/, '').replace(/\([^)]*\)|\[[^\]]*\]/g,'').replace(/(및|와|과|의|을|를|은|는|이|가|에서|으로|로|에|도|만|하다|한다|하기|하는)/g,'').replace(/[^가-힣a-z0-9]/g,''); }
function tokens(s) { return s.toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g,' ').split(/[\s,./:;'"“”‘’\-_/\r\n]+/).filter((x) => x.length > 1 && !['의','을','를','은','는','이','가','과','와','및','에','에서','으로','로','도','만','것'].includes(x)); }
function similarity(a,b) { if (!a || !b) return 0; if (a === b) return 1; if (a.includes(b)||b.includes(a)) return .85; const A=new Set([...a].slice(0,-1).map((x,i)=>a.slice(i,i+2))), B=new Set([...b].slice(0,-1).map((x,i)=>b.slice(i,i+2))); return [...A].filter((x)=>B.has(x)).length / new Set([...A,...B]).size; }
function variants(item) { const out=[item,item.replace(/\([^)]*\)/g,'')]; (item.match(/\(([^)]*)\)/g)||[]).forEach((x)=>out.push(x.slice(1,-1))); return [...new Set(out.flatMap((x)=>x.split('/')).map((x)=>x.trim()).filter(Boolean))]; }
function answerItems(text) { const lines=text.split(/\r?\n/).map((x)=>x.trim()).filter(Boolean); const numbered=lines.map((x)=>x.match(/^\d+\.\s*(.+)$/)?.[1]).filter(Boolean); return numbered.length ? [...new Set(numbered)] : text.replace(/[\r\n]+/g,',').split(',').map((x)=>x.trim()).filter(Boolean); }
function userItems(text) { return text.replace(/[\r\n/]+/g,',').split(',').map((x)=>x.replace(/^\d+\.\s*/,'').trim()).filter(Boolean); }
function requiredCount(question) { return Number(question.match(/(\d+)\s*(?:가지만|가지|개|종류|가지를)/)?.[1]) || null; }
function grade(q, user) {
  const answers=answerItems(q.answer), users=userItems(user); const matched=answers.filter((a)=>variants(a).some((v)=>users.some((u)=>{const an=normalize(v),un=normalize(u), at=tokens(v),ut=new Set(tokens(u)); const overlap=at.length ? at.filter((x)=>ut.has(x)).length/at.length : 0; const sim=similarity(an,un); return sim>=.7||overlap>=.6||(sim>=.5&&overlap>=.4);})));
  const needed=requiredCount(q.question), target=needed || answers.length, correct=answers.length>=2 ? matched.length>=target : matched.length>0;
  return {correct, matched, missed:answers.filter((x)=>!matched.includes(x)), count:matched.length, total:target};
}
function log(q, result, gradeResult, user, countAttempt = true) { const all=store.get('log',{}); all[keyOf(q)]={result, user, date:new Date().toISOString(), ...gradeResult}; store.set('log',all); if(countAttempt) store.set('solvedCount', store.get('solvedCount', 0) + 1); }
function submit() {
  const q=state.quiz[state.index], user=$('#answerInput').value; state.answers[state.index]=user;
  $('#answerInput').disabled=true; $('#submitButton').classList.add('hidden'); $('#nextButton').classList.remove('hidden'); $('#afterAnswerActions').classList.remove('hidden');
  if (state.mode === 'round') { $('#resultBox').textContent='답이 저장되었습니다. 회차 종료 후 정답과 판정이 공개됩니다.'; $('#resultBox').className='result'; return; }
  const result=grade(q,user); state.results[state.index]=result; if(result.correct) state.score++; log(q,result.correct?'정답':'오답',result,user); if(state.mode==='frequent'){const done=store.get('frequentDone',[]); if(!done.includes(q.id)) store.set('frequentDone',[...done,q.id]);}
  const text=result.correct ? `정답입니다. (${result.count}/${result.total})` : `오답입니다. (${result.count}/${result.total} 맞음)\n\n빠진 항목:\n${result.missed.map((x)=>`- ${x}`).join('\n')}\n\n[정답]\n${q.answer}`;
  $('#resultBox').textContent=text; $('#resultBox').className=`result ${result.correct?'ok':'no'}`;
}
function next() { if(state.index < state.quiz.length-1){state.index++;renderQuestion();}else finish(); }
function finish() {
  if(state.mode==='round'){ state.results=state.quiz.map((q,i)=>grade(q,state.answers[i])); state.score=state.results.filter((r)=>r.correct).length; state.quiz.forEach((q,i)=>log(q,state.results[i].correct?'정답':'오답',state.results[i],state.answers[i])); }
  $('#summaryMode').textContent=$('#modeLabel').textContent; $('#summaryScore').textContent=`${state.score} / ${state.quiz.length}`; $('#summaryText').textContent=`정답률 ${Math.round(state.score/state.quiz.length*100)}%`; $('#roundResults').classList.toggle('hidden',state.mode!=='round');
  if(state.mode==='round') $('#roundResults').innerHTML=state.quiz.map((q,i)=>`<details class="round-result card"><summary>${i+1}. ${q.round} <span class="tag">${state.results[i].correct?'정답':'오답'} ${state.results[i].count}/${state.results[i].total}</span></summary><p><b>문제</b>\n${escapeHTML(q.question)}\n\n<b>내 답</b>\n${escapeHTML(state.answers[i]||'(미입력)')}\n\n<b>정답</b>\n${escapeHTML(q.answer)}</p></details>`).join('');
  updateStats(); show('summaryView');
}
function escapeHTML(s){return s.replace(/[&<>]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
function manual(result) { const q=state.quiz[state.index], user=state.answers[state.index]; log(q,result,{correct:true,count:1,total:1},user,false); if(result==='정답'){const m=store.get('memorized',[]).filter((x)=>x!==keyOf(q));store.set('memorized',m);alert('정답으로 기록했습니다.');}else{const m=store.get('memorized',[]);if(!m.includes(keyOf(q)))store.set('memorized',[...m,keyOf(q)]);alert('암기완료 처리했습니다.');}updateStats(); }
document.addEventListener('click',(e)=>{const button=e.target.closest('.mode-card'); const mode=button?.dataset.mode; if(mode){if(mode==='random')start(mode,shuffle(state.questions).slice(0,12));if(mode==='frequent'){const done=store.get('frequentDone',[]);const q=frequentQuestions().filter((x)=>!done.includes(x.id));start(mode,q.length?q:frequentQuestions());}if(mode==='wrong')start(mode,activeWrongs());if(mode==='round')$('#roundPicker').classList.remove('hidden');} });
$('#startRoundButton').onclick=()=>start('round',state.questions.filter((q)=>q.round===$('#roundSelect').value)); $('#submitButton').onclick=submit; $('#nextButton').onclick=next; $('#backButton').onclick=()=>{updateStats();show('homeView');}; $('#summaryHomeButton').onclick=()=>show('homeView'); $('#correctButton').onclick=()=>manual('정답'); $('#memorizedButton').onclick=()=>manual('암기'); $('#resetButton').onclick=()=>{if(confirm('이 기기의 오답·빈출 진도를 모두 초기화할까요?')){['log','memorized','frequentDone','solvedCount'].forEach((x)=>localStorage.removeItem(`maldda-${x}`));updateStats();}};
boot();
