const CACHE_NAME = "project-aegis-v1";

const urlsToCache = [
  "/",
  "/index.html",
  "/login.html",
  "/manifest.json",
  "/css/styles.css",
  "/js/app.js",
  "/js/dexie.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch(err => console.error("Cache failed:", err))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
