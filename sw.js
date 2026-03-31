const CACHE = "garage-manager-v2";

const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/js/app.js",
  "/js/home.js",
  "/js/manut.js",
  "/js/fuel.js",
  "/js/stats.js",
  "/js/utils.js",
  "/img/logo.png"
];

self.addEventListener("install",e=>{
  e.waitUntil(
    caches.open(CACHE)
    .then(cache=>cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch",e=>{
  e.respondWith(
    caches.match(e.request)
    .then(res=>res || fetch(e.request))
  );
});
