/**
 * Banco de dados do Odontograma (Google Planilhas) - versão 18.
 * Cole este código em: Planilha do Google > Extensões > Apps Script (substituindo o anterior).
 * Este código é igual para todas as instalações: NÃO tem senha nem e-mail escritos nele.
 *
 * INSTALAÇÃO (uma vez só):
 * 1. Configurações do projeto (engrenagem, à esquerda) > Propriedades do script > Adicionar propriedade:
 *      EMAIL_COORDENACAO  =  o e-mail da conta dona desta planilha
 *      CHAVE_COORDENACAO  =  a senha da coordenação para entrar no app
 *    e clique em "Salvar propriedades do script".
 * 2. Volte ao Editor, escolha "testarInstalacao" na lista ao lado de Executar e clique em Executar.
 *    Ela pede as autorizações do Google e mostra "TUDO CERTO" quando estiver pronto para publicar.
 * 3. Escolha "ativarBackupSemanal" e clique em Executar (uma vez só): toda segunda-feira, de madrugada,
 *    uma cópia da planilha é guardada na pasta "Odontograma - backups" do seu Drive.
 *
 * Para trocar a senha da coordenação: mude o valor em Propriedades do script e salve.
 * Não precisa publicar nova versão: vale na hora.
 *
 * VERSÃO 15: na primeira vez que o servidor for usado, a planilha é reorganizada sozinha
 * (abas Exames, Dentes, Acessos, Uso e Dicionário), depois de fazer um backup.
 * Para fazer isso na hora, escolha "reorganizarPlanilha" e clique em Executar.
 *
 * Perfis: cirurgião-dentista, referência técnica (RT) do DSEI e coordenação.
 * - A coordenação titular entra com o EMAIL_COORDENACAO e a CHAVE_COORDENACAO das Propriedades do script.
 *   Só ela adiciona ou desativa outras pessoas da coordenação, que entram com código pessoal.
 * - A coordenação aprova as referências técnicas; cada RT aprova os dentistas do seu DSEI.
 * - Em DSEI sem RT ativa, os pedidos de dentistas vão para a coordenação.
 * - Ao aprovar, o código de acesso pessoal vai por e-mail automaticamente.
 */
const NOME_APP = 'Odontograma · SESAI';

// Backup: quantas cópias semanais guardar (as mais antigas vão para a lixeira do Drive).
const BACKUPS_GUARDADOS = 8;
const PASTA_BACKUP = 'Odontograma - backups';

// Configuração guardada fora do código (Propriedades do script).
/** @param {string} nome */
function propriedade(nome) {
  try { return String(PropertiesService.getScriptProperties().getProperty(nome) || '').trim(); } catch (x) { return ''; }
}
function emailCfg() { return propriedade('EMAIL_COORDENACAO'); }
function chaveCfg() { return propriedade('CHAVE_COORDENACAO'); }

// Recortes com 1 a 4 pessoas aparecem como "<5" no painel, para proteger a identidade.
const MINIMO = 5;

const CAB_USUARIOS = ['id', 'nome', 'cro', 'email', 'uf', 'dsei', 'polo', 'perfil', 'status', 'codigo_hash', 'pedido_em', 'aprovado_por', 'aprovado_em', 'ultimo_acesso'];
const CAB_ACESSOS = ['data', 'hora', 'quem', 'email', 'perfil', 'dsei', 'tipo', 'acao', 'detalhe'];
const CAB_ACESSOS_ANTIGO = ['quando', 'email', 'nome', 'acao', 'detalhe'];
const CAB_USO = ['usuario_id', 'nome', 'email', 'perfil', 'dsei', 'ultimo_acesso', 'entradas_no_mes', 'mes_referencia', 'entradas_total',
  'consultas_equipe', 'exames_validos', 'exames_cancelados', 'ultimo_exame'];
const CAB_DICIONARIO = ['aba', 'coluna', 'descricao', 'valores_possiveis'];
// Versão do formato das abas. Quando muda, a planilha é reorganizada uma vez (com backup antes).
const FORMATO = '15';
const VERSAO = 18;
const MOTIVOS_CANCELAMENTO = ['Digitado errado', 'Exame em duplicidade', 'Pessoa errada', 'Outro'];
// Ações do dia a dia: viram contadores na aba Uso, sem uma linha por vez na aba Acessos.
const ROTINA = { 'Entrou no app': 'entrada', 'Consultou a equipe': 'consulta' };
const TIPO_ACAO = { 'Pediu acesso': 'Cadastro', 'Pediu novo código': 'Cadastro', 'Aprovou acesso': 'Gestão de acesso', 'Recusou acesso': 'Gestão de acesso',
  'Desativou acesso': 'Gestão de acesso', 'Reativou acesso': 'Gestão de acesso', 'Gerou novo código': 'Gestão de acesso', 'Substituiu referência técnica': 'Gestão de acesso',
  'Adicionou coordenação': 'Gestão de acesso', 'Definiu coordenação como RT': 'Gestão de acesso', 'Tirou RT da coordenação': 'Gestão de acesso', 'Tentativa de acesso recusada': 'Segurança', 'Viu um exame': 'Consulta', 'Viu o acompanhamento de uma pessoa': 'Consulta',
  'Cancelou exame': 'Exame', 'Registrou novo exame de pessoa já examinada': 'Exame', 'Backup da planilha': 'Sistema', 'Reorganizou a planilha': 'Sistema' };
let MIGRANDO = false;
const NOME_PERFIL = { dentista: 'cirurgião-dentista', rt: 'referência técnica', coord: 'coordenação' };

function doGet() {
  return saida({ ok: true, mensagem: 'Servidor do odontograma ativo', versao: VERSAO, instalacao: diagnostico() });
}
// O que falta configurar (não mostra senha nem e-mail).
function diagnostico() {
  /** @type {any} */ const d = { email: emailConfigurado() ? 'ok' : 'falta cadastrar EMAIL_COORDENACAO em Propriedades do script', chave: chaveConfigurada() ? 'ok' : 'falta cadastrar CHAVE_COORDENACAO em Propriedades do script' };
  try { d.planilha = SpreadsheetApp.getActiveSpreadsheet() ? 'ok' : 'este código não está dentro de uma planilha (abra pela planilha: Extensões > Apps Script)'; }
  catch (x) { d.planilha = 'sem autorização: rode a função testarInstalacao no Apps Script e publique uma nova versão'; }
  try { MailApp.getRemainingDailyQuota(); d.email_envio = 'ok'; }
  catch (x) { d.email_envio = 'sem autorização: rode a função testarInstalacao no Apps Script e publique uma nova versão'; }
  d.backup = propriedade('ULTIMO_BACKUP') || 'ainda não feito (rode ativarBackupSemanal)';
  d.formato = propriedade('FORMATO_PLANILHA') === FORMATO ? 'ok' : 'será reorganizada no primeiro uso (ou rode reorganizarPlanilha)';
  d.pronto = d.email === 'ok' && d.chave === 'ok' && d.planilha === 'ok' && d.email_envio === 'ok';
  return d;
}
function emailConfigurado() { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailCfg()); }
function chaveConfigurada() { return chaveCfg().length >= 6; }
// Rode esta função no Apps Script antes de publicar (lista ao lado de Executar > testarInstalacao > Executar).
function testarInstalacao() {
  const d = diagnostico();
  Logger.log('E-mail da coordenação: ' + (emailConfigurado() ? emailCfg() : 'FALTA CADASTRAR: Configurações do projeto > Propriedades do script > EMAIL_COORDENACAO'));
  let conta = '';
  try { conta = normEmail(Session.getEffectiveUser().getEmail()); } catch (x) { conta = ''; }
  if (conta) Logger.log('Conta Google em uso agora: ' + conta + (emailConfigurado() && conta !== normEmail(emailCfg()) ? '  ATENÇÃO: é diferente do EMAIL_COORDENACAO. Use a mesma conta (ou corrija em Propriedades do script).' : ''));
  Logger.log('Senha da coordenação: ' + (chaveConfigurada() ? 'cadastrada' : (chaveCfg() ? 'MUITO CURTA: use pelo menos 6 caracteres' : 'FALTA CADASTRAR: Configurações do projeto > Propriedades do script > CHAVE_COORDENACAO')));
  Logger.log('Planilha: ' + (d.planilha === 'ok' ? SpreadsheetApp.getActiveSpreadsheet().getName() : d.planilha));
  Logger.log('Envio de e-mails: ' + (d.email_envio === 'ok' ? MailApp.getRemainingDailyQuota() + ' e-mails disponíveis hoje' : d.email_envio));
  const login = autenticar({ email: emailCfg(), codigo: chaveCfg() });
  Logger.log('Login da coordenação: ' + (login && login.perfil === 'coord' ? 'funciona' : 'NÃO funciona: confira as Propriedades do script'));
  const contaDiferente = !!conta && emailConfigurado() && conta !== normEmail(emailCfg());
  Logger.log('Formato da planilha: ' + (propriedade('FORMATO_PLANILHA') === FORMATO ? 'versão ' + FORMATO + ' (reorganizada)' : 'ainda não reorganizada: acontece sozinha no primeiro uso, ou rode reorganizarPlanilha'));
  Logger.log('Backup semanal: ' + (backupAtivo() ? 'ativado' : 'desativado (rode ativarBackupSemanal)') + (propriedade('ULTIMO_BACKUP') ? ' · último: ' + propriedade('ULTIMO_BACKUP') : ''));
  Logger.log(d.pronto && login && !contaDiferente ? 'TUDO CERTO. Agora publique: Implantar > Gerenciar implantações > lápis > Nova versão > Implantar (ou Nova implantação, na primeira vez).'
                               : 'Ainda falta ajustar o que está indicado acima.');
}

