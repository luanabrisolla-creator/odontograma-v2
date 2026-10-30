/* ===== COMPARTILHADO INICIO =====
   Código igual no app (index.html) e no servidor (Codigo.gs). É copiado pelo montar.py:
   não edite só de um lado. */
// Faixas etárias da SESAI (Ficha 4)
var FAIXAS_ETARIAS = ["0 a 5 anos", "6 a 11 anos", "12 a 18 anos", "Adulto (19 a 59 anos)", "Pessoa idosa (60 anos ou mais)", "Idade não informada"];
/** @param {any} i */
function faixaEtaria(i) {
  if (i === "" || i == null || isNaN(Number(i))) return FAIXAS_ETARIAS[5];
  i = Math.floor(Number(i));
  return i <= 5 ? FAIXAS_ETARIAS[0] : i <= 11 ? FAIXAS_ETARIAS[1] : i <= 18 ? FAIXAS_ETARIAS[2] : i <= 59 ? FAIXAS_ETARIAS[3] : FAIXAS_ETARIAS[4];
}
/** @param {any} e */
function sexoDe(e) { return e.crianca && (e.crianca.sexo === "F" || e.crianca.sexo === "M") ? e.crianca.sexo : "NI"; }
// UFs e DSEIs (o servidor também usa estas listas para validar o que chega do app).
var UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
var DSEI_UF = {"AC": ["Alto Rio Juruá", "Alto Rio Purus"], "AL": ["Alagoas e Sergipe"], "AM": ["Alto Rio Negro", "Alto Rio Purus", "Alto Rio Solimões", "Manaus", "Médio Rio Purus", "Médio Rio Solimões e Afluentes", "Parintins", "Porto Velho", "Vale do Javari", "Yanomami"], "AP": ["Amapá e Norte do Pará"], "BA": ["Bahia"], "CE": ["Ceará"], "ES": ["Minas Gerais e Espírito Santo"], "GO": ["Araguaia"], "MA": ["Guamá-Tocantins", "Maranhão"], "MG": ["Minas Gerais e Espírito Santo"], "MS": ["Mato Grosso do Sul"], "MT": ["Araguaia", "Cuiabá", "Kaiapó do Mato Grosso", "Porto Velho", "Vilhena", "Xavante", "Xingu"], "PA": ["Altamira", "Amapá e Norte do Pará", "Guamá-Tocantins", "Kaiapó do Mato Grosso", "Kaiapó do Pará", "Parintins", "Rio Tapajós", "Tocantins"], "PB": ["Potiguara"], "PE": ["Pernambuco"], "PR": ["Interior Sul", "Litoral Sul"], "RJ": ["Litoral Sul"], "RN": ["Potiguara"], "RO": ["Alto Rio Purus", "Porto Velho", "Vilhena"], "RR": ["Leste de Roraima", "Yanomami"], "RS": ["Interior Sul"], "SC": ["Interior Sul", "Litoral Sul"], "SE": ["Alagoas e Sergipe"], "SP": ["Litoral Sul"], "TO": ["Araguaia", "Tocantins"]};
var DSEIS = ["Alagoas e Sergipe", "Altamira", "Alto Rio Juruá", "Alto Rio Negro", "Alto Rio Purus", "Alto Rio Solimões", "Amapá e Norte do Pará", "Araguaia", "Bahia", "Ceará", "Cuiabá", "Guamá-Tocantins", "Interior Sul", "Kaiapó do Mato Grosso", "Kaiapó do Pará", "Leste de Roraima", "Litoral Sul", "Manaus", "Maranhão", "Mato Grosso do Sul", "Minas Gerais e Espírito Santo", "Médio Rio Purus", "Médio Rio Solimões e Afluentes", "Parintins", "Pernambuco", "Porto Velho", "Potiguara", "Rio Tapajós", "Tocantins", "Vale do Javari", "Vilhena", "Xavante", "Xingu", "Yanomami"];
// Listas usadas no exame (termos genéricos dos prontuários eletrônicos da atenção primária).
var LOCAIS_ATENDIMENTO = ["UBSI", "CASAI", "Domicílio", "Escola ou creche", "Unidade móvel", "Outro"];
var INSUMOS = ["Escova dental","Creme dental","Fio dental"];
var GERAIS = ["Escovação supervisionada","Aplicação tópica de flúor","Orientação de higiene e dieta","Profilaxia / remoção de placa","Raspagem supragengival","Encaminhamento para especialidade"];
var VIGILANCIA = ["Abscesso dentoalveolar", "Alteração em tecidos moles", "Dor de dente", "Fendas ou fissuras lábio palatais", "Fluorose dentária moderada ou severa", "Traumatismo dentoalveolar", "Não identificado"];
var VIG_FLUOROSE = "Fluorose dentária moderada ou severa", VIG_NENHUM = "Não identificado";
/** @type {any} */
var NOMES_PROTESE = {"": "Não avaliado", nao: "Não", sim: "Sim"};
// Situação do dente. Só o dente presente tem faces, sinais e tratamento.
// Esfoliado só existe para decíduo; no permanente, ausente é sempre "por outro motivo".
var STATUS_DENTE = ["presente", "nao_erupc", "esfoliado", "ausente", "ausente_carie"];
/** Exodontia devido à cárie indicada ou realizada neste exame. @param {any} d */
function exoCarie(d) { var p = (d && d.procs) || {}; return p.exo_carie === "indicado" || p.exo_carie === "realizado"; }
// Itens da vigilância que vêm do odontograma (não são perguntados de novo).
/** @param {any} ex */
function vigilanciaDosDentes(ex) {
  var ds = ex.dentes || {}, l = [], nums = dentesDaDenticao(ex.denticao);
  if (nums.some(function (n) { return ds[n] && ds[n].status === "presente" && ds[n].dor; })) l.push("Dor de dente");
  if (nums.some(function (n) { return ds[n] && ds[n].status === "presente" && ds[n].abscesso; })) l.push("Abscesso dentoalveolar");
  return l;
}
// Vigilância final do exame: os itens do odontograma + os marcados pelo profissional. Sem nenhum: "Não identificado".
/** @param {any} ex */
function completarVigilancia(ex) {
  var der = vigilanciaDosDentes(ex), outros = (Array.isArray(ex.vigilancia) ? ex.vigilancia : []).filter(function (v) {
    return v !== VIG_NENHUM && v !== "Dor de dente" && v !== "Abscesso dentoalveolar"; });
  var l = der.concat(outros);
  return l.length ? l : [VIG_NENHUM];
}
// Sigla do dente, como nos odontogramas dos prontuários eletrônicos.
/** @param {any} d */
function siglaDente(d) {
  if (!d) return "";
  /** @type {any} */ var S = {nao_erupc: "NE", esfoliado: "Es", ausente: "A", ausente_carie: "E"};
  if (S[d.status]) return S[d.status];
  var fs = d.faces || {}, vs = Object.keys(fs).map(function (k) { return fs[k]; });
  /** @param {any} v */
  function tem(v) { return vs.indexOf(v) >= 0; }
  if (tem("restc")) return "Rc";
  if (tem("ca") || tem("cc")) return "C";
  if (tem("rest")) return "R";
  if (tem("mba")) return "M";
  if (tem("mbi")) return "Mi";
  if (tem("sel")) return "Hs";
  return "H";
}
// Exame cancelado continua guardado, mas não entra em painel, índices nem acompanhamento.
/** @param {any} e */
function exameValido(e) { return !!e && e.situacao !== "cancelado"; }
// Filtro cruzado: faixa, sexo, classe, proc (procedimento por dente) e coletivo. "exceto" ignora algumas dimensões.
/** @param {any} e @param {any} f @param {any} [exceto] */
function exameCombina(e, f, exceto) {
  exceto = exceto || [];
  /** @param {any} k */
  function usa(k) { return f && f[k] && exceto.indexOf(k) < 0; }
  var res = e.resultado || {};
  if (usa("faixa") && faixaEtaria(e.idadeAnos) !== f.faixa) return false;
  if (usa("sexo") && sexoDe(e) !== f.sexo) return false;
  if (usa("classe") && res.classe !== f.classe) return false;
  if (usa("coletivo") && (e.gerais || []).indexOf(f.coletivo) < 0) return false;
  if (usa("vig") && (e.vigilancia || []).indexOf(f.vig) < 0) return false;
  if (usa("proc")) {
    var tem = Object.keys(e.dentes || {}).some(function (n) { var p = (e.dentes[n] || {}).procs || {}; return p[f.proc] === "indicado" || p[f.proc] === "realizado"; });
    if (!tem) return false;
  }
  return true;
}
// Cada bloco do painel ignora o próprio filtro, para continuar mostrando as outras opções.
/** @param {any} regs @param {any} f @param {any} agrup */
function montarPainel(regs, f, agrup) {
  var validos = regs.filter(exameValido), ult = idsUltimoPorPessoa(validos);
  /** @param {any} exceto */
  function ag(exceto) { return agregarExames(validos.filter(function (e) { return exameCombina(e, f, exceto); }), agrup, ult); }
  return {resumo: ag([]), risco: ag(["classe"]), tabela: ag(["faixa", "sexo", "classe"]), faixa: ag(["faixa"]), proc: ag(["proc"]), coletivo: ag(["coletivo"]), vig: ag(["vig"])};
}
// Nível de risco pela classe, igual para todos: A–B baixo, C–D moderado, E–F alto.
/** @param {any} c */
function nivelDaClasse(c) { var i = "ABCDEF".indexOf(String(c || "")); return i < 0 || !c ? "" : i < 2 ? "Baixo risco" : i < 4 ? "Risco moderado" : "Alto risco"; }
// Faixas etárias da população indígena da SESAI (de 5 em 5 anos), usadas na cobertura.
var FAIXAS_POP = ["0 a 4", "5 a 9", "10 a 14", "15 a 19", "20 a 24", "25 a 29", "30 a 34", "35 a 39", "40 a 44", "45 a 49", "50 a 54", "55 a 59", "60 a 64", "65 a 69", "70 a 74", "75 ou mais"];
/** @param {any} i */
function faixaPop(i) { if (i === "" || i == null || isNaN(Number(i))) return -1; return Math.min(15, Math.floor(Math.floor(Number(i)) / 5)); }
/** @param {any} t */
function normNome(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
// Nomes da planilha da SESAI vêm em maiúsculas: "ALTO CATRIMANI" vira "Alto Catrimani".
/** @param {any} s */
function nomeTitulo(s) {
  var peq = ["de", "da", "do", "das", "dos", "e", "d"], rom = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)$/;
  return String(s || "").trim().replace(/\s+/g, " ").toLowerCase().split(" ").map(function (w, i) {
    if (rom.test(w)) return w.toUpperCase();
    if (i > 0 && peq.indexOf(w) >= 0) return w;
    return w.replace(/(^|[-\/(])([a-zà-ÿ])/g, function (_, a, b) { return a + b.toUpperCase(); });
  }).join(" ");
}
// Monta a base de territórios e população a partir das linhas da planilha baixada do painel da SESAI
// (uma linha por aldeia, sexo e faixa etária). `linhas` = cabeçalho + dados, como no Excel.
/** @param {any[][]} linhas @param {string[]} dseisConhecidos */
function montarPopulacao(linhas, dseisConhecidos) {
  if (!linhas || linhas.length < 2) throw new Error("A planilha está vazia.");
  var cab = linhas[0].map(normNome), col = {};
  var PEDE = {cdsei: ["codigo dsei"], dsei: ["dsei"], cpolo: ["codigo polo base"], polo: ["polo base"], cti: ["codigo terra indigena"], ti: ["terra indigena"],
    cmun: ["codigo municipio ibge", "codigo municipio"], mun: ["municipio"], uf: ["uf"], cald: ["codigo aldeia"], ald: ["aldeia"], sexo: ["sexo"], faixa: ["faixa etaria"], ano: ["ano"], pop: ["populacao indigena", "populacao"]};
  var falta = [];
  Object.keys(PEDE).forEach(function (k) { var i = -1; PEDE[k].some(function (n) { i = cab.indexOf(n); return i >= 0; }); if (i < 0) falta.push(PEDE[k][0]); col[k] = i; });
  if (falta.length) throw new Error("Colunas que faltam na planilha: " + falta.join(", ") + ". Use a planilha baixada do painel da população indígena da SESAI.");
  var mapaDsei = {};
  (dseisConhecidos || []).forEach(function (d) { mapaDsei[normNome(d)] = d; });
  var out = {ano: 0, dseis: {}, polos: {}, tis: {}, muns: {}, aldeias: {}, pop: {}, linhas: 0, pessoas: 0};
  var anos = {};
  for (var i = 1; i < linhas.length; i++) {
    var l = linhas[i]; if (!l || l[col.cald] === "" || l[col.cald] == null) continue;
    var ca = String(l[col.cald]).trim(), cp = String(l[col.cpolo]).trim(), cd = String(l[col.cdsei]).trim(), ct = String(l[col.cti] == null ? "" : l[col.cti]).trim(), cm = String(l[col.cmun] == null ? "" : l[col.cmun]).trim();
    var nd = String(l[col.dsei] || "");
    out.dseis[cd] = mapaDsei[normNome(nd)] || nomeTitulo(nd);
    if (!out.polos[cp]) out.polos[cp] = [nomeTitulo(l[col.polo]), cd];
    if (ct && !out.tis[ct]) out.tis[ct] = nomeTitulo(l[col.ti]);
    if (cm && !out.muns[cm]) out.muns[cm] = nomeTitulo(l[col.mun]);
    if (!out.aldeias[ca]) out.aldeias[ca] = [nomeTitulo(l[col.ald]), cp, ct, cm, String(l[col.uf] || "").trim().toUpperCase()];
    var f = faixaPop(String(l[col.faixa] || "").replace(/[^0-9].*$/, "")), s = String(l[col.sexo] || "").trim().toUpperCase().charAt(0), n = Number(l[col.pop]) || 0;
    if (f < 0 || (s !== "F" && s !== "M")) continue;
    var v = out.pop[ca] || (out.pop[ca] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    v[f * 2 + (s === "F" ? 0 : 1)] += n; out.pessoas += n; out.linhas++;
    anos[String(l[col.ano] || "")] = 1;
  }
  var la = Object.keys(anos).filter(function (a) { return /^\d{4}$/.test(a); }).sort();
  out.ano = la.length ? Number(la[la.length - 1]) : 0;
  if (!out.linhas) throw new Error("Nenhuma linha de população foi lida.");
  return out;
}
/** @param {any} regs @param {any} agrup */
/* Situação das pessoas x produção:
 * - Indicadores clínicos (risco, ceo-d, CPO-D, placa, gengivite, sexo, faixa etária, vigilância, prótese) contam
 *   UMA observação por pessoa: o exame mais recente dela no recorte (como no ceo-d/CPO-D comunitário:
 *   soma dos índices dividida pelo número de indivíduos). r.n = pessoas.
 * - Produção (exames, exames por mês, procedimentos, coletivos, insumos, local de atendimento) conta todos os
 *   exames. r.nExames = exames.
 * ult: ids dos exames que são o último de cada pessoa (calculado antes dos filtros); sem ele, calcula aqui. */
/** @param {any[]} regs */
function idsUltimoPorPessoa(regs) {
  /** @type {any} */ var por = {}, ids = {};
  regs.forEach(function (e) {
    var k = codigoIndividuoDe(e) || e.id, a = por[k], de = String(e.dataExame || ""), da = a ? String(a.dataExame || "") : "";
    if (!a || de > da || (de === da && String(e.atualizadoEm || "") > String(a.atualizadoEm || ""))) por[k] = e;
  });
  Object.keys(por).forEach(function (k) { ids[por[k].id] = true; });
  return ids;
}
/** @param {any} regs @param {any} agrup @param {any} [ult] */
function agregarExames(regs, agrup, ult) {
  ult = ult || idsUltimoPorPessoa(regs);
  var CL = ["A", "B", "C", "D", "E", "F"], FX = FAIXAS_ETARIAS;
  /** @param {any} c */
  function nivel(c) {
    var i = CL.indexOf(c);
    return i < 2 ? "Baixo" : i < 4 ? "Moderado" : "Alto";
  }
  /** @param {any} ks */
  function zeros(ks) { /** @type {any} */ var o = {}; ks.forEach(function (/** @type {any} */ k) { o[k] = 0; }); return o; }
  function idxVazio() { return {n: 0, soma: 0, c: 0, e: 0, p: 0, o: 0}; }
  /** @param {any} alvo @param {any} ind @param {any} perdido */
  function somar(alvo, ind, perdido) { alvo.n++; alvo.soma += Number(ind.total) || 0; alvo.c += Number(ind.c) || 0; alvo[perdido] += Number(ind[perdido]) || 0; alvo.o += Number(ind.o) || 0; }
  /** @type {any} */
  var r = {n: 0, nExames: 0, sexo: zeros(["F", "M", "NI"]), classe: zeros(CL), nivel: zeros(["Baixo", "Moderado", "Alto"]), faixas: {}, meses: {},
    ceod: idxVazio(), cpod: idxVazio(), cpod12: {soma: 0, n: 0}, procs: {}, gerais: {}, insumos: {}, placa: 0, gengivite: 0, fluorose: 0, procsRealizados: 0,
    vigilancia: {}, local: {}, protese: {avaliados: 0, sup: 0, inf: 0, alguma: 0}};
  FX.forEach(function (f) { r.faixas[f] = {n: 0, sexo: zeros(["F", "M", "NI"]), classe: zeros(CL), ceod: idxVazio(), cpod: idxVazio()}; });
  regs.forEach(function (/** @type {any} */ e) {
    var res = e.resultado || {};
    var c = CL.indexOf(res.classe) >= 0 ? res.classe : null;
    if (!c) return;
    // produção: todos os exames
    r.nExames++;
    var mes = String(e.dataExame || "").slice(0, 7);
    if (mes) r.meses[mes] = (r.meses[mes] || 0) + 1;
    (e.gerais || []).forEach(function (/** @type {any} */ g) { r.gerais[g] = (r.gerais[g] || 0) + 1; });
    (e.insumos || []).forEach(function (/** @type {any} */ g) { r.insumos[g] = (r.insumos[g] || 0) + 1; });
    if (e.localAtendimento) r.local[e.localAtendimento] = (r.local[e.localAtendimento] || 0) + 1;
    Object.keys(e.dentes || {}).forEach(function (n) {
      var p = (e.dentes[n] || {}).procs || {};
      Object.keys(p).forEach(function (k) {
        if (p[k] !== "indicado" && p[k] !== "realizado") return;
        if (!r.procs[k]) r.procs[k] = {indicado: 0, realizado: 0};
        r.procs[k][p[k]]++;
        if (p[k] === "realizado") r.procsRealizados++;
      });
    });
    // situação das pessoas: só o último exame de cada pessoa
    if (!ult[e.id]) return;
    r.n++;
    var sx = sexoDe(e);
    r.sexo[sx]++; r.classe[c]++; r.nivel[nivel(c)]++;
    var f = r.faixas[faixaEtaria(e.idadeAnos)]; f.n++; f.sexo[sx]++; f.classe[c]++;
    var idade = e.idadeAnos === "" || e.idadeAnos == null || isNaN(Number(e.idadeAnos)) ? null : Math.floor(Number(e.idadeAnos));
    if (e.denticao !== "permanente" && res.ceod) { somar(r.ceod, res.ceod, "e"); somar(f.ceod, res.ceod, "e"); }
    if (e.denticao !== "decidua" && res.cpod) {
      somar(r.cpod, res.cpod, "p"); somar(f.cpod, res.cpod, "p");
      if (idade === 12) { r.cpod12.soma += Number(res.cpod.total) || 0; r.cpod12.n++; }
    }
    if (e.placa) r.placa++;
    if (e.gengivite) r.gengivite++;
    if (e.fluorose) r.fluorose++;
    (e.vigilancia || []).forEach(function (/** @type {any} */ g) { r.vigilancia[g] = (r.vigilancia[g] || 0) + 1; });
    var pr = e.protese || {};
    if (pr.sup || pr.inf) {
      r.protese.avaliados++;
      if (pr.sup === "sim") r.protese.sup++;
      if (pr.inf === "sim") r.protese.inf++;
      if (pr.sup === "sim" || pr.inf === "sim") r.protese.alguma++;
    }
  });
  /** @param {any} o */
  function media(o) { return o.n ? Math.round(o.soma / o.n * 100) / 100 : null; }
  r.ceodMedia = media(r.ceod); r.cpodMedia = media(r.cpod); r.cpod12Media = media(r.cpod12);
  var m = r.cpod12Media == null ? null : Math.round(r.cpod12Media * 10) / 10;
  r.cpod12Severidade = m == null ? null : m <= 1.1 ? "Muito baixa" : m <= 2.6 ? "Baixa" : m <= 4.4 ? "Moderada" : m <= 6.5 ? "Alta" : "Muito alta";
  return r;
}

/* ---------- linhas da planilha (abas Exames e Dentes) ---------- */
var NOMES_STATUS = {presente: "Presente", nao_erupc: "Não erupcionado", esfoliado: "Esfoliado", ausente: "Ausente por outro motivo", ausente_carie: "Extraído por cárie"};
var NOMES_FACE = {"": "Hígida", ca: "Cárie ativa", cc: "Cárie crônica", mba: "Mancha branca ativa", mbi: "Mancha branca inativa",
  rest: "Restaurada sem cárie", restc: "Restaurada com cárie", sel: "Selante"};
var NOMES_PROC = {exo_carie: "Exodontia devido à cárie", exodontia: "Exodontia por outros motivos", selante: "Selante", art: "ART (restauração atraumática)", civ: "Restauração em ionômero de vidro", resina: "Restauração em resina",
  amalgama: "Restauração em amálgama", verniz: "Verniz fluoretado", cdf: "Cariostático (diamino fluoreto de prata)", selprov: "Selamento provisório / adequação do meio",
  pulpotomia: "Pulpotomia", pulpectomia: "Pulpectomia", coroa: "Coroa de aço"};
var CAB_EXAME = ["id_exame", "codigo_individuo", "numero_exame", "codigo_exame", "situacao_registro", "data_exame", "faixa_etaria", "idade_anos", "sexo", "nascimento",
  "uf", "dsei", "polo_base", "aldeia_comunidade", "municipio", "codigo_municipio_ibge", "terra_indigena", "codigo_terra_indigena", "codigo_polo_base", "codigo_aldeia", "aldeia_fora_da_lista", "codigo_confere_local", "local_atendimento", "profissional", "cro", "denticao", "classe_risco", "nivel_risco",
  "ceod_c", "ceod_e", "ceod_o", "ceod", "cpod_c", "cpod_p", "cpod_o", "cpod", "dentes_cariados", "placa_visivel", "gengivite", "fluorose_moderada_severa",
  "vigilancia_saude_bucal", "protese_superior", "protese_inferior", "usa_protese_superior", "usa_protese_inferior", "dentes_com_dor_abscesso", "procedimentos_gerais", "insumos_fornecidos", "observacoes", "conferencia_vinculo", "alertas_vinculo", "exame_anterior_id",
  "motivo_cancelamento", "observacao_cancelamento", "cancelado_em", "cancelado_por", "criado_em", "atualizado_em", "usuario_id", "dados_completos_json"];
var CAB_DENTE = ["id_exame", "codigo_individuo", "numero_exame", "situacao_registro", "data_exame", "dsei", "dente", "tipo", "situacao", "sigla",
  "face_oclusal_incisal", "face_vestibular", "face_lingual_palatina", "face_mesial", "face_distal", "dor", "abscesso_fistula", "procedimentos_indicados", "procedimentos_realizados", "observacao"];
/** @param {any} n */
function decidDe(n) { return Math.floor(Number(n) / 10) >= 5; }
/** @param {any} iso */
function dataBR(iso) { return iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : ""; }
/** @param {any} e */
function codigoIndividuoDe(e) { return e.codigoIndividuo || e.codigo || ""; }
/** @param {any} e */
function cariadosDe(e) { var r = e.resultado || {}; return (Number((r.ceod || {}).c) || 0) + (Number((r.cpod || {}).c) || 0); }
/** @param {any} e */
function dentesComDor(e) { return Object.keys(e.dentes || {}).filter(function (n) { var d = e.dentes[n] || {}; return d.dor || d.abscesso; }); }
/** @param {any} e */
function registroParaJson(e) {
  /** @type {any} */ var j = {};
  Object.keys(e).forEach(function (k) { if (k !== "envio" && k.charAt(0) !== "_") j[k] = e[k]; });
  return JSON.stringify(j);
}
// Parte do código de acompanhamento: 1 a 3 letras ou números do nome, sem acento. Nome sem letra nem número vira "X".
/** @param {any} t */
function parteCodigo(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^0-9A-Za-z]/g, "").slice(0, 3).toUpperCase() || "X"; }
// O começo do código de acompanhamento (UF-POLO-ALDEIA) bate com o local deste exame? O código nunca muda depois de
// mostrado; então "não" aparece quando a pessoa foi examinada em outra aldeia ou o local foi corrigido depois.
/** @param {any} e */
function codigoConfereLocal(e) {
  var m = /^([A-Z]{2})-([A-Z0-9]{1,3})-([A-Z0-9]{1,3})-/.exec(String(codigoIndividuoDe(e)).toUpperCase());
  if (!m) return "";
  return m[1] === String(e.uf || "").toUpperCase() && m[2] === parteCodigo(e.polo) && m[3] === parteCodigo(e.aldeia) ? "sim" : "não";
}
/** @param {any} e */
function linhaExame(e) {
  var r = e.resultado || {}, ce = r.ceod || {}, cp = r.cpod || {}, v = e.vinculo || {}, c = e.cancelamento || {}, sn = function (/** @type {any} */ b) { return b == null ? "" : b ? "sim" : "não"; };
  return [e.id, codigoIndividuoDe(e), e.numeroExame || 1, e.codigo || "", exameValido(e) ? "válido" : "cancelado", e.dataExame || "", faixaEtaria(e.idadeAnos),
    e.idadeAnos, (e.crianca || {}).sexo || "", (e.crianca || {}).nascimento || "", e.uf || "", e.dsei || "", e.polo || "", e.aldeia || "", e.municipio || "", e.codMunicipio || "", e.ti || "", e.codTI || "", e.codPolo || "", e.codAldeia || "",
    e.codAldeia ? "não" : (e.aldeia ? "sim" : ""), codigoConfereLocal(e), e.localAtendimento || "",
    (e.profissional || {}).nome || "", (e.profissional || {}).cro || "", e.denticao || "", r.classe || "", nivelDaClasse(r.classe) || r.risco || "",
    ce.c, ce.e, ce.o, ce.total, cp.c, cp.p, cp.o, cp.total, cariadosDe(e), sn(e.placa), sn(e.gengivite), sn(e.fluorose),
    (e.vigilancia || []).join("; "), e.protese ? NOMES_PROTESE[e.protese.sup || ""] : "", e.protese ? NOMES_PROTESE[e.protese.inf || ""] : "",
    e.protese ? NOMES_PROTESE[e.protese.usoSup || ""] : "", e.protese ? NOMES_PROTESE[e.protese.usoInf || ""] : "",
    dentesComDor(e).join(" "), (e.gerais || []).join("; "), (e.insumos || []).join("; "), e.observacoes || "",
    v.anteriorId ? (v.conferidos && v.conferidos.length ? "compatível, com mudança conferida" : "compatível") : "1º exame",
    (v.conferidos || []).join(" · "), v.anteriorId || "",
    c.motivo || "", c.observacao || "", c.em || "", c.por || "", e.criadoEm || "", e.atualizadoEm || "", e.usuarioId || "", registroParaJson(e)];
}
/** @param {any} e */
function linhasDentes(e) {
  var cod = codigoIndividuoDe(e), num = e.numeroExame || 1, sit = exameValido(e) ? "válido" : "cancelado";
  return Object.keys(e.dentes || {}).map(Number).sort(function (a, b) { return a - b; }).map(function (n) {
    var d = e.dentes[n] || {}, p = d.procs || {}, fs = d.faces || {};
    /** @param {any} v */
    function proc(v) { return Object.keys(p).filter(function (k) { return p[k] === v; }).map(function (k) { return NOMES_PROC[k] || k; }).join("; "); }
    var semFaces = d.status !== "presente";
    /** @param {any} k */
    function f(k) { return semFaces ? "" : (NOMES_FACE[fs[k] || ""] || ""); }
    return [e.id, cod, num, sit, e.dataExame || "", e.dsei || "", n, decidDe(n) ? "decíduo" : "permanente", NOMES_STATUS[d.status] || d.status || "", siglaDente(d),
      f("O"), f("V"), f("L"), f("M"), f("D"), d.dor ? "sim" : "não", d.abscesso ? "sim" : "não", proc("indicado"), proc("realizado"), d.obs || ""];
  });
}

