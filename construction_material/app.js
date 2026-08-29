(async()=>{
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('load failed: '+src));document.head.appendChild(s)});
  const version='cm-20260830-1';
  for(const src of ['data/questions_09.js','data/questions_10.js','data/questions_11.js','code_01.js','code_02.js','code_03.js','code_04.js','code_05.js']) await load(`${src}?v=${version}`);
  const ungzip=async(b64)=>{
    const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const stream=new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  };
  window.CM_LOADED_QUESTIONS=JSON.parse(await ungzip(window.CM_DATA_B64||''));
  const code=await ungzip(window.CM_APP_B64||'');
  (0,eval)(code);
})().catch(err=>{console.error(err);const el=document.getElementById('dataStatus');if(el)el.textContent='앱 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.';});
