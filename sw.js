const CACHE='travel-wardrobe-v310-20261119';
const FILES=['./','./index.html','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const FONT_HOSTS=new Set(['fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net']);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('travel-wardrobe-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(FONT_HOSTS.has(url.hostname)){
    // Font CSS and browser-selected font resources are cached after their first successful load.
    // Failed/offline requests fall through to normal CSS fallback font stacks.
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
      if(response.ok||response.type==='opaque'){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
      }
      return response;
    })).catch(()=>Response.error()));
    return;
  }
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));}
    return response;
  }).catch(()=>caches.match(request)));
});