/* ---------- mesma pessoa: conferência dente a dente entre dois exames ---------- */
// Compara sempre do exame mais antigo para o mais novo (pela data do exame).
// "impossivel": não acontece na boca (é outra pessoa ou erro de registro). "confira": raro, o dentista confere na boca.
/** @param {any} a @param {any} b */
function conferirVinculo(a, b) {
  var antes = a, depois = b;
  if (String(b.dataExame || "") < String(a.dataExame || "")) { antes = b; depois = a; }
  var PRES = ["presente"], AUS = ["esfoliado", "ausente", "ausente_carie"], COM_FACES = ["presente"];
  var FACES = ["O", "V", "L", "M", "D"], NOME_F = {O: "oclusal/incisal", V: "vestibular", L: "lingual/palatina", M: "mesial", D: "distal"};
  var da1 = dataBR(antes.dataExame), da2 = dataBR(depois.dataExame);
  /** @type {any[]} */ var alertas = [];
  var nums = Object.keys(antes.dentes || {}).filter(function (n) { return (depois.dentes || {})[n]; }).map(Number).sort(function (x, y) { return x - y; });
  nums.forEach(function (n) {
    var x = antes.dentes[n] || {}, y = depois.dentes[n] || {}, fx = x.faces || {}, fy = y.faces || {};
    var tipo = decidDe(n) ? "decíduo" : "permanente";
    if (AUS.indexOf(x.status) >= 0 && PRES.indexOf(y.status) >= 0) {
      alertas.push({dente: n, nivel: "impossivel", chave: n + ":volta", texto: (x.status === "ausente_carie" ? "extraído" : x.status === "esfoliado" ? "esfoliado" : "ausente") + " no exame de " + da1 + " e presente no exame de " + da2 + ".",
        motivo: "Um dente " + tipo + " que " + (decidDe(n) ? "esfoliou ou foi extraído" : "foi perdido") + " não volta."});
      return;
    }
    if (PRES.indexOf(x.status) >= 0 && y.status === "nao_erupc") {
      alertas.push({dente: n, nivel: "impossivel", chave: n + ":desnasceu", texto: "presente no exame de " + da1 + " e não erupcionado no exame de " + da2 + ".",
        motivo: "Um dente que já erupcionou não volta a ficar sem erupcionar."});
      return;
    }
    if (COM_FACES.indexOf(x.status) >= 0 && COM_FACES.indexOf(y.status) >= 0) {
      var rest = FACES.filter(function (k) { return (fx[k] === "rest" || fx[k] === "restc") && !fy[k]; });
      var cav = FACES.filter(function (k) { return (fx[k] === "ca" || fx[k] === "cc") && !fy[k]; });
      /** @param {any} l */
      var nomes = function (l) { return l.map(function (/** @type {any} */ k) { return NOME_F[k]; }).join(", "); };
      if (rest.length) alertas.push({dente: n, nivel: "confira", chave: n + ":rest:" + rest.join(""), texto: "face " + nomes(rest) + " restaurada no exame de " + da1 + " e hígida no exame de " + da2 + ".",
        motivo: "A restauração pode ter caído, mas é raro a face ficar hígida."});
      if (cav.length) alertas.push({dente: n, nivel: "confira", chave: n + ":cav:" + cav.join(""), texto: "face " + nomes(cav) + " com cárie cavitada no exame de " + da1 + " e hígida no exame de " + da2 + ".",
        motivo: "Cavidade não some sem tratamento: deveria aparecer restaurada."});
    }
  });
  return alertas;
}
// Situação simplificada de um dente, para a linha do tempo da pessoa.
/** @param {any} d */
function estadoDente(d) {
  if (!d) return "";
  var fs = d.faces || {}, vs = Object.keys(fs).map(function (k) { return fs[k]; });
  if (d.status === "nao_erupc") return "nao_erupc";
  if (d.status === "esfoliado") return "esfoliado";
  if (d.status === "ausente") return "ausente";
  if (d.status === "ausente_carie") return "extraido";
  if (d.status !== "presente") return "";
  if (exoCarie(d)) return "exo_carie";
  if (vs.some(function (v) { return v === "ca" || v === "cc" || v === "restc"; })) return "cariado";
  if (vs.indexOf("rest") >= 0) return "obturado";
  return "higido";
}
var NOMES_ESTADO = {nao_erupc: "não erupcionado", esfoliado: "esfoliado", ausente: "ausente", extraido: "extraído", exo_carie: "com exodontia devido à cárie",
  cariado: "cariado", obturado: "obturado", higido: "hígido"};
