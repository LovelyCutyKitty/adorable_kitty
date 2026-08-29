(async()=>{
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('load failed: '+src));document.head.appendChild(s)});
  const version='cm-20260830-6';
  for(const src of ['data/questions_09.js','data/questions_10.js','data/questions_11.js','code_01.js','code_02.js','code_03.js','code_04.js','code_05.js']) await load(`${src}?v=${version}`);
  const ungzip=async(b64)=>{
    const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const stream=new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  };
  window.CM_LOADED_QUESTIONS=JSON.parse(await ungzip(window.CM_DATA_B64||''));
  const softeningQuestion='아스팔트 연화점시험(환구법)에 대한 물음에 답하시오.\n가. 시료를 환(ring)에 넣고 몇 시간 안에 시험을 마쳐야 하는가?\n나. 시료가 강구와 함께 시료대에서 몇 mm 떨어진 밑판에 닿는 순간의 온도를 연화점으로 하는가?\n다. 시험온도는 매분 몇 °C의 비율로 온도가 상승하도록 하는가?';
  for(const q of window.CM_LOADED_QUESTIONS){
    if(q && q.topic==='아스팔트 연화점시험' && (q.source==='2024-3'||q.source==='2022-1')) q.question=softeningQuestion;
  }
  window.CM_DATA={...(window.CM_DATA||{}),...(window.CM_META||{}),questions:window.CM_LOADED_QUESTIONS};
  const code=await ungzip(window.CM_APP_B64||'');
  (0,eval)(code);
  await load(`latex-patch.js?v=${version}`);
})().catch(err=>{console.error(err);const el=document.getElementById('dataStatus');if(el)el.textContent='앱 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.';});
