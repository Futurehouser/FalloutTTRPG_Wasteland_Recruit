// The web version (GitHub Pages, iPhone Home Screen): keeps a copy of the app so it also opens without internet.
// Online it always asks the site first (so a new version shows up straight away) and keeps what it gets;
// offline it answers from that copy. Only the app's own files: card pictures, radio and GitHub stay online-only.
// The publishing workflow fills in VERSION and FILES; a new VERSION makes the phone pick up this file again.
const VERSION = "dev";
const FILES = [/*FILES*/];
const CACHE = "wr-" + VERSION;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: "no-cache" })).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("wr-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: "no-cache" });
      if (res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") { const home = await cache.match("index.html"); if (home) return home; }
      throw err;
    }
  })());
});