/* ---------- backup semanal ---------- */
// Rode uma vez: agenda o backup para toda segunda-feira de madrugada e já faz o primeiro.
function ativarBackupSemanal() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'fazerBackup') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('fazerBackup').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(3).create();
  fazerBackup();
  Logger.log('Backup semanal ativado: toda segunda-feira, entre 3h e 4h. Primeira cópia já feita na pasta "' + PASTA_BACKUP + '" do seu Drive.');
}
// Para parar os backups automáticos (as cópias já feitas continuam no Drive).
function desativarBackupSemanal() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'fazerBackup') ScriptApp.deleteTrigger(t); });
  Logger.log('Backup semanal desativado.');
}
function backupAtivo() {
  try { return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'fazerBackup'; }); } catch (x) { return false; }
}
// Faz uma cópia da planilha agora (também pode ser rodada à mão, a qualquer momento).
/** @param {string} [motivo] */
function fazerBackup(motivo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pastas = DriveApp.getFoldersByName(PASTA_BACKUP);
  const pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(PASTA_BACKUP);
  const quando = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH-mm');
  try { pasta.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (x) {}
  try { pasta.setDescription('Cópias automáticas do Odontograma. Contêm dados de saúde: não compartilhe esta pasta.'); } catch (x) {}
  // A cópia de antes da reorganização tem outro nome: não entra no rodízio e não vai para a lixeira.
  const copia = DriveApp.getFileById(ss.getId()).makeCopy((motivo ? 'Antes da reorganização - Odontograma ' : 'Backup Odontograma ') + quando, pasta);
  // Guarda só as mais recentes; as antigas vão para a lixeira do Drive (recuperáveis por 30 dias).
  /** @type {any[]} */ const copias = [];
  const it = pasta.getFiles();
  while (it.hasNext()) { const f = it.next(); if (/^Backup Odontograma /.test(f.getName())) copias.push(f); }
  copias.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  copias.slice(BACKUPS_GUARDADOS).forEach(function (f) { f.setTrashed(true); });
  PropertiesService.getScriptProperties().setProperty('ULTIMO_BACKUP', quando);
  registrar({ email: '', nome: 'Sistema' }, 'Backup da planilha', copia.getName());
  return copia.getName();
}

/* ---------- reorganização da planilha (versão 15) ---------- */
function formatoAtual() { return propriedade('FORMATO_PLANILHA') === FORMATO; }
function precisaJuntarAcessos() {
  try { return planilha().getSheets().some(function (a) { return /^Acessos - formato antigo/.test(a.getName()); }); } catch (x) { return false; }
}
// Rode no editor para reorganizar agora (faz backup antes). Também acontece sozinha no primeiro uso.
function reorganizarPlanilha() {
  const t = LockService.getScriptLock(); t.waitLock(30000);
  try {
    const r = reorganizarAgora();
    Logger.log('Planilha reorganizada: ' + r.exames + ' exames, ' + r.dentes + ' linhas de dentes, ' + r.acessos + ' eventos em Acessos, ' + r.uso + ' pessoas em Uso.');
    Logger.log(r.backup ? 'Backup feito antes: ' + r.backup : 'ATENÇÃO: não foi possível fazer o backup antes (' + r.erroBackup + ').');
  } finally { t.releaseLock(); }
}
function garantirFormato() { if (!formatoAtual()) reorganizarAgora(); else juntarAcessosAntigos(); }
// Se uma implantação antiga gravou na aba Acessos no formato antigo, junta tudo de novo numa aba só
// e soma as entradas antigas na aba Uso. Não apaga nenhum evento.
function juntarAcessosAntigos() {
  const ss = planilha();
  const antigas = ss.getSheets().filter(function (a) { return /^Acessos - formato antigo/.test(a.getName()); });
  const atual = ss.getSheetByName('Acessos');
  const atualAntiga = atual && atual.getLastRow() > 0 && String(atual.getRange(1, 1).getValues()[0][0]) === 'quando';
  if (!antigas.length && !atualAntiga) return false;
  MIGRANDO = true;
  try {
    const r = migrarAcessos(ss);
    somarUsoAntigo(r.porEmail);
  } finally { MIGRANDO = false; }
  return true;
}
/** @param {any} porEmail */
function somarUsoAntigo(porEmail) {
  const emails = Object.keys(porEmail || {}); if (!emails.length) return;
  const aba = obterAba(planilha(), 'Uso', CAB_USO);
  const n = aba.getLastRow() - 1;
  const v = n > 0 ? aba.getRange(2, 1, n, CAB_USO.length).getValues() : [];
  const us = lerUsuarios(), porEmailU = {};
  us.forEach(function (x) { porEmailU[normEmail(x.email)] = x; });
  emails.forEach(function (email) {
    const o = porEmail[email];
    let i = v.findIndex(function (l) { return normEmail(l[2]) === email; });
    if (i < 0) {
      const x = porEmailU[email] || (email === emailCoord() ? { id: 'coord', nome: 'Coordenação', email: email, perfil: 'coord', dsei: '' } : null);
      if (!x) return;
      v.push([x.id, x.nome, x.email, perfilTexto(x), x.dsei || '', '', 0, fmtDia(new Date()).slice(0, 7), 0, 0, 0, 0, '']); i = v.length - 1;
    }
    const l = v[i];
    l[8] = (Number(l[8]) || 0) + o.entradas;
    if (String(l[7]) === fmtDia(new Date()).slice(0, 7)) l[6] = (Number(l[6]) || 0) + o.mes;
    l[9] = (Number(l[9]) || 0) + o.consultas;
    if (o.ultimo) { const u = fmtDia(new Date(o.ultimo)) + ' ' + fmtHora(new Date(o.ultimo)); if (u > String(l[5])) l[5] = u; }
  });
  if (v.length) aba.getRange(2, 1, v.length, CAB_USO.length).setValues(v.map(linhaSegura));
}
function reorganizarAgora() {
  const ss = planilha();
  /** @type {any} */ const r = { exames: 0, dentes: 0, acessos: 0, uso: 0, backup: '', erroBackup: '' };
  try { r.backup = fazerBackup('reorganizar'); } catch (x) { r.erroBackup = String(x); }
  MIGRANDO = true;
  try {
    const regs = lerExames().map(sanear);
    const linhasEx = regs.map(linhaExame);
    /** @type {any[]} */ const linhasDe = [];
    regs.forEach(function (e) { linhasDentes(e).forEach(function (l) { linhasDe.push(l); }); });
    reescreverAba(ss, 'Exames', CAB_EXAME, linhasEx, 0);
    reescreverAba(ss, 'Dentes', CAB_DENTE, linhasDe, 1);
    const uso = migrarAcessos(ss);
    r.uso = recalcularUso(ss, regs, uso.porEmail);
    escreverDicionario(ss);
    r.exames = linhasEx.length; r.dentes = linhasDe.length; r.acessos = uso.eventos;
    PropertiesService.getScriptProperties().setProperty('FORMATO_PLANILHA', FORMATO);
  } finally { MIGRANDO = false; }
  registrar({ email: '', nome: 'Sistema' }, 'Reorganizou a planilha', 'Versão ' + FORMATO + ' · ' + r.exames + ' exames' + (r.backup ? ' · backup antes: ' + r.backup : ' · sem backup: ' + r.erroBackup));
  return r;
}
// Tira dados que identificam a pessoa, se algum exame muito antigo ainda os tiver.
/** @param {any} r */
function sanear(r) {
  ['nome', 'cns', 'cartaoSus', 'cartao_sus', 'cpf', 'mae', 'nomeMae', 'endereco', 'telefone'].forEach(function (k) { delete r[k]; });
  if (r.crianca) r.crianca = { nascimento: r.crianca.nascimento || '', sexo: r.crianca.sexo || '' };
  if (!r.codigoIndividuo) r.codigoIndividuo = r.codigo || r.id;
  return r;
}
// Texto que começa com = + - @ viraria fórmula na planilha.
/** @param {any} v */
function celulaSegura(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }
/** @param {any} l */
function linhaSegura(l) { return l.map(celulaSegura); }
/** @param {any} ss @param {string} nome @param {any[]} cab @param {any[]} linhas @param {number} [posicao] */
function reescreverAba(ss, nome, cab, linhas, posicao) {
  const tmpNome = nome + ' (nova)';
  const sobra = ss.getSheetByName(tmpNome); if (sobra) ss.deleteSheet(sobra);
  const nova = ss.insertSheet(tmpNome);
  nova.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold');
  nova.setFrozenRows(1);
  for (let i = 0; i < linhas.length; i += 4000) {
    const bloco = linhas.slice(i, i + 4000).map(function (l) { const x = linhaSegura(l); while (x.length < cab.length) x.push(''); return x.slice(0, cab.length); });
    nova.getRange(2 + i, 1, bloco.length, cab.length).setValues(bloco);
  }
  const velha = ss.getSheetByName(nome); if (velha) ss.deleteSheet(velha);
  nova.setName(nome);
  if (posicao != null) { try { ss.setActiveSheet(nova); ss.moveActiveSheet(posicao + 1); } catch (x) {} }
  return nova;
}
/** @param {any} d */
function fmtDia(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
/** @param {any} d */
function fmtHora(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm'); }
/** @param {any} u */
function perfilTexto(u) { return u.id === 'coord' ? 'coordenação titular' : u.perfil === 'coord' && u.dsei ? 'coordenação e referência técnica' : (NOME_PERFIL[u.perfil] || ''); }
// Junta todas as abas "Acessos" (formato antigo e novo): eventos importantes ficam, entradas viram contadores na aba Uso.
/** @param {any} ss */
function migrarAcessos(ss) {
  const us = lerUsuarios(), porEmailU = {};
  us.forEach(function (x) { porEmailU[normEmail(x.email)] = x; });
  const coord = emailCoord();
  /** @type {any[]} */ const linhas = [];
  /** @type {any} */ const porEmail = {};
  /** @type {any[]} */ const abas = ss.getSheets().filter(function (a) { return /^Acessos/.test(a.getName()); });
  abas.forEach(function (aba) {
    if (aba.getLastRow() < 2) return;
    const v = aba.getDataRange().getValues(), cab = v[0].map(String);
    const antigo = cab[0] === 'quando';
    for (let i = 1; i < v.length; i++) {
      const l = v[i];
      if (antigo) {
        const quando = l[0] instanceof Date ? l[0] : new Date(l[0]);
        const email = normEmail(l[1]), acao = String(l[3] || '');
        if (!acao) continue;
        if (ROTINA[acao]) {
          const o = porEmail[email] = porEmail[email] || { entradas: 0, consultas: 0, ultimo: '', mes: 0 };
          if (ROTINA[acao] === 'entrada') { o.entradas++; if (!isNaN(quando.getTime()) && fmtDia(quando).slice(0, 7) === fmtDia(new Date()).slice(0, 7)) o.mes++; }
          else o.consultas++;
          if (!isNaN(quando.getTime()) && quando.toISOString() > o.ultimo) o.ultimo = quando.toISOString();
          continue;
        }
        const quem = porEmailU[email] || (email && email === coord ? { id: 'coord', perfil: 'coord', nome: 'Coordenação', dsei: '' } : null);
        linhas.push([isNaN(quando.getTime()) ? '' : fmtDia(quando), isNaN(quando.getTime()) ? '' : fmtHora(quando), String(l[2] || (quem ? quem.nome : '') || ''), email,
          quem ? perfilTexto(quem) : '', quem ? quem.dsei || '' : '', TIPO_ACAO[acao] || 'Outro', acao, String(l[4] || '')]);
      } else if (cab[0] === 'data') {
        const x = l.map(function (c) { return c instanceof Date ? fmtDia(c) : c; });
        if (x[7]) linhas.push(x.slice(0, CAB_ACESSOS.length));
      }
    }
  });
  linhas.sort(function (a, b) { return (String(b[0]) + String(b[1])).localeCompare(String(a[0]) + String(a[1])); });
  abas.forEach(function (a) { if (a.getName() !== 'Acessos') ss.deleteSheet(a); });
  reescreverAba(ss, 'Acessos', CAB_ACESSOS, linhas, 2);
  return { eventos: linhas.length, porEmail: porEmail };
}
// Uma linha por pessoa com acesso: entradas, consultas e exames.
/** @param {any} ss @param {any[]} regs @param {any} porEmail */
function recalcularUso(ss, regs, porEmail) {
  const us = lerUsuarios().filter(function (x) { return x.status === 'ativo' || x.status === 'desativado'; });
  const pessoas = us.slice();
  if (emailConfigurado()) pessoas.unshift({ id: 'coord', nome: 'Coordenação', email: emailCoord(), perfil: 'coord', dsei: '', ultimo_acesso: '' });
  const mes = fmtDia(new Date()).slice(0, 7);
  const linhas = pessoas.map(function (x) {
    const o = porEmail[normEmail(x.email)] || { entradas: 0, consultas: 0, ultimo: '', mes: 0 };
    const meus = regs.filter(function (r) { return ehDoUsuario(r, x); });
    const validos = meus.filter(exameValido);
    const ult = validos.reduce(function (m, r) { return String(r.dataExame || '') > m ? String(r.dataExame || '') : m; }, '');
    const ultimoAcesso = [o.ultimo, String(x.ultimo_acesso || '')].sort().pop() || '';
    return [x.id, x.nome, x.email, perfilTexto(x), x.dsei || '', ultimoAcesso ? fmtDia(new Date(ultimoAcesso)) + ' ' + fmtHora(new Date(ultimoAcesso)) : '',
      o.mes, mes, o.entradas, o.consultas, validos.length, meus.length - validos.length, ult];
  });
  reescreverAba(ss, 'Uso', CAB_USO, linhas, 3);
  return linhas.length;
}
/** @param {any} u @param {any} tipo */
function atualizarUso(u, tipo) {
  if (!u || !u.id) return;
  const aba = obterAba(planilha(), 'Uso', CAB_USO);
  const n = aba.getLastRow() - 1;
  const v = n > 0 ? aba.getRange(2, 1, n, CAB_USO.length).getValues() : [];
  let i = v.findIndex(function (l) { return String(l[0]) === String(u.id); });
  const agora = new Date(), mes = fmtDia(agora).slice(0, 7);
  /** @type {any[]} */ let l = i >= 0 ? v[i] : [u.id, u.nome || '', u.email || '', perfilTexto(u), u.dsei || '', '', 0, mes, 0, 0, 0, 0, ''];
  l[1] = u.nome || l[1]; l[2] = u.email || l[2]; l[3] = perfilTexto(u); l[4] = u.dsei || '';
  if (tipo === 'entrada' || tipo === 'consulta') l[5] = fmtDia(agora) + ' ' + fmtHora(agora);
  if (String(l[7]) !== mes) { l[7] = mes; l[6] = 0; }
  if (tipo === 'entrada') { l[6] = (Number(l[6]) || 0) + 1; l[8] = (Number(l[8]) || 0) + 1; }
  if (tipo === 'consulta') l[9] = (Number(l[9]) || 0) + 1;
  if (tipo && typeof tipo === 'object') { l[10] = tipo.validos; l[11] = tipo.cancelados; l[12] = tipo.ultimo; }
  if (i >= 0) aba.getRange(i + 2, 1, 1, CAB_USO.length).setValues([linhaSegura(l)]);
  else aba.appendRow(linhaSegura(l));
}
/** @param {any} u @param {any[]} regs */
function atualizarUsoExames(u, regs) {
  const meus = regs.filter(function (r) { return ehDoUsuario(r, u); }), validos = meus.filter(exameValido);
  const ult = validos.reduce(function (m, r) { return String(r.dataExame || '') > m ? String(r.dataExame || '') : m; }, '');
  try { atualizarUso(u, /** @type {any} */ ({ validos: validos.length, cancelados: meus.length - validos.length, ultimo: ult })); } catch (x) {}
}


/** @param {any} e */
function doPost(e) {
  /** @type {any} */ let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return saida({ ok: false, erro: 'Pedido inválido.' }); }
  if (!d.acao) return saida({ ok: false, erro: 'Esta versão do app está desatualizada. Abra o app com internet e recarregue a página para receber a versão com acesso individual.' });
  const A = ACOES[d.acao];
  if (!A) return saida({ ok: false, erro: 'Ação desconhecida: ' + d.acao });
  // Na primeira vez depois de atualizar o código, reorganiza a planilha (com backup antes).
  if (!formatoAtual() || precisaJuntarAcessos()) {
    const tf = LockService.getScriptLock(); tf.waitLock(30000);
    try { garantirFormato(); } catch (err) { return saida({ ok: false, erro: 'Não foi possível reorganizar a planilha: ' + err }); } finally { tf.releaseLock(); }
  }
  const trava = A.escreve ? LockService.getScriptLock() : null;
  if (trava) trava.waitLock(30000);
  try {
    if (A.publica) return saida(A.fn(d));
    const u = autenticar(d);
    if (!u) {
      if (d.email) registrar({ email: d.email, nome: '' }, 'Tentativa de acesso recusada', d.acao);
      return saida({ ok: false, semAcesso: true, erro: 'E-mail ou código de acesso inválido, ou acesso desativado.' });
    }
    if (A.perfis && A.perfis.indexOf(u.perfil) < 0) return saida({ ok: false, erro: 'Seu perfil não tem permissão para isso.' });
    return saida(A.fn(d, u));
  } catch (err) {
    return saida({ ok: false, erro: 'Erro no servidor: ' + err });
  } finally {
    if (trava) trava.releaseLock();
  }
}

const ACOES = {
  pedirAcesso:    { publica: true, escreve: true, fn: pedirAcesso },
  reenviarCodigo: { publica: true, escreve: true, fn: reenviarCodigo },
  entrar:         { fn: entrar },
  enviarExame:    { escreve: true, fn: enviarExame },
  painel:         { fn: painel },
  meusExames:     { fn: meusExames },
  verExame:       { fn: verExame },
  equipe:         { perfis: ['rt', 'coord'], fn: equipe },
  aprovar:        { perfis: ['rt', 'coord'], escreve: true, fn: aprovar },
  recusar:        { perfis: ['rt', 'coord'], escreve: true, fn: recusar },
  desativar:      { perfis: ['rt', 'coord'], escreve: true, fn: function (d, u) { return mudarStatus(d, u, 'desativado'); } },
  reativar:       { perfis: ['rt', 'coord'], escreve: true, fn: function (d, u) { return mudarStatus(d, u, 'ativo'); } },
  novoCodigo:     { perfis: ['rt', 'coord'], escreve: true, fn: novoCodigoPara },
  admin:          { perfis: ['coord'], fn: admin },
  substituirRT:   { perfis: ['coord'], escreve: true, fn: substituirRT },
  adicionarCoord: { perfis: ['coord'], escreve: true, fn: adicionarCoord },
  definirRtCoord: { perfis: ['coord'], escreve: true, fn: definirRtCoord },
  cancelarExame:  { escreve: true, fn: cancelarExame },
  buscarPessoa:   { fn: buscarPessoa },
  pessoa:         { fn: pessoa },
  acompanhamento: { fn: acompanhamento }
};

/* ---------- usuários ---------- */
const normEmail = s => String(s || '').trim().toLowerCase();
const normCro = s => String(s || '').replace(/\D/g, '') || String(s || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
function emailCoord() {
  if (emailConfigurado()) return normEmail(emailCfg());
  try { return normEmail(Session.getEffectiveUser().getEmail()); } catch (x) { return ''; }
}
function planilha() { return SpreadsheetApp.getActiveSpreadsheet(); }
function lerUsuarios() {
  const aba = obterAba(planilha(), 'Usuarios', CAB_USUARIOS);
  if (aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB_USUARIOS.length).getValues().map(function (l, i) {
    const u = { _linha: i + 2 };
    CAB_USUARIOS.forEach(function (k, j) { u[k] = l[j] instanceof Date ? l[j].toISOString() : String(l[j]); });
    return u;
  }).filter(function (u) { return u.id; });
}
/** @param {any} u */
function salvarUsuario(u) {
  const aba = obterAba(planilha(), 'Usuarios', CAB_USUARIOS);
  const linha = CAB_USUARIOS.map(function (k) { return u[k] == null ? '' : u[k]; });
  if (u._linha) aba.getRange(u._linha, 1, 1, linha.length).setValues([linha]);
  else { aba.appendRow(linha); u._linha = aba.getLastRow(); }
}
/** @param {any} u */
function publico(u) {
  const o = {};
  ['id', 'nome', 'cro', 'email', 'uf', 'dsei', 'polo', 'perfil', 'status', 'pedido_em', 'aprovado_por', 'aprovado_em', 'ultimo_acesso', 'titular'].forEach(function (k) { o[k] = u[k] || ''; });
  return o;
}
/** @param {any} c */
function hashCodigo(c) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(c || '').replace(/[\s-]/g, '').toUpperCase());
  return Utilities.base64Encode(b);
}
function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', uuid = Utilities.getUuid().replace(/-/g, '');
  let c = '';
  for (let i = 0; i < 12; i++) c += letras.charAt((parseInt(uuid.substr(i * 2, 2), 16) + Math.floor(Math.random() * 256)) % letras.length);
  return c.slice(0, 4) + '-' + c.slice(4, 8) + '-' + c.slice(8);
}
/** @param {any} d */
function autenticar(d) {
  const email = normEmail(d.email), cod = String(d.codigo || '').trim();
  if (!email || !cod) return null;
  if (email && email === emailCoord() && chaveConfigurada() && cod === chaveCfg()) {
    return { id: 'coord', nome: 'Coordenação', email: email, perfil: 'coord', dsei: '', uf: '', cro: '', polo: '', status: 'ativo', titular: 'sim' };
  }
  const h = hashCodigo(cod);
  const u = lerUsuarios().filter(function (x) { return normEmail(x.email) === email && x.status === 'ativo' && x.codigo_hash === h; })[0];
  if (!u) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  if (String(u.ultimo_acesso).slice(0, 10) !== hoje) { u.ultimo_acesso = new Date().toISOString(); salvarUsuario(u); }
  return u;
}
/** @param {any} u @param {any} acao @param {any} detalhe */
function registrar(u, acao, detalhe) {
  if (MIGRANDO) return;
  try {
    if (ROTINA[acao]) return atualizarUso(u, ROTINA[acao]);
    const aba = obterAba(planilha(), 'Acessos', CAB_ACESSOS), agora = new Date();
    const linha = linhaSegura([fmtDia(agora), fmtHora(agora), u.nome || '', u.email || '', perfilTexto(u), u.dsei || '', TIPO_ACAO[acao] || 'Outro', acao, detalhe || '']);
    // Mais recente em cima.
    aba.insertRowAfter(1);
    aba.getRange(2, 1, 1, linha.length).setValues([linha]);
  } catch (x) {}
}
/** @param {any} dsei */
function rtsDo(dsei) { return lerUsuarios().filter(function (x) { return ehRT(x) && x.status === 'ativo' && x.dsei === dsei; }); }
// RT do DSEI: perfil "rt" ou pessoa da coordenação com DSEI (coordenação e RT no mesmo acesso).
/** @param {any} x */
function ehRT(x) { return x.perfil === 'rt' || (x.perfil === 'coord' && !!x.dsei); }
/** @param {any} u @param {any} alvo */
function podeGerir(u, alvo) {
  // Só a coordenação titular mexe nas outras pessoas da coordenação.
  if (alvo.perfil === 'coord') return !!u.titular && alvo.id !== u.id;
  if (u.perfil === 'coord') return true;
  return u.perfil === 'rt' && alvo.perfil === 'dentista' && alvo.dsei === u.dsei && alvo.id !== u.id;
}

