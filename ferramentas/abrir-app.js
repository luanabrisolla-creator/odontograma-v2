// Abre o index.html num navegador de verdade (Chromium) e falha se aparecer algum erro de JavaScript ao carregar.
// Pega erros que a conferência de sintaxe não pega (por exemplo, usar algo antes de ele existir).
const path = require("path"), fs = require("fs"), http = require("http");
const raiz = fs.existsSync(path.join(__dirname, "index.html")) ? __dirname : path.join(__dirname, "..");
const { chromium } = require("playwright");
const tipos = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };
const srv = http.createServer((q, r) => {
  const f = path.join(raiz, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html"));
  if (!f.startsWith(raiz) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": tipos[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch(), erros = [];
  for (const tela of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const pg = await (await b.newContext({ viewport: tela })).newPage();
    pg.on("pageerror", e => erros.push(`${tela.width}px: ${e.message}`));
    await pg.route("https://script.google.com/**", r => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":false,"erro":"teste"}' }));
    await pg.goto(`http://localhost:${srv.address().port}/index.html`); await pg.waitForTimeout(1500);
  }
  await b.close(); srv.close();
  if (erros.length) { erros.forEach(e => console.log("ERRO   " + e)); process.exit(1); }
  console.log("O app abriu sem erros no celular e no computador.");
});