// O que mudou em cada dente entre o primeiro e o último exame de uma pessoa.
/** @param {any} a @param {any} b */
function mudancasDentes(a, b) {
  /** @type {any[]} */ var l = [];
  var nums = Object.keys(Object.assign({}, a.dentes || {}, b.dentes || {})).map(Number).sort(function (x, y) { return x - y; });
  nums.forEach(function (n) {
    var x = estadoDente((a.dentes || {})[n]), y = estadoDente((b.dentes || {})[n]);
    if (!x || !y || x === y) return;
    var tipo = "outro";
    if (y === "cariado" && (x === "higido" || x === "nao_erupc" || x === "obturado")) tipo = "carie_nova";
    else if (x === "cariado" && y === "obturado") tipo = "tratado";
    else if (y === "extraido" || (y === "ausente" && (x === "cariado" || x === "exo_carie"))) tipo = "extraido";
    else if (y === "esfoliado") tipo = "esfoliou";
    else if (x === "nao_erupc") tipo = "erupcionou";
    l.push({dente: n, de: x, para: y, tipo: tipo});
  });
  return l;
}

/* ---------- avaliação do exame: classe de risco e índices (igual no app e no servidor) ----------
 * O servidor refaz este cálculo a partir dos dentes ao gravar: o resultado da planilha nunca é o que o
 * navegador mandou pronto.
 * Índices (cada dente conta uma vez; vale a pior situação: e/P > cariado > obturado):
 * - CPO-D (permanentes): C = cavidade (ativa ou crônica), restauração com cárie ou exodontia devido à cárie
 *   (indicada ou realizada no exame); P = extraído por cárie (já ausente); O = restaurado sem cárie.
 *   Mancha branca não conta (só cavidade evidente é cárie).
 * - ceo-d (decíduos): c = como no CPO-D, sem a exodontia; e = exodontia devido à cárie (indicada ou realizada);
 *   decíduo extraído por cárie, esfoliado ou ausente NÃO conta; o = restaurado sem cárie.
 */