/* ---------- e-mails ---------- */
function enviarEmail(para, assunto, texto) {
  try { MailApp.sendEmail({ to: para, subject: assunto, body: texto, name: NOME_APP }); return true; } catch (x) { return false; }
}
/** @param {any} u @param {any} codigo @param {any} link @param {any} novo */
function emailCodigo(u, codigo, link, novo) {
  return enviarEmail(u.email, novo ? 'Seu novo código de acesso ao Odontograma' : 'Seu acesso ao Odontograma foi aprovado',
    'Olá, ' + u.nome + '.\n\n' +
    (novo ? 'Foi gerado um novo código de acesso para você. O código anterior deixou de funcionar.\n\n'
          : 'Seu acesso como ' + NOME_PERFIL[u.perfil] + (u.dsei ? (u.perfil === 'coord' ? ' e referência técnica' : '') + ' do DSEI ' + u.dsei : '') + ' foi aprovado.\n\n') +
    'Abra o app' + (link ? ' (' + link + ')' : '') + ', toque em "Já tenho um código" e digite:\n\n' +
    '    E-mail: ' + u.email + '\n    Código: ' + codigo + '\n\n' +
    'O código é pessoal: não compartilhe. Você pode entrar com ele no celular e no computador.\n' +
    'Se perder o código, peça outro no próprio app, em "Esqueci meu código".\n\n' + NOME_APP);
}

