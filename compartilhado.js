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
// Procedimentos coletivos ou de boca toda, com os termos da Ficha 7 do SIASI.
var GERAIS = ["Escovação dental supervisionada", "Aplicação tópica de flúor-gel", "Orientação de higiene e dieta", "Evidenciação de placa bacteriana",
  "Profilaxia / remoção de placa", "Raspagem (RAP) supragengival", "Raspagem (RAP) subgengival", "Sutura", "Tratamento de alveolite",
  "Outro procedimento cirúrgico", "Outro procedimento de urgência"];
// Nomes de antes da versão 47: o que chega de um app 45 ou 46 é trocado pelo nome novo (o encaminhamento passou a ter a especialidade).
/** @type {any} */
var GERAIS_ANTIGOS = {"Escovação supervisionada": "Escovação dental supervisionada", "Aplicação tópica de flúor": "Aplicação tópica de flúor-gel",
  "Raspagem supragengival": "Raspagem (RAP) supragengival", "Encaminhamento para especialidade": ""};
// Aceitos só quando vêm de um app antigo (não aparecem mais para marcar).
var GERAIS_ACEITOS = GERAIS.concat(["Encaminhamento para especialidade"]);
var VIG_FENDA = "Má formação: fenda ou fissura lábio palatal", VIG_FREIO = "Má formação: interferência de freios";
var VIGILANCIA = ["Abscesso dentoalveolar", "Alteração em tecidos moles", "Dor de dente", VIG_FENDA, VIG_FREIO, "Fluorose dentária moderada ou severa", "Traumatismo dentoalveolar", "Não identificado"];
var VIG_FLUOROSE = "Fluorose dentária moderada ou severa", VIG_NENHUM = "Não identificado";
/** @type {any} */
var VIG_ANTIGOS = {"Fendas ou fissuras lábio palatais": VIG_FENDA};
// Localidade de residência (Ficha 4).
var LOCALIDADES = ["Aldeia", "Acampamento", "Logradouro"];
// Índice de Dean (Ficha 4), perguntado de 10 a 19 anos. 4 e 5 entram na vigilância como fluorose moderada ou severa.
/** @type {any} */
var DEAN = {"0": "Normal", "1": "Questionável", "2": "Muito leve", "3": "Leve", "4": "Moderada", "5": "Severa", "9": "Excluído (não foi possível avaliar)"};
var DEAN_CODIGOS = ["0", "1", "2", "3", "4", "5", "9"];
/** Idade em que o índice de Dean é perguntado. @param {any} ex */
function perguntaDean(ex) { var i = Math.floor(Number(ex && ex.idadeAnos)); return !semOdontograma(ex) && ex.idadeAnos !== "" && ex.idadeAnos != null && i >= 10 && i <= 19; }
/** Quem responde se está gestante: sexo feminino, de 10 a 49 anos. @param {any} ex */
function perguntaGestante(ex) { var i = Math.floor(Number(ex && ex.idadeAnos)); return !!ex && (ex.crianca || {}).sexo === "F" && ex.idadeAnos !== "" && ex.idadeAnos != null && i >= 10 && i <= 49; }
// Encaminhamentos da Ficha 7 ("usuário referenciado"), cada um pendente ou realizado.
/** @type {any} */
var ESPECIALIDADES = {endodontia: "Endodontia", periodontia: "Periodontia", protese: "Prótese", cbmf: "Cirurgia bucomaxilofacial", ortodontia: "Ortodontia", radiologia: "Radiologia"};
/** @type {any} */
var SITUACAO_ENCAMINHAMENTO = {pendente: "Pendente", realizado: "Realizado"};
var PRESCRICOES = ["Analgésico", "Anti-inflamatório", "Antibiótico", "Outra prescrição"];
// Placa e gengivite podem ficar "não avaliadas" (nunca viram "Não" nas contas).
/** @param {any} ex @param {string} k */
function naoAvaliada(ex, k) { return Array.isArray(ex && ex.condNaoAvaliadas) && ex.condNaoAvaliadas.indexOf(k) >= 0; }
// Necessidade não tratada (decisão 4). Cárie ativa, restaurada com cárie, dor e abscesso pedem tratamento; mancha branca ativa
// e cárie crônica pedem um preventivo ou o acompanhamento. Em todos os casos o profissional pode, em vez do procedimento,
// marcar a conduta do dente: "acompanhamento, sem tratamento agora" (com o motivo) ou o encaminhamento para a atenção especializada.
/** @type {any} */
var NECESSIDADE_FACE = {ca: "cárie ativa", restc: "restaurada com cárie", cc: "cárie crônica", mba: "mancha branca ativa"};
/** O que o dente tem que pede uma conduta (vazio: nada). @param {any} d */
function necessidadeDoDente(d) {
  if (!d || d.status !== "presente") return [];
  var fs = d.faces || {}, l = [];
  Object.keys(NECESSIDADE_FACE).forEach(function (k) { if (Object.keys(fs).some(function (f) { return fs[f] === k; })) l.push(NECESSIDADE_FACE[k]); });
  if (d.dor) l.push("dor");
  if (d.abscesso) l.push("abscesso ou fístula");
  return l;
}
/** A conduta do dente está completa (acompanhamento com o motivo, ou encaminhamento com a especialidade). @param {any} d */
function condutaValida(d) {
  var c = d && d.conduta;
  return !!c && ((c.tipo === "acompanhamento" && !!String(c.motivo || "").trim()) || (c.tipo === "encaminhamento" && !!ESPECIALIDADES[c.especialidade]));
}
/** Dentes com necessidade e sem procedimento nem conduta: [{n, motivos}]. @param {any} ex */
function necessidadesSemConduta(ex) {
  if (!ex || semOdontograma(ex)) return [];
  var ds = ex.dentes || {};
  return dentesDaDenticao(ex.denticao).filter(function (n) {
    var d = ds[n]; if (!necessidadeDoDente(d).length || condutaValida(d)) return false;
    var p = (d && d.procs) || {};
    return !Object.keys(p).some(function (k) { return p[k] === "indicado" || p[k] === "realizado"; });
  }).map(function (n) { return {n: n, motivos: necessidadeDoDente(ds[n])}; });
}
// Nível de cada procedimento do dente (decisão 3). Todos os da lista são da atenção primária (APS); a coordenação pode passar
// um procedimento para a atenção especializada num DSEI (por exemplo, onde a coroa de aço não é feita na APS).
// "ajustes" é {procedimento: "especializada"} do DSEI do exame.
/** @param {string} k @param {any} [ajustes] */
function nivelDoProc(k, ajustes) { return ajustes && ajustes[k] === "especializada" ? "especializada" : "aps"; }
/** O que ainda falta da APS no exame: procedimentos indicados (da APS) e necessidades sem tratamento nem conduta. @param {any} ex @param {any} [ajustes] */
function pendenciasAPS(ex, ajustes) {
  if (!ex || semOdontograma(ex)) return [];
  var ds = ex.dentes || {}, l = [];
  dentesDaDenticao(ex.denticao).forEach(function (n) {
    var d = ds[n]; if (!d || d.status !== "presente") return;
    var p = d.procs || {};
    Object.keys(p).forEach(function (k) { if (p[k] === "indicado" && nivelDoProc(k, ajustes) === "aps") l.push(n + ": " + (NOMES_PROC[k] || k) + " (indicado)"); });
  });
  necessidadesSemConduta(ex).forEach(function (x) { l.push(x.n + ": " + x.motivos.join(", ") + " sem tratamento nem conduta"); });
  return l;
}
// Situação do tratamento odontológico básico (APS) no exame. Só o profissional conclui: o app sugere quando não há pendência.
/** @type {any} */
var NOMES_TRATAMENTO = {concluido: "Concluído", nao_concluido: "Não concluído", pendente: "Não concluído: há pendências da APS",
  a_confirmar: "Sem pendências, a confirmar", nao_avaliado: "Não avaliado (sem odontograma)"};
