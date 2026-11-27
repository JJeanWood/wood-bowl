/* Wood Bowl : service worker.
   - Le code (html, js, css) : d'abord le réseau, pour toujours avoir la dernière version ; le cache en secours hors ligne.
   - Les images et musiques : d'abord le cache (elles ne changent pas), téléchargées une fois. */
const VERSION='wb-3';
const CODE=['./','./index.html','./style.css','./moteur.js','./legendes.js','./carriere.js','./gazette.js','./gazette2.js','./son.js','./jeu.js','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CODE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==location.origin){ /* polices Google : cache d'abord */
    if(/fonts\.(googleapis|gstatic)\.com/.test(u.host))e.respondWith(caches.open(VERSION).then(c=>c.match(r).then(m=>m||fetch(r).then(x=>{c.put(r,x.clone());return x}))));
    return}
  const media=/\/(img|mus|icones)\//.test(u.pathname);
  if(media)e.respondWith(caches.open(VERSION).then(c=>c.match(r).then(m=>m||fetch(r).then(x=>{if(x.ok)c.put(r,x.clone());return x}))));
  /* le code : toujours redemandé au site (sans la mémoire du navigateur), pour recevoir les mises à jour tout de suite */
  else e.respondWith(fetch(r,{cache:'no-cache'}).then(x=>{if(x.ok){const y=x.clone();caches.open(VERSION).then(c=>c.put(r,y))}return x}).catch(()=>caches.match(r).then(m=>m||caches.match('./index.html'))));
});