/* ---------- ações públicas ---------- */
function pedirAcesso(d) {
  const email = normEmail(d.email), perfil = d.perfil === 'rt' ? 'rt' : 'dentista';
  const nome = String(d.nome || '').trim(), cro = String(d.cro || '').trim(), dsei = String(d.dsei || '').trim();
  if (!nome || !cro || !dsei || !d.uf) return { ok: false, erro: 'Preencha nome, CRO, UF e DSEI.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, erro: 'E-mail inválido.' };
  if (email === emailCoord()) return { ok: false, erro: 'Este é o e-mail da coordenação: entre com a chave da coordenação.' };
  const todos = lerUsuarios(), ex = todos.filter(function (x) { return normEmail(x.email) === email; })[0];
  if (ex && ex.status === 'ativo') return { ok: false, erro: 'Este e-mail já tem acesso. Use "Esqueci meu código" para receber um novo.' };
  if (ex && ex.status === 'pendente') return { ok: false, erro: 'Já existe um pedido com este e-mail aguardando aprovação.' };
  const u = ex || { id: Utilities.getUuid().slice(0, 8) };
  Object.assign(u, { nome: nome, cro: cro, email: email, uf: String(d.uf || ''), dsei: dsei, polo: String(d.polo || '').trim(), perfil: perfil,
    status: 'pendente', codigo_hash: '', pedido_em: new Date().toISOString(), aprovado_por: '', aprovado_em: '' });
  salvarUsuario(u);
  registrar(u, 'Pediu acesso', NOME_PERFIL[perfil] + ' · DSEI ' + dsei);
  const rts = perfil === 'dentista' ? rtsDo(dsei) : [];
  const destinos = rts.length ? rts.map(function (x) { return x.email; }) : [emailCoord()];
  enviarEmail(destinos.join(','), 'Novo pedido de acesso ao Odontograma',
    nome + ' (CRO ' + cro + ') pediu acesso como ' + NOME_PERFIL[perfil] + ' do DSEI ' + dsei + '.\n\nAbra o app' + (d.link ? ' (' + d.link + ')' : '') +
    ' e vá em "' + (rts.length ? 'Equipe' : 'Administração') + '" para aprovar ou recusar.\n\n' + NOME_APP);
  return { ok: true, para: rts.length ? 'a referência técnica do DSEI ' + dsei : 'a coordenação' };
}
/** @param {any} d */
function reenviarCodigo(d) {
  const email = normEmail(d.email);
  const u = lerUsuarios().filter(function (x) { return normEmail(x.email) === email && x.status === 'ativo'; })[0];
  if (u) { const c = gerarCodigo(); u.codigo_hash = hashCodigo(c); salvarUsuario(u); emailCodigo(u, c, d.link, true); registrar(u, 'Pediu novo código', ''); }
  return { ok: true };
}

/* ---------- ações de quem tem acesso ---------- */
function entrar(d, u) {
  registrar(u, 'Entrou no app', d.aparelho || '');
  return { ok: true, usuario: publico(u) };
}
/** @param {any} r */
function autorDe(r) { return r.usuarioId || ''; }
/** @param {any} r @param {any} u */
function ehDoUsuario(r, u) {
  if (r.usuarioId) return r.usuarioId === u.id;
  return !!u.cro && normCro((r.profissional || {}).cro) === normCro(u.cro);
}
// Ordem dos exames de uma pessoa: data do exame e, no mesmo dia, a hora em que foi criado.
/** @param {any} a @param {any} b */
function ordemExame(a, b) { return String(a.dataExame || '').localeCompare(String(b.dataExame || '')) || String(a.criadoEm || '').localeCompare(String(b.criadoEm || '')); }
// Exame que serve de comparação: o último antes deste; se este for o mais antigo, o primeiro depois dele.
/** @param {any[]} daPessoa @param {any} reg */
function exameReferencia(daPessoa, reg) {
  const l = daPessoa.slice().sort(ordemExame);
  const antes = l.filter(function (r) { return ordemExame(r, reg) <= 0; });
  return antes.length ? antes[antes.length - 1] : l[0];
}
/** @param {any} reg */
function gravarRegistro(reg) {
  const exames = obterAba(planilha(), 'Exames', CAB_EXAME);
  const dentes = obterAba(planilha(), 'Dentes', CAB_DENTE);
  removerLinhas(exames, reg.id);
  removerLinhas(dentes, reg.id);
  exames.appendRow(linhaSegura(linhaExame(reg)));
  const ld = linhasDentes(reg).map(linhaSegura);
  if (ld.length) dentes.getRange(dentes.getLastRow() + 1, 1, ld.length, ld[0].length).setValues(ld);
}
// Atualiza o número (1º, 2º...) dos outros exames da pessoa, se a ordem mudou.
/** @param {any[]} regs @param {string} cod @param {string} excetoId */
function renumerarPessoa(regs, cod, excetoId) {
  regs.filter(function (r) { return exameValido(r) && codigoIndividuoDe(r) === cod; }).sort(ordemExame).forEach(function (r, i) {
    if (r.numeroExame !== i + 1) { r.numeroExame = i + 1; if (r.id !== excetoId) gravarRegistro(r); }
  });
}
/** @param {any} d @param {any} u */
function enviarExame(d, u) {
  /** @type {any} */ let reg = d.registro;
  if (!reg && d.linhaExame && d.cabecalhoExame) {
    // App antigo (versão 14 ou anterior): os dados completos vêm dentro da linha.
    try { reg = JSON.parse(d.linhaExame[d.cabecalhoExame.indexOf('dados_completos_json')]); } catch (x) { reg = null; }
  }
  if (!reg || !reg.id || !reg.resultado) return { ok: false, erro: 'Exame incompleto.' };
  const regs = lerExames();
  const anterior = regs.filter(function (r) { return r.id === reg.id; })[0];
  // Só quem fez o exame pode alterá-lo.
  if (anterior && !ehDoUsuario(anterior, u)) return { ok: false, erro: 'Só o profissional que fez este exame pode alterá-lo.' };
  if (anterior && !exameValido(anterior)) return { ok: false, erro: 'Este exame foi cancelado e não pode ser alterado.' };
  // Exame feito por outra pessoa no mesmo aparelho: espera o dono entrar para ser enviado.
  if (!anterior && reg.dono && reg.dono !== u.id) return { ok: false, erro: 'Este exame foi feito por outro profissional neste aparelho e só pode ser enviado por ele.' };
  reg = sanear(JSON.parse(registroParaJson(reg)));
  if (u.id === 'coord') return { ok: false, erro: 'A coordenação titular não registra exames.' };
  if (u.perfil === 'coord' && !u.dsei) return { ok: false, erro: 'Para registrar exames, a pessoa da coordenação precisa ser também RT de um DSEI.' };
  reg.profissional = { nome: u.nome, cro: u.cro };
  reg.usuarioId = u.id;
  reg.situacao = 'valido'; delete reg.cancelamento;
  if (anterior && anterior.criadoEm) reg.criadoEm = anterior.criadoEm;
  const outros = regs.filter(function (r) { return r.id !== reg.id; });
  const v = reg.vinculo;
  let novoVinculo = false;
  if (v && v.codigoIndividuo) {
    // Mesma pessoa: confere dente a dente com o exame anterior.
    const daPessoa = outros.filter(function (r) { return exameValido(r) && codigoIndividuoDe(r) === v.codigoIndividuo; });
    if (!daPessoa.length) return { ok: false, vinculoInvalido: true, erro: 'A pessoa ' + v.codigoIndividuo + ' não tem mais exames válidos (o exame anterior pode ter sido cancelado). Abra este exame e confirme de novo se é a mesma pessoa.' };
    if (daPessoa[0].dsei !== reg.dsei) return { ok: false, vinculoInvalido: true, erro: 'A pessoa ' + v.codigoIndividuo + ' é de outro DSEI. Só dá para juntar exames do mesmo DSEI.' };
    const ref = exameReferencia(daPessoa, reg);
    const alertas = conferirVinculo(ref, reg);
    const imp = alertas.filter(function (a) { return a.nivel === 'impossivel'; });
    if (imp.length) return { ok: false, conferencia: alertas, anterior: ref,
      erro: 'Não combina com o exame de ' + dataBR(ref.dataExame) + ' da pessoa ' + v.codigoIndividuo + ': ' + imp.map(function (a) { return 'dente ' + a.dente + ' ' + a.texto; }).join(' ') + ' Confira os dentes ou marque que não é a mesma pessoa.' };
    const conf = alertas.filter(function (a) { return a.nivel === 'confira'; }), chaves = v.chaves || [];
    const falta = conf.filter(function (a) { return chaves.indexOf(a.chave) < 0; });
    if (falta.length) return { ok: false, conferencia: alertas, anterior: ref,
      erro: 'Falta conferir na boca: ' + falta.map(function (a) { return 'dente ' + a.dente + ' (' + a.texto + ')'; }).join('; ') + '.' };
    novoVinculo = !(anterior && anterior.vinculo && anterior.vinculo.codigoIndividuo === v.codigoIndividuo);
    reg.codigoIndividuo = v.codigoIndividuo;
    reg.vinculo = { anteriorId: ref.id, codigoIndividuo: v.codigoIndividuo, chaves: conf.map(function (a) { return a.chave; }),
      conferidos: conf.map(function (a) { return 'dente ' + a.dente + ': ' + a.texto + ' (conferido na boca)'; }) };
  } else {
    delete reg.vinculo;
    const eraRaiz = anterior && !(anterior.vinculo && anterior.vinculo.codigoIndividuo) && anterior.codigoIndividuo;
    if (eraRaiz) reg.codigoIndividuo = anterior.codigoIndividuo;
    else {
      // Pessoa nova: o código do indivíduo é o código do exame, sem repetir o de outra pessoa.
      const usados = {};
      outros.forEach(function (r) { usados[codigoIndividuoDe(r)] = 1; });
      const base = reg.codigo || reg.id;
      let cod = base, k = 2;
      while (usados[cod]) cod = base + '-' + (k++);
      reg.codigoIndividuo = cod;
    }
  }
  const todos = outros.concat([reg]);
  renumerarPessoa(todos, reg.codigoIndividuo, reg.id);
  if (anterior && anterior.codigoIndividuo && anterior.codigoIndividuo !== reg.codigoIndividuo) renumerarPessoa(todos, anterior.codigoIndividuo, reg.id);
  if (!reg.numeroExame) reg.numeroExame = 1;
  gravarRegistro(reg);
  if (novoVinculo) registrar(u, 'Registrou novo exame de pessoa já examinada', reg.codigoIndividuo + ' · ' + reg.numeroExame + 'º exame · DSEI ' + reg.dsei);
  atualizarUsoExames(u, todos);
  return { ok: true, id: reg.id, codigoIndividuo: reg.codigoIndividuo, numeroExame: reg.numeroExame, vinculo: reg.vinculo || null };
}
/** @param {any} d @param {any} u */
function cancelarExame(d, u) {
  const regs = lerExames(), r = regs.filter(function (x) { return x.id === d.id; })[0];
  if (!r) return { ok: false, erro: 'Exame não encontrado na nuvem. Se ele ainda não foi enviado, use "Excluir" em Meus exames.' };
  if (!ehDoUsuario(r, u)) return { ok: false, erro: 'Só o profissional que fez o exame pode cancelá-lo.' };
  if (!exameValido(r)) return { ok: false, erro: 'Este exame já está cancelado.' };
  const motivo = String(d.motivo || ''), obs = String(d.observacao || '').trim();
  if (MOTIVOS_CANCELAMENTO.indexOf(motivo) < 0) return { ok: false, erro: 'Escolha o motivo do cancelamento.' };
  if (motivo === 'Outro' && !obs) return { ok: false, erro: 'Explique o motivo em "Outro motivo".' };
  r.situacao = 'cancelado';
  r.cancelamento = { motivo: motivo, observacao: obs, em: new Date().toISOString(), por: u.nome };
  r.atualizadoEm = new Date().toISOString();
  gravarRegistro(r);
  renumerarPessoa(regs, codigoIndividuoDe(r), r.id);
  registrar(u, 'Cancelou exame', (r.codigo || r.id) + ' · ' + motivo + (obs ? ': ' + obs : ''));
  atualizarUsoExames(u, regs);
  return { ok: true, exame: r };
}
/** @param {any} t */
function normTexto(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
// Pessoas já examinadas no DSEI com a mesma aldeia, data de nascimento e sexo.
/** @param {any} d @param {any} u */
function buscarPessoa(d, u) {
  const dsei = String(d.dsei || ''), aldeia = normTexto(d.aldeia), nasc = String(d.nascimento || ''), sexo = String(d.sexo || '');
  if (!dsei || !aldeia || !nasc || (sexo !== 'F' && sexo !== 'M')) return { ok: true, candidatos: [] };
  const nomePor = nomesUsuarios();
  /** @type {any} */ const grupos = {};
  lerExames().forEach(function (r) {
    if (!exameValido(r) || r.id === d.excetoId || r.dsei !== dsei || normTexto(r.aldeia) !== aldeia) return;
    if ((r.crianca || {}).nascimento !== nasc || (r.crianca || {}).sexo !== sexo) return;
    const k = codigoIndividuoDe(r); (grupos[k] = grupos[k] || []).push(r);
  });
  const candidatos = Object.keys(grupos).map(function (k) {
    const l = grupos[k].sort(ordemExame), ult = l[l.length - 1];
    ult.profissionalNome = nomePor[ult.usuarioId] || (ult.profissional || {}).nome || '';
    return { codigoIndividuo: k, exames: l.length, ultimo: ult };
  }).sort(function (a, b) { return String(b.ultimo.dataExame).localeCompare(String(a.ultimo.dataExame)); }).slice(0, 5);
  return { ok: true, candidatos: candidatos };
}
function nomesUsuarios() {
  /** @type {any} */ const m = { coord: 'Coordenação' };
  lerUsuarios().forEach(function (x) { m[x.id] = x.nome; });
  return m;
}
// Quem pode ver a linha do tempo de uma pessoa: coordenação, RT do DSEI e quem já examinou a pessoa.
/** @param {any[]} l @param {any} u */
function podeVerPessoa(l, u) {
  if (u.perfil === 'coord') return true;
  if (u.perfil === 'rt' && l.some(function (r) { return r.dsei === u.dsei; })) return true;
  return l.some(function (r) { return ehDoUsuario(r, u); });
}
/** @param {any} d @param {any} u */
function pessoa(d, u) {
  const cod = String(d.codigoIndividuo || '');
  const l = lerExames().filter(function (r) { return exameValido(r) && codigoIndividuoDe(r) === cod; }).sort(ordemExame);
  if (!l.length) return { ok: false, erro: 'Pessoa não encontrada.' };
  if (!podeVerPessoa(l, u)) return { ok: false, erro: 'Você não tem acesso aos exames desta pessoa.' };
  const nomePor = nomesUsuarios();
  l.forEach(function (r) { r.profissionalNome = nomePor[r.usuarioId] || (r.profissional || {}).nome || ''; });
  if (!l.every(function (r) { return ehDoUsuario(r, u); })) registrar(u, 'Viu o acompanhamento de uma pessoa', cod + ' · DSEI ' + l[0].dsei);
  return { ok: true, codigoIndividuo: cod, exames: l };
}
/** @param {any} a @param {any} b */
function mesesEntre(a, b) {
  const x = new Date(String(a) + 'T12:00:00'), y = new Date(String(b) + 'T12:00:00');
  return isNaN(x.getTime()) || isNaN(y.getTime()) ? 0 : (y.getTime() - x.getTime()) / (30.4375 * 864e5);
}
// Acompanhamento: pessoas com 2 ou mais exames, primeiro × último exame.
/** @param {any} p @param {any} u */
function acompanhamento(p, u) {
  const regs = lerExames().filter(exameValido);
  /** @type {any} */ const grupos = {};
  regs.forEach(function (r) { const k = codigoIndividuoDe(r); (grupos[k] = grupos[k] || []).push(r); });
  let pessoas = Object.keys(grupos).map(function (k) { return { cod: k, l: grupos[k].sort(ordemExame) }; });
  if (p.minha) pessoas = pessoas.filter(function (x) { return x.l.some(function (r) { return ehDoUsuario(r, u); }); });
  else if (p.dsei) pessoas = pessoas.filter(function (x) { return x.l[0].dsei === p.dsei; });
  const CL = 'ABCDEF';
  const seg = pessoas.filter(function (x) { return x.l.length >= 2; }).map(function (x) {
    const a = x.l[0], b = x.l[x.l.length - 1], ca = CL.indexOf((a.resultado || {}).classe), cb = CL.indexOf((b.resultado || {}).classe);
    return { cod: x.cod, l: x.l, a: a, b: b, evol: cb < ca ? 'menor' : cb > ca ? 'maior' : 'igual',
      carieNova: mudancasDentes(a, b).filter(function (m) { return m.tipo === 'carie_nova'; }).length,
      meses: mesesEntre(a.dataExame, b.dataExame), faixa: faixaEtaria(a.idadeAnos) };
  });
  const sigilo = !p.minha;
  /** @param {any} v */
  const n5 = function (v) { return sigilo ? ocultarNumero(v) : v; };
  /** @param {any[]} l @param {any} f */
  const media = function (l, f) { return (!sigilo || l.length >= MINIMO) && l.length ? Math.round(l.reduce(function (s, x) { return s + f(x); }, 0) / l.length * 10) / 10 : null; };
  /** @param {any[]} l */
  const resumo = function (l) {
    return { n: n5(l.length), menor: n5(l.filter(function (x) { return x.evol === 'menor'; }).length), igual: n5(l.filter(function (x) { return x.evol === 'igual'; }).length),
      maior: n5(l.filter(function (x) { return x.evol === 'maior'; }).length),
      cariados1: media(l, function (x) { return cariadosDe(x.a); }), cariadosU: media(l, function (x) { return cariadosDe(x.b); }),
      dor1: n5(l.filter(function (x) { return dentesComDor(x.a).length; }).length), dorU: n5(l.filter(function (x) { return dentesComDor(x.b).length; }).length),
      carieNova: n5(l.filter(function (x) { return x.carieNova > 0; }).length) };
  };
  const geral = Object.assign(resumo(seg), { examinadas: n5(pessoas.length), intervaloMeses: media(seg, function (x) { return x.meses; }) });
  const porFaixa = FAIXAS_ETARIAS.map(function (f) { const l = seg.filter(function (x) { return x.faixa === f; }); return Object.assign({ faixa: f }, resumo(l)); })
    .filter(function (x) { return x.n !== 0; });
  // Lista por pessoa, conforme o perfil.
  const visiveis = seg.filter(function (x) { return u.perfil === 'coord' || (u.perfil === 'rt' && x.a.dsei === u.dsei) || x.l.some(function (r) { return ehDoUsuario(r, u); }); });
  const lista = visiveis.sort(function (x, y) { return String(y.b.dataExame).localeCompare(String(x.b.dataExame)); }).slice(0, 500).map(function (x) {
    return { codigo: x.cod, sexo: (x.a.crianca || {}).sexo || '', nascimento: (x.a.crianca || {}).nascimento || '', dsei: x.a.dsei, aldeia: x.a.aldeia || '',
      data1: x.a.dataExame, dataU: x.b.dataExame, idade1: x.a.idadeAnos, idadeU: x.b.idadeAnos, exames: x.l.length, faixa: x.faixa,
      classe1: (x.a.resultado || {}).classe || '', classeU: (x.b.resultado || {}).classe || '', evol: x.evol,
      cariados1: cariadosDe(x.a), cariadosU: cariadosDe(x.b), carieNova: x.carieNova, dor1: dentesComDor(x.a).length, dorU: dentesComDor(x.b).length,
      conferido: x.l.some(function (r) { return r.vinculo && r.vinculo.conferidos && r.vinculo.conferidos.length; }) };
  });
  return { ok: true, versao: VERSAO, geral: geral, porFaixa: porFaixa, lista: lista, sigilo: sigilo };
}
/** @param {any} d @param {any} u */
function meusExames(d, u) {
  const l = lerExames().filter(function (r) { return ehDoUsuario(r, u); })
    .sort(function (a, b) { return String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || '')); }).slice(0, 1000);
  return { ok: true, exames: l };
}
/** @param {any} d @param {any} u */
function verExame(d, u) {
  const r = lerExames().filter(function (x) { return x.id === d.id; })[0];
  if (!r) return { ok: false, erro: 'Exame não encontrado.' };
  const pode = u.perfil === 'coord' || ehDoUsuario(r, u) || (u.perfil === 'rt' && r.dsei === u.dsei);
  if (!pode) return { ok: false, erro: 'Você não tem acesso a este exame.' };
  if (!ehDoUsuario(r, u)) registrar(u, 'Viu um exame', (r.codigo || r.id) + ' · DSEI ' + r.dsei);
  return { ok: true, exame: r };
}
/** @param {any} d @param {any} u */
function equipe(d, u) {
  const dsei = u.perfil === 'rt' ? u.dsei : String(d.dsei || '');
  if (!dsei) return { ok: false, erro: 'Escolha o DSEI.' };
  const us = lerUsuarios().filter(function (x) { return x.dsei === dsei && x.status !== 'recusado'; });
  const regs = lerExames();
  const mes = new Date().toISOString().slice(0, 7);
  const membros = us.filter(function (x) { return x.status !== 'pendente'; }).map(function (x) {
    const meus = regs.filter(function (r) { return exameValido(r) && ehDoUsuario(r, x); });
    const ult = meus.reduce(function (m, r) { const t = String(r.atualizadoEm || r.dataExame || ''); return t > m ? t : m; }, '');
    return Object.assign(publico(x), { total: meus.length, mes: meus.filter(function (r) { return String(r.dataExame || '').slice(0, 7) === mes; }).length, ultimoEnvio: ult });
  });
  const nomePor = {};
  us.forEach(function (x) { nomePor[x.id] = x.nome; });
  const exames = regs.filter(function (r) { return r.dsei === dsei; })
    .sort(function (a, b) { return String(b.dataExame || '').localeCompare(String(a.dataExame || '')); }).slice(0, 500)
    .map(function (r) { return { id: r.id, codigo: r.codigo || '', codigoIndividuo: codigoIndividuoDe(r), numeroExame: r.numeroExame || 1, situacao: exameValido(r) ? 'valido' : 'cancelado',
      motivo: (r.cancelamento || {}).motivo || '', dataExame: r.dataExame, profissional: nomePor[r.usuarioId] || (r.profissional || {}).nome || '', usuarioId: r.usuarioId || '',
      idade: r.idadeAnos, classe: (r.resultado || {}).classe || '', ceod: ((r.resultado || {}).ceod || {}).total, cpod: ((r.resultado || {}).cpod || {}).total }; });
  const pedidos = us.filter(function (x) { return x.status === 'pendente' && (x.perfil === 'dentista' || u.perfil === 'coord'); }).map(publico);
  registrar(u, 'Consultou a equipe', 'DSEI ' + dsei);
  return { ok: true, dsei: dsei, membros: membros, pedidos: pedidos, exames: exames };
}
/** @param {any} d */
function alvoDe(d) { return lerUsuarios().filter(function (x) { return x.id === d.id; })[0]; }
/** @param {any} d @param {any} u */
function aprovar(d, u) {
  const a = alvoDe(d);
  if (!a || a.status !== 'pendente') return { ok: false, erro: 'Pedido não encontrado ou já analisado.' };
  if (!podeGerir(u, a)) return { ok: false, erro: a.perfil === 'rt' ? 'Só a coordenação aprova referências técnicas.' : 'Você só aprova dentistas do seu DSEI.' };
  const c = gerarCodigo();
  Object.assign(a, { status: 'ativo', codigo_hash: hashCodigo(c), aprovado_por: u.nome, aprovado_em: new Date().toISOString() });
  salvarUsuario(a);
  const foi = emailCodigo(a, c, d.link, false);
  registrar(u, 'Aprovou acesso', a.nome + ' · ' + NOME_PERFIL[a.perfil] + ' · DSEI ' + a.dsei);
  return { ok: true, emailEnviado: foi, codigo: foi ? '' : c };
}
/** @param {any} d @param {any} u */
function recusar(d, u) {
  const a = alvoDe(d);
  if (!a || a.status !== 'pendente') return { ok: false, erro: 'Pedido não encontrado ou já analisado.' };
  if (!podeGerir(u, a)) return { ok: false, erro: 'Você não pode analisar este pedido.' };
  a.status = 'recusado'; salvarUsuario(a);
  enviarEmail(a.email, 'Pedido de acesso ao Odontograma', 'Olá, ' + a.nome + '.\n\nSeu pedido de acesso como ' + NOME_PERFIL[a.perfil] + ' do DSEI ' + a.dsei +
    ' não foi aprovado. Em caso de dúvida, procure a referência técnica do seu DSEI ou a coordenação.\n\n' + NOME_APP);
  registrar(u, 'Recusou acesso', a.nome + ' · DSEI ' + a.dsei);
  return { ok: true };
}
/** @param {any} d @param {any} u @param {any} status */
function mudarStatus(d, u, status) {
  const a = alvoDe(d);
  if (!a || a.status === 'pendente') return { ok: false, erro: 'Usuário não encontrado.' };
  if (!podeGerir(u, a)) return { ok: false, erro: 'Você não pode alterar este acesso.' };
  a.status = status; salvarUsuario(a);
  registrar(u, status === 'ativo' ? 'Reativou acesso' : 'Desativou acesso', a.nome + ' · DSEI ' + a.dsei);
  return { ok: true };
}
/** @param {any} d @param {any} u */
function novoCodigoPara(d, u) {
  const a = alvoDe(d);
  if (!a || a.status !== 'ativo') return { ok: false, erro: 'O acesso precisa estar ativo.' };
  if (!podeGerir(u, a)) return { ok: false, erro: 'Você não pode alterar este acesso.' };
  const c = gerarCodigo(); a.codigo_hash = hashCodigo(c); salvarUsuario(a);
  const foi = emailCodigo(a, c, d.link, true);
  registrar(u, 'Gerou novo código', a.nome);
  return { ok: true, emailEnviado: foi, codigo: foi ? '' : c };
}
/** @param {any} d @param {any} u */
function admin(d, u) {
  const us = lerUsuarios().filter(function (x) { return x.status !== 'recusado'; });
  const aba = obterAba(planilha(), 'Acessos', CAB_ACESSOS);
  const n = aba.getLastRow() - 1;
  const acessos = n > 0 ? aba.getRange(2, 1, Math.min(n, 200), CAB_ACESSOS.length).getValues()
    .map(function (l) { return { data: l[0] instanceof Date ? fmtDia(l[0]) : String(l[0]), hora: l[1] instanceof Date ? fmtHora(l[1]) : String(l[1]), quem: String(l[2] || l[3] || ''),
      perfil: String(l[4] || ''), dsei: String(l[5] || ''), tipo: String(l[6] || ''), acao: String(l[7] || ''), detalhe: String(l[8] || '') }; }) : [];
  const dseisRT = {};
  us.forEach(function (x) { if (ehRT(x) && x.status === 'ativo') (dseisRT[x.dsei] = dseisRT[x.dsei] || []).push(x.nome); });
  const qtdEquipe = {};
  us.forEach(function (x) { if (x.status === 'ativo') qtdEquipe[x.dsei] = (qtdEquipe[x.dsei] || 0) + 1; });
  return { ok: true, usuarios: us.map(publico), acessos: acessos, dseisRT: dseisRT, qtdEquipe: qtdEquipe, titular: !!u.titular };
}
// Só a coordenação titular adiciona pessoas à coordenação. Elas entram com código pessoal.
// Com UF, DSEI e CRO, a pessoa é também RT daquele DSEI (recebe os pedidos e registra exames).
/** @param {any} d */
function dadosRT(d) {
  const dsei = String(d.dsei || '').trim(), cro = String(d.cro || '').trim(), uf = String(d.uf || '').trim();
  if (!dsei) return { ok: true, dsei: '', cro: cro, uf: '' };
  if (!uf || !cro) return { ok: false, erro: 'Para ser também RT, informe UF, DSEI e CRO.' };
  return { ok: true, dsei: dsei, cro: cro, uf: uf };
}
/** @param {any} d @param {any} u */
function adicionarCoord(d, u) {
  if (!u.titular) return { ok: false, erro: 'Só a coordenação titular adiciona pessoas à coordenação.' };
  // O e-mail da pessoa nova vem em emailNovo (o campo email é o de quem está entrando).
  const nome = String(d.nome || '').trim(), email = normEmail(d.emailNovo);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, erro: 'E-mail inválido.' };
  if (email === emailCoord()) return { ok: false, erro: 'Este é o e-mail da coordenação titular.' };
  const rt = dadosRT(d); if (!rt.ok) return rt;
  const ex = lerUsuarios().filter(function (x) { return normEmail(x.email) === email; })[0];
  if (ex && ex.status === 'ativo' && ex.perfil === 'rt') {
    // Já é RT: passa a ser também coordenação, com o mesmo código e o mesmo DSEI.
    if (!d.promover) return { ok: false, jaRT: true, nome: ex.nome, dsei: ex.dsei, erro: ex.nome + ' já é referência técnica do DSEI ' + ex.dsei + '.' };
    ex.perfil = 'coord'; ex.aprovado_por = u.nome; ex.aprovado_em = new Date().toISOString();
    salvarUsuario(ex);
    enviarEmail(ex.email, 'Você agora também faz parte da coordenação do Odontograma', 'Olá, ' + ex.nome + '.\n\nAlém de referência técnica do DSEI ' + ex.dsei +
      ', você agora faz parte da coordenação. Entre no app com o seu código de sempre: as abas Administração e Equipes já estão disponíveis.\n\n' + NOME_APP);
    registrar(u, 'Adicionou coordenação', ex.nome + ' · ' + email + ' · continua RT do DSEI ' + ex.dsei);
    return { ok: true, promovida: true, emailEnviado: true, codigo: '' };
  }
  if (!nome) return { ok: false, erro: 'Informe o nome.' };
  if (ex && (ex.status === 'ativo' || ex.status === 'pendente')) return { ok: false, erro: 'Este e-mail já tem acesso ou pedido como ' + NOME_PERFIL[ex.perfil] + '. Desative esse acesso antes.' };
  const a = ex || { id: Utilities.getUuid().slice(0, 8) };
  const c = gerarCodigo();
  Object.assign(a, { nome: nome, cro: rt.cro, email: email, uf: rt.uf, dsei: rt.dsei, polo: '', perfil: 'coord', status: 'ativo', codigo_hash: hashCodigo(c),
    pedido_em: new Date().toISOString(), aprovado_por: u.nome, aprovado_em: new Date().toISOString() });
  salvarUsuario(a);
  const foi = emailCodigo(a, c, d.link, false);
  registrar(u, 'Adicionou coordenação', nome + ' · ' + email + (rt.dsei ? ' · também RT do DSEI ' + rt.dsei : ''));
  return { ok: true, emailEnviado: foi, codigo: foi ? '' : c };
}
// A titular define (ou tira) o DSEI em que uma pessoa da coordenação também é RT.
/** @param {any} d @param {any} u */
function definirRtCoord(d, u) {
  if (!u.titular) return { ok: false, erro: 'Só a coordenação titular faz isso.' };
  const a = alvoDe(d);
  if (!a || a.perfil !== 'coord') return { ok: false, erro: 'Pessoa da coordenação não encontrada.' };
  const rt = dadosRT(d); if (!rt.ok) return rt;
  const antes = a.dsei;
  a.dsei = rt.dsei; a.uf = rt.uf; if (rt.cro) a.cro = rt.cro;
  salvarUsuario(a);
  registrar(u, rt.dsei ? 'Definiu coordenação como RT' : 'Tirou RT da coordenação', a.nome + (rt.dsei ? ' · RT do DSEI ' + rt.dsei : ' · deixou de ser RT do DSEI ' + antes));
  if (rt.dsei) enviarEmail(a.email, 'Você agora também é referência técnica no Odontograma', 'Olá, ' + a.nome + '.\n\nAlém da coordenação, você agora é referência técnica do DSEI ' + rt.dsei +
    ': recebe os pedidos de acesso dos dentistas desse DSEI e pode registrar exames. Entre no app com o seu código de sempre.\n\n' + NOME_APP);
  return { ok: true };
}
/** @param {any} d @param {any} u */
function substituirRT(d, u) {
  const us = lerUsuarios(), antiga = us.filter(function (x) { return x.id === d.antigaId; })[0];
  if (!antiga || antiga.perfil !== 'rt') return { ok: false, erro: 'Referência técnica não encontrada.' };
  /** @type {any} */ let nova = null;
  let foi = true, cod = '';
  if (d.novaId) {
    nova = us.filter(function (x) { return x.id === d.novaId; })[0];
    if (!nova || nova.dsei !== antiga.dsei || nova.id === antiga.id) return { ok: false, erro: 'Quem assume precisa ser outra pessoa do mesmo DSEI.' };
    if (nova.status === 'pendente') {
      const c = gerarCodigo();
      Object.assign(nova, { perfil: 'rt', status: 'ativo', codigo_hash: hashCodigo(c), aprovado_por: u.nome, aprovado_em: new Date().toISOString() });
      salvarUsuario(nova);
      foi = emailCodigo(nova, c, d.link, false); cod = foi ? '' : c;
    } else {
      nova.perfil = 'rt'; nova.status = 'ativo'; salvarUsuario(nova);
      enviarEmail(nova.email, 'Você agora é referência técnica no Odontograma', 'Olá, ' + nova.nome + '.\n\nVocê passou a ser referência técnica do DSEI ' + nova.dsei +
        '. Entre no app com o seu código de sempre: a aba "Equipe" já está disponível.\n\n' + NOME_APP);
    }
  }
  if (d.destinoAntiga === 'dentista') antiga.perfil = 'dentista'; else antiga.status = 'desativado';
  salvarUsuario(antiga);
  registrar(u, 'Substituiu referência técnica', 'DSEI ' + antiga.dsei + ': saiu ' + antiga.nome + (nova ? ', entrou ' + nova.nome : ', sem substituta'));
  return { ok: true, emailEnviado: foi, codigo: cod };
}