/** @param {any} ex @param {any} [ajustes] */
function situacaoTratamento(ex, ajustes) {
  if (semOdontograma(ex)) return "nao_avaliado";
  if (pendenciasAPS(ex, ajustes).length) return "pendente";
  var t = (ex.tratamento || {}).aps;
  return t === "concluido" || t === "nao_concluido" ? t : "a_confirmar";
}
/** Encaminhamento, à parte da APS: "sem", "pendente" (algum ainda pendente) ou "realizado". @param {any} ex */
function situacaoEncaminhamento(ex) {
  var e = ex.encaminhamentos || {}, ks = Object.keys(e);
  if (!ks.length) return "sem";
  return ks.some(function (k) { return e[k] === "pendente"; }) ? "pendente" : "realizado";
}
/** @type {any} */
var NOMES_SIT_ENCAMINHAMENTO = {sem: "Sem encaminhamento", pendente: "Encaminhamento pendente", realizado: "Encaminhamento realizado"};
// Plano de tratamento (decisão 7): o exame com odontograma abre o plano; cada consulta de retorno muda só os dentes que mexeu
// (procedimento realizado, conduta, necessidade nova), os encaminhamentos que mudaram e a confirmação do tratamento básico.
// O estado do plano é o exame com os retornos aplicados, do mais antigo para o mais novo. Nada é apagado.
/** @param {any} plano @param {any[]} retornos */
function estadoDoPlano(plano, retornos) {
  var e = JSON.parse(JSON.stringify(plano || {}));
  e.dentes = e.dentes || {}; e.encaminhamentos = e.encaminhamentos || {};
  (retornos || []).filter(function (r) { return r && r.planoId === plano.id && r.situacao !== "cancelado"; })
    .sort(function (a, b) { return String(a.dataExame).localeCompare(String(b.dataExame)) || String(a.criadoEm || "").localeCompare(String(b.criadoEm || "")); })
    .forEach(function (r) {
      Object.keys(r.dentes || {}).forEach(function (n) { e.dentes[n] = JSON.parse(JSON.stringify(r.dentes[n])); });
      Object.keys(r.encaminhamentos || {}).forEach(function (k) { e.encaminhamentos[k] = r.encaminhamentos[k]; });
      if (Object.keys(e.encaminhamentos).length) e.fezEncaminhamento = "sim";
      if (r.tratamento && r.tratamento.aps) e.tratamento = {aps: r.tratamento.aps, motivo: r.tratamento.motivo || ""};
      e.ultimoRetorno = r.dataExame;
    });
  return e;
}
/** Troca os nomes de antes da versão 47 pelos novos (exames que chegam de um app 45 ou 46). Muda o próprio exame. @param {any} e */
function atualizarNomesAntigos(e) {
  if (!e) return e;
  if (Array.isArray(e.gerais)) e.gerais = e.gerais.map(function (g) { return g in GERAIS_ANTIGOS ? GERAIS_ANTIGOS[g] || g : g; });
  if (Array.isArray(e.vigilancia)) e.vigilancia = e.vigilancia.map(function (v) { return VIG_ANTIGOS[v] || v; });
  return e;
}
// Odontograma opcional: quando não é preenchido, o profissional escolhe o principal motivo (um só).
var MOTIVOS_SEM_ODONTOGRAMA = ["Tempo insuficiente para realizar o odontograma", "A pessoa recusou o exame odontológico", "Não foi possível realizar o exame por dificuldade de colaboração",
  "Falta de condições adequadas (iluminação, espaço ou materiais)", "Condição clínica impediu a realização do exame", "Atendimento direcionado exclusivamente a ações coletivas", "Outro motivo"];
