// Guarda o aplicativo no aparelho para funcionar sem internet.
// Ao publicar uma nova versão do index.html, troque o número abaixo (e a VERSAO_APP do index.html).
const CACHE = "odontograma-v37-1";
// O essencial precisa existir; os demais são guardados se estiverem no site (um arquivo faltando não impede o resto).
const ESSENCIAIS = ["./", "./index.html"];
const EXTRAS = ["./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./mapa-ti.json", "./paisagem.webp", "./paisagem-faixa.webp"];
// Só é guardada a página que for mesmo o Odontograma (tem esta marca). Página de login de Wi-Fi, página de erro ou um
// arquivo trocado no GitHub nunca substituem a cópia boa que está no aparelho.
const MARCA = 'name="odontograma-app"';
async function paginaDoApp(resp) {
  if (!resp || !resp.ok || resp.redirected || !(resp.headers.get("content-type") || "").includes("text/html")) return null;
  const txt = await resp.clone().text();
  return txt.includes(MARCA) ? txt : null;
}
async function guardarPagina(c, txt) {
  const r = () => new Response(txt, {headers: {"Content-Type": "text/html; charset=utf-8"}});
  await Promise.all([c.put("./", r()), c.put("./index.html", r())]);
}

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const txt = await paginaDoApp(await fetch("./index.html", {cache: "reload"}));
    if (!txt) throw new Error("A página baixada não é o Odontograma: a versão guardada continua valendo.");
    await guardarPagina(c, txt);
    await Promise.allSettled(EXTRAS.map(u => c.add(u)));
    await self.skipWaiting();
  })());
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
    // Página: tenta a versão mais nova. Se não vier o Odontograma (sem internet, Wi-Fi com login, erro), usa a guardada.
    e.respondWith((async () => {
      try {
        const resp = await fetch(r), txt = await paginaDoApp(resp);
        if (txt) { await guardarPagina(await caches.open(CACHE), txt); return resp; }
        return (await caches.match("./index.html")) || resp;
      } catch (x) { return (await caches.match("./index.html")) || Response.error(); }
    })());
    return;
  }
  e.respondWith(caches.match(r).then(c => c || fetch(r).then(resp => {
    if (resp.ok || resp.type === "opaque") { const cp = resp.clone(); caches.open(CACHE).then(ca => ca.put(r, cp)); }
    return resp;
  })));
});
