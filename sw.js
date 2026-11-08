/* Study: service worker.
   Pagina: si apre subito dalla copia salvata e intanto controllo se ce n'è una nuova (se c'è, la pagina viene avvisata).
   Il resto (icone, font, manifest): prima la copia salvata. Cambiando V si rifà tutto. */
const V='cursus-v7';
const FILES=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/logo-512.png','fonts/inter-latin-wght.woff2','fonts/jost-latin-wght.woff2'];
const ROOT=self.registration.scope,IDX=new URL('index.html',ROOT).href;

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(FILES.map(u=>c.add(new Request(u,{cache:'reload'}))))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});

let busy=null;
function refresh(){
  if(busy)return busy;
  busy=(async()=>{
    try{
      const c=await caches.open(V),nw=await fetch(IDX,{cache:'no-cache'});
      if(!nw.ok)return;
      const old=await c.match(IDX),[a,b]=await Promise.all([old?old.clone().text():'',nw.clone().text()]);
      if(a===b)return;
      await Promise.all([c.put(IDX,nw.clone()),c.put(ROOT,nw.clone())]);
      if(old)(await self.clients.matchAll({type:'window'})).forEach(x=>x.postMessage({t:'upd'}));
    }catch(_){}
    finally{busy=null;}
  })();
  return busy;
}

async function page(e){
  const c=await caches.open(V),hit=(await c.match(ROOT,{ignoreSearch:true}))||(await c.match(IDX));
  if(hit){e.waitUntil(refresh());return hit;}
  const x=await fetch(e.request);
  if(x.ok){const k=x.clone(),k2=x.clone();e.waitUntil(Promise.all([c.put(IDX,k),c.put(ROOT,k2)]));}
  return x;
}

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  if(r.mode==='navigate'||r.destination==='document'){e.respondWith(page(e).catch(()=>caches.match(IDX)));return;}
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>m||fetch(r).then(x=>{if(x.ok){const k=x.clone();caches.open(V).then(h=>h.put(r,k));}return x;})));
});

self.addEventListener('message',e=>{if(e.data&&e.data.t==='chk')e.waitUntil(refresh());});
