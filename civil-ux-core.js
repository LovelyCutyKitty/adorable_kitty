(() => {
  const UX = window.CivilUX = window.CivilUX || {};
  UX.version = 'civil-ux-20260829-2';
  UX.sessionType = '';
  UX.sessionLabel = '';
  UX.frequentThreshold = Number(store.get('uxLastFrequency', 2)) || 2;
  UX.listMode = '';
  UX.listQuestions = [];

  UX.idOf = (q) => String(q?.id ?? keyOf(q));
  UX.unique = (list = state.questions) => {
    const m = new Map(); list.forEach(q => { const id=UX.idOf(q); if(!m.has(id))m.set(id,q); }); return [...m.values()];
  };
  UX.byId = (id) => UX.unique().find(q => UX.idOf(q) === String(id));
  UX.appearances = (id) => [...new Set(state.questions.filter(q => UX.idOf(q)===String(id)).map(q=>String(q.round)))].sort().reverse();
  UX.yearCode = (round) => String(round).split('-')[0];
  UX.fullYear = (y) => Number(y)<100 ? 2000+Number(y) : Number(y);
  UX.esc = (s='') => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  UX.q = (s) => document.querySelector(s);
  UX.qa = (s) => [...document.querySelectorAll(s)];

  UX.favoriteIds = () => new Set(store.get('favoriteIds', []).map(String));
  UX.isFavorite = (q) => UX.favoriteIds().has(UX.idOf(q));
  UX.toggleFavorite = (q) => {
    const ids=UX.favoriteIds(),id=UX.idOf(q); ids.has(id)?ids.delete(id):ids.add(id); store.set('favoriteIds',[...ids]); UX.renderFavorite(); UX.updateHomeStats();
  };
  UX.favoriteQuestions = () => UX.unique().filter(q=>UX.favoriteIds().has(UX.idOf(q)));
  UX.isWrong = (q) => new Set(activeWrongs().map(x=>UX.idOf(x))).has(UX.idOf(q));
  UX.isMemorized = (q) => { const mem=memorized(); return state.questions.some(x=>UX.idOf(x)===UX.idOf(q)&&mem.has(keyOf(x))); };

  UX.hidePickers = (except='') => ['randomPicker','frequentPicker','listPicker'].forEach(id=>{if(id!==except)UX.q('#'+id)?.classList.add('hidden');});
  UX.updateHomeStats = () => {
    UX.q('#favoriteCount').textContent=UX.favoriteIds().size;
    UX.q('#uniqueCount').textContent=UX.unique().length;
  };
  UX.renderFavorite = () => { const q=state.quiz?.[state.index]; if(!q)return; const on=UX.isFavorite(q),b=UX.q('#favoriteButton'); b.textContent=on?'★':'☆'; b.classList.toggle('active',on); };

  UX.migrate = () => {
    if(store.get('uxCivilMigrated2',false))return;
    const old=store.get('frequentDone',[]).map(String),fp=store.get('frequentDoneByThreshold2',{}); if(!fp['2']?.length)fp['2']=old; store.set('frequentDoneByThreshold2',fp);
    const attempts=store.get('uxAttempts',{}),seen=new Set(Object.keys(attempts));
    Object.entries(store.get('log',{})).forEach(([k,v])=>{const q=state.questions.find(x=>keyOf(x)===k);if(!q||seen.has(UX.idOf(q))||!['정답','오답'].includes(v?.result))return;attempts[UX.idOf(q)]=[{correct:v.result==='정답',date:v.date||new Date().toISOString(),legacy:true}];seen.add(UX.idOf(q));});
    store.set('uxAttempts',attempts); store.set('uxCivilMigrated2',true);
  };

  UX.frequentQuestions = (n=UX.frequentThreshold) => UX.unique().filter(q=>Number(q.frequency||1)>=n).sort((a,b)=>Number(b.frequency||1)-Number(a.frequency||1)||Number(a.id)-Number(b.id));
  UX.frequentDone = (n=UX.frequentThreshold) => new Set((store.get('frequentDoneByThreshold2',{})[String(n)]||[]).map(String));
  UX.selectFrequency = (n) => {
    UX.frequentThreshold=n;store.set('uxLastFrequency',n);UX.qa('[data-ux-frequency]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.uxFrequency)===n));
    const all=UX.frequentQuestions(n),done=UX.frequentDone(n); UX.q('#frequentCountText').textContent=`${n}회 이상 출제 문제: ${all.length}문제`; UX.q('#frequentProgressText').textContent=`현재 진행: ${all.filter(q=>done.has(UX.idOf(q))).length} / ${all.length}`;
  };
  UX.setupFrequency = () => { const max=Math.max(2,...UX.unique().map(q=>Number(q.frequency||1))); UX.q('#frequencyOptions').innerHTML=Array.from({length:max-1},(_,i)=>i+2).map(n=>`<button type="button" data-ux-frequency="${n}">${n}회 이상</button>`).join(''); UX.selectFrequency(Math.min(UX.frequentThreshold,max)); };

  UX.start = (type,list,label) => { if(!list.length)return alert('출제할 문제가 없습니다.'); UX.sessionType=type;UX.sessionLabel=label;start(type==='wrong'?'wrong':type==='frequent'?'frequent':'random',list); UX.q('#modeLabel').textContent=label; };
  UX.openList = (mode,list,title) => { UX.listMode=mode;UX.listQuestions=list; UX.q('#listPickerTitle').textContent=title; UX.q('#selectableQuestionList').innerHTML=list.length?list.map((q,i)=>`<label class="ux-question-option"><input type="checkbox" data-ux-list-index="${i}" checked><span class="ux-qtext">${UX.isFavorite(q)?'<span class="ux-star">★</span> ':''}${UX.esc(q.question)}</span><span class="ux-qmeta">${Number(q.frequency||1)}회<br>${UX.appearances(UX.idOf(q)).slice(0,2).join(', ')}</span></label>`).join(''):'<div class="ux-empty">해당 문제가 없습니다.</div>'; UX.hidePickers('listPicker');UX.q('#listPicker').classList.remove('hidden');UX.updateListCount(); };
  UX.selectedList = () => UX.qa('#selectableQuestionList input[data-ux-list-index]:checked').map(x=>UX.listQuestions[Number(x.dataset.uxListIndex)]).filter(Boolean);
  UX.updateListCount = () => UX.q('#selectedCountText').textContent=`선택 ${UX.selectedList().length}문제`;

  const baseRender=renderQuestion; renderQuestion=function(){baseRender();UX.renderFavorite();};
  const baseLog=log; log=function(q,result,g,user,countAttempt=true){baseLog(q,result,g,user,countAttempt);if(!countAttempt)return;const a=store.get('uxAttempts',{}),id=UX.idOf(q),arr=a[id]||[];arr.push({correct:result==='정답',date:new Date().toISOString()});a[id]=arr.slice(-30);store.set('uxAttempts',a);if(state.mode==='frequent'){const all=store.get('frequentDoneByThreshold2',{}),k=String(UX.frequentThreshold),set=new Set((all[k]||[]).map(String));set.add(id);all[k]=[...set];store.set('frequentDoneByThreshold2',all);}};
  const baseFinish=finish; finish=function(){baseFinish(); const correct=state.results.filter(r=>r?.correct).length,total=state.quiz.length,wrongIds=state.quiz.filter((q,i)=>!state.results[i]?.correct).map(UX.idOf);const sessions=store.get('uxSessions',[]);sessions.unshift({id:`s-${Date.now()}`,date:new Date().toISOString(),type:UX.sessionType||state.mode,label:UX.sessionLabel||UX.q('#modeLabel').textContent,total,correct,rate:total?Math.round(correct/total*100):0,wrongIds,questionIds:state.quiz.map(UX.idOf)});store.set('uxSessions',sessions.slice(0,500));UX.q('#summaryWrongButton').classList.toggle('hidden',!wrongIds.length);UX.q('#summaryWrongButton').dataset.uxWrongIds=JSON.stringify(wrongIds);};

  const oldUpdateStats=updateStats; updateStats=function(){oldUpdateStats();UX.updateHomeStats();};

  UX.q('#favoriteButton').onclick=()=>UX.toggleFavorite(state.quiz[state.index]);
  UX.q('#startRandomButton').onclick=()=>{const n=Math.max(1,Math.min(state.questions.length,Number(UX.q('#randomCountInput').value)||12));UX.start('random',shuffle(state.questions).slice(0,n),`랜덤 ${n}문제`);};
  UX.q('#continueFrequentButton').onclick=()=>{const all=UX.frequentQuestions(),done=UX.frequentDone(),remain=all.filter(q=>!done.has(UX.idOf(q)));if(!remain.length)return alert('선택한 빈출 범위를 모두 풀었습니다. 처음부터 풀기를 이용해 주세요.');UX.start('frequent',remain,`빈출 ${UX.frequentThreshold}회 이상`);};
  UX.q('#restartFrequentButton').onclick=()=>{if(!confirm(`${UX.frequentThreshold}회 이상 빈출 문제를 처음부터 풀까요?\n오답·즐겨찾기·풀이기록은 유지됩니다.`))return;const fp=store.get('frequentDoneByThreshold2',{});fp[String(UX.frequentThreshold)]=[];store.set('frequentDoneByThreshold2',fp);UX.selectFrequency(UX.frequentThreshold);UX.start('frequent',UX.frequentQuestions(),`빈출 ${UX.frequentThreshold}회 이상`);};
  UX.q('#selectAllButton').onclick=()=>{UX.qa('#selectableQuestionList input[type=checkbox]').forEach(x=>x.checked=true);UX.updateListCount();}; UX.q('#clearAllButton').onclick=()=>{UX.qa('#selectableQuestionList input[type=checkbox]').forEach(x=>x.checked=false);UX.updateListCount();};
  UX.q('#startSelectedButton').onclick=()=>{const list=UX.selectedList();if(!list.length)return alert('풀 문제를 1개 이상 선택해 주세요.');UX.start(UX.listMode,list,UX.listMode==='favorite'?'즐겨찾기':'오답 복습');};
  UX.q('#summaryWrongButton').onclick=()=>{const ids=JSON.parse(UX.q('#summaryWrongButton').dataset.uxWrongIds||'[]');show('homeView');UX.openList('wrong',ids.map(UX.byId).filter(Boolean),'이번 풀이의 오답');};

  document.addEventListener('change',e=>{if(e.target.matches('[data-ux-list-index]'))UX.updateListCount();});
  document.addEventListener('click',e=>{
    const m=e.target.closest('[data-ux-mode]');if(m){UX.hidePickers();const mode=m.dataset.uxMode;if(mode==='random')UX.q('#randomPicker').classList.remove('hidden');if(mode==='frequent'){UX.selectFrequency(UX.frequentThreshold);UX.q('#frequentPicker').classList.remove('hidden');}if(mode==='wrong')UX.openList('wrong',UX.unique(activeWrongs()),'오답 선택');if(mode==='favorite')UX.openList('favorite',UX.favoriteQuestions(),'즐겨찾기 선택');return;}
    if(e.target.closest('[data-ux-round]'))UX.hidePickers(); if(e.target.closest('.ux-close-picker'))UX.hidePickers();
    const c=e.target.closest('[data-ux-count]');if(c){UX.qa('[data-ux-count]').forEach(b=>b.classList.remove('selected'));c.classList.add('selected');UX.q('#randomCountInput').value=c.dataset.uxCount==='all'?state.questions.length:c.dataset.uxCount;}
    const f=e.target.closest('[data-ux-frequency]');if(f)UX.selectFrequency(Number(f.dataset.uxFrequency));
    const p=e.target.closest('[data-ux-panel]');if(p&&UX.renderPanel)UX.renderPanel(p.dataset.uxPanel);
  });
  UX.q('#randomCountInput').addEventListener('input',()=>UX.qa('[data-ux-count]').forEach(b=>b.classList.toggle('selected',b.dataset.uxCount===UX.q('#randomCountInput').value)));
  UX.q('#panelBackButton').onclick=()=>show('homeView');

  UX.migrate();UX.setupFrequency();UX.updateHomeStats();
})();
