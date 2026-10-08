// Guarda o aplicativo no aparelho para funcionar sem internet.
// Ao publicar uma nova versão do index.html, troque o número abaixo.
const CACHE = "odontograma-v18";
const ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname.endsWith("script.google.com") || u.hostname.endsWith("googleusercontent.com")) return; // envio: sempre pela rede
  if (r.mode === "navigate") {
    // página: tenta a versão mais nova; sem internet, usa a guardada
    e.respondWith(fetch(r).then(resp => { const cp = resp.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return resp; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(r).then(c => c || fetch(r).then(resp => {
    if (resp.ok || resp.type === "opaque") { const cp = resp.clone(); caches.open(CACHE).then(ca => ca.put(r, cp)); }
    return resp;
  })));
});
