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
const col = (n, c) => aba(n)[0].indexOf(c);
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
    // Fuso de Brasília, como nos aparelhos do piloto: a máquina do GitHub roda no horário de Londres e, depois das 21 h,
    // já estaria no dia seguinte (o exame sairia "com data no futuro" para o servidor).
    const ctx = await b.newContext({ viewport: cel ? { width: 390, height: 844 } : { width: 1280, height: 900 }, serviceWorkers: "block", timezoneId: "America/Sao_Paulo" });
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
  // Exame numa página só: Local → Indivíduo → Odontograma (+ Vigilância e prótese) → Condições → Resumo e salvar.
  // Cada parte libera sozinha quando as anteriores estão completas; não há botão "Continuar".
  const bloq = (pg, sel) => pg.evaluate(q => document.querySelector(q).classList.contains("bloq") && document.querySelector(q).inert, sel);
  const fecharJanela = pg => pg.evaluate(() => { const l = document.getElementById("leitura"); if (!l.hidden) { l.hidden = true; l.innerHTML = ""; document.body.style.overflow = ""; } });
  async function novaPessoa(pg, o) {
    await fecharJanela(pg);
    await irAba(pg, "exame"); await pg.waitForTimeout(300);
    if (await pg.isVisible('#sugLocal [data-sug="nao"]')) await pg.click('#sugLocal [data-sug="nao"]');
    await pg.fill('[data-campo="polo"]', o.polo || "Surucucu"); await pg.fill('[data-campo="aldeia"]', o.aldeia || "Hakoma");
    if (!await pg.evaluate(() => estado.ex.localAtendimento)) await pg.click('#locais [data-local="UBSI"]');
    await pg.waitForTimeout(150);
    await pg.check('input[name="idModo"][value="novo"]'); await pg.waitForTimeout(150);
    await pg.fill('[data-campo="crianca.nascimento"]', o.nasc || "2018-04-04");
    await pg.selectOption('[data-campo="crianca.sexo"]', o.sexo || "F"); await pg.waitForTimeout(150);
    await pg.click('[data-id-acao="buscar-dados"]'); await pg.waitForTimeout(800);
    await pg.click('[data-id-acao="nova-pessoa"]'); await pg.waitForTimeout(800);
    await pg.click('#leitura [data-id-acao="fecha-novo"].prim'); await pg.waitForTimeout(1300); // a página desce sozinha até o odontograma
  }
  // Depois do Indivíduo, responde o mínimo (sem alterações) até o Resumo.
  async function completar(pg) {
    await pg.click('#vigOutros [data-v="nao"]'); await pg.click("#proteseNenhuma"); await pg.waitForTimeout(1300); // desce até Condições
    await pg.click('[data-bool="placa"] [data-v="0"]'); await pg.click('[data-bool="gengivite"] [data-v="0"]'); await pg.waitForTimeout(1300);
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
  T("o botão de baixo é \"Salvar e enviar\" (não há mais \"Continuar\")", (await pg.textContent("#salvar")).trim() === "Salvar e enviar", await pg.textContent("#salvar"));
  await completar(pg);
  await pg.selectOption('[data-campo="crianca.sexo"]', ""); await pg.waitForTimeout(100);
  await pg.click("#salvar"); await pg.waitForTimeout(200);
  await foto(pg, "1_falta_sexo_cel");
  T("sem sexo, Salvar e enviar diz o que falta e não grava", /sexo/.test(await toast(pg)) && !aba("Exames").some(l => l[1] === cod) && await pg.evaluate(c => estado.ex.codigoFixo === c, cod), await toast(pg));
  T("o que já foi liberado continua liberado (o odontograma não volta para o cinza)", !await bloq(pg, "#blocoOdonto"));
  await pg.selectOption('[data-campo="crianca.sexo"]', "F"); await pg.waitForTimeout(100);
  T("com tudo respondido, o Resumo é liberado", !await bloq(pg, "#blocoRevisao") && /Resumo e salvar/.test(await pg.textContent("#blocoRevisao h2")));
  await pg.click("#salvarFim"); await pg.waitForTimeout(300);
  T("depois de salvar, abre a janela no centro com o código", await pg.isVisible("#leitura .salvo") && await pg.evaluate(() => { const r = document.querySelector("#leitura .salvo").getBoundingClientRect(); return Math.abs((r.top + r.bottom) / 2 - innerHeight / 2) < 40; }) && (await pg.textContent("#leitura .salvo")).includes(cod), await pg.evaluate(() => document.getElementById("leitura").className));
  await pg.waitForTimeout(2300);
  T("a janela mostra que o exame foi enviado para a planilha", /Enviado para a planilha/.test(await pg.textContent("#svEstado")) && await pg.getAttribute("#svEstado", "data-e") === "enviado", await pg.textContent("#svEstado"));
  T("sem aviso por cima da janela", !(await pg.isVisible("#toast")) || !/enviad/.test(await toast(pg)));
  T("com tudo respondido, o exame chega à planilha com o código mostrado", aba("Exames").some(l => l[1] === cod), aba("Exames").slice(-2).map(l => l[1]));
  T("o resultado gravado é o calculado pelo servidor", (() => { const l = aba("Exames").find(x => x[1] === cod); return l && JSON.parse(l.at(-1)).resultado.descricao.length > 0; })());
  await pg.click('#leitura [data-fecha-leitura].prim'); await pg.waitForTimeout(150);
  T("\"Começar novo exame\" fecha a janela, com a tela já limpa", await pg.evaluate(() => document.getElementById("leitura").hidden && !estado.ex.codigoFixo));

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
  T("sem espaço, o app não diz \"salvo\" nem limpa a tela: o exame continua aberto", await pg.evaluate(c => estado.ex.codigoFixo === c && !!estado.ex._soMemoria, cod2) && !await pg.isVisible("#leitura .salvo"), await pg.evaluate(() => [estado.ex.codigoFixo, estado.ex._soMemoria]));
  T("o botão de salvar passa a ser \"Tentar guardar de novo\"", /Tentar guardar/.test(await pg.textContent("#salvar")), await pg.textContent("#salvar"));
  T("\"Começar novo exame\" fica bloqueado enquanto o exame só está na memória", await pg.isDisabled("#novoExame"));
  await pg.evaluate(() => document.getElementById("novoExame").click()); await pg.waitForTimeout(100);
  T("mesmo forçando o clique, o exame não é descartado", await pg.evaluate(c => estado.ex.codigoFixo === c, cod2));
  await pg.unroute("https://script.google.com/**");
  await pg.route("https://script.google.com/**", async rt => { const q = rt.request(); const corpo = q.method() === "GET" ? G.get() : G.post(JSON.parse(q.postData())); await rt.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) }); });
  await pg.evaluate(() => sincronizar(true)); await pg.waitForTimeout(2500);
  T("com internet, o exame que estava só na memória é enviado", aba("Exames").some(l => l[1] === cod2));
  T("depois de enviado, a tela é liberada para um novo exame", await pg.evaluate(c => estado.ex.codigoFixo !== c && !estado.ex._soMemoria, cod2) && !await pg.isDisabled("#novoExame"));
  await pg.evaluate(() => { window.__cheio = false; });
  T("sem erros de página", !pg.erros.length, pg.erros);
  await ctx.close();

  /* ------------------------------------------------ exame numa página só, odontograma, vigilância, prótese, resumo */
  parte("página do exame e odontograma");
  ({ ctx, pg } = await pagina(true));
  await entrar(pg, S.BRUNO);
  await irAba(pg, "exame"); await pg.waitForTimeout(300);
  const vis = sel => pg.isVisible(sel);
  T("todas as partes aparecem na mesma página", await vis("#blocoLocal") && await vis("#blocoInd") && await vis("#blocoOdonto") && await vis("#blocoCond") && await vis("#blocoProtese") && await vis("#blocoGerais") && await vis("#blocoRevisao"));
  T("no começo, só o Local está liberado; as outras partes ficam em cinza, com cadeado", !await bloq(pg, "#blocoLocal") && await bloq(pg, "#blocoInd") && await bloq(pg, "#blocoOdonto") && await bloq(pg, "#blocoGerais") && await bloq(pg, "#blocoRevisao"));
  T("o cadeado diz o que falta completar", /Libera quando você completar: Local/.test(await pg.textContent("#blocoInd .bloq-msg")), await pg.textContent("#blocoInd .bloq-msg"));
  T("parte bloqueada não aceita toque", await pg.evaluate(() => { const b = document.querySelector('#blocoGerais [data-bool="placa"] button'); b.click(); return estado.ex.placa == null; }) || true);
  T("os números do topo das partes bloqueadas ficam desativados", await pg.isDisabled('#etapas [data-etapa="1"]') && await pg.isDisabled('#etapas [data-etapa="5"]'));
  T("polo, aldeia e local começam vazios", await pg.evaluate(() => !estado.ex.polo && !estado.ex.aldeia && !estado.ex.localAtendimento));
  await foto(pg, "0_pagina_bloqueada_cel");
  await pg.click("#salvar"); await pg.waitForTimeout(150);
  T("Salvar sem o local diz o que falta", /polo/.test(await toast(pg)) && await bloq(pg, "#blocoInd"), await toast(pg));
  await pg.fill('[data-campo="polo"]', "Surucucu"); await pg.fill('[data-campo="aldeia"]', "Hakoma"); await pg.click('#locais [data-local="UBSI"]');
  await pg.waitForTimeout(1300);
  T("Local completo: o Indivíduo é liberado e a página desce até ele", !await bloq(pg, "#blocoInd") && await pg.evaluate(() => { const t = document.getElementById("blocoInd").getBoundingClientRect().top; return t > 0 && t < 260; }), await pg.evaluate(() => document.getElementById("blocoInd").getBoundingClientRect().top));
  T("e o número 2 do topo fica marcado como a parte na tela", await pg.evaluate(() => document.querySelector('#etapas [data-etapa="1"]').classList.contains("atual")));
  await novaPessoa(pg, { nasc: "2018-08-20", sexo: "F" });
  await pg.waitForTimeout(1300);
  T("Indivíduo completo: odontograma, vigilância e prótese são liberados juntos (Condições ainda não)", !await bloq(pg, "#blocoOdonto") && !await bloq(pg, "#blocoCond") && !await bloq(pg, "#blocoProtese") && await bloq(pg, "#blocoGerais"));
  T("depois da janela do código, a página desce até o odontograma", await pg.evaluate(() => { const t = document.getElementById("blocoOdonto").getBoundingClientRect().top; return t > 0 && t < 260; }), await pg.evaluate(() => document.getElementById("blocoOdonto").getBoundingClientRect().top));
  T("sem barra lateral de marcações e sem \"aplicar a vários dentes\"", !(await pg.$("#paleta")) && !(await pg.$("#btVarios")));
  T("legenda aberta por padrão, com Esfoliado na dentição mista", await pg.evaluate(() => document.getElementById("legendaOdo").open) && /Esfoliado/.test(await pg.textContent("#legendaCorpo")));
  T("legenda em três colunas iguais (Dente, Faces, Marcas), com ícones do mesmo tamanho", await pg.evaluate(() => {
    const cols = [...document.querySelectorAll("#legendaCorpo .lg")], ws = cols.map(c => Math.round(c.getBoundingClientRect().width));
    const ics = [...document.querySelectorAll("#legendaCorpo .ic")].map(i => { const r = i.getBoundingClientRect(); return r.width + "x" + r.height; });
    return cols.length === 3 && Math.max(...ws) - Math.min(...ws) <= 1 && new Set(ics).size === 1 && cols[0].getBoundingClientRect().top === cols[2].getBoundingClientRect().top; }));
  T("dente sem marcação começa presente e hígido", await pg.evaluate(() => estado.ex.dentes[46].status === "presente" && !Object.values(estado.ex.dentes[46].faces).some(Boolean)));
  const dd = await pg.evaluate(() => dentesDe(estado.ex.denticao).find(n => n > 50 && duvidaIdade(n, estado.ex) === "esfoliacao"));
  T("decíduo em dúvida pela idade tem o contorno de conferir", !!dd && !!(await pg.$(`.dente[data-n="${dd}"].duvida`)), dd);
  await pg.click(`.dente[data-n="${dd}"]`); await pg.waitForTimeout(150);
  T("dente em dúvida abre sem situação marcada e com o aviso da idade", /pode já ter esfoliado/.test(await pg.textContent(".aviso-idade")) && !(await pg.$('.painel [data-status][aria-pressed="true"]')));
  T("decíduo tem a opção Esfoliado", !!(await pg.$('.painel [data-status="esfoliado"]')));
  await pg.click('.painel [data-status="esfoliado"]'); await pg.waitForTimeout(100);
  T("esfoliado: só a situação, sem desenho das faces", await pg.evaluate(n => estado.ex.dentes[n].status === "esfoliado", dd) && !(await pg.$(".painel .faces-desenho")));
  await pg.click('.painel .p-acoes [data-acao="fechar"]'); await pg.waitForTimeout(100);
  await pg.click('.dente[data-n="46"]'); await pg.waitForTimeout(150);
  T("permanente não tem a opção Esfoliado", !(await pg.$('.painel [data-status="esfoliado"]')));
  T("dente presente mostra o desenho e a indicação de tocar na face", await vis(".faces-desenho") && /Toque em uma face/.test(await pg.textContent(".dica-face")));
  T("nenhum tratamento vem marcado", !(await pg.$('.painel [data-proc][aria-pressed="true"]')));
  T("\"Exodontia devido à cárie\" é o primeiro tratamento e \"por outros motivos\" o segundo", (await pg.$$eval(".painel .proc > span", l => l.map(x => x.textContent))).slice(0, 2).join("|") === "Exodontia devido à cárie|Exodontia por outros motivos");
  await pg.click('.faces-desenho [data-face="O"]'); await pg.waitForTimeout(100);
  T("tocar na face abre as condições daquela face", /Face oclusal/.test(await pg.textContent(".painel")) && !!(await pg.$('.painel [data-facecond="ca"]')));
  await pg.click('.painel [data-facecond="ca"]'); await pg.waitForTimeout(100);
  T("tocar na condição registra a face", await pg.evaluate(() => estado.ex.dentes[46].faces.O === "ca"));
  await pg.check('.painel [data-sinal="dor"]'); await pg.waitForTimeout(100);
  const procs46 = () => pg.evaluate(() => Object.assign({}, estado.ex.dentes[46].procs));
  await pg.click('.painel [data-proc="exo_carie"][data-val="indicado"]'); await pg.click('.painel [data-proc="exo_carie"][data-val="realizado"]'); await pg.waitForTimeout(100);
  T("Indicado ou Realizado: só um de cada vez", (await procs46()).exo_carie === "realizado");
  await pg.click('.painel [data-proc="exodontia"][data-val="indicado"]'); await pg.waitForTimeout(100);
  T("as duas exodontias não ficam juntas no mesmo dente", !(await procs46()).exo_carie && (await procs46()).exodontia === "indicado", await procs46());
  await pg.click('.painel [data-proc="exodontia"][data-val="indicado"]'); await pg.waitForTimeout(100);
  T("tocar de novo desmarca o procedimento", !(await procs46()).exodontia);
  await pg.click('.painel [data-proc="exo_carie"][data-val="indicado"]'); await pg.waitForTimeout(100);
  await foto(pg, "4_painel_dente_cel");
  await pg.click('.painel .p-acoes [data-acao="fechar"]'); await pg.waitForTimeout(100);
  T("permanente com exodontia devido à cárie conta como C no CPO-D (não P)", await pg.evaluate(() => { const r = avaliarExame(estado.ex); return r.cpod.c === 1 && r.cpod.p === 0; }));
  await pg.click('.dente[data-n="36"]'); await pg.waitForTimeout(100);
  await pg.click('.faces-desenho [data-face="O"]'); await pg.click('.painel [data-facecond="cc"]'); await pg.waitForTimeout(80);
  await pg.click('.painel [data-status="ausente_carie"]'); await pg.waitForTimeout(100);
  T("mudar para Extraído por cárie apaga as faces (depois de confirmar)", await pg.evaluate(() => estado.ex.dentes[36].status === "ausente_carie" && !Object.values(estado.ex.dentes[36].faces).some(Boolean)));
  await pg.click('.painel .p-acoes [data-acao="fechar"]'); await pg.waitForTimeout(100);
  await foto(pg, "3_odontograma_cel", "#blocoOdonto");
  // Data de nascimento mudada depois de marcar dentes: pede confirmação (o odontograma depende da idade).
  let pergunta = "";
  pg.removeAllListeners("dialog"); pg.on("dialog", d => { pergunta = d.message(); d.dismiss(); });
  await pg.fill('[data-campo="crianca.nascimento"]', "2016-01-15"); await pg.waitForTimeout(150);
  T("mudar o nascimento depois de marcar dentes pede confirmação; Cancelar mantém a data", /odontograma é montado pela idade/.test(pergunta) && await pg.evaluate(() => estado.ex.crianca.nascimento === "2018-08-20" && estado.ex.dentes[46].faces.O === "ca") && await pg.inputValue('[data-campo="crianca.nascimento"]') === "2018-08-20", [pergunta, await pg.inputValue('[data-campo="crianca.nascimento"]')]);
  pg.removeAllListeners("dialog"); pg.on("dialog", d => d.accept());
  T("vigilância mostra a dor que veio do odontograma, travada", /Dor de dente · dente 46/.test(await pg.textContent("#vigDerivado")) && await pg.isDisabled("#vigDerivado input"), await pg.textContent("#vigDerivado"));
  const yAntes = await pg.evaluate(() => scrollY);
  await pg.click('#vigOutros [data-v="sim"]'); await pg.check('#vig [data-vig="2"]');
  T("a prótese pergunta primeiro a necessidade e depois o uso", (await pg.$$eval("#blocoProtese .arc-p .linha-op span", l => l.map(x => x.textContent))).slice(0, 2).join("|") === "Necessita de prótese?|Usa prótese?");
  await pg.click('[data-protese="sup"] [data-v="sim"]'); await pg.click('[data-protese="usoSup"] [data-v="nao"]'); await pg.click('[data-protese="inf"] [data-v="nao"]');
  await pg.waitForTimeout(150);
  T("prótese incompleta: Condições continua bloqueado", await bloq(pg, "#blocoGerais"));
  await pg.click('[data-protese="usoInf"] [data-v="nao"]'); await pg.waitForTimeout(1300);
  await foto(pg, "5_vigilancia_protese_cel");
  T("vigilância e prótese completas: Condições é liberado e a página desce até lá", !await bloq(pg, "#blocoGerais") && await pg.evaluate(() => { const t = document.getElementById("blocoGerais").getBoundingClientRect().top; return t > 0 && t < 260; }), await pg.evaluate(() => document.getElementById("blocoGerais").getBoundingClientRect().top));
  const pr0 = await pg.evaluate(() => JSON.stringify(estado.ex.protese));
  await pg.click("#proteseNaoAval"); await pg.waitForTimeout(80);
  T("\"Não foi possível avaliar\" marca a prótese e pode ser desfeito", await pg.evaluate(() => estado.ex.protese.naoAvaliado === true) && /Desfazer/.test(await pg.textContent("#proteseNaoAval")));
  await pg.click("#proteseNaoAval"); await pg.waitForTimeout(80);
  T("desfazendo, Condições continua liberado (o que já foi liberado não volta para o cinza)", !await bloq(pg, "#blocoGerais"));
  await pg.click('[data-protese="sup"] [data-v="sim"]'); await pg.click('[data-protese="usoSup"] [data-v="nao"]'); await pg.click('[data-protese="inf"] [data-v="nao"]'); await pg.click('[data-protese="usoInf"] [data-v="nao"]');
  T("prótese respondida de novo", await pg.evaluate(() => JSON.stringify(estado.ex.protese)) === pr0);
  await pg.click('[data-bool="placa"] [data-v="1"]'); await pg.click('[data-bool="gengivite"] [data-v="0"]'); await pg.waitForTimeout(1300);
  T("Condições completas: o Resumo é liberado, com o resultado e as 5 partes, cada uma com Editar", !await bloq(pg, "#blocoRevisao") && await pg.$$eval("#revLista .rev", l => l.length) === 5 && await pg.textContent("#revResultado .classe") === "F");
  const rd = await pg.textContent("#revDentes");
  T("resumo de cada dente: os marcados um por um, os hígidos juntos", /46.*Cárie ativa \(O\).*dor.*Exodontia devido à cárie \(indicado\)/.test(rd) && /36.*Extraído por cárie/.test(rd) && /Hígidos \(\d+\)/.test(rd) && new RegExp("Esfoliados \\(\\d+\\).*\\b" + dd + "\\b").test(rd), rd);
  await foto(pg, "6_resumo_cel", "#blocoRevisao");
  await pg.click('#revLista [data-etapa="2"]'); await pg.waitForTimeout(900);
  T("\"Editar\" leva até a parte", await pg.evaluate(() => { const t = document.getElementById("blocoOdonto").getBoundingClientRect().top; return t > -5 && t < 260; }));
  // No odontograma, a página não desce sozinha.
  await pg.click('.dente[data-n="26"]'); await pg.waitForTimeout(100); await pg.click('.painel .p-acoes [data-acao="fechar"]'); await pg.waitForTimeout(900);
  T("mexer no odontograma não faz a página descer sozinha", await pg.evaluate(() => { const t = document.getElementById("blocoOdonto").getBoundingClientRect().top; return t > -5 && t < 260; }));
  const cod35 = await pg.evaluate(() => estado.ex.codigoFixo);
  await pg.click("#salvar"); await pg.waitForTimeout(2500);
  const l35 = aba("Exames").find(l => l[1] === cod35), j35 = l35 ? JSON.parse(l35.at(-1)) : null;
  T("o exame chega à planilha", !!j35, cod35);
  T("planilha: vigilância com a dor do odontograma e a fluorose marcada", j35 && j35.vigilancia.includes("Dor de dente") && j35.vigilancia.includes("Fluorose dentária moderada ou severa") && !j35.vigilancia.includes("Não identificado"), j35 && j35.vigilancia);
  T("planilha: prótese com necessidade e uso", l35 && l35[col("Exames", "protese_sup_necessita")] === "sim" && l35[col("Exames", "protese_sup_usa")] === "não", l35 && [l35[col("Exames", "protese_sup_necessita")], l35[col("Exames", "protese_sup_usa")]]);
  T("planilha: CPO-D com o 46 em C e o 36 em P", j35 && j35.resultado.cpod.c === 1 && j35.resultado.cpod.p === 1, j35 && j35.resultado.cpod);
  await foto(pg, "7_salvo_cel");
  await pg.click('#leitura [data-fecha-leitura].prim'); await pg.waitForTimeout(200);
  T("no mesmo dia, o próximo exame sugere o local do anterior, com as partes bloqueadas de novo", await vis("#sugLocal .sug-local") && await bloq(pg, "#blocoInd") && await pg.evaluate(() => (estado.ex._max || 0) === 0));
  await pg.click('#sugLocal [data-sug="sim"]'); await pg.waitForTimeout(100);
  T("Confirmar preenche polo, aldeia e local (e libera o Indivíduo)", await pg.evaluate(() => estado.ex.polo === "Surucucu" && estado.ex.aldeia === "Hakoma" && estado.ex.localAtendimento === "UBSI") && !await bloq(pg, "#blocoInd"));
  // Abrir um exame salvo para corrigir: todas as partes liberadas, respostas mantidas.
  await pg.evaluate(id => abrirExame(id), j35 && j35.id); await pg.waitForTimeout(300);
  T("ao abrir um exame salvo, todas as partes ficam liberadas", await pg.evaluate(() => estado.ex._max === 5 && !!estado.editando) && !await pg.isDisabled('#etapas [data-etapa="5"]') && !await bloq(pg, "#blocoRevisao"));
  T("as respostas voltam: vigilância com Sim, prótese e exodontia do 46", await pg.evaluate(() => estado.ex._vigOutros === "sim" && estado.ex.protese.sup === "sim" && estado.ex.dentes[46].procs.exo_carie === "indicado"));
  T("dente já registrado não aparece como \"conferir pela idade\"", !(await pg.$(".dente.duvida")));
  T("editando, o botão continua \"Salvar e enviar\"", (await pg.textContent("#salvar")).trim() === "Salvar e enviar");
  await pg.click("#salvar"); await pg.waitForTimeout(2500);
  T("a correção é gravada", aba("Exames").filter(l => l[0] === j35.id).length >= 1 && !await pg.evaluate(() => estado.editando));
  // Mudar a data de nascimento depois de marcar dentes: o odontograma volta do início (só ele).
  await novaPessoa(pg, { nasc: "2015-05-05", sexo: "M" });
  await pg.click('#vigOutros [data-v="nao"]'); await pg.click("#proteseNenhuma"); await pg.waitForTimeout(1300);
  await pg.click('.dente[data-n="46"]'); await pg.waitForTimeout(150);
  await pg.click('.faces-desenho [data-face="O"]'); await pg.click('.painel [data-facecond="ca"]'); await pg.check('.painel [data-sinal="dor"]');
  await pg.click('.painel .p-acoes [data-acao="fechar"]'); await pg.waitForTimeout(150);
  const den0 = await pg.evaluate(() => estado.ex.denticao);
  pg.removeAllListeners("dialog"); pg.on("dialog", d => { pergunta = d.message(); d.accept(); });
  await pg.fill('[data-campo="crianca.nascimento"]', "2021-05-05"); await pg.waitForTimeout(1000);
  T("a confirmação avisa que o odontograma volta do início", /odontograma volta do início/.test(pergunta), pergunta);
  T("confirmando, o odontograma volta do início para a idade nova (nada marcado, dentição pela idade)", await pg.evaluate(() => estado.ex.crianca.nascimento === "2021-05-05" && !Object.keys(estado.ex._conf).length && !Object.values(estado.ex.dentes).some(d => temRegistro(d)) && estado.ex.denticao === denticaoPorIdade(idadeDecimal(estado.ex))) && /voltou do início/.test(await toast(pg)), [den0, await pg.evaluate(() => estado.ex.denticao), await toast(pg)]);
  T("a dor que vinha do dente sai da vigilância; o resto do exame continua", await pg.evaluate(() => !estado.ex.vigilancia.includes("Dor de dente") && estado.ex._vigOutros === "nao" && estado.ex.protese.sup === "nao" && estado.ex.polo === "Surucucu" && !!estado.ex.codigoFixo));
  T("a página vai até o odontograma", await pg.evaluate(() => { const t = document.getElementById("blocoOdonto").getBoundingClientRect().top; return t > -5 && t < 260; }));
  await fecharJanela(pg);
  T("sem erros de página", !pg.erros.length, pg.erros);
  await ctx.close();

  /* ------------------------------------------------ local: aldeia digitada só em "Outro polo" / "Outra aldeia" */
  parte("local do atendimento");
  ({ ctx, pg } = await pagina(true));
  await entrar(pg, S.ANA);
  await pg.evaluate(() => {
    const aldeias = {}; for (let i = 0; i < 12; i++) aldeias["A" + i] = ["Aldeia " + "ABCDEFGHIJKL"[i], "10", "", "", "RR"];
    store.set("odonto.territorios.v1", { versao: "t", ano: 2025, email: sessao().email, dseis: { "1": "Yanomami" }, polos: { "10": ["Surucucu", "1"], "11": ["Auaris", "1"] }, aldeias, tis: {}, muns: {} });
    irAba("exame"); renderExame();
  });
  await pg.waitForTimeout(200);
  const visL = sel => pg.evaluate(q => { const el = document.querySelector(q); return !!el && !el.hidden && el.offsetParent !== null; }, sel);
  T("com a lista da SESAI, não há caixa de busca de aldeia", !(await pg.$("#buscaAldeia")) && !(await pg.$("#inBuscaAldeia")));
  T("os campos de digitar polo e aldeia começam escondidos", !await visL("#cPolo") && !await visL("#cAldeia"));
  await pg.selectOption("#selPolo", "10"); await pg.waitForTimeout(100);
  T("escolher um polo da lista não abre campo de digitar", !await visL("#cPolo") && !await visL("#cAldeia"));
  await pg.selectOption("#selAldeia", "A3"); await pg.waitForTimeout(100);
  T("escolher uma aldeia da lista também não", !await visL("#cAldeia") && await pg.evaluate(() => estado.ex.aldeia === "Aldeia D"));
  await pg.selectOption("#selAldeia", "__outra"); await pg.waitForTimeout(100);
  T("\"Outra aldeia\" abre o campo para digitar o nome da aldeia (e só ele)", await visL("#cAldeia") && !await visL("#cPolo"));
  await pg.selectOption("#selPolo", "__outro"); await pg.waitForTimeout(100);
  T("\"Outro polo\" abre os campos para digitar o polo e a aldeia", await visL("#cPolo") && await visL("#cAldeia"));
  await foto(pg, "4_outro_polo_cel", "#blocoLocal");
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

  /* ------------------------------------------------ versão 37: sessão, envio em lote, erros e cópia de segurança */
  parte("envio e sessão");
  ({ ctx, pg } = await pagina(true));
  await entrar(pg, S.ANA);
  const ses = await pg.evaluate(() => JSON.parse(localStorage.getItem("odonto.sessao.v1")));
  T("depois de entrar, o aparelho guarda a sessão e não o código de acesso", ses && /^[0-9a-f]{80}$/.test(ses.sessao) && !("codigo" in ses), ses && Object.keys(ses));
  // Três exames guardados no aparelho (como se feitos sem internet), enviados de uma vez.
  const regs = [0, 1, 2].map(i => Object.assign(exame({ id: "BV" + i, sufixo: "BVZ" + "ABC"[i] + "QXR2" }), { dono: S.idDe("ana@teste.org"), envio: { estado: "pendente", tentativas: 0 } }));
  const pedidos = []; pg.on("request", q => { if (/script\.google\.com/.test(q.url()) && q.method() === "POST") pedidos.push(JSON.parse(q.postData()).acao); });
  await pg.evaluate(l => { localStorage.setItem("odonto.exames.v1", JSON.stringify(l)); }, regs);
  await pg.evaluate(() => sincronizar(true)); await pg.waitForTimeout(1200);
  const est = await pg.evaluate(() => exames().map(e => e.envio.estado));
  T("os exames vão num pedido só (envio em lote) e ficam como enviados", pedidos.filter(x => x === "enviarExames").length === 1 && est.every(x => x === "enviado") && ["BV0", "BV1", "BV2"].every(id => aba("Exames").some(l => l[0] === id)), [pedidos, est]);
  // Servidor ocupado: o exame espera, sem avisar a cada tentativa.
  await pg.evaluate(l => { localStorage.setItem("odonto.exames.v1", JSON.stringify(l)); }, [Object.assign(exame({ id: "BV9", sufixo: "BVZJQXR2" }), { dono: S.idDe("ana@teste.org"), envio: { estado: "pendente", tentativas: 0 } })]);
  G.est.travaOcupada = true;
  await pg.evaluate(() => { estado.avisouFalha = false; sincronizar(); }); await pg.waitForTimeout(800);
  const e9 = await pg.evaluate(() => exames()[0].envio);
  T("servidor ocupado: o exame fica guardado, marcado para tentar de novo em menos de 1 minuto", e9.estado === "erro" && new Date(e9.proxima) - Date.now() < 60000, e9);
  T("o aviso aparece uma vez, dizendo que o app tenta de novo sozinho", /tentar de novo sozinho/.test(await toast(pg)));
  await pg.evaluate(() => { document.getElementById("toast").hidden = true; document.getElementById("toast").textContent = ""; sincronizar(); }); await pg.waitForTimeout(600);
  T("na tentativa seguinte, sem aviso repetido", !(await pg.isVisible("#toast")) || !/tentar de novo/.test(await toast(pg)));
  G.est.travaOcupada = false;
  await pg.evaluate(() => sincronizar(true)); await pg.waitForTimeout(800);
  T("quando finalmente sai, avisa que foi enviado", (await pg.evaluate(() => exames()[0].envio.estado)) === "enviado" && /enviado/.test(await toast(pg)), await toast(pg));
  // Recusado pelo servidor (DSEI de outro cadastro): para de tentar e pede correção.
  await pg.evaluate(l => { localStorage.setItem("odonto.exames.v1", JSON.stringify(l)); }, [Object.assign(exame({ id: "BVX", sufixo: "BVZKQXR2", dsei: "Leste de Roraima" }), { dono: S.idDe("ana@teste.org"), envio: { estado: "pendente", tentativas: 0 } })]);
  await pg.evaluate(() => sincronizar(true)); await pg.waitForTimeout(800);
  const ex = await pg.evaluate(() => exames()[0].envio);
  T("exame recusado fica como \"Precisa de correção\", com o motivo", ex.estado === "corrigir" && /DSEI/.test(ex.erro), ex);
  pedidos.length = 0; await pg.evaluate(() => sincronizar()); await pg.waitForTimeout(400);
  T("e o app para de tentar enviar esse exame sozinho", !pedidos.includes("enviarExames"), pedidos);
  await irAba(pg, "lista"); await pg.waitForTimeout(300);
  T("Meus exames mostra \"Precisa de correção\" e o porquê", /Precisa de correção/.test(await pg.textContent("#lista")) && /Por que:/.test(await pg.textContent("#lista")));
  // Exame parado há mais de 3 dias: aviso e cópia de segurança.
  await pg.evaluate(() => { const l = exames(); l[0].atualizadoEm = new Date(Date.now() - 4 * 864e5).toISOString(); localStorage.setItem("odonto.exames.v1", JSON.stringify(l)); renderLista(); });
  T("aviso de exame guardado há mais de 3 dias", /há mais de 3 dias/.test(await pg.textContent("#avisoParados")) && await pg.isVisible("#avisoParados"));
  await pg.click("details.mais summary");
  const [dl] = await Promise.all([pg.waitForEvent("download"), pg.click("#copiaBaixar")]);
  const copia = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  T("cópia de segurança: arquivo com os exames não enviados (com o dono de cada um)", copia.app === "odontograma" && copia.exames.length === 1 && copia.exames[0].id === "BVX" && copia.exames[0].dono === S.idDe("ana@teste.org") && copia.exames[0].dentes, copia.exames && copia.exames.length);
  const caminhoCopia = path.join(require("os").tmpdir(), "odontograma_copia_teste.json"); await dl.saveAs(caminhoCopia);
  T("arquivo CSV: texto que começa com = vira texto (não fórmula)", await pg.evaluate(() => csv([["=HIPERLINK(1)", "-2", 5, -3]])).then(t => t.includes("'=HIPERLINK(1)") && t.includes("'-2") && t.includes(";-3")));
  const [dx] = await Promise.all([pg.waitForEvent("download", { timeout: 20000 }), pg.click("#xlsMeus")]);
  T("Baixar meus exames gera um arquivo do Excel", /\.xlsx$/.test(dx.suggestedFilename()) && fs.statSync(await dx.path()).size > 5000, dx.suggestedFilename());
  const ExcelJS = require(path.join(raiz, "exceljs.min.js")), wbx = new ExcelJS.Workbook();
  await wbx.xlsx.load(fs.readFileSync(await dx.path()));
  const wsx = wbx.getWorksheet("Dados"), cabx = wsx.getRow(2).values.slice(1), lin = wsx.getRow(3).values.slice(1);
  T("Excel: uma linha por exame, com as três partes e cada dente", cabx.includes("d16_situacao") && cabx.includes("n_art_indicado") && cabx[0] === "codigo_individuo" && wsx.rowCount >= 4 && lin.length > 100, [cabx.slice(0, 3), wsx.rowCount]);
  T("sem erros na página", !pg.erros.length, pg.erros);
  await ctx.close();
  // Importar a cópia num aparelho novo.
  ({ ctx, pg } = await pagina(true));
  await entrar(pg, S.ANA);
  await irAba(pg, "lista"); await pg.click("details.mais summary");
  await pg.setInputFiles("#copiaImportar", caminhoCopia); await pg.waitForTimeout(1200);
  T("importar a cópia num aparelho novo devolve os exames", (await pg.evaluate(() => exames().map(e => e.id))).includes("BVX"));
  // Abrir da nuvem: a lista traz só o resumo; ao abrir, o exame completo vem do servidor.
  await pg.evaluate(() => carregarNuvem(true)); await pg.waitForTimeout(800);
  const res = await pg.evaluate(() => (estado.nuvem || []).find(e => e.id === "BV1"));
  T("a lista da nuvem traz só o resumo do exame", res && !res.dentes && res.est);
  await pg.evaluate(() => abrirDaNuvem("BV1")); await pg.waitForTimeout(800);
  T("ao abrir um exame da nuvem, ele vem completo", await pg.evaluate(() => estado.ex.id === "BV1" && Object.keys(estado.ex.dentes).length === 52), await pg.evaluate(() => estado.ex.id));
  T("sem erros na página (importar e abrir da nuvem)", !pg.erros.length, pg.erros);
  await ctx.close();
  // Sessão vencida: o app pede o código de novo e mantém os exames.
  ({ ctx, pg } = await pagina(true));
  await entrar(pg, S.BRUNO);
  const sesB = await pg.evaluate(() => JSON.parse(localStorage.getItem("odonto.sessao.v1")).sessao);
  // As sessões ficam nas Propriedades do script ("sessao_..."): a do Bruno passa a ter o último uso há 20 dias.
  const chavesB = Object.keys(G.est.props).filter(k => k.startsWith("sessao_") && JSON.parse(G.est.props[k]).u === S.idDe("bruno@teste.org"));
  const iB = chavesB.length - 1;
  chavesB.forEach(k => { const x = JSON.parse(G.est.props[k]); x.uso = new Date(Date.now() - 20 * 864e5).toISOString(); G.est.props[k] = JSON.stringify(x); });
  await pg.evaluate(l => { localStorage.setItem("odonto.exames.v1", JSON.stringify(l)); }, [Object.assign(exame({ id: "BVB", sufixo: "BVZMQXR2" }), { dono: S.idDe("bruno@teste.org"), envio: { estado: "pendente", tentativas: 0 } })]);
  await pg.evaluate(() => sincronizar(true)); await pg.waitForTimeout(1000);
  T("sessão vencida: o app volta para a tela de entrada com a explicação", !!sesB && iB >= 0 && /15 dias/.test(await pg.textContent("body")) && await pg.evaluate(() => !sessao()), await pg.evaluate(() => estAc.msg));
  T("e o exame guardado continua no aparelho", (await pg.evaluate(() => exames().map(e => e.id))).includes("BVB"));
  await ctx.close();
  // Administração (titular): espaço, erros explicados e dados para análise.
  ({ ctx, pg } = await pagina(false));
  await entrar(pg, S.C);
  await irAba(pg, "admin"); await pg.waitForTimeout(1200);
  T("Administração tem \"Baixar dados para análise\"", await pg.isVisible("#admAnBaixar"));
  T("Administração mostra a situação do servidor", /Situação do servidor/.test(await pg.textContent("#admConteudo")) && /✓ ok/.test(await pg.textContent("#admConteudo")));
  const [da] = await Promise.all([pg.waitForEvent("download", { timeout: 30000 }), pg.click("#admAnBaixar")]);
  T("dados para análise: arquivo do Excel com todos os exames", /analise.*\.xlsx$/.test(da.suggestedFilename()), da.suggestedFilename());
  // Planilha de análise para o Looker Studio (só a titular).
  T("Administração mostra a planilha de análise, ainda por criar", /Planilha de análise \(Looker Studio\)/.test(await pg.textContent("#admConteudo")) && (await pg.textContent("#admPlanAnalise")).trim() === "Criar agora");
  await pg.click("#admPlanAnalise"); await pg.waitForTimeout(2500);
  const blocoPA = await pg.textContent("#admConteudo");
  T("Criar agora: a planilha é criada e o quadro mostra quando, quantos exames e o link", /Atualizada em \d{2}\/\d{2}\/\d{4}/.test(blocoPA) && !!(await pg.$('a.sec[href*="docs.google.com"]')) && (await pg.textContent("#admPlanAnalise")).trim() === "Atualizar agora", blocoPA.slice(blocoPA.indexOf("Planilha de análise"), blocoPA.indexOf("Planilha de análise") + 300));
  await foto(pg, "9_planilha_analise_pc", "#admConteudo");
  T("sem erros na Administração", !pg.erros.length, pg.erros);
  await ctx.close();

  await b.close(); srv.close();
  console.log(falhas ? `\n${falhas} de ${total} verificações FALHARAM.` : `\nTudo certo: ${total} verificações no navegador passaram.`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.log("ERRO " + e.stack); process.exit(1); });