var MOTIVO_SO_COLETIVO = "Atendimento direcionado exclusivamente a ações coletivas", MOTIVO_OUTRO = "Outro motivo";
// Sem exame clínico, estes procedimentos não aparecem (precisam do odontograma).
var GERAIS_CLINICOS = ["Profilaxia / remoção de placa", "Raspagem (RAP) supragengival", "Raspagem (RAP) subgengival", "Evidenciação de placa bacteriana", "Sutura", "Outro procedimento cirúrgico"];
/** Exame registrado sem odontograma (os exames de antes do odontograma opcional sempre têm). @param {any} e */
function semOdontograma(e) { return !!e && e.odontograma === "nao"; }
/** "individual" ou "exclusivamente coletivo" (este só sem odontograma, com o motivo das ações coletivas). @param {any} e */
function tipoAtendimento(e) { return semOdontograma(e) && e.odontogramaMotivo === MOTIVO_SO_COLETIVO ? "exclusivamente coletivo" : "individual"; }
// Prótese, como na Ficha 4: sem prótese, parcial ou total. "sim" vem dos apps 45 e 46 (tipo não informado).
/** @type {any} */
var NOMES_PROTESE = {"": "Não avaliado", nao: "Sem prótese", parcial: "Parcial", total: "Total", sim: "Sim (tipo não informado)"};
var VALORES_PROTESE = ["nao", "parcial", "total", "sim"];
/** A arcada precisa ou usa prótese (de qualquer tipo). @param {any} v */
function temProtese(v) { return v === "parcial" || v === "total" || v === "sim"; }
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
  // De 10 a 19 anos a fluorose vem do índice de Dean: moderada (4) ou severa (5).
  if (perguntaDean(ex) && (ex.fluoroseDean === "4" || ex.fluoroseDean === "5")) l.push(VIG_FLUOROSE);
  return l;
}
// Vigilância final do exame: os itens do odontograma + os marcados pelo profissional. Sem nenhum: "Não identificado".
/** @param {any} ex */
function completarVigilancia(ex) {
  var dean = perguntaDean(ex), der = vigilanciaDosDentes(ex), outros = (Array.isArray(ex.vigilancia) ? ex.vigilancia : []).filter(function (v) {
    return v !== VIG_NENHUM && v !== "Dor de dente" && v !== "Abscesso dentoalveolar" && !(dean && v === VIG_FLUOROSE); });
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
    var pr = procsDe(e)[f.proc];
    if (!pr || !(pr.indicado || pr.realizado)) return false;
  }
  return true;
}
// Cada bloco do painel ignora o próprio filtro, para continuar mostrando as outras opções.
/** @param {any} regs @param {any} f @param {any} agrup */
function montarPainel(regs, f, agrup) {
  // A situação de cada pessoa vem do último exame COM odontograma (o atendimento sem exame clínico não diz nada sobre os dentes).
  var validos = regs.filter(exameValido), ult = idsUltimoPorPessoa(validos.filter(function (e) { return !semOdontograma(e); }));
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
    vigilancia: {}, local: {}, protese: {avaliados: 0, sup: 0, inf: 0, alguma: 0},
    atend: {registrados: 0, preenchidos: 0, naoPreenchidos: 0, coletivos: 0, motivos: {}, pessoasSemClassificacao: 0}};
  // Pessoas com classificação de risco (algum exame com odontograma) e sem (só atendimentos sem odontograma no recorte).
  /** @type {any} */ var comClasse = {}, semClasse = {};
  FX.forEach(function (f) { r.faixas[f] = {n: 0, sexo: zeros(["F", "M", "NI"]), classe: zeros(CL), ceod: idxVazio(), cpod: idxVazio()}; });
  regs.forEach(function (/** @type {any} */ e) {
    var res = e.resultado || {};
    var c = CL.indexOf(res.classe) >= 0 ? res.classe : null, sem = semOdontograma(e);
    if (!c && !sem) return;
    (c ? comClasse : semClasse)[codigoIndividuoDe(e) || e.id] = true;
    // Atendimentos: os individuais (com e sem odontograma, com o motivo) e, à parte, os exclusivamente coletivos.
    if (tipoAtendimento(e) === "exclusivamente coletivo") r.atend.coletivos++;
    else {
      r.atend.registrados++;
      if (sem) { r.atend.naoPreenchidos++; var mo = e.odontogramaMotivo || MOTIVO_OUTRO; r.atend.motivos[mo] = (r.atend.motivos[mo] || 0) + 1; }
      else r.atend.preenchidos++;
    }
    // produção: todos os exames
    r.nExames++;
    var mes = String(e.dataExame || "").slice(0, 7);
    if (mes) r.meses[mes] = (r.meses[mes] || 0) + 1;
    (e.gerais || []).forEach(function (/** @type {any} */ g) { r.gerais[g] = (r.gerais[g] || 0) + 1; });
    (e.insumos || []).forEach(function (/** @type {any} */ g) { r.insumos[g] = (r.insumos[g] || 0) + 1; });
    if (e.localAtendimento) r.local[e.localAtendimento] = (r.local[e.localAtendimento] || 0) + 1;
    // Daqui em diante, só o que vem do exame clínico (o atendimento sem odontograma não entra nas contas por dente nem na classe).
    if (sem) return;
    var pe = procsDe(e);
    Object.keys(pe).forEach(function (k) {
      if (!r.procs[k]) r.procs[k] = {indicado: 0, realizado: 0};
      r.procs[k].indicado += pe[k].indicado; r.procs[k].realizado += pe[k].realizado; r.procsRealizados += pe[k].realizado;
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
      if (temProtese(pr.sup)) r.protese.sup++;
      if (temProtese(pr.inf)) r.protese.inf++;
      if (temProtese(pr.sup) || temProtese(pr.inf)) r.protese.alguma++;
    }
  });
  /** @param {any} o */
  function media(o) { return o.n ? Math.round(o.soma / o.n * 100) / 100 : null; }
  r.atend.pessoasSemClassificacao = Object.keys(semClasse).filter(function (k) { return !comClasse[k]; }).length;
  r.ceodMedia = media(r.ceod); r.cpodMedia = media(r.cpod); r.cpod12Media = media(r.cpod12);
  var m = r.cpod12Media == null ? null : Math.round(r.cpod12Media * 10) / 10;
  r.cpod12Severidade = m == null ? null : m <= 1.1 ? "Muito baixa" : m <= 2.6 ? "Baixa" : m <= 4.4 ? "Moderada" : m <= 6.5 ? "Alta" : "Muito alta";
  return r;
}

