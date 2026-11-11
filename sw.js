/* e-Remiza: prosty service worker – aplikacja otwiera się też bez sieci. */
const C = "eremiza-nowa-v1";
const FILES = ["e-remiza-nowa.html", "manifest.webmanifest", "icon-192.png"];
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => c.addAll(FILES)).catch(() => {})); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== C).map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then((res) => { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); return res; }).catch(() => caches.match(r)));
});