/* ---------- exames ---------- */
function lerExames() {
  // Lê todas as abas cujo nome começa com "Exames" (inclusive as de formato antigo)
  // e acha em cada linha a célula com os dados completos, mesmo se o cabeçalho estiver desalinhado.
  // Exames repetidos (reenviados) contam uma vez só, pela versão mais recente.
  const porId = {};
  planilha().getSheets().forEach(function (aba) {
    if (aba.getName().indexOf('Exames') !== 0 || aba.getLastRow() < 2) return;
    const valores = aba.getDataRange().getValues();
    for (let i = 1; i < valores.length; i++) {
      for (let j = valores[i].length - 1; j >= 0; j--) {
        const v = valores[i][j];
        if (typeof v !== 'string' || v.charAt(0) !== '{') continue;
        try {
          const r = JSON.parse(v);
          if (!r || !r.resultado) continue;
          if (!r.dsei) r.dsei = 'Sem DSEI';
          const id = r.id || ('linha-' + aba.getName() + '-' + i);
          r.id = id;
          if (!porId[id] || String(r.atualizadoEm || '') > String(porId[id].atualizadoEm || '')) porId[id] = r;
        } catch (x) { /* não é o JSON do exame */ }
        break;
      }
    }
  });
  const l = Object.keys(porId).map(function (k) { const r = porId[k]; if (!r.codigoIndividuo) r.codigoIndividuo = r.codigo || r.id; return r; });
  // Número do exame de cada pessoa (1º, 2º...), sempre pela ordem das datas.
  /** @type {any} */ const grupos = {};
  l.filter(exameValido).forEach(function (r) { (grupos[r.codigoIndividuo] = grupos[r.codigoIndividuo] || []).push(r); });
  Object.keys(grupos).forEach(function (k) { grupos[k].sort(ordemExame).forEach(function (r, i) { r.numeroExame = i + 1; }); });
  return l;
}

