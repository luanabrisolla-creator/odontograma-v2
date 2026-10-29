// Testes no navegador (Chromium): o app de verdade, falando com o servidor simulado na mesma máquina.
// Rodam no computador (node testes/navegador.test.js, com o Playwright instalado) e no GitHub a cada envio.
const path = require("path"), fs = require("fs"), http = require("http");
const { chromium } = require("playwright");
const { cenario, exame } = require("./cenario.js");
const raiz = path.join(__dirname, "..");
let falhas = 0, total = 0, secao = "";
const T = (nome, cond, extra) => {
  total++;
  if (!cond) { falhas++; console.log("FALHA " + secao + " › " + nome + (extra === undefined ? "" : " → " + JSON.stringify(extra).slice(0, 400))); }
  else if (process.env.VERBOSO) console.log("ok    " + secao + " › " + nome);
};
const parte = n => { secao = n; };
// FOTOS=pasta guarda capturas de tela das telas principais (opcional).
const foto = async (pg, nome, sel) => { if (!process.env.FOTOS) return; fs.mkdirSync(process.env.FOTOS, { recursive: true }); const alvo = sel ? await pg.$(sel) : null; await (alvo || pg).screenshot({ path: path.join(process.env.FOTOS, nome + ".png") }); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const tipos = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" };

const S = cenario();
const { G } = S;
const aba = n => G.est.sheets[n] || [];
// Exames já na nuvem, para o Painel ter mais de 5 pessoas.
for (let i = 0; i < 8; i++) {
  const r = S.P(S.BRUNO, { acao: "enviarExame", registro: exame({ nasc: "2016-0" + (i + 1) + "-10", idade: 10, data: "2026-09-1" + i, mud: i < 4 ? { 46: { faces: { O: "ca" } }, 54: { faces: { O: "rest" } } } : {} }) });
  if (!r.ok) throw new Error("exame de base: " + r.erro);
}

(async () => {
  const srv = http.createServer((q, r) => {
    const f = path.join(raiz, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html"));
    if (!f.startsWith(raiz) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": tipos[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
  });
  await new Promise(ok => srv.listen(0, ok));
  const URL = `http://localhost:${srv.address().port}/index.html`;
  const b = await chromium.launch();
  async function pagina(cel) {
    const ctx = await b.newContext({ viewport: cel ? { width: 390, height: 844 } : { width: 1280, height: 900 }, serviceWorkers: "block" });
    const pg = await ctx.newPage(); pg.erros = [];
    pg.on("pageerror", e => pg.erros.push(e.message));
    pg.on("dialog", d => d.accept());
    await pg.route("https://script.google.com/**", async rt => {
      const q = rt.request();
      const corpo = q.method() === "GET" ? G.get() : G.post(JSON.parse(q.postData()));
      await rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
    });
    await pg.route(/fonts\.(googleapis|gstatic)\.com/, rt => rt.abort());
    return { ctx, pg };
  }
  async function entrar(pg, cr) {
    await pg.goto(URL); await pg.waitForTimeout(500);
    if (await pg.$('[data-ac="entrar"]')) await pg.click('[data-ac="entrar"]');
    await pg.fill("#acEmail", cr.email); await pg.fill("#acCodigo", cr.codigo); await pg.click("#acEntrar"); await pg.waitForTimeout(1500);
    await pg.evaluate(() => { const t = document.getElementById("toast"); if (t) t.hidden = true; const l = document.getElementById("leitura"); if (l) l.hidden = true; });
  }
  const irAba = (pg, k) => pg.evaluate(k => irAba(k), k);
  async function novaPessoa(pg, o) {
    await irAba(pg, "exame"); await pg.waitForTimeout(300);
    await pg.fill('[data-campo="polo"]', o.polo || "Surucucu"); await pg.fill('[data-campo="aldeia"]', o.aldeia || "Hakoma");
    await pg.check('input[name="idModo"][value="novo"]'); await pg.waitForTimeout(150);
    await pg.fill('[data-campo="crianca.nascimento"]', o.nasc || "2018-04-04");
    await pg.selectOption('[data-campo="crianca.sexo"]', o.sexo || "F"); await pg.waitForTimeout(150);
    await pg.click('[data-id-acao="buscar-dados"]'); await pg.waitForTimeout(800);
    await pg.click('[data-id-acao="nova-pessoa"]'); await pg.waitForTimeout(800);
    await pg.click('#leitura [data-id-acao="fecha-novo"].prim'); await pg.waitForTimeout(200);
  }
  async function completar(pg) {
    await pg.evaluate(() => { pendentes(estado.ex).forEach(n => estado.ex.dentes[n].status = opsConfirmar(n, estado.ex)[0]); renderOdonto(); renderResultado(); });
    if (!await pg.evaluate(() => estado.ex.localAtendimento)) await pg.click('#locais [data-local="UBSI"]');
    await pg.check('#blocoCond [data-vig="6"]');
    await pg.click('[data-bool="placa"] [data-v="0"]'); await pg.click('[data-bool="gengivite"] [data-v="0"]'); await pg.waitForTimeout(150);
  }
  const toast = pg => pg.textContent("#toast");

  /* ------------------------------------------------ exame do começo ao fim */
  parte("exame");
  let { ctx, pg } = await pagina(true);
  await entrar(pg, S.ANA);
  T("dentista entra", await pg.evaluate(() => !!sessao()));
  const opcoes = await pg.$$eval("#inSexo option", os => os.map(o => o.textContent));
  T("sexo sem a opção \"Não informado\"", !opcoes.some(t => /não informado/i.test(t)) && opcoes.includes("Feminino") && opcoes.includes("Masculino"), opcoes);
  await novaPessoa(pg, {});
  T("DSEI do exame vem do cadastro e não é editável", await pg.isDisabled("#exDsei") && await pg.inputValue("#exDsei") === "Yanomami", [await pg.isDisabled("#exDsei"), await pg.inputValue("#exDsei")]);
  const cod = await pg.evaluate(() => estado.ex.codigoFixo);
  T("código novo no formato UF-polo-aldeia-8 caracteres", /^RR-SUR-HAK-[2-9A-HJKMNP-Z]{8}$/.test(cod || ""), cod);
  await pg.selectOption('[data-campo="crianca.sexo"]', ""); await pg.waitForTimeout(100);
  await completar(pg);
  await pg.click("#salvar"); await pg.waitForTimeout(400);
  await foto(pg, "1_falta_sexo_cel");
  T("sem sexo, o app não deixa salvar e diz o que falta", /sexo/.test(await toast(pg)) && !aba("Exames").some(l => l[1] === cod), await toast(pg));
  await pg.selectOption('[data-campo="crianca.sexo"]', "F"); await pg.waitForTimeout(100);
  await pg.click("#salvar"); await pg.waitForTimeout(2500);
  T("com tudo respondido, o exame chega à planilha com o código mostrado", aba("Exames").some(l => l[1] === cod), aba("Exames").slice(-2).map(l => l[1]));
  T("o resultado gravado é o calculado pelo servidor", (() => { const l = aba("Exames").find(x => x[1] === cod); return l && JSON.parse(l.at(-1)).resultado.descricao.length > 0; })());

  /* ------------------------------------------------ armazenamento cheio */
  parte("armazenamento");
  await pg.evaluate(() => {
    const orig = Storage.prototype.setItem;
    window.__cheio = true;
    Storage.prototype.setItem = function (k, v) { if (window.__cheio && k === "odonto.exames.v1") { const e = new Error("cheio"); e.name = "QuotaExceededError"; throw e; } return orig.call(this, k, v); };
  });
  await novaPessoa(pg, { nasc: "2017-02-02", sexo: "M" });
  const cod2 = await pg.evaluate(() => estado.ex.codigoFixo);
  await pg.evaluate(() => { navigator.__off = true; });
  await completar(pg);
  await pg.route("https://script.google.com/**", rt => rt.abort());
  await pg.click("#salvar"); await pg.waitForTimeout(800);
  await pg.evaluate(() => scrollTo(0, 0)); await foto(pg, "2_sem_espaco_cel");
  T("sem espaço: aparece o aviso vermelho para enviar os exames", await pg.isVisible("#avisoArmaz") && /sem espaço/.test(await pg.textContent("#avisoArmaz")), await pg.textContent("#avisoArmaz"));
  T("o exame não some: continua na lista do app (na memória)", await pg.evaluate(c => exames().some(e => e.codigo === c), cod2));
  await pg.unroute("https://script.google.com/**");
  await pg.route("https://script.google.com/**", async rt => { const q = rt.request(); const corpo = q.method() === "GET" ? G.get() : G.post(JSON.parse(q.postData())); await rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) }); });
  await pg.evaluate(() => sincronizar(true)); await pg.waitForTimeout(2500);
  T("com internet, o exame que estava só na memória é enviado", aba("Exames").some(l => l[1] === cod2));
  await pg.evaluate(() => { window.__cheio = false; });
  T("sem erros de página", !pg.erros.length, pg.erros);
  await ctx.close();

  /* ------------------------------------------------ faxina dos enviados antigos */
  parte("faxina");
  ({ ctx, pg } = await pagina(true));
  await entrar(pg, S.BRUNO);
  await pg.evaluate(() => {
    const velho = { id: "VELHO", envio: { estado: "enviado", em: new Date(Date.now() - 40 * 86400000).toISOString() }, dono: sessao().usuario.id, dataExame: "2026-08-01", crianca: {}, dentes: {}, resultado: {} };
    const pend = { id: "PENDENTE-ANTIGO", envio: { estado: "erro", em: new Date(Date.now() - 90 * 86400000).toISOString() }, dono: sessao().usuario.id, dataExame: "2026-07-01", crianca: {}, dentes: {}, resultado: {} };
    localStorage.setItem("odonto.exames.v1", JSON.stringify([velho, pend]));
  });
  await pg.reload(); await pg.waitForTimeout(800);
  const ids = await pg.evaluate(() => JSON.parse(localStorage.getItem("odonto.exames.v1") || "[]").map(e => e.id));
  T("exame enviado há mais de 30 dias sai do aparelho; o não enviado fica", !ids.includes("VELHO") && ids.includes("PENDENTE-ANTIGO"), ids);
  await ctx.close();
  // Aparelho já cheio desde a abertura: o app abre sem travar.
  ({ ctx, pg } = await pagina(true));
  await entrar(pg, S.BRUNO);
  await pg.addInitScript(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === "__t") return o.call(this, k, v); const e = new Error("cheio"); e.name = "QuotaExceededError"; throw e; }; });
  await pg.reload(); await pg.waitForTimeout(1200);
  await pg.evaluate(() => store.set(K_EXAMES, exames().concat([{ id: "NOVO-CHEIO", envio: { estado: "pendente" }, crianca: {}, dentes: {}, resultado: {} }])));
  const cheio = [pg.erros.length, await pg.isVisible("#avisoArmaz"), await pg.evaluate(() => exames().some(e => e.id === "NOVO-CHEIO")), await pg.evaluate(() => document.getElementById("avisoArmaz").className + "|" + document.getElementById("avisoArmaz").hidden + "|" + getComputedStyle(document.getElementById("avisoArmaz")).display + "|" + !!document.getElementById("avisoArmaz").offsetParent)];
  T("aparelho cheio desde a abertura: abre sem erro e avisa ao gravar", !cheio[0] && cheio[1] && cheio[2], cheio.concat(pg.erros));
  await ctx.close();

  /* ------------------------------------------------ reorganização pela titular */
  parte("reorganização");
  G.est.props.FORMATO_PLANILHA = "21";
  ({ ctx, pg } = await pagina(false));
  await entrar(pg, S.C);
  await irAba(pg, "admin"); await pg.waitForTimeout(1500);
  T("Administração mostra a atualização pendente", await pg.isVisible("#admReorg"));
  await pg.click('[data-reorg="previa"]'); await pg.waitForTimeout(800);
  T("prévia mostra os números antes de mudar", /Exames na planilha/.test(await pg.textContent("#admReorgPrevia")) && G.est.props.FORMATO_PLANILHA === "21");
  await foto(pg, "3_reorganizacao_previa_pc", "#admReorg");
  await pg.click('[data-reorg="fazer"]'); await pg.waitForTimeout(2500);
  T("confirmar faz backup e atualiza a planilha", G.ctx.formatoAtual() && !await pg.isVisible("#admReorg"));
  T("situação do servidor aparece na Administração", /Situação do servidor/.test(await pg.textContent("#admConteudo")));
  T("sem erros de página (coordenação)", !pg.erros.length, pg.erros);
  await ctx.close();

  /* ------------------------------------------------ todas as abas, todos os perfis */
  parte("abas");
  for (const [nome, cr, cel] of [["coordenação", S.C, false], ["coordenação + RT", S.PAULA, true], ["RT", S.RT, false], ["dentista", S.BRUNO, true]]) {
    ({ ctx, pg } = await pagina(cel));
    await entrar(pg, cr);
    const abas = await pg.evaluate(() => abasDoPerfil().map(a => a[0]));
    for (const k of abas) { await irAba(pg, k); await pg.waitForTimeout(900); }
    T(nome + ": abre todas as abas sem erro (" + abas.join(", ") + ")", !pg.erros.length, pg.erros);
    if (abas.includes("exame")) {
      await irAba(pg, "exame"); await pg.waitForTimeout(300);
      T(nome + ": exame mostra procedimentos coletivos e insumos", /Escovação supervisionada/.test(await pg.textContent("body")) && /Escova dental/.test(await pg.textContent("body")));
    }
    if (abas.includes("painel")) {
      await irAba(pg, "painel"); await pg.waitForTimeout(400);
      await pg.selectOption("#pPeriodo", "tudo"); await pg.waitForTimeout(1500);
      T(nome + ": painel mostra os índices por faixa etária", /Índices médios por faixa etária/.test(await pg.textContent("#pConteudo")), (await pg.textContent("#pConteudo")).slice(0, 200));
    }
    await ctx.close();
  }

  /* ------------------------------------------------ e-mails com o endereço oficial (a partir do app) */
  parte("recuperação");
  ({ ctx, pg } = await pagina(true));
  await pg.goto(URL); await pg.waitForTimeout(500);
  if (await pg.$('[data-ac="entrar"]')) await pg.click('[data-ac="entrar"]');
  await pg.fill("#acEmail", S.CARLA.email); await pg.click("#acReenviar"); await pg.waitForTimeout(800);
  const m = G.est.mails.filter(x => x.to === S.CARLA.email).pop();
  T("o link do e-mail é o endereço oficial, não o da página aberta", m && m.body.includes("https://luanabrisolla-creator.github.io/odontograma-v2/?recuperar=") && !m.body.includes("localhost"), m && m.body);
  await ctx.close();

  await b.close(); srv.close();
  console.log(falhas ? `\n${falhas} de ${total} verificações FALHARAM.` : `\nTudo certo: ${total} verificações no navegador passaram.`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.log("ERRO " + e.stack); process.exit(1); });
