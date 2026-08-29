const CACHE="construction-material-cm-20260830-10";
const ASSETS=[
  "./","./index.html","./styles.css","./ui-patch.css","../final-ux.css","./app.js","./latex-patch.js","../final-ux.js","./manifest.webmanifest",
  "./data/meta.js","./data/questions_01.js","./data/questions_02.js","./data/questions_03.js","./data/questions_04.js","./data/questions_05.js","./data/questions_06.js","./data/questions_07.js","./data/questions_08.js","./data/questions_09.js","./data/questions_10.js","./data/questions_11.js","./data/finalize.js",
  "./code_01.js","./code_02.js","./code_03.js","./code_04.js","./code_05.js"
];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))));
});