var DESCRICAO_CLASSE = {
  A: "Sem lesão de cárie, sem placa, sem gengivite e sem mancha branca ativa.",
  B: "História de dente restaurado ou perdido por cárie, sem sinais de atividade.",
  C: "Uma ou mais cavidades em lesão crônica, sem placa, gengivite ou mancha branca ativa.",
  D: "Placa, gengivite e/ou mancha branca ativa, sem cavidade ativa.",
  E: "Uma ou mais cavidades em lesão ativa.",
  F: "Presença de dor e/ou abscesso."
};
/** Dentes da dentição, na ordem do odontograma. @param {string} den */
function dentesDaDenticao(den) {
  var sup = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], inf = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  var supD = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65], infD = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
  if (den === "permanente") return sup.concat(inf);
  if (den === "decidua") return supD.concat(infD);
  return sup.concat(supD, infD, inf);
}
/** @param {any} ex */
function avaliarExame(ex) {
  var nums = dentesDaDenticao(ex.denticao), dentes = ex.dentes || {};
  var F = [], E = [], Dm = [], C = [], B = [];
  var ceod = {c: 0, e: 0, o: 0, total: 0}, cpod = {c: 0, p: 0, o: 0, total: 0};
  nums.forEach(function (n) {
    var d = dentes[n]; if (!d) return;
    var faces = d.faces || {}, fs = Object.keys(faces).map(function (k) { return faces[k]; });
    var tem = function (x) { return fs.indexOf(x) >= 0; };
    var presente = d.status === "presente", exo = presente && exoCarie(d);
    var decid = Math.floor(n / 10) >= 5;
    if (presente && (d.dor || d.abscesso)) F.push(n);
    if (presente && (tem("ca") || tem("restc"))) E.push(n);
    if (presente && tem("mba")) Dm.push(n);
    if (presente && (tem("cc") || exo)) C.push(n);
    if ((presente && (tem("rest") || tem("mbi"))) || d.status === "ausente_carie") B.push(n);
    var perdido = decid ? exo : d.status === "ausente_carie";
    var cariado = presente && (tem("ca") || tem("cc") || tem("restc") || (!decid && exo));
    var obturado = presente && tem("rest") && !cariado;
    var alvo = decid ? ceod : cpod;
    if (perdido) alvo[decid ? "e" : "p"]++;
    else if (cariado) alvo.c++;
    else if (obturado) alvo.o++;
  });
  ceod.total = ceod.c + ceod.e + ceod.o; cpod.total = cpod.c + cpod.p + cpod.o;
  var lista = function (a) { return a.join(", "); };
  var juntar = function (a) { return a.length > 1 ? a.slice(0, -1).join(", ") + " e " + a[a.length - 1] : a.join(""); };
  var motivos = [];
  var vigF = (ex.vigilancia || []).filter(function (v) { return v === "Dor de dente" || v === "Abscesso dentoalveolar"; });
  if (F.length) motivos.push("Dor ou abscesso: " + lista(F));
  if (vigF.length && !F.length) motivos.push(juntar(vigF) + " (vigilância em saúde bucal)");
  if (E.length) motivos.push("Cavidade ativa: " + lista(E));
  if (Dm.length) motivos.push("Mancha branca ativa: " + lista(Dm));
  if (ex.placa) motivos.push("Placa visível");
  if (ex.gengivite) motivos.push("Gengivite");
  if (C.length) motivos.push("Cavidade crônica ou exodontia devido à cárie: " + lista(C));
  if (B.length) motivos.push("Restauração, mancha inativa ou extração por cárie: " + lista(B));
  var classe = "A";
  if (F.length || vigF.length) classe = "F";
  else if (E.length) classe = "E";
  else if (Dm.length || ex.placa || ex.gengivite) classe = "D";
  else if (C.length) classe = "C";
  else if (B.length) classe = "B";
  if (!motivos.length) motivos.push("Nenhuma alteração registrada");
  return {classe: classe, descricao: DESCRICAO_CLASSE[classe], risco: nivelDaClasse(classe), motivos: motivos, ceod: ceod, cpod: cpod};
}
/* ===== COMPARTILHADO FIM ===== */
