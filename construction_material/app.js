(async()=>{
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('load failed: '+src));document.head.appendChild(s)});
  const version='cm-20260830-7';
  for(const src of ['data/questions_09.js','data/questions_10.js','data/questions_11.js','code_01.js','code_02.js','code_03.js','code_04.js','code_05.js']) await load(`${src}?v=${version}`);
  const ungzip=async(b64)=>{
    const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const stream=new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  };
  window.CM_LOADED_QUESTIONS=JSON.parse(await ungzip(window.CM_DATA_B64||''));

  // 새 엑셀 데이터에 기존 앱 스키마(round/order/id/groupId/representative)를 복원한다.
  // id는 기존처럼 "회차-회차내번호"를 사용해 예전 오답/즐겨찾기 기록과 다시 연결한다.
  const roundCounts={};
  const groupIds=new Map();
  const represented=new Set();
  let groupSeq=0;
  const oldTopics=[];
  for(const q of window.CM_LOADED_QUESTIONS){
    if(!String(q.source||'').startsWith('2026-')){
      const t=q.topic||(q.topics&&q.topics[0])||'';
      if(t&&!oldTopics.includes(t)) oldTopics.push(t);
    }
  }
  for(const t of oldTopics) groupIds.set(t,`g${String(++groupSeq).padStart(3,'0')}`);

  const idPairs=[];
  for(const q of window.CM_LOADED_QUESTIONS){
    const legacyId=q.id;
    const round=q.round||q.source||'';
    const order=(roundCounts[round]||0)+1;
    roundCounts[round]=order;
    const stableId=`${round}-${order}`;
    const topic=q.topic||(q.topics&&q.topics[0])||stableId;
    if(!groupIds.has(topic)) groupIds.set(topic,`g${String(++groupSeq).padStart(3,'0')}`);
    const groupId=groupIds.get(topic);
    q.source=q.source||round;
    q.round=round;
    q.order=order;
    q.groupId=groupId;
    q.representative=!represented.has(groupId);
    represented.add(groupId);
    q.legacyHashId=legacyId;
    q.id=stableId;
    if(legacyId&&legacyId!==stableId) idPairs.push([legacyId,stableId]);
  }

  // v6를 한 번 사용하며 새 해시 ID로 저장된 기록도 안정 ID로 옮긴다.
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++) keys.push(localStorage.key(i));
    for(const key of keys){
      const value=localStorage.getItem(key);
      if(!value||!value.includes('cm-')) continue;
      let next=value;
      for(const [from,to] of idPairs) if(next.includes(from)) next=next.split(from).join(to);
      if(next!==value) localStorage.setItem(key,next);
    }
  }catch(e){console.warn('study state migration skipped',e);}

  window.CM_DATA={...(window.CM_META||{}),questions:window.CM_LOADED_QUESTIONS};
  const code=await ungzip(window.CM_APP_B64||'');
  (0,eval)(code);
  await load(`latex-patch.js?v=${version}`);
})().catch(err=>{console.error(err);const el=document.getElementById('dataStatus');if(el)el.textContent='앱 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.';});
