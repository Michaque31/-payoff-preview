const CACHE='payoff-preview-v2';
const FILES=['./','./index.html','./manifest.json','./payoff-symbol.svg','./version.json'];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE)
    .then(c=>Promise.all(FILES.map(u=>fetch(u,{cache:'reload'}).then(r=>{if(!r.ok)throw new Error('Falha ao atualizar '+u);return c.put(u,r)}))))
    .then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||e.request.url.includes('version.json'))return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
