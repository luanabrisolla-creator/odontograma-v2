// Monta um cenário de teste do zero: coordenação titular, RTs e dentistas criados pelos fluxos do próprio app
// (pedido de acesso, aprovação, e-mail com código). Nenhum dado real, nenhuma senha real.
const criarGAS = require("./gas-simulado.js");
const SENHA_TITULAR = "senha-de-teste-da-coordenacao";
const LINK = "https://exemplo.invalido/odontograma/";

function cenario(opcoes) {
  const G = criarGAS(Object.assign({ props: { EMAIL_COORDENACAO: "coord@teste.org", CHAVE_COORDENACAO: SENHA_TITULAR, NOME_COORDENACAO: "Coordenação Teste" } }, opcoes || {}));
  const C = { email: "coord@teste.org", codigo: SENHA_TITULAR };
  const P = (cred, o) => G.post(Object.assign({ link: LINK }, o, cred || {}));
  const codigoDoEmail = email => { const m = G.est.mails.filter(x => x.to === email && /Código: /.test(x.body)).pop(); return m && (m.body.match(/Código: (\S+)/) || [])[1]; };
  const idDe = email => (G.est.sheets.Usuarios || []).slice(1).find(l => l[3] === email)[0];
  function profissional(nome, email, perfil, uf, dsei, aprovador) {
    const r = P(null, { acao: "pedirAcesso", nome, cro: uf + " " + (1000 + G.est.mails.length), email, uf, dsei, perfil });
    if (!r.ok) throw new Error("pedirAcesso " + email + ": " + r.erro);
    const a = P(aprovador, { acao: "aprovar", id: idDe(email) });
    if (!a.ok) throw new Error("aprovar " + email + ": " + a.erro);
    return { email, codigo: codigoDoEmail(email) };
  }
  P(C, { acao: "entrar", aparelho: "Teste" });
  const RT = profissional("Rita RT", "rt@teste.org", "rt", "RR", "Yanomami", C);
  const ANA = profissional("Ana Dentista", "ana@teste.org", "dentista", "RR", "Yanomami", RT);
  const BRUNO = profissional("Bruno Dentista", "bruno@teste.org", "dentista", "RR", "Yanomami", RT);
  const CARLA = profissional("Carla Dentista", "carla@teste.org", "dentista", "RR", "Leste de Roraima", C);
  const BETO = profissional("Beto RT", "beto@teste.org", "rt", "MT", "Xavante", C);
  const ad = P(C, { acao: "adicionarCoord", nome: "Paula Coord", emailNovo: "paula@teste.org", uf: "RR", dsei: "Leste de Roraima", cro: "RR 7070" });
  if (!ad.ok) throw new Error("adicionarCoord: " + ad.erro);
  const PAULA = { email: "paula@teste.org", codigo: codigoDoEmail("paula@teste.org") || ad.codigo };
  return { G, P, C, RT, ANA, BRUNO, CARLA, BETO, PAULA, LINK, SENHA_TITULAR, codigoDoEmail, idDe };
}

// Exame completo e válido, no mesmo formato que o app monta (montarRegistro).
const PERM = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const DEC = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const faces = () => ({ O: "", M: "", D: "", V: "", L: "" });
let seq = 0;
function exame(o) {
  o = o || {};
  const den = o.denticao || "mista", lista = den === "permanente" ? PERM : den === "decidua" ? DEC : PERM.concat(DEC);
  const dentes = {};
  lista.forEach(n => { dentes[n] = { status: den === "mista" && n < 50 && n % 10 >= 7 ? "nao_erupc" : "presente", faces: faces(), dor: false, abscesso: false, procs: {}, obs: "" }; });
  Object.entries(o.mud || {}).forEach(([n, v]) => { dentes[n] = Object.assign({ status: "presente", faces: faces(), dor: false, abscesso: false, procs: {}, obs: "" }, dentes[n], v, { faces: Object.assign(faces(), (dentes[n] || {}).faces, v.faces || {}) }); });
  const id = o.id || "EX-" + (++seq) + "-" + Math.random().toString(36).slice(2, 7);
  const ALFA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const suf = o.sufixo || Array.from({ length: 8 }, () => ALFA[Math.floor(Math.random() * ALFA.length)]).join("");
  const data = o.data || "2026-10-01";
  return Object.assign({
    id, versao: 1, criadoEm: data + "T12:00:00.000Z", atualizadoEm: data + "T12:00:00.000Z", dataExame: data,
    profissional: { nome: "x", cro: "x" }, municipio: "", uf: o.uf || "RR", dsei: o.dsei || "Yanomami",
    polo: o.polo || "Surucucu", aldeia: o.aldeia || "Saúba", codPolo: "", codAldeia: "", seq: null, croCod: "", sufixo: suf,
    codigo: o.codigo || `${o.uf || "RR"}-SUR-SAU-${suf}`,
    crianca: { nascimento: o.nasc || "2018-05-12", sexo: o.sexo || "F" }, idadeAnos: o.idade != null ? o.idade : 8.4, denticao: den,
    localAtendimento: o.local || "UBSI", vigilancia: o.vig || ["Não identificado"], protese: o.protese || { sup: "nao", inf: "nao", usoSup: "nao", usoInf: "nao", naoAvaliado: false },
    placa: !!o.placa, gengivite: !!o.gengivite, fluorose: false, gerais: o.gerais || [], insumos: o.insumos || [], observacoes: "",
    dentes, resultado: { classe: "A", risco: "Baixo risco", descricao: "", motivos: [], ceod: { c: 0, e: 0, o: 0, total: 0 }, cpod: { c: 0, p: 0, o: 0, total: 0 } },
    codigoIndividuo: o.codigo || `${o.uf || "RR"}-SUR-SAU-${suf}`, numeroExame: 1, vinculo: o.vinculo || null
  }, o.extra || {});
}
module.exports = { cenario, exame, PERM, DEC };