/* ---------- painel: só números agregados, nunca dados individuais ---------- */
function painel(p, u) {
  const regs = lerExames().filter(exameValido);
  const de = p.de || '', ate = p.ate || '', agrup = p.agrup || 'dois';
  const noPeriodo = regs.filter(function (r) {
    const d = String(r.dataExame || '');
    return (!de || d >= de) && (!ate || d <= ate);
  });
  const filtros = { faixa: p.f_faixa || '', sexo: p.f_sexo || '', classe: p.f_classe || '', proc: p.f_proc || '', coletivo: p.f_coletivo || '' };
  const doRecorte = p.minha ? noPeriodo.filter(function (r) { return ehDoUsuario(r, u); })
    : p.dsei ? noPeriodo.filter(function (r) { return r.dsei === p.dsei; }) : noPeriodo;
  const blocos = montarPainel(doRecorte, filtros, agrup);
  // Na produção do próprio profissional não há ocultação: são os exames dele.
  if (!p.minha) Object.keys(blocos).forEach(function (k) { blocos[k] = ocultar(blocos[k]); });

  const porDsei = {};
  noPeriodo.filter(function (r) { return exameCombina(r, filtros); }).forEach(function (r) { (porDsei[r.dsei] = porDsei[r.dsei] || []).push(r); });
  const comparacao = p.minha ? [] : Object.keys(porDsei).map(function (d) {
    const a = agregarExames(porDsei[d], agrup);
    if (a.n < MINIMO) return { dsei: d, n: '<5' };
    return { dsei: d, n: a.n, alto: ocultarNumero(a.nivel.Alto), pctAlto: Math.round(a.nivel.Alto / a.n * 100),
             ceod: a.ceod.n >= MINIMO ? a.ceodMedia : null, cpod: a.cpod.n >= MINIMO ? a.cpodMedia : null, procs: a.procsRealizados };
  }).sort(function (x, y) { return (typeof y.n === 'number' ? y.n : 0) - (typeof x.n === 'number' ? x.n : 0); });

  const profs = {};
  doRecorte.filter(function (r) { return exameCombina(r, filtros); }).forEach(function (r) { const k = r.usuarioId || normCro((r.profissional || {}).cro) || (r.profissional || {}).nome; if (k) profs[k] = 1; });

  return { ok: true, versao: VERSAO, geradoEm: new Date().toISOString(), dseis: Object.keys(porDsei).sort(),
           totalExames: regs.length, participantes: Object.keys(profs).length,
           resumo: blocos.resumo, blocos: blocos, filtros: filtros, comparacao: comparacao };
}

/** @param {any} v */
function ocultarNumero(v) { return typeof v === 'number' && v > 0 && v < MINIMO ? '<5' : v; }

