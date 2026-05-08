self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("tandem-shell-v1").then((cache) =>
      cache.addAll(["/", "/manifest.webmanifest"])
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
  );
});