/* ---------- nomes usados na planilha ---------- */
var NOMES_STATUS = {presente: "Presente", nao_erupc: "Não erupcionado", esfoliado: "Esfoliado", ausente: "Ausente por outro motivo", ausente_carie: "Extraído por cárie"};
var NOMES_FACE = {"": "Hígida", ca: "Cárie ativa", cc: "Cárie crônica", mba: "Mancha branca ativa", mbi: "Mancha branca inativa",
  rest: "Restaurada sem cárie", restc: "Restaurada com cárie", sel: "Selante"};
// Procedimentos por dente, com os termos da Ficha 7 do SIASI (o verniz fica com o nome que as equipes conhecem).
// As chaves (exo_carie, art…) nunca mudam: são os nomes das colunas na planilha e no Looker.
var NOMES_PROC = {exo_carie: "Exodontia devido à cárie", exodontia: "Exodontia por outros motivos", selante: "Aplicação de selante", art: "Tratamento restaurador atraumático (ART)",
  civ: "Restauração com cimento de ionômero de vidro", resina: "Restauração em resina composta", amalgama: "Restauração em amálgama", verniz: "Verniz fluoretado",
  cdf: "Aplicação de cariostático", selprov: "Selamento provisório / adequação do meio", pcdp: "Proteção do complexo dentino-pulpar",
  pulpotomia: "Pulpotomia", pulpectomia: "Pulpectomia (dente decíduo)", coroa: "Coroa de aço"};