/** @param {any} r */
function ocultar(r) {
  if (r.n > 0 && r.n < MINIMO) return { n: '<5', poucos: true };
  /** @param {any} x */
  function obj(x) { Object.keys(x).forEach(function (k) { x[k] = ocultarNumero(x[k]); }); }
  // Índice de um grupo: só aparece com 5 pessoas ou mais (senão, só o "<5").
  /** @param {any} x */
  function ind(x) { return x && x.n >= MINIMO ? x : { n: ocultarNumero(x ? x.n : 0) }; }
  obj(r.sexo); obj(r.classe); obj(r.nivel); obj(r.meses); obj(r.gerais); obj(r.insumos);
  Object.keys(r.faixas).forEach(function (f) {
    const x = r.faixas[f];
    x.ceod = x.n >= MINIMO ? ind(x.ceod) : { n: ocultarNumero(x.ceod.n) };
    x.cpod = x.n >= MINIMO ? ind(x.cpod) : { n: ocultarNumero(x.cpod.n) };
    x.n = ocultarNumero(x.n); obj(x.sexo); obj(x.classe);
  });
  r.placa = ocultarNumero(r.placa); r.gengivite = ocultarNumero(r.gengivite); r.fluorose = ocultarNumero(r.fluorose);
  if (r.ceod.n < MINIMO) r.ceodMedia = null;
  if (r.cpod.n < MINIMO) r.cpodMedia = null;
  if (r.cpod12.n < MINIMO) { r.cpod12Media = null; r.cpod12Severidade = null; }
  r.ceod = ind(r.ceod); r.cpod = ind(r.cpod); r.cpod12 = { n: ocultarNumero(r.cpod12.n) };
  return r;
}

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
  if (usa("proc")) {
    var tem = Object.keys(e.dentes || {}).some(function (n) { var p = (e.dentes[n] || {}).procs || {}; return p[f.proc] === "indicado" || p[f.proc] === "realizado"; });
    if (!tem) return false;
  }
  return true;
}
// Cada bloco do painel ignora o próprio filtro, para continuar mostrando as outras opções.
/** @param {any} regs @param {any} f @param {any} agrup */
function montarPainel(regs, f, agrup) {
  var validos = regs.filter(exameValido);
  /** @param {any} exceto */
  function ag(exceto) { return agregarExames(validos.filter(function (e) { return exameCombina(e, f, exceto); }), agrup); }
  return {resumo: ag([]), risco: ag(["classe"]), tabela: ag(["faixa", "sexo", "classe"]), faixa: ag(["faixa"]), proc: ag(["proc"]), coletivo: ag(["coletivo"])};
}
/** @param {any} regs @param {any} agrup */
function agregarExames(regs, agrup) {
  var CL = ["A", "B", "C", "D", "E", "F"], FX = FAIXAS_ETARIAS;
  /** @param {any} c */
  function nivel(c) {
    var i = CL.indexOf(c);
    if (agrup === "tres") return i < 2 ? "Baixo" : i < 4 ? "Moderado" : "Alto";
    return i < 3 ? "Baixo" : "Alto";
  }
  /** @param {any} ks */
  function zeros(ks) { /** @type {any} */ var o = {}; ks.forEach(function (/** @type {any} */ k) { o[k] = 0; }); return o; }
  function idxVazio() { return {n: 0, soma: 0, c: 0, e: 0, p: 0, o: 0}; }
  /** @param {any} alvo @param {any} ind @param {any} perdido */
  function somar(alvo, ind, perdido) { alvo.n++; alvo.soma += Number(ind.total) || 0; alvo.c += Number(ind.c) || 0; alvo[perdido] += Number(ind[perdido]) || 0; alvo.o += Number(ind.o) || 0; }
  /** @type {any} */
  var r = {n: 0, sexo: zeros(["F", "M", "NI"]), classe: zeros(CL), nivel: zeros(["Baixo", "Moderado", "Alto"]), faixas: {}, meses: {},
    ceod: idxVazio(), cpod: idxVazio(), cpod12: {soma: 0, n: 0}, procs: {}, gerais: {}, insumos: {}, placa: 0, gengivite: 0, fluorose: 0, procsRealizados: 0};
  FX.forEach(function (f) { r.faixas[f] = {n: 0, sexo: zeros(["F", "M", "NI"]), classe: zeros(CL), ceod: idxVazio(), cpod: idxVazio()}; });
  regs.forEach(function (/** @type {any} */ e) {
    var res = e.resultado || {};
    var c = CL.indexOf(res.classe) >= 0 ? res.classe : null;
    if (!c) return;
    r.n++;
    var sx = sexoDe(e);
    r.sexo[sx]++; r.classe[c]++; r.nivel[nivel(c)]++;
    var f = r.faixas[faixaEtaria(e.idadeAnos)]; f.n++; f.sexo[sx]++; f.classe[c]++;
    var mes = String(e.dataExame || "").slice(0, 7);
    if (mes) r.meses[mes] = (r.meses[mes] || 0) + 1;
    var idade = e.idadeAnos === "" || e.idadeAnos == null || isNaN(Number(e.idadeAnos)) ? null : Math.floor(Number(e.idadeAnos));
    if (e.denticao !== "permanente" && res.ceod) { somar(r.ceod, res.ceod, "e"); somar(f.ceod, res.ceod, "e"); }
    if (e.denticao !== "decidua" && res.cpod) {
      somar(r.cpod, res.cpod, "p"); somar(f.cpod, res.cpod, "p");
      if (idade === 12) { r.cpod12.soma += Number(res.cpod.total) || 0; r.cpod12.n++; }
    }
    if (e.placa) r.placa++;
    if (e.gengivite) r.gengivite++;
    if (e.fluorose) r.fluorose++;
    (e.gerais || []).forEach(function (/** @type {any} */ g) { r.gerais[g] = (r.gerais[g] || 0) + 1; });
    (e.insumos || []).forEach(function (/** @type {any} */ g) { r.insumos[g] = (r.insumos[g] || 0) + 1; });
    Object.keys(e.dentes || {}).forEach(function (n) {
      var p = (e.dentes[n] || {}).procs || {};
      Object.keys(p).forEach(function (k) {
        if (p[k] !== "indicado" && p[k] !== "realizado") return;
        if (!r.procs[k]) r.procs[k] = {indicado: 0, realizado: 0};
        r.procs[k][p[k]]++;
        if (p[k] === "realizado") r.procsRealizados++;
      });
    });
  });
  /** @param {any} o */
  function media(o) { return o.n ? Math.round(o.soma / o.n * 100) / 100 : null; }
  r.ceodMedia = media(r.ceod); r.cpodMedia = media(r.cpod); r.cpod12Media = media(r.cpod12);
  var m = r.cpod12Media == null ? null : Math.round(r.cpod12Media * 10) / 10;
  r.cpod12Severidade = m == null ? null : m <= 1.1 ? "Muito baixa" : m <= 2.6 ? "Baixa" : m <= 4.4 ? "Moderada" : m <= 6.5 ? "Alta" : "Muito alta";
  return r;
}

/* ---------- linhas da planilha (abas Exames e Dentes) ---------- */
var NOMES_STATUS = {presente: "Presente", nao_erupc: "Não erupcionado", ausente: "Ausente (esfoliado ou outro motivo)", ausente_carie: "Extraído por cárie",
  extr_ind: "Extração indicada", raiz: "Raiz residual", a_confirmar: "A confirmar na boca"};
var NOMES_FACE = {"": "Hígida", ca: "Cárie ativa (cavidade)", cc: "Cárie crônica (cavidade)", mba: "Mancha branca ativa", mbi: "Mancha branca inativa",
  rest: "Restaurada", restc: "Restaurada com cárie", sel: "Selante"};
var NOMES_PROC = {selante: "Selante", art: "ART (restauração atraumática)", civ: "Restauração em ionômero de vidro", resina: "Restauração em resina",
  amalgama: "Restauração em amálgama", verniz: "Verniz fluoretado", cdf: "Cariostático (diamino fluoreto de prata)", selprov: "Selamento provisório / adequação do meio",
  pulpotomia: "Pulpotomia", pulpectomia: "Pulpectomia", coroa: "Coroa de aço", exodontia: "Exodontia"};
var CAB_EXAME = ["id_exame", "codigo_individuo", "numero_exame", "codigo_exame", "situacao_registro", "data_exame", "faixa_etaria", "idade_anos", "sexo", "nascimento",
  "uf", "dsei", "polo_base", "aldeia_comunidade", "municipio", "profissional", "cro", "denticao", "classe_risco", "nivel_risco",
  "ceod_c", "ceod_e", "ceod_o", "ceod", "cpod_c", "cpod_p", "cpod_o", "cpod", "dentes_cariados", "placa_visivel", "gengivite", "fluorose_moderada_severa",
  "dentes_com_dor_abscesso", "procedimentos_gerais", "insumos_fornecidos", "observacoes", "conferencia_vinculo", "alertas_vinculo", "exame_anterior_id",
  "motivo_cancelamento", "observacao_cancelamento", "cancelado_em", "cancelado_por", "criado_em", "atualizado_em", "usuario_id", "dados_completos_json"];
var CAB_DENTE = ["id_exame", "codigo_individuo", "numero_exame", "situacao_registro", "data_exame", "dsei", "dente", "tipo", "situacao",
  "face_oclusal_incisal", "face_vestibular", "face_lingual_palatina", "face_mesial", "face_distal", "dor_abscesso", "procedimentos_indicados", "procedimentos_realizados", "observacao"];
/** @param {any} n */
function decidDe(n) { return Math.floor(Number(n) / 10) >= 5; }
/** @param {any} iso */
function dataBR(iso) { return iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : ""; }
/** @param {any} e */
function codigoIndividuoDe(e) { return e.codigoIndividuo || e.codigo || ""; }
/** @param {any} e */
function cariadosDe(e) { var r = e.resultado || {}; return (Number((r.ceod || {}).c) || 0) + (Number((r.cpod || {}).c) || 0); }
/** @param {any} e */
function dentesComDor(e) { return Object.keys(e.dentes || {}).filter(function (n) { return (e.dentes[n] || {}).dor; }); }
/** @param {any} e */
function registroParaJson(e) {
  /** @type {any} */ var j = {};
  Object.keys(e).forEach(function (k) { if (k !== "envio" && k.charAt(0) !== "_") j[k] = e[k]; });
  return JSON.stringify(j);
}
/** @param {any} e */
function linhaExame(e) {
  var r = e.resultado || {}, ce = r.ceod || {}, cp = r.cpod || {}, v = e.vinculo || {}, c = e.cancelamento || {}, sn = function (/** @type {any} */ b) { return b ? "sim" : "não"; };
  return [e.id, codigoIndividuoDe(e), e.numeroExame || 1, e.codigo || "", exameValido(e) ? "válido" : "cancelado", e.dataExame || "", faixaEtaria(e.idadeAnos),
    e.idadeAnos, (e.crianca || {}).sexo || "", (e.crianca || {}).nascimento || "", e.uf || "", e.dsei || "", e.polo || "", e.aldeia || "", e.municipio || "",
    (e.profissional || {}).nome || "", (e.profissional || {}).cro || "", e.denticao || "", r.classe || "", r.risco || "",
    ce.c, ce.e, ce.o, ce.total, cp.c, cp.p, cp.o, cp.total, cariadosDe(e), sn(e.placa), sn(e.gengivite), sn(e.fluorose),
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
    var semFaces = ["nao_erupc", "ausente", "ausente_carie", "raiz", "a_confirmar"].indexOf(d.status) >= 0;
    /** @param {any} k */
    function f(k) { return semFaces ? "" : (NOMES_FACE[fs[k] || ""] || ""); }
    return [e.id, cod, num, sit, e.dataExame || "", e.dsei || "", n, decidDe(n) ? "decíduo" : "permanente", NOMES_STATUS[d.status] || d.status || "",
      f("O"), f("V"), f("L"), f("M"), f("D"), d.dor ? "sim" : "não", proc("indicado"), proc("realizado"), d.obs || ""];
  });
}

