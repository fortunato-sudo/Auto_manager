const CACHE_NAME = "garage-manager-v2";

self.addEventListener("install", event=>{
  self.skipWaiting();
});

self.addEventListener("activate", event=>{
  event.waitUntil(
    caches.keys().then(keys=>{
      return Promise.all(
        keys.map(key=>{
          if(key !== CACHE_NAME){
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", event=>{
  if(event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache=>{
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(()=>{
        return caches.match(event.request);
      })
  );
});