/** @param {any} n */
function decidDe(n) { return Math.floor(Number(n) / 10) >= 5; }
/** @param {any} iso */
function dataBR(iso) { return iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : ""; }
/** @param {any} e */
function codigoIndividuoDe(e) { return e.codigoIndividuo || e.codigo || ""; }
/** @param {any} e */
function cariadosDe(e) { var r = e.resultado || {}; return (Number((r.ceod || {}).c) || 0) + (Number((r.cpod || {}).c) || 0); }
/** @param {any} e */
function dentesComDor(e) {
  if (!e.dentes) return (e.comDor || []).map(String);
  return Object.keys(e.dentes).filter(function (n) { var d = e.dentes[n] || {}; return d.dor || d.abscesso; });
}
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
/* ---------- resumo do exame: tudo menos o detalhe de cada dente ----------
 * O Painel, a página inicial e as listas leem só o resumo (pequeno); o exame completo é lido só quando precisa
 * dos dentes (abrir um exame, conferir a mesma pessoa). O resumo guarda, de cada dente, só o estado (est),
 * os dentes com dor ou abscesso (comDor) e quantos tratamentos foram indicados e realizados (procsR). */
var COD_ESTADO = {higido: "h", nao_erupc: "n", esfoliado: "s", ausente: "a", extraido: "x", exo_carie: "e", cariado: "c", obturado: "o"};
/** Estado de cada dente: {16: "cariado", ...}. Funciona com o exame completo ou com o resumo. @param {any} e */
function estadosDe(e) {
  /** @type {any} */ var o = {};
  if (e.dentes) { Object.keys(e.dentes).forEach(function (n) { o[n] = estadoDente(e.dentes[n]); }); return o; }
  var nums = dentesDaDenticao(e.denticao), est = String(e.est || ""), inv = {};
  Object.keys(COD_ESTADO).forEach(function (k) { /** @type {any} */ (inv)[COD_ESTADO[k]] = k; });
  nums.forEach(function (n, i) { var c = est.charAt(i); if (c && c !== "-") o[n] = /** @type {any} */ (inv)[c] || ""; });
  return o;
}
/** Tratamentos do exame: {art: {indicado: 2, realizado: 0}, ...}. Funciona com o exame completo ou com o resumo. @param {any} e */
function procsDe(e) {
  if (!e.dentes) return e.procsR || {};
  /** @type {any} */ var o = {};
  Object.keys(e.dentes).forEach(function (n) {
    var p = (e.dentes[n] || {}).procs || {};
    Object.keys(p).forEach(function (k) {
      if (p[k] !== "indicado" && p[k] !== "realizado") return;
      if (!o[k]) o[k] = {indicado: 0, realizado: 0};
      o[k][p[k]]++;
    });
  });
  return o;
}
/** @param {any} e */
function resumoDoExame(e) {
  /** @type {any} */ var r = {};
  Object.keys(e).forEach(function (k) { if (k !== "dentes" && k !== "observacoes" && k !== "envio" && k.charAt(0) !== "_") r[k] = e[k]; });
  var res = e.resultado || {};
  r.resultado = {classe: res.classe, risco: res.risco, ceod: res.ceod, cpod: res.cpod};
  var est = estadosDe(e);
  r.est = dentesDaDenticao(e.denticao).map(function (n) { return COD_ESTADO[est[n]] || "-"; }).join("");
  r.comDor = dentesComDor(e).map(Number);
  r.procsR = procsDe(e);
  return r;
}

/* ---------- colunas da planilha e do arquivo de análise (uma linha por exame) ----------
 * Parte 1: o exame. Parte 2: contas prontas. Parte 3: o detalhe de cada dente (só no arquivo do Excel; na
 * planilha, o detalhe fica no exame completo). Controle: vínculo, cancelamento e datas. */
var ORDEM_DENTES = dentesDaDenticao("mista");
var COL_VIG = {"Abscesso dentoalveolar": "vig_abscesso_dentoalveolar", "Alteração em tecidos moles": "vig_tecidos_moles", "Dor de dente": "vig_dor_de_dente",
  "Má formação: fenda ou fissura lábio palatal": "vig_fendas_labio_palatais", "Má formação: interferência de freios": "vig_interferencia_freios", "Fluorose dentária moderada ou severa": "vig_fluorose", "Traumatismo dentoalveolar": "vig_traumatismo", "Não identificado": "vig_nao_identificado"};