/* ---------- mesma pessoa: conferência dente a dente entre dois exames ---------- */
// Compara sempre do exame mais antigo para o mais novo (pela data do exame).
// "impossivel": não acontece na boca (é outra pessoa ou erro de registro). "confira": raro, o dentista confere na boca.
/** @param {any} a @param {any} b */
function conferirVinculo(a, b) {
  var antes = a, depois = b;
  if (String(b.dataExame || "") < String(a.dataExame || "")) { antes = b; depois = a; }
  var PRES = ["presente", "extr_ind", "raiz"], AUS = ["ausente", "ausente_carie"], COM_FACES = ["presente", "extr_ind"];
  var FACES = ["O", "V", "L", "M", "D"], NOME_F = {O: "oclusal/incisal", V: "vestibular", L: "lingual/palatina", M: "mesial", D: "distal"};
  var da1 = dataBR(antes.dataExame), da2 = dataBR(depois.dataExame);
  /** @type {any[]} */ var alertas = [];
  var nums = Object.keys(antes.dentes || {}).filter(function (n) { return (depois.dentes || {})[n]; }).map(Number).sort(function (x, y) { return x - y; });
  nums.forEach(function (n) {
    var x = antes.dentes[n] || {}, y = depois.dentes[n] || {}, fx = x.faces || {}, fy = y.faces || {};
    if (x.status === "a_confirmar" || y.status === "a_confirmar") return;
    var tipo = decidDe(n) ? "decíduo" : "permanente";
    if (AUS.indexOf(x.status) >= 0 && PRES.indexOf(y.status) >= 0) {
      alertas.push({dente: n, nivel: "impossivel", chave: n + ":volta", texto: (x.status === "ausente_carie" ? "extraído" : "ausente") + " no exame de " + da1 + " e " + (y.status === "raiz" ? "com raiz residual" : "presente") + " no exame de " + da2 + ".",
        motivo: "Um dente " + tipo + " que " + (decidDe(n) ? "esfoliou ou foi extraído" : "foi perdido") + " não volta."});
      return;
    }
    if (PRES.indexOf(x.status) >= 0 && y.status === "nao_erupc") {
      alertas.push({dente: n, nivel: "impossivel", chave: n + ":desnasceu", texto: "presente no exame de " + da1 + " e não erupcionado no exame de " + da2 + ".",
        motivo: "Um dente que já erupcionou não volta a ficar sem erupcionar."});
      return;
    }
    if (x.status === "raiz" && y.status === "presente" && FACES.every(function (k) { return !fy[k]; })) {
      alertas.push({dente: n, nivel: "confira", chave: n + ":raiz", texto: "raiz residual no exame de " + da1 + " e coroa hígida no exame de " + da2 + ".",
        motivo: "Raiz residual não vira coroa hígida."});
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
  if (d.status === "ausente") return "ausente";
  if (d.status === "ausente_carie") return "extraido";
  if (d.status === "extr_ind") return "extr_ind";
  if (d.status === "raiz") return "raiz";
  if (d.status === "a_confirmar") return "";
  if (vs.some(function (v) { return v === "ca" || v === "cc" || v === "restc"; })) return "cariado";
  if (vs.indexOf("rest") >= 0) return "obturado";
  return "higido";
}
var NOMES_ESTADO = {nao_erupc: "não erupcionado", ausente: "ausente", extraido: "extraído", extr_ind: "com extração indicada", raiz: "raiz residual",
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
    else if ((x === "cariado" || x === "raiz") && y === "obturado") tipo = "tratado";
    else if (y === "extraido" || (y === "ausente" && (x === "cariado" || x === "raiz" || x === "extr_ind")) ) tipo = "extraido";
    else if (y === "ausente" && decidDe(n)) tipo = "esfoliou";
    else if (x === "nao_erupc") tipo = "erupcionou";
    l.push({dente: n, de: x, para: y, tipo: tipo});
  });
  return l;
}
/* ===== COMPARTILHADO FIM ===== */

/* ---------- aba Dicionário: o que é cada coluna ---------- */
const DICIONARIO = [
  ['Exames', 'id_exame', 'Identificador único do exame (gerado pelo app).', 'texto'],
  ['Exames', 'codigo_individuo', 'Identifica a pessoa sem nome nem Cartão SUS. É o mesmo em todos os exames dela. Use esta coluna para ligar os exames de uma mesma pessoa.', 'UF-POLO-ALDEIA-CRO-sequência'],
  ['Exames', 'numero_exame', 'Ordem do exame desta pessoa, pela data do exame. Exames cancelados não contam.', '1, 2, 3…'],
  ['Exames', 'codigo_exame', 'Código gerado no momento deste exame. No 1º exame é igual ao codigo_individuo.', 'UF-POLO-ALDEIA-CRO-sequência'],
  ['Exames', 'situacao_registro', 'Se o exame vale para análise. Filtre "válido" antes de calcular qualquer indicador.', 'válido · cancelado'],
  ['Exames', 'data_exame', 'Data em que o exame foi feito.', 'AAAA-MM-DD'],
  ['Exames', 'faixa_etaria', 'Faixa etária da SESAI na data do exame.', FAIXAS_ETARIAS.join(' · ')],
  ['Exames', 'idade_anos', 'Idade na data do exame, em anos com uma casa decimal.', 'número'],
  ['Exames', 'sexo', 'Sexo informado.', 'F · M · vazio (não informado)'],
  ['Exames', 'nascimento', 'Data de nascimento.', 'AAAA-MM-DD'],
  ['Exames', 'uf', 'UF do atendimento.', 'sigla'],
  ['Exames', 'dsei', 'DSEI do atendimento.', 'nome do DSEI'],
  ['Exames', 'polo_base', 'Polo base do atendimento.', 'texto'],
  ['Exames', 'aldeia_comunidade', 'Aldeia ou comunidade do atendimento.', 'texto'],
  ['Exames', 'municipio', 'Município informado pelo profissional.', 'texto'],
  ['Exames', 'profissional', 'Nome do cirurgião-dentista que fez o exame.', 'texto'],
  ['Exames', 'cro', 'CRO do profissional.', 'texto'],
  ['Exames', 'denticao', 'Dentição registrada.', 'decidua · mista · permanente'],
  ['Exames', 'classe_risco', 'Classe de risco de cárie pela atividade de doença.', 'A · B · C · D · E · F'],
  ['Exames', 'nivel_risco', 'Agrupamento da classe em nível de risco, conforme a configuração do profissional.', 'Baixo risco · Risco moderado · Alto risco'],
  ['Exames', 'ceod_c', 'Dentes decíduos cariados (c do ceo-d).', '0 a 20'],
  ['Exames', 'ceod_e', 'Dentes decíduos extraídos ou com extração indicada (e do ceo-d).', '0 a 20'],
  ['Exames', 'ceod_o', 'Dentes decíduos obturados (o do ceo-d).', '0 a 20'],
  ['Exames', 'ceod', 'ceo-d da pessoa: c + e + o. Cada dente conta uma vez: extraído > cariado > obturado.', '0 a 20'],
  ['Exames', 'cpod_c', 'Dentes permanentes cariados (C do CPO-D).', '0 a 32'],
  ['Exames', 'cpod_p', 'Dentes permanentes perdidos ou com extração indicada (P do CPO-D).', '0 a 32'],
  ['Exames', 'cpod_o', 'Dentes permanentes obturados (O do CPO-D).', '0 a 32'],
  ['Exames', 'cpod', 'CPO-D da pessoa: C + P + O. Cada dente conta uma vez: perdido > cariado > obturado.', '0 a 32'],
  ['Exames', 'dentes_cariados', 'Total de dentes cariados (c + C). Usado no acompanhamento para ver se a pessoa melhorou.', 'número'],
  ['Exames', 'placa_visivel', 'Placa visível.', 'sim · não'],
  ['Exames', 'gengivite', 'Gengivite (sangramento gengival).', 'sim · não'],
  ['Exames', 'fluorose_moderada_severa', 'Fluorose moderada ou severa.', 'sim · não'],
  ['Exames', 'dentes_com_dor_abscesso', 'Dentes com dor, abscesso ou fístula.', 'números dos dentes, separados por espaço'],
  ['Exames', 'procedimentos_gerais', 'Procedimentos coletivos e de boca toda realizados.', 'lista separada por ;'],
  ['Exames', 'insumos_fornecidos', 'Insumos de higiene bucal fornecidos.', 'Escova dental; Creme dental; Fio dental'],
  ['Exames', 'observacoes', 'Observações do exame (sem dados que identifiquem a pessoa).', 'texto'],
  ['Exames', 'conferencia_vinculo', 'Resultado da conferência dente a dente com o exame anterior da mesma pessoa.', '1º exame · compatível · compatível, com mudança conferida'],
  ['Exames', 'alertas_vinculo', 'Mudanças raras que o dentista conferiu na boca (ex.: restauração que caiu).', 'texto'],
  ['Exames', 'exame_anterior_id', 'id_exame do exame usado na conferência.', 'texto'],
  ['Exames', 'motivo_cancelamento', 'Motivo escolhido por quem cancelou.', MOTIVOS_CANCELAMENTO.join(' · ')],
  ['Exames', 'observacao_cancelamento', 'Explicação do cancelamento (obrigatória em "Outro").', 'texto'],
  ['Exames', 'cancelado_em', 'Data e hora do cancelamento.', 'data e hora'],
  ['Exames', 'cancelado_por', 'Profissional que cancelou (sempre quem fez o exame).', 'texto'],
  ['Exames', 'criado_em', 'Quando o exame foi salvo pela primeira vez.', 'data e hora'],
  ['Exames', 'atualizado_em', 'Última alteração do exame.', 'data e hora'],
  ['Exames', 'usuario_id', 'Identificador do acesso do profissional (aba Usuarios).', 'texto'],
  ['Exames', 'dados_completos_json', 'Todos os dados do exame, usados pelo app. Não precisa usar na análise.', 'JSON'],
  ['Dentes', 'id_exame', 'Exame ao qual o dente pertence (liga com a aba Exames).', 'texto'],
  ['Dentes', 'codigo_individuo', 'Pessoa (igual à aba Exames).', 'texto'],
  ['Dentes', 'numero_exame', 'Ordem do exame da pessoa.', '1, 2, 3…'],
  ['Dentes', 'situacao_registro', 'Se o exame vale para análise.', 'válido · cancelado'],
  ['Dentes', 'data_exame', 'Data do exame.', 'AAAA-MM-DD'],
  ['Dentes', 'dsei', 'DSEI do atendimento.', 'nome do DSEI'],
  ['Dentes', 'dente', 'Número do dente (notação FDI).', '11 a 48 (permanentes) · 51 a 85 (decíduos)'],
  ['Dentes', 'tipo', 'Tipo de dente.', 'decíduo · permanente'],
  ['Dentes', 'situacao', 'Condição do dente no exame.', Object.keys(NOMES_STATUS).filter(function (k) { return k !== 'a_confirmar'; }).map(function (k) { return NOMES_STATUS[k]; }).join(' · ')],
  ['Dentes', 'face_oclusal_incisal', 'Condição da face oclusal (posteriores) ou incisal (anteriores). Vazio quando não se aplica.', Object.keys(NOMES_FACE).map(function (k) { return NOMES_FACE[k]; }).join(' · ')],
  ['Dentes', 'face_vestibular', 'Condição da face vestibular.', 'igual à face oclusal'],
  ['Dentes', 'face_lingual_palatina', 'Condição da face lingual (inferiores) ou palatina (superiores).', 'igual à face oclusal'],
  ['Dentes', 'face_mesial', 'Condição da face mesial.', 'igual à face oclusal'],
  ['Dentes', 'face_distal', 'Condição da face distal.', 'igual à face oclusal'],
  ['Dentes', 'dor_abscesso', 'Dor, abscesso ou fístula associados ao dente.', 'sim · não'],
  ['Dentes', 'procedimentos_indicados', 'Procedimentos indicados no dente.', Object.keys(NOMES_PROC).map(function (k) { return NOMES_PROC[k]; }).join('; ')],
  ['Dentes', 'procedimentos_realizados', 'Procedimentos realizados no dente.', 'mesma lista dos indicados'],
  ['Dentes', 'observacao', 'Observação sobre o dente.', 'texto'],
  ['Acessos', 'data · hora', 'Quando aconteceu. A aba fica do mais recente para o mais antigo.', 'AAAA-MM-DD · HH:MM'],
  ['Acessos', 'quem · email · perfil · dsei', 'Quem fez a ação.', 'texto'],
  ['Acessos', 'tipo', 'Grupo da ação, para filtrar.', 'Cadastro · Gestão de acesso · Consulta · Exame · Segurança · Sistema'],
  ['Acessos', 'acao · detalhe', 'O que foi feito. As entradas no app e as consultas à equipe não viram linhas aqui: são contadas na aba Uso.', 'texto'],
  ['Uso', 'entradas_no_mes · mes_referencia', 'Quantas vezes a pessoa entrou no app no mês indicado.', 'número · AAAA-MM'],
  ['Uso', 'entradas_total · consultas_equipe', 'Total de entradas no app e de consultas à aba Equipe.', 'número'],
  ['Uso', 'exames_validos · exames_cancelados · ultimo_exame', 'Exames que a pessoa fez e a data do mais recente.', 'número · AAAA-MM-DD'],
  ['Usuarios', 'perfil · status', 'Perfil e situação do acesso. A coordenação titular entra pelas Propriedades do script e não aparece nesta aba. Perfil "coord" com DSEI preenchido = coordenação e também RT daquele DSEI.', 'dentista · rt · coord · ativo · pendente · desativado · recusado']
];
/** @param {any} ss */
function escreverDicionario(ss) { reescreverAba(ss, 'Dicionário', CAB_DICIONARIO, DICIONARIO, 5); }

/* ---------- utilidades ---------- */
function obterAba(planilha, nome, cabecalho) {
  /** @type {any} */ let aba = planilha.getSheetByName(nome);
  if (aba && aba.getLastRow() > 0) {
    const atual = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
    const compativel = atual.every(function (c, i) { return c === '' || c === cabecalho[i]; });
    if (!compativel) {
      // Formato antigo (com nome e Cartão SUS): a aba é renomeada e uma nova é criada.
      aba.setName(nome + ' - formato antigo ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH-mm'));
      aba = null;
    }
  }
  if (!aba) aba = planilha.insertSheet(nome);
  if (aba.getLastRow() === 0 || aba.getLastColumn() < cabecalho.length) {
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

/** @param {any} aba @param {any} id */
function removerLinhas(aba, id) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return;
  const ids = aba.getRange(2, 1, ultima - 1, 1).getValues();
  // Apaga de baixo para cima, em blocos de linhas seguidas (mais rápido que uma por uma).
  let i = ids.length - 1;
  while (i >= 0) {
    if (String(ids[i][0]) !== String(id)) { i--; continue; }
    let j = i;
    while (j - 1 >= 0 && String(ids[j - 1][0]) === String(id)) j--;
    aba.deleteRows(j + 2, i - j + 1);
    i = j - 1;
  }
}

/** @param {any} obj */
function saida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function saida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