var COL_PRESCRICAO = ["prescricao_analgesico", "prescricao_anti_inflamatorio", "prescricao_antibiotico", "prescricao_outra"];
var COL_FACE = {ca: "carie_ativa", cc: "carie_cronica", mba: "mancha_branca_ativa", mbi: "mancha_branca_inativa", rest: "restaurada_sem_carie", restc: "restaurada_com_carie", sel: "selante"};
var COL_STATUS = {presente: "presentes", nao_erupc: "nao_erupcionados", esfoliado: "esfoliados", ausente: "ausentes_outro_motivo", ausente_carie: "extraidos_carie"};
var CAB_P1 = ["codigo_individuo", "numero_exame", "data_exame", "situacao_registro", "uf", "dsei", "polo_base", "aldeia_comunidade", "municipio", "terra_indigena",
  "codigo_polo_base", "codigo_aldeia", "codigo_municipio_ibge", "codigo_terra_indigena", "local_atendimento", "nascimento", "idade_anos", "faixa_etaria", "sexo", "denticao",
  "classe_risco", "nivel_risco", "ceod_c", "ceod_e", "ceod_o", "ceod", "cpod_c", "cpod_p", "cpod_o", "cpod"]
  .concat(Object.keys(COL_VIG).map(function (k) { return COL_VIG[k]; }))
  .concat(["protese_sup_necessita", "protese_inf_necessita", "protese_sup_usa", "protese_inf_usa", "placa_visivel", "gengivite", "procedimentos_coletivos", "insumos", "observacoes"])
  // Desde a versão 47 (Fichas 4 e 7 do SIASI)
  .concat(["localidade_residencia", "gestante", "semanas_gestacao", "fluorose_dean", "tratamento_aps", "tratamento_aps_motivo", "pendencias_aps", "situacao_encaminhamento"])
  .concat(Object.keys(ESPECIALIDADES).map(function (k) { return "encaminhamento_" + k; }))
  .concat(PRESCRICOES.map(function (_, i) { return COL_PRESCRICAO[i]; }));
var CAB_P2 = Object.keys(COL_STATUS).map(function (k) { return "n_dentes_" + COL_STATUS[k]; })
  .concat([].concat.apply([], Object.keys(COL_FACE).map(function (k) { return ["n_dentes_" + COL_FACE[k], "n_faces_" + COL_FACE[k]]; })))
  .concat(["n_dentes_dor", "n_dentes_abscesso_fistula"])
  .concat([].concat.apply([], Object.keys(NOMES_PROC).map(function (k) { return ["n_" + k + "_indicado", "n_" + k + "_realizado"]; })));
/** Nome das faces de cada dente: O ou I (incisal, nos anteriores) e L ou P (palatina, nos superiores). @param {any} n */
function letrasFaces(n) { var q = Math.floor(n / 10), anterior = [1, 2, 3].indexOf(n % 10) >= 0, sup = [1, 2, 5, 6].indexOf(q) >= 0; return {O: anterior ? "I" : "O", V: "V", L: sup ? "P" : "L", M: "M", D: "D"}; }
var CAB_P3 = [].concat.apply([], ORDEM_DENTES.map(function (n) {
  var lf = letrasFaces(n), p = "d" + n + "_";
  return [p + "situacao", p + "face_" + lf.O, p + "face_V", p + "face_" + lf.L, p + "face_M", p + "face_D", p + "dor", p + "abscesso", p + "trat_indicado", p + "trat_realizado", p + "obs"];
}));
var CAB_CONTROLE = ["id_exame", "codigo_exame", "aldeia_fora_da_lista", "codigo_confere_local", "conferencia_vinculo", "alertas_vinculo", "exame_anterior_id",
  "motivo_cancelamento", "observacao_cancelamento", "cancelado_em", "cancelado_por", "profissional", "cro", "criado_em", "atualizado_em", "usuario_id"];
// Planilha principal: as colunas do índice primeiro (o servidor lê só elas para achar um exame ou uma pessoa).
var CAB_INDICE = ["id_exame", "codigo_individuo", "numero_exame", "situacao_registro", "data_exame", "dsei", "usuario_id", "criado_em", "atualizado_em", "exame_anterior_id", "codigo_exame"];
var CAB_EXAME = CAB_INDICE.concat(CAB_P1.filter(function (k) { return CAB_INDICE.indexOf(k) < 0; }), CAB_P2,
  CAB_CONTROLE.filter(function (k) { return CAB_INDICE.indexOf(k) < 0; }), ["resumo_json", "dados_completos_json"]);
// Arquivo de análise (Excel): Partes 1, 2 e 3, e o controle no fim.
var CAB_ANALISE = CAB_P1.concat(CAB_P2, CAB_P3, CAB_CONTROLE.filter(function (k) { return k !== "usuario_id"; }));
/** Valor de cada coluna do exame, pelo nome. Com completo = false, a Parte 3 fica de fora. @param {any} e @param {boolean} [completo] */
function valoresDoExame(e, completo) {
  var r = e.resultado || {}, ce = r.ceod || {}, cp = r.cpod || {}, v = e.vinculo || {}, c = e.cancelamento || {}, pr = e.protese || {}, cr = e.crianca || {};
  var sn = function (/** @type {any} */ b) { return b == null ? "" : b ? "sim" : "não"; };
  var prot = function (/** @type {any} */ x) { return pr.naoAvaliado ? "não avaliado" : ({sim: "sim", nao: "não", parcial: "parcial", total: "total"})[x || ""] || "não avaliado"; };
  // Placa e gengivite: vazio sem odontograma; "não avaliado" quando o profissional marcou assim.
  var cond = function (/** @type {string} */ k) { return naoAvaliada(e, k) ? "não avaliado" : sn(e[k]); };
  var enc = e.encaminhamentos || {}, presc = e.prescricoes || [];
  /** @type {any} */ var o = {
    id_exame: e.id, codigo_individuo: codigoIndividuoDe(e), numero_exame: e.numeroExame || 1, data_exame: e.dataExame || "", situacao_registro: exameValido(e) ? "válido" : "cancelado",
    uf: e.uf || "", dsei: e.dsei || "", polo_base: e.polo || "", aldeia_comunidade: e.aldeia || "", municipio: e.municipio || "", terra_indigena: e.ti || "",
    codigo_polo_base: e.codPolo || "", codigo_aldeia: e.codAldeia || "", codigo_municipio_ibge: e.codMunicipio || "", codigo_terra_indigena: e.codTI || "",
    local_atendimento: e.localAtendimento || "", nascimento: cr.nascimento || "", idade_anos: e.idadeAnos, faixa_etaria: faixaEtaria(e.idadeAnos), sexo: cr.sexo || "",
    denticao: ({mista: "mista", decidua: "decídua", permanente: "permanente"})[e.denticao] || e.denticao || "",
    classe_risco: r.classe || "", nivel_risco: nivelDaClasse(r.classe) || r.risco || "",
    ceod_c: e.denticao === "permanente" ? "" : ce.c, ceod_e: e.denticao === "permanente" ? "" : ce.e, ceod_o: e.denticao === "permanente" ? "" : ce.o, ceod: e.denticao === "permanente" ? "" : ce.total,
    cpod_c: e.denticao === "decidua" ? "" : cp.c, cpod_p: e.denticao === "decidua" ? "" : cp.p, cpod_o: e.denticao === "decidua" ? "" : cp.o, cpod: e.denticao === "decidua" ? "" : cp.total,
    protese_sup_necessita: prot(pr.sup), protese_inf_necessita: prot(pr.inf), protese_sup_usa: prot(pr.usoSup), protese_inf_usa: prot(pr.usoInf),
    placa_visivel: cond("placa"), gengivite: cond("gengivite"),
    localidade_residencia: e.localidade || "", gestante: e.gestante === "sim" ? "sim" : e.gestante === "nao" ? "não" : "", semanas_gestacao: e.gestante === "sim" && e.semanasGestacao != null ? e.semanasGestacao : "",
    fluorose_dean: e.fluoroseDean ? e.fluoroseDean + " · " + (DEAN[e.fluoroseDean] || "") : "",
    tratamento_aps: (e.tratamento || {}).aps ? (NOMES_TRATAMENTO[e.tratamento.aps] || e.tratamento.aps).toLowerCase() : "",
    tratamento_aps_motivo: (e.tratamento || {}).motivo || "", pendencias_aps: (e.tratamento || {}).pendencias != null ? e.tratamento.pendencias : "",
    situacao_encaminhamento: e.fezEncaminhamento == null && !Object.keys(e.encaminhamentos || {}).length ? "" : NOMES_SIT_ENCAMINHAMENTO[situacaoEncaminhamento(e)].toLowerCase(), procedimentos_coletivos: (e.gerais || []).join("; "), insumos: (e.insumos || []).join("; "), observacoes: e.observacoes || "",
    codigo_exame: e.codigo || "", aldeia_fora_da_lista: e.codAldeia ? "não" : (e.aldeia ? "sim" : ""), codigo_confere_local: codigoConfereLocal(e),
    conferencia_vinculo: v.anteriorId ? (v.conferidos && v.conferidos.length ? "compatível, com mudança conferida" : "compatível") : "1º exame",
    alertas_vinculo: (v.conferidos || []).join(" · "), exame_anterior_id: v.anteriorId || "",
    motivo_cancelamento: c.motivo || "", observacao_cancelamento: c.observacao || "", cancelado_em: c.em || "", cancelado_por: c.por || "",
    profissional: (e.profissional || {}).nome || "", cro: (e.profissional || {}).cro || "", criado_em: e.criadoEm || "", atualizado_em: e.atualizadoEm || "", usuario_id: e.usuarioId || ""
  };
  Object.keys(COL_VIG).forEach(function (k) { o[COL_VIG[k]] = sn((e.vigilancia || []).indexOf(k) >= 0); });
  Object.keys(ESPECIALIDADES).forEach(function (k) { o["encaminhamento_" + k] = (SITUACAO_ENCAMINHAMENTO[enc[k]] || "").toLowerCase(); });
  PRESCRICOES.forEach(function (p, i) { o[COL_PRESCRICAO[i]] = e.fezPrescricao == null ? "" : presc.indexOf(p) >= 0 ? "sim" : "não"; });
  // Parte 2: contas prontas (vêm do exame completo; no resumo, só as que ele guarda)
  if (e.dentes) {
    var ds = Object.keys(e.dentes).map(function (n) { return e.dentes[n] || {}; });
    Object.keys(COL_STATUS).forEach(function (k) { o["n_dentes_" + COL_STATUS[k]] = ds.filter(function (d) { return d.status === k; }).length; });
    Object.keys(COL_FACE).forEach(function (f) {
      var vs = ds.map(function (d) { var fc = d.status === "presente" ? d.faces || {} : {}; return Object.keys(fc).filter(function (k) { return fc[k] === f; }).length; });
      o["n_dentes_" + COL_FACE[f]] = vs.filter(function (x) { return x > 0; }).length;
      o["n_faces_" + COL_FACE[f]] = vs.reduce(function (a, x) { return a + x; }, 0);
    });
    o.n_dentes_dor = ds.filter(function (d) { return d.status === "presente" && d.dor; }).length;
    o.n_dentes_abscesso_fistula = ds.filter(function (d) { return d.status === "presente" && d.abscesso; }).length;
  }
  var pe = procsDe(e);
  Object.keys(NOMES_PROC).forEach(function (k) { o["n_" + k + "_indicado"] = (pe[k] || {}).indicado || 0; o["n_" + k + "_realizado"] = (pe[k] || {}).realizado || 0; });
  // Sem odontograma, tudo o que depende do exame clínico fica VAZIO (sem informação), nunca "não" ou 0:
  // a falta do odontograma nunca pode ser lida como dente hígido nem como ausência de necessidade.
  if (semOdontograma(e)) {
    CAB_P2.concat(["classe_risco", "nivel_risco", "ceod_c", "ceod_e", "ceod_o", "ceod", "cpod_c", "cpod_p", "cpod_o", "cpod", "placa_visivel", "gengivite",
      "protese_sup_necessita", "protese_inf_necessita", "protese_sup_usa", "protese_inf_usa"], Object.keys(COL_VIG).map(function (k) { return COL_VIG[k]; }))
      .forEach(function (k) { o[k] = ""; });
  }
  if (completo) {
    ORDEM_DENTES.forEach(function (n) {
      var d = (e.dentes || {})[n], lf = letrasFaces(n), p = "d" + n + "_", pres = !!d && d.status === "presente", fc = (d && d.faces) || {}, pp = (d && d.procs) || {};
      var face = function (/** @type {any} */ k) { return pres ? String(NOMES_FACE[fc[k] || ""] || "").toLowerCase() : ""; };
      var trat = function (/** @type {any} */ st) { return d ? Object.keys(NOMES_PROC).filter(function (k) { return pp[k] === st; }).map(function (k) { return NOMES_PROC[k]; }).join("; ") : ""; };
      o[p + "situacao"] = d ? String(NOMES_STATUS[d.status] || d.status || "").toLowerCase() : "";
      o[p + "face_" + lf.O] = face("O"); o[p + "face_V"] = face("V"); o[p + "face_" + lf.L] = face("L"); o[p + "face_M"] = face("M"); o[p + "face_D"] = face("D");
      o[p + "dor"] = pres ? sn(d.dor) : ""; o[p + "abscesso"] = pres ? sn(d.abscesso) : "";
      o[p + "trat_indicado"] = trat("indicado"); o[p + "trat_realizado"] = trat("realizado"); o[p + "obs"] = d ? d.obs || "" : "";
    });
  }
  return o;
}
/** Linha da aba Exames: as colunas de cada parte, o resumo e o exame completo. @param {any} e */
function linhaExame(e) {
  var o = valoresDoExame(e, false);
  o.resumo_json = JSON.stringify(resumoDoExame(e));
  o.dados_completos_json = registroParaJson(e);
  return CAB_EXAME.map(function (k) { return o[k] == null ? "" : o[k]; });
}
/** Linha do arquivo de análise (Excel): uma linha por exame, com o detalhe de cada dente. @param {any} e */
function linhaAnalise(e) {
  var o = valoresDoExame(e, true);
  return CAB_ANALISE.map(function (k) { return o[k] == null ? "" : o[k]; });
}
// Uma linha por dente (usada na planilha de análise por dente, para gráficos dente a dente).
var CAB_DENTE = ["id_exame", "codigo_individuo", "numero_exame", "situacao_registro", "data_exame", "dsei", "dente", "tipo", "situacao", "sigla",
  "face_oclusal_incisal", "face_vestibular", "face_lingual_palatina", "face_mesial", "face_distal", "dor", "abscesso_fistula", "procedimentos_indicados", "procedimentos_realizados", "observacao"];
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
  var ea = estadosDe(a), eb = estadosDe(b);
  var nums = Object.keys(Object.assign({}, ea, eb)).map(Number).sort(function (x, y) { return x - y; });
  nums.forEach(function (n) {
    var x = ea[n] || "", y = eb[n] || "";
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
