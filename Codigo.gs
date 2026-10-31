/**
 * ODONTOGRAMA · SAÚDE BUCAL INDÍGENA — servidor (Google Apps Script ligado à planilha)
 *
 * Cole este arquivo inteiro em: Planilha do Google > Extensões > Apps Script (substituindo o anterior) e publique
 * pelo lápis (Implantar > Gerenciar implantações > lápis > Nova versão > Implantar), para o endereço /exec não mudar.
 * Este código é igual para todas as instalações: NÃO tem senha nem e-mail escritos nele.
 *
 * INSTALAÇÃO (uma vez só)
 * 1. Configurações do projeto (engrenagem) > Propriedades do script:
 *      EMAIL_COORDENACAO = e-mail da conta dona desta planilha
 *      CHAVE_COORDENACAO = senha da coordenação titular (use uma frase longa)
 *    e clique em "Salvar propriedades do script". Trocar a senha depois vale na hora, sem publicar de novo.
 * 2. No editor, escolha "testarInstalacao" e clique em Executar: mostra "TUDO CERTO" quando estiver pronto.
 * 3. Escolha "ativarBackupSemanal" e clique em Executar (uma vez só): toda segunda-feira, de madrugada, uma cópia
 *    da planilha vai para a pasta "Odontograma - backups" do seu Drive.
 *
 * PERFIS
 * - Coordenação titular: entra com EMAIL_COORDENACAO + CHAVE_COORDENACAO; é a única que mexe em outras pessoas da coordenação.
 * - Coordenação: aprova as referências técnicas (RT); pode ser também RT de um DSEI.
 * - RT: aprova os cirurgiões-dentistas do seu DSEI. Sem RT ativa no DSEI, os pedidos vão para a coordenação.
 * - Cirurgião-dentista e RT registram exames só no DSEI do próprio cadastro.
 *
 * ÍNDICE DESTE ARQUIVO
 *  1. Configuração e constantes             8. Entrada e exames
 *  2. Instalação, diagnóstico e backup      9. Pessoas: busca, código de acompanhamento, histórico
 *  3. Formato da planilha e reorganização  10. Ações do Dia B e página inicial
 *  4. Abas Acessos e Uso (auditoria)       11. Equipe, administração e coordenação
 *  5. Entrada dos pedidos (doPost)         12. Convites
 *  6. Usuários, e-mails e endereço do app  13. Painel, população e territórios
 *  7. Pedido de acesso e recuperação       14. Trecho compartilhado com o app (montar.py), dicionário e utilidades
 */

/* ---------- 1. configuração e constantes ---------- */
const NOME_APP = 'Odontograma · Saúde Bucal Indígena';

// Backup: quantas cópias semanais guardar (as mais antigas vão para a lixeira do Drive).
const BACKUPS_GUARDADOS = 8;
const PASTA_BACKUP = 'Odontograma - backups';

// Configuração guardada fora do código (Propriedades do script).
/** @param {string} nome */
function propriedade(nome) {
  // E-mail e senha da coordenação não mudam durante um pedido: lidos uma vez só (o Google limita as leituras por dia).
  const fixo = nome === 'EMAIL_COORDENACAO' || nome === 'CHAVE_COORDENACAO', m = MEMO;
  if (fixo && m && m.prop && nome in m.prop) return m.prop[nome];
  let v = ''; try { v = String(PropertiesService.getScriptProperties().getProperty(nome) || '').trim(); } catch (x) { return ''; }
  if (fixo && m) (m.prop = m.prop || {})[nome] = v;
  return v;
}
function emailCfg() { return propriedade('EMAIL_COORDENACAO'); }
function chaveCfg() { return propriedade('CHAVE_COORDENACAO'); }

// Recortes com 1 a 4 pessoas aparecem como "<5" no painel, para proteger a identidade.
const MINIMO = 5;

const CAB_USUARIOS = ['id', 'nome', 'cro', 'email', 'uf', 'dsei', 'polo', 'perfil', 'status', 'codigo_hash', 'pedido_em', 'aprovado_por', 'aprovado_em', 'ultimo_acesso'];
const CAB_ACESSOS = ['data', 'hora', 'quem', 'email', 'perfil', 'dsei', 'tipo', 'acao', 'detalhe'];
const CAB_USO = ['usuario_id', 'nome', 'email', 'perfil', 'dsei', 'ultimo_acesso', 'entradas_no_mes', 'mes_referencia', 'entradas_total',
  'consultas_equipe', 'exames_validos', 'exames_cancelados', 'ultimo_exame'];
const CAB_DICIONARIO = ['aba', 'coluna', 'descricao', 'valores_possiveis'];
// Versão do formato das abas. Quando muda, a planilha é reorganizada uma vez (com backup antes).
// Todas as datas e horas do servidor no horário de Brasília, qualquer que seja o fuso configurado no projeto.
const FUSO = 'America/Sao_Paulo';
const FORMATO = '25';
const VERSAO = 38;
const MOTIVOS_CANCELAMENTO = ['Digitado errado', 'Exame em duplicidade', 'Pessoa errada', 'Outro'];
// Ações do dia a dia: viram contadores na aba Uso, sem uma linha por vez na aba Acessos.
const ROTINA = { 'Entrou no app': 'entrada', 'Consultou a equipe': 'consulta' };
const TIPO_ACAO = { 'Pediu acesso': 'Cadastro', 'Pediu reativação': 'Cadastro', 'Pediu novo código': 'Cadastro', 'Confirmou novo código': 'Cadastro', 'Aprovou acesso': 'Gestão de acesso', 'Recusou acesso': 'Gestão de acesso',
  'Desativou acesso': 'Gestão de acesso', 'Reativou acesso': 'Gestão de acesso', 'Gerou novo código': 'Gestão de acesso', 'Substituiu referência técnica': 'Gestão de acesso',
  'Adicionou coordenação': 'Gestão de acesso', 'Definiu coordenação como RT': 'Gestão de acesso', 'Tirou RT da coordenação': 'Gestão de acesso', 'Tentativa de acesso recusada': 'Segurança', 'Código em mais de um DSEI': 'Segurança', 'Código repetido': 'Exame', 'Resultado recalculado': 'Exame', 'Viu um exame': 'Consulta', 'Viu o acompanhamento de uma pessoa': 'Consulta',
  'Cancelou exame': 'Exame', 'Registrou novo exame de pessoa já examinada': 'Exame', 'Criou ação do Dia B': 'Ação do Dia B', 'Atualizou a população': 'Sistema', 'Enviou convite': 'Gestão de acesso', 'Reenviou convite': 'Gestão de acesso', 'Cancelou convite': 'Gestão de acesso', 'Aceitou convite': 'Cadastro', 'Cancelou ação do Dia B': 'Ação do Dia B', 'Backup da planilha': 'Sistema', 'Limpou aviso de auditoria': 'Sistema', 'Limpou a lista de erros': 'Sistema', 'Campos descartados de um exame': 'Segurança', 'Baixou dados para análise': 'Consulta', 'Reorganizou a planilha': 'Sistema' };
let MIGRANDO = false;
const NOME_PERFIL = { dentista: 'cirurgião-dentista', rt: 'referência técnica', coord: 'coordenação' };

/* ---------- 2. instalação, diagnóstico e backup ---------- */
// O endereço /exec aberto no navegador mostra a versão do servidor e se a instalação está completa.
function doGet() {
  // Só a versão: a situação da instalação aparece para a coordenação em Administração (não para qualquer pessoa com o endereço).
  return saida({ ok: true, versao: VERSAO });
}
// O que falta configurar (não mostra senha nem e-mail).
function diagnostico() {
  /** @type {any} */ const d = { email: emailConfigurado() ? 'ok' : 'falta cadastrar EMAIL_COORDENACAO em Propriedades do script', chave: chaveConfigurada() ? 'ok' : chaveCfg() ? 'curta: a senha precisa ter pelo menos ' + SENHA_MINIMA + ' caracteres (troque em Propriedades do script)' : 'falta cadastrar CHAVE_COORDENACAO em Propriedades do script' };
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
const SENHA_MINIMA = 12;
function chaveConfigurada() { return chaveCfg().length >= SENHA_MINIMA; }
// Rode esta função no Apps Script antes de publicar (lista ao lado de Executar > testarInstalacao > Executar).
function testarInstalacao() {
  const d = diagnostico();
  Logger.log('E-mail da coordenação: ' + (emailConfigurado() ? emailCfg() : 'FALTA CADASTRAR: Configurações do projeto > Propriedades do script > EMAIL_COORDENACAO'));
  let conta = '';
  try { conta = normEmail(Session.getEffectiveUser().getEmail()); } catch (x) { conta = ''; }
  if (conta) Logger.log('Conta Google em uso agora: ' + conta + (emailConfigurado() && conta !== normEmail(emailCfg()) ? '  ATENÇÃO: é diferente do EMAIL_COORDENACAO. Use a mesma conta (ou corrija em Propriedades do script).' : ''));
  Logger.log('Senha da coordenação: ' + (chaveConfigurada() ? 'cadastrada' : (chaveCfg() ? 'MUITO CURTA: use pelo menos ' + SENHA_MINIMA + ' caracteres' : 'FALTA CADASTRAR: Configurações do projeto > Propriedades do script > CHAVE_COORDENACAO')));
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
  garantirTarefaDiaria();
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
  const quando = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd HH-mm');
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

/* ---------- tarefa diária (de madrugada) ----------
 * Confere o espaço da planilha (e avisa a coordenação titular), corta linhas e colunas vazias, passa o registro de
 * Acessos com mais de 12 meses para uma planilha de arquivo e apaga sessões vencidas. Criada sozinha. */
function garantirTarefaDiaria() {
  const tem = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'tarefaDiaria'; });
  if (!tem) ScriptApp.newTrigger('tarefaDiaria').timeBased().everyDays(1).atHour(2).create();
  return !tem;
}
function tarefaDiaria() {
  /** @type {any} */ const r = { espaco: null, cortadas: 0, arquivados: 0, sessoes: 0, uso: 0 };
  // Refaz as cópias rápidas a partir da planilha (por garantia, uma vez por dia).
  MEMO = null; marcarVersaoDados(); cadastrosMudaram(); esquecerDaMemoria('indice+'); esquecerDaMemoria('resumos+');
  try { r.cortadas = cortarVazios(); } catch (x) { registrarErro(x, 'tarefaDiaria: cortar vazios', null); }
  try { r.arquivados = arquivarAcessos(); } catch (x) { registrarErro(x, 'tarefaDiaria: arquivar Acessos', null); }
  try { r.sessoes = limparSessoes(); } catch (x) { registrarErro(x, 'tarefaDiaria: sessões', null); }
  try { r.espaco = conferirEspaco(); } catch (x) { registrarErro(x, 'tarefaDiaria: espaço', null); }
  try { r.uso = recalcularUso(planilha(), lerResumos()); } catch (x) { registrarErro(x, 'tarefaDiaria: aba Uso', null); }
  try { lerIndice(); } catch (x) {}
  try { r.analise = atualizarAnalise().exames; } catch (x) { registrarErro(x, 'tarefaDiaria: planilha de análise', null); }
  PropertiesService.getScriptProperties().setProperty('TAREFA_DIARIA_EM', new Date().toISOString());
  return r;
}
// O Google aceita até 10 milhões de células por planilha, somando todas as abas (inclusive as vazias).
const LIMITE_CELULAS = 10000000, FAIXAS_AVISO = [50, 60, 75, 85, 90, 95, 96, 97, 98, 99, 100];
function espacoPlanilha() {
  let usadas = 0;
  planilha().getSheets().forEach(function (a) { usadas += a.getMaxRows() * a.getMaxColumns(); });
  const pct = Math.floor(usadas / LIMITE_CELULAS * 100);
  const idx = lerIndice(), porExame = CAB_EXAME.length, cabem = Math.max(0, Math.floor((LIMITE_CELULAS - usadas) / porExame));
  const desde = fmtDia(new Date(Date.now() - 30 * 864e5)), ritmo = idx.filter(function (r) { return String(r.criadoEm || '').slice(0, 10) >= desde; }).length;
  return { usadas: usadas, pct: pct, cabem: cabem, ritmo30: ritmo, mesesAteEncher: ritmo ? Math.round(cabem / ritmo * 10) / 10 : null,
    faixa: FAIXAS_AVISO.filter(function (f) { return pct >= f; }).pop() || 0 };
}
function conferirEspaco() {
  const e = espacoPlanilha(), ja = Number(propriedade('ESPACO_AVISADO') || 0);
  if (e.faixa && e.faixa > ja) {
    PropertiesService.getScriptProperties().setProperty('ESPACO_AVISADO', String(e.faixa));
    enviarEmail(emailCoord(), 'Odontograma: a planilha está com ' + e.pct + '% do espaço usado',
      'A planilha do Odontograma está com ' + e.pct + '% do espaço usado (o Google aceita até 10 milhões de células).\n\n' +
      'Cabem ainda cerca de ' + e.cabem + ' exames' + (e.mesesAteEncher != null ? '. No ritmo dos últimos 30 dias, ela enche em cerca de ' + e.mesesAteEncher + ' meses' : '') + '.\n' +
      (e.pct >= 75 ? 'Planeje com a equipe técnica a criação de uma planilha nova antes de chegar a 90%.\n' : '') + '\nVeja os detalhes em Administração no app.\n\n' + NOME_APP);
  }
  return e;
}
// Corta as linhas e colunas vazias que sobram no fim de cada aba (o Google conta também as células vazias).
function cortarVazios() {
  let n = 0;
  planilha().getSheets().forEach(function (a) {
    const lr = Math.max(a.getLastRow(), 1), lc = Math.max(a.getLastColumn(), 1), mr = a.getMaxRows(), mc = a.getMaxColumns();
    if (mr - lr > 50) { a.deleteRows(lr + 51, mr - lr - 50); n += (mr - lr - 50) * mc; }
    if (mc - lc > 1) { a.deleteColumns(lc + 2, mc - lc - 1); n += (mc - lc - 1) * Math.min(mr, lr + 50); }
  });
  return n;
}
// Eventos da aba Acessos com mais de 12 meses vão para a planilha "Odontograma - arquivo de acessos", na pasta de backups.
function arquivarAcessos() {
  const aba = planilha().getSheetByName('Acessos'); if (!aba || aba.getLastRow() < 2) return 0;
  const corte = fmtDia(new Date(Date.now() - 365 * 864e5));
  const v = aba.getRange(2, 1, aba.getLastRow() - 1, CAB_ACESSOS.length).getValues();
  const velhos = v.filter(function (l) { return textoCelula(l[0]).slice(0, 10) < corte; });
  if (!velhos.length) return 0;
  let id = propriedade('ARQUIVO_ACESSOS_ID'), arq = null;
  try { if (id) arq = SpreadsheetApp.openById(id); } catch (x) { arq = null; }
  if (!arq) {
    arq = SpreadsheetApp.create('Odontograma - arquivo de acessos');
    try { const pastas = DriveApp.getFoldersByName(PASTA_BACKUP); const pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(PASTA_BACKUP); DriveApp.getFileById(arq.getId()).moveTo(pasta); } catch (x) {}
    PropertiesService.getScriptProperties().setProperty('ARQUIVO_ACESSOS_ID', arq.getId());
  }
  const destino = obterAba(arq, 'Acessos', CAB_ACESSOS);
  destino.getRange(destino.getLastRow() + 1, 1, velhos.length, CAB_ACESSOS.length).setValues(velhos.map(function (l) { return linhaSegura(l.map(textoCelula)); }));
  const ficam = v.filter(function (l) { return textoCelula(l[0]).slice(0, 10) >= corte; });
  reescreverAba(planilha(), 'Acessos', CAB_ACESSOS, ficam.map(function (l) { return l.map(textoCelula); }), 1);
  return velhos.length;
}

/* ---------- planilha de análise (para o Looker Studio) ----------
 * Uma planilha separada, "Odontograma - análise", na pasta de backups e só da coordenação titular, refeita toda
 * madrugada pela tarefa diária (e pelo botão "Atualizar agora" da Administração):
 * - aba Exames: uma linha por exame válido, com as mesmas colunas da aba Exames do app, sem as duas colunas do sistema;
 * - aba Dentes: uma linha por dente de cada exame válido (todos os dentes da dentição registrada);
 * - aba Sobre: quando foi atualizada e quantos exames e dentes tem.
 * O Looker Studio lê esta cópia, nunca a planilha do app: assim ele não atrapalha os envios e a cópia pode ser
 * refeita a qualquer momento. No fim, o servidor confere se os números batem com a planilha do app.
 * As abas são sempre as MESMAS (o conteúdo é reescrito dentro delas): o Looker guarda o número interno de cada aba
 * e perderia a ligação se a aba fosse apagada e criada de novo. */
const ANALISE_NOME = 'Odontograma - análise';
// (CAB_EXAME vem do trecho compartilhado, no fim do arquivo: por isso é calculado na hora)
function cabAnExames() { return CAB_EXAME.filter(function (k) { return k !== 'resumo_json' && k !== 'dados_completos_json'; }); }
const CAB_AN_DENTES = ['id_exame', 'codigo_individuo', 'numero_exame', 'data_exame', 'dsei', 'polo_base', 'aldeia_comunidade', 'faixa_etaria', 'sexo', 'idade_anos',
  'dente', 'tipo', 'situacao', 'sigla', 'tem_carie', 'faces_com_carie', 'face_oclusal_incisal', 'face_vestibular', 'face_lingual_palatina', 'face_mesial', 'face_distal', 'dor', 'abscesso_fistula',
  'procedimentos_indicados', 'procedimentos_realizados', 'observacao'];
const ANALISE_LIMITE = 9000000; // o Google aceita 10 milhões de células; deixa folga
/** Todos os exames válidos, completos (com os dentes), lidos da planilha do app em blocos. */
function examesValidosCompletos() {
  const aba = abaExames(), n = aba.getLastRow() - 1, col = colEx().dados_completos_json; /** @type {any} */ const porId = {};
  for (let i = 0; i < n; i += 1000) {
    aba.getRange(2 + i, col, Math.min(1000, n - i), 1).getValues().forEach(function (v, k) {
      const r = parseExame(v[0], 2 + i + k);
      if (r && (!porId[r.id] || String(r.atualizadoEm || '') > String(porId[r.id].atualizadoEm || ''))) porId[r.id] = r;
    });
  }
  const l = Object.keys(porId).map(function (k) { return porId[k]; });
  // Número do exame de cada pessoa igual ao da planilha do app (pela ordem dos exames válidos).
  const num = {}; lerResumos().forEach(function (r) { num[r.id] = r.numeroExame; });
  return l.filter(exameValido).map(function (r) { if (num[r.id]) r.numeroExame = num[r.id]; return r; })
    .sort(function (a, b) { return String(a.dataExame).localeCompare(String(b.dataExame)) || String(a.id).localeCompare(String(b.id)); });
}
/** @param {any} e */
function linhasDentesAnalise(e) {
  const o = valoresDoExame(e, false);
  return linhasDentes(e).map(function (l) {
    /** @type {any} */ const d = {}; CAB_DENTE.forEach(function (k, i) { d[k] = l[i]; });
    // Contas prontas para o Looker: faces com cárie (ativa, crônica ou restaurada com cárie) neste dente.
    const x = (e.dentes || {})[l[CAB_DENTE.indexOf('dente')]] || {}, fs = x.status === 'presente' ? x.faces || {} : {};
    d.faces_com_carie = ['O', 'V', 'L', 'M', 'D'].filter(function (f) { return ['ca', 'cc', 'restc'].indexOf(fs[f]) >= 0; }).length;
    d.tem_carie = d.faces_com_carie > 0 ? 'sim' : 'não';
    return CAB_AN_DENTES.map(function (k) { return k in d ? d[k] : o[k] == null ? '' : o[k]; });
  });
}
function planilhaAnalise() {
  let id = propriedade('ANALISE_ID'), ss = null;
  try { if (id) ss = SpreadsheetApp.openById(id); } catch (x) { ss = null; }
  if (!ss) {
    ss = SpreadsheetApp.create(ANALISE_NOME);
    try { const pastas = DriveApp.getFoldersByName(PASTA_BACKUP); const pasta = pastas.hasNext() ? pastas.next() : DriveApp.createFolder(PASTA_BACKUP); DriveApp.getFileById(ss.getId()).moveTo(pasta); } catch (x) {}
    PropertiesService.getScriptProperties().setProperty('ANALISE_ID', ss.getId());
  }
  return ss;
}
/** Refaz a planilha de análise e confere. Devolve o estado (também guardado em ANALISE_ESTADO). */
function atualizarAnalise() {
  const inicio = Date.now(), regs = examesValidosCompletos();
  const exames = regs.map(function (e) { const o = valoresDoExame(e, false); return cabAnExames().map(function (k) { return o[k] == null ? '' : o[k]; }); });
  /** @type {any[]} */ let dentes = []; regs.forEach(function (e) { dentes = dentes.concat(linhasDentesAnalise(e)); });
  const celulas = (exames.length + 1) * cabAnExames().length + (dentes.length + 1) * CAB_AN_DENTES.length;
  /** @type {any} */ const est = { em: new Date().toISOString(), exames: exames.length, dentes: dentes.length, celulas: celulas, pct: Math.floor(celulas / ANALISE_LIMITE * 100), ok: false };
  if (celulas > ANALISE_LIMITE) {
    est.erro = 'A planilha de análise ficaria com ' + celulas + ' células, acima do limite. A versão anterior foi mantida.';
    guardarEstadoAnalise(est); throw new Error('planilha de análise: ' + est.erro);
  }
  const ss = planilhaAnalise(), comeco = new Date();
  escreverAbaNoLugar(ss, 'Sobre', ['item', 'valor'], [['Situação', 'Atualização em andamento (começou em ' + fmtDia(comeco) + ' ' + fmtHora(comeco) + '). Se esta linha continuar aqui, a atualização não terminou: veja Erros recentes na Administração do app.']], 2);
  escreverAbaNoLugar(ss, 'Exames', cabAnExames(), exames, 0);
  escreverAbaNoLugar(ss, 'Dentes', CAB_AN_DENTES, dentes, 1);
  const agora = new Date();
  escreverAbaNoLugar(ss, 'Sobre', ['item', 'valor'], [
    ['O que é', 'Cópia dos exames válidos do Odontograma para análise (Looker Studio, Excel). Refeita toda madrugada: não edite, as mudanças se perdem.'],
    ['Atualizada em (horário de Brasília)', fmtDia(agora) + ' ' + fmtHora(agora)],
    ['Exames válidos', String(exames.length)], ['Linhas de dentes', String(dentes.length)],
    ['Espaço usado', est.pct + '% (o Google aceita até 10 milhões de células)'],
    ['Exames', 'Uma linha por exame válido. As colunas são as mesmas da aba Exames do app; o Dicionário do app explica cada uma.'],
    ['Dentes', 'Uma linha por dente de cada exame (todos os dentes da dentição registrada). Use id_exame para ligar com a aba Exames.']
  ], 2);
  ss.getSheets().forEach(function (a) { if (['Exames', 'Dentes', 'Sobre'].indexOf(a.getName()) < 0 && ss.getSheets().length > 3) { try { ss.deleteSheet(a); } catch (x) {} } });
  SpreadsheetApp.flush();
  // Conferência: o que ficou na planilha de análise bate com a planilha do app?
  const nEx = ss.getSheetByName('Exames').getLastRow() - 1, nDe = ss.getSheetByName('Dentes').getLastRow() - 1;
  const validos = lerIndice().filter(function (r) { return r.situacao !== 'cancelado'; }).length;
  est.url = ss.getUrl(); est.segundos = Math.round((Date.now() - inicio) / 1000);
  est.ok = nEx === exames.length && nDe === dentes.length && exames.length === validos;
  if (!est.ok) est.erro = 'Conferência: planilha de análise com ' + nEx + ' exames e ' + nDe + ' dentes; esperado ' + validos + ' exames válidos e ' + dentes.length + ' dentes.';
  guardarEstadoAnalise(est);
  if (!est.ok) throw new Error('planilha de análise: ' + est.erro);
  return est;
}
/** Reescreve o conteúdo de uma aba sem apagá-la (o Looker continua ligado a ela). @param {any} ss @param {string} nome @param {any[]} cab @param {any[][]} linhas @param {number} posicao */
function escreverAbaNoLugar(ss, nome, cab, linhas, posicao) {
  let a = ss.getSheetByName(nome);
  if (!a) { a = ss.insertSheet(nome); try { ss.setActiveSheet(a); ss.moveActiveSheet(posicao + 1); } catch (x) {} }
  const nl = Math.max(linhas.length + 1, 2), nc = cab.length;
  if (a.getMaxRows() < nl) a.insertRowsAfter(a.getMaxRows(), nl - a.getMaxRows());
  if (a.getMaxColumns() < nc) a.insertColumnsAfter(a.getMaxColumns(), nc - a.getMaxColumns());
  a.getRange(1, 1, 1, nc).setValues([cab]).setFontWeight('bold');
  a.setFrozenRows(1);
  if (!linhas.length) a.getRange(2, 1, 1, nc).clearContent();
  for (let i = 0; i < linhas.length; i += 4000) {
    const bloco = linhas.slice(i, i + 4000).map(function (l) { const x = linhaSegura(l); while (x.length < nc) x.push(''); return x.slice(0, nc); });
    a.getRange(2 + i, 1, bloco.length, nc).setValues(bloco);
  }
  // O que sobrou da versão anterior (linhas abaixo e colunas à direita) sai.
  if (a.getMaxRows() > nl) a.deleteRows(nl + 1, a.getMaxRows() - nl);
  if (a.getMaxColumns() > nc) a.deleteColumns(nc + 1, a.getMaxColumns() - nc);
}
/** @param {any} est */
function guardarEstadoAnalise(est) { PropertiesService.getScriptProperties().setProperty('ANALISE_ESTADO', JSON.stringify(est)); }
function estadoAnalise() { try { return JSON.parse(propriedade('ANALISE_ESTADO') || 'null'); } catch (x) { return null; } }
/** @param {any} d @param {any} u */
function atualizarAnalisePelaTitular(d, u) {
  if (!u.titular) return { ok: false, erro: 'Só a coordenação titular atualiza a planilha de análise.' };
  try { return { ok: true, analise: atualizarAnalise() }; }
  catch (err) {
    // Para a titular, a mensagem diz o motivo e o que fazer (ex.: falta autorizar no editor do Apps Script).
    const e = registrarErro(err, 'atualizar planilha de análise', u), t = TIPOS_ERRO[e.tipo] || TIPOS_ERRO.nao_identificado;
    return { ok: false, erro: t.titulo + '. ' + (e.tipo === 'autorizacao' ? 'No Apps Script, escolha atualizarPlanilhaAnalise, clique em Executar e autorize.' : t.fazer), analise: estadoAnalise() || {} };
  }
}
// Rode no editor para criar ou refazer a planilha de análise agora.
function atualizarPlanilhaAnalise() {
  const r = atualizarAnalise();
  Logger.log('Planilha de análise atualizada: ' + r.exames + ' exames, ' + r.dentes + ' linhas de dentes, ' + r.pct + '% do espaço, em ' + r.segundos + ' s.\n' + r.url);
}

/* ---------- erros: explicados para a coordenação titular ----------
 * O profissional vê só uma mensagem simples. O detalhe técnico fica na aba _erros, a Administração mostra o motivo em
 * linguagem simples e o que fazer, e a coordenação titular recebe um e-mail (no máximo um a cada 6 horas). */
const ABA_ERROS = '_erros', CAB_ERROS = ['data', 'hora', 'tipo', 'acao', 'quem', 'detalhe'];
const TIPOS_ERRO = {
  fila: { titulo: 'Muitos envios ao mesmo tempo', motivo: 'Vários profissionais enviaram exames no mesmo minuto e a fila da planilha encheu.', fazer: 'Nada: o app tenta de novo sozinho. Se isso acontecer em todo Dia B, avise a equipe técnica.' },
  google_lento: { titulo: 'O Google demorou para responder', motivo: 'A planilha ficou lenta por alguns segundos, o que acontece de vez em quando.', fazer: 'Nada, se for raro. Se for várias vezes por dia, confira se a planilha está muito grande.' },
  cota_email: { titulo: 'Acabou a cota de e-mails do dia', motivo: 'A conta do Google envia um número limitado de e-mails por dia (cerca de 100 numa conta Gmail comum).', fazer: 'Os códigos de acesso aparecem na tela de quem aprovou, para repassar. A cota volta no dia seguinte.' },
  cota: { titulo: 'Acabou outra cota diária do Google', motivo: 'O uso do dia passou de um limite do Google.', fazer: 'Esperar o dia seguinte. Se repetir, avise a equipe técnica.' },
  planilha_alterada: { titulo: 'A planilha foi alterada à mão', motivo: 'Uma aba foi renomeada, uma coluna foi apagada ou o cabeçalho mudou.', fazer: 'Desfazer a mudança (na planilha: Arquivo > Histórico de versões).' },
  limite_planilha: { titulo: 'A planilha está perto do limite', motivo: 'O Google aceita até 10 milhões de células por planilha.', fazer: 'Avise a equipe técnica para planejar uma planilha nova.' },
  autorizacao: { titulo: 'Falta autorização do Google', motivo: 'O código novo foi colado, mas ainda não foi autorizado.', fazer: 'No Apps Script, rode testarInstalacao, autorize e publique pelo lápis.' },
  analise: { titulo: 'A planilha de análise não foi atualizada', motivo: 'A cópia para o Looker Studio ("Odontograma - análise") não foi refeita ou os números não bateram com a planilha do app.', fazer: 'Em Administração, toque em "Atualizar agora". Se continuar, copie o detalhe e mande para a equipe técnica. Os exames do app não foram afetados.' },
  nao_identificado: { titulo: 'Erro não identificado', motivo: 'Algo inesperado aconteceu no servidor.', fazer: 'Copie o detalhe técnico e mande para a equipe técnica.' }
};
/** @param {string} t */
function tipoDoErro(t) {
  if (/planilha de análise/i.test(t)) return 'analise';
  if (/lock|trava|bloqueio/i.test(t)) return 'fila';
  if (/too many times|muitas vezes|quota|cota/i.test(t)) return /mail|e-mail|email/i.test(t) ? 'cota_email' : 'cota';
  if (/10000000|10\.000\.000|células|cells.*limit|limit.*cells/i.test(t)) return 'limite_planilha';
  if (/authoriz|autoriza|permission|permiss/i.test(t)) return 'autorizacao';
  if (/timed out|tempo limite|unavailable|indispon|server error|erro de servidor|exceeded maximum execution|tempo máximo/i.test(t)) return 'google_lento';
  if (/number of columns|número de colunas|number of rows|número de linhas|cabeçalho|header|coordinates|coordenadas/i.test(t)) return 'planilha_alterada';
  return 'nao_identificado';
}
/** @param {any} err @param {any} acao @param {any} u */
function registrarErro(err, acao, u) {
  const texto = String((err && (err.stack || err.message)) || err).slice(0, 800), tipo = tipoDoErro(texto), agora = new Date();
  try {
    obterAba(planilha(), ABA_ERROS, CAB_ERROS).appendRow(linhaSegura([fmtDia(agora), fmtHora(agora), tipo, String(acao || ''), u ? (u.email || u.nome || '') : '', texto]));
    const ult = propriedade('ERROS_EMAIL_EM');
    if (!ult || agora.getTime() - new Date(ult).getTime() > 6 * 3600 * 1000) {
      PropertiesService.getScriptProperties().setProperty('ERROS_EMAIL_EM', agora.toISOString());
      const t = TIPOS_ERRO[tipo];
      enviarEmail(emailCoord(), 'Odontograma: erro no servidor (' + t.titulo + ')', 'Aconteceu um erro no servidor do Odontograma.\n\nMotivo: ' + t.motivo + '\nO que fazer: ' + t.fazer +
        '\n\nOs exames não se perdem: ficam guardados nos aparelhos e o app tenta de novo sozinho.\nVeja os detalhes em Administração > Erros recentes (avisos repetidos ficam juntos por 6 horas).\n\n' + NOME_APP);
    }
  } catch (x) {}
  return { tipo: tipo, mensagem: 'Não foi possível concluir agora. Tente de novo em alguns minutos.' };
}
// Erros dos últimos 7 dias, juntos por motivo (só para a coordenação titular, em Administração).
function errosRecentes() {
  const aba = planilha().getSheetByName(ABA_ERROS); if (!aba || aba.getLastRow() < 2) return { total24h: 0, grupos: [] };
  const v = aba.getRange(2, 1, aba.getLastRow() - 1, CAB_ERROS.length).getValues().map(function (l) { return { data: textoCelula(l[0]).slice(0, 10), hora: textoCelula(l[1]).slice(-5), tipo: String(l[2]), acao: String(l[3]), quem: String(l[4]), detalhe: String(l[5]) }; });
  const desde = fmtDia(new Date(Date.now() - 7 * 864e5)), ontem = new Date(Date.now() - 864e5);
  const rec = v.filter(function (x) { return x.data >= desde; });
  /** @type {any} */ const g = {};
  rec.forEach(function (x) { (g[x.tipo] = g[x.tipo] || []).push(x); });
  return { total24h: rec.filter(function (x) { return new Date(x.data + 'T' + (x.hora || '00:00') + ':00-03:00') >= ontem; }).length,
    grupos: Object.keys(g).map(function (k) { const l = g[k], t = TIPOS_ERRO[k] || TIPOS_ERRO.nao_identificado;
      return { tipo: k, titulo: t.titulo, motivo: t.motivo, fazer: t.fazer, vezes: l.length, primeiro: l[0].data + ' ' + l[0].hora, ultimo: l[l.length - 1].data + ' ' + l[l.length - 1].hora,
        exemplos: l.slice(-5).reverse() }; }).sort(function (a, b) { return String(b.ultimo).localeCompare(String(a.ultimo)); }) };
}
/** @param {any} d @param {any} u */
function limparErros(d, u) {
  if (!u.titular) return { ok: false, erro: 'Só a coordenação titular limpa a lista de erros.' };
  const aba = planilha().getSheetByName(ABA_ERROS);
  if (aba) reescreverAba(planilha(), ABA_ERROS, CAB_ERROS, [], null);
  registrar(u, 'Limpou a lista de erros', '');
  return { ok: true };
}

/* ---------- dados para análise (arquivo do Excel) ----------
 * Uma linha por exame, com as três partes (exame, contas prontas e cada dente). Em páginas, para não estourar o tamanho
 * da resposta. Cada perfil baixa o que pode ver: o profissional, os próprios exames; a RT, os do DSEI; a coordenação, todos. */
const TAM_PAGINA_ANALISE = 200;
/** @param {any} d @param {any} u */
function dadosAnalise(d, u) {
  const aba = abaExames(), n = aba.getLastRow() - 1, ini = Math.max(0, Number(d.pagina) || 0) * TAM_PAGINA_ANALISE;
  const de = String(d.de || ''), ate = String(d.ate || ''), dsei = String(d.dsei || '');
  /** @type {any[]} */ const linhas = [];
  if (n > 0 && ini < n) {
    aba.getRange(2 + ini, colEx().dados_completos_json, Math.min(TAM_PAGINA_ANALISE, n - ini), 1).getValues().forEach(function (v, i) {
      const r = parseExame(v[0], 2 + ini + i); if (!r) return;
      const pode = d.meus || u.perfil === 'dentista' ? ehDoUsuario(r, u) : u.perfil === 'rt' ? r.dsei === u.dsei : true;
      if (!pode || (de && r.dataExame < de) || (ate && r.dataExame > ate) || (dsei && r.dsei !== dsei)) return;
      linhas.push(linhaAnalise(r));
    });
  }
  if (!ini) registrar(u, 'Baixou dados para análise', (d.meus ? 'meus exames' : dsei || (u.perfil === 'rt' ? 'DSEI ' + u.dsei : 'todos')) + (de || ate ? ' · ' + (de || '…') + ' a ' + (ate || '…') : ''));
  return { ok: true, cabecalho: ini ? null : CAB_ANALISE, linhas: linhas, total: Math.max(0, n), proxima: ini + TAM_PAGINA_ANALISE < n ? (Number(d.pagina) || 0) + 1 : null };
}

/* ---------- 3. formato da planilha e reorganização ---------- */
// Quando o FORMATO muda (colunas novas), a planilha é reorganizada uma vez, sempre com backup antes.
function formatoAtual() {
  if (MEMO && MEMO.formatoOk) return true;
  const ok = propriedade('FORMATO_PLANILHA') === FORMATO; if (ok && MEMO) MEMO.formatoOk = true;
  return ok;
}
// Rode no editor para reorganizar agora (faz backup antes, e cancela se o backup falhar). Com a planilha vazia
// acontece sozinha; com exames, a coordenação titular confirma na Administração depois de ver o relatório.
function reorganizarPlanilha() {
  const t = LockService.getScriptLock(); t.waitLock(30000); COM_TRAVA = true;
  try {
    const r = reorganizarAgora();
    Logger.log('Planilha reorganizada: ' + r.exames + ' exames, ' + r.acessos + ' eventos em Acessos, ' + r.uso + ' pessoas em Uso.');
    Logger.log('Backup feito antes: ' + r.backup + ' · exames com resultado recalculado: ' + ((r.relatorio || {}).mudam || 0));
  } finally { concluirGravacao(); COM_TRAVA = false; t.releaseLock(); }
}
/* Relatório do que a reorganização muda nos exames: para cada exame, a classe e o ceo-d/CPO-D gravados
 * comparados com o que o servidor calcula pela regra atual. Não grava nada. */
/** @param {any[]} regs */
function relatorioRecalculo(regs) {
  /** @type {any} */ const r = { exames: regs.length, comDentes: 0, mudam: 0, classe: 0, ceod: 0, cpod: 0, exemplos: [] };
  const ind = function (x) { x = x || {}; return [x.c || 0, x.e != null ? x.e : x.p || 0, x.o || 0, x.total || 0].join('/'); };
  regs.forEach(function (e) {
    if (!e.dentes || !Object.keys(e.dentes).length) return;
    r.comDentes++;
    const a = e.resultado || {}, b = avaliarExame(e);
    const mc = a.classe !== b.classe, me = ind(a.ceod) !== ind(b.ceod), mp = ind(a.cpod) !== ind(b.cpod);
    if (mc) r.classe++; if (me) r.ceod++; if (mp) r.cpod++;
    if (mc || me || mp) {
      r.mudam++;
      // Todos os exames que mudam entram no relatório (a aba lista um por um); a resposta ao app leva só alguns.
      r.exemplos.push({ id: e.id, codigo: codigoIndividuoDe(e), dsei: e.dsei, data: e.dataExame,
        classe: [a.classe || '', b.classe], ceod: [ind(a.ceod), ind(b.ceod)], cpod: [ind(a.cpod), ind(b.cpod)] });
    }
  });
  return r;
}
/** Prévia para a coordenação titular, antes de confirmar. @param {any} d @param {any} u */
function previaReorganizacao(d, u) {
  if (!u.titular) return { ok: false, erro: 'Só a coordenação titular atualiza a planilha.' };
  const rel = relatorioRecalculo(lerExames().map(sanear));
  return { ok: true, pendente: !formatoAtual(), formatoAtual: propriedade('FORMATO_PLANILHA') || '', formatoNovo: FORMATO,
    relatorio: Object.assign({}, rel, { exemplos: rel.exemplos.slice(0, 20) }) };
}
/** @param {any} d @param {any} u */
function reorganizarPelaTitular(d, u) {
  if (!u.titular) return { ok: false, erro: 'Só a coordenação titular atualiza a planilha.' };
  if (formatoAtual()) return { ok: true, jaFeito: true };
  try {
    const r = reorganizarAgora();
    if (r.relatorio) r.relatorio = Object.assign({}, r.relatorio, { exemplos: r.relatorio.exemplos.slice(0, 20) });
    return { ok: true, resultado: r };
  }
  catch (err) { return { ok: false, erro: String(err.message || err) }; }
}
function reorganizarAgora() {
  const ss = planilha();
  /** @type {any} */ const r = { exames: 0, acessos: 0, uso: 0, backup: '', relatorio: null };
  // Backup obrigatório: sem cópia, nada é reescrito.
  try { r.backup = fazerBackup('reorganizar'); }
  catch (x) { throw new Error('Reorganização cancelada: não foi possível fazer o backup antes (' + x + '). Nada foi alterado na planilha.'); }
  MIGRANDO = true;
  try {
    // O resultado (classe e índices) de todos os exames é refeito pelo servidor, pela regra atual.
    const antes = lerExames().map(sanear);
    r.relatorio = relatorioRecalculo(antes);
    if (r.relatorio.mudam) reescreverAba(ss, 'Relatório da reorganização', ['id_exame', 'codigo_individuo', 'dsei', 'data_exame', 'classe_antes', 'classe_depois', 'ceod_antes (c/e/o/total)', 'ceod_depois', 'cpod_antes (C/P/O/total)', 'cpod_depois', 'reorganizado_em'],
      r.relatorio.exemplos.map(function (x) { return [x.id, x.codigo, x.dsei, x.data, x.classe[0], x.classe[1], x.ceod[0], x.ceod[1], x.cpod[0], x.cpod[1], new Date().toISOString()]; }), null);
    const regs = antes.map(recalcularResultado);
    const linhasEx = regs.map(linhaExame);
    reescreverAba(ss, 'Exames', CAB_EXAME, linhasEx, 0);
    // Desde o formato 25, o detalhe de cada dente fica no exame completo (uma linha por exame): a aba Dentes sai.
    const abaD = ss.getSheetByName('Dentes'); if (abaD) ss.deleteSheet(abaD);
    MEMO = null;
    const uso = migrarAcessos(ss);
    r.uso = recalcularUso(ss, regs);
    escreverDicionario(ss);
    r.exames = linhasEx.length; r.acessos = uso.eventos;
    PropertiesService.getScriptProperties().setProperty('FORMATO_PLANILHA', FORMATO);
  } finally { MIGRANDO = false; }
  const rel = r.relatorio || {};
  registrar({ email: '', nome: 'Sistema' }, 'Reorganizou a planilha', 'Versão ' + FORMATO + ' · ' + r.exames + ' exames · ' + (rel.mudam || 0) + ' com resultado recalculado (classe ' + (rel.classe || 0) + ', ceo-d ' + (rel.ceod || 0) + ', CPO-D ' + (rel.cpod || 0) + ') · backup antes: ' + r.backup);
  return r;
}
// O servidor é a fonte do resultado clínico: refaz a classe de risco e o ceo-d/CPO-D a partir dos dentes
// (avaliarExame, no trecho compartilhado). Um exame sem dentes guardados mantém o resultado que tinha.
/** @param {any} r */
function recalcularResultado(r) {
  if (!r || !r.dentes || !Object.keys(r.dentes).length) return r;
  const c = avaliarExame(r);
  r.resultado = Object.assign({}, r.resultado || {}, { classe: c.classe, risco: c.risco, descricao: c.descricao, motivos: c.motivos, ceod: c.ceod, cpod: c.cpod, agrupamento: 'tres' });
  return r;
}
// Garante que nenhum exame guarde dados que identificam a pessoa (nome, Cartão SUS, CPF, endereço...).
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
  const principal = (function () { try { return ss.getId() === planilha().getId(); } catch (x) { return true; } })();
  if (MEMO && principal) { if (MEMO.abas) delete MEMO.abas[nome]; if (nome === 'Exames') { MEMO.abaEx = null; MEMO.indice = null; MEMO.resumos = null; MEMO.completos = null; MEMO.proxLinha = null; MEMO.emendas = {}; MEMO.escrevendo = false; } }
  if (nome === 'Exames' && principal) { marcarVersaoDados(); esquecerDaMemoria('indice+'); esquecerDaMemoria('resumos+'); }
  if (posicao != null) { try { ss.setActiveSheet(nova); ss.moveActiveSheet(posicao + 1); } catch (x) {} }
  return nova;
}
/** @param {any} d */
function fmtDia(d) { return Utilities.formatDate(d, FUSO, 'yyyy-MM-dd'); }
/** @param {any} d */
function fmtHora(d) { return Utilities.formatDate(d, FUSO, 'HH:mm'); }
/** @param {any} u */
function perfilTexto(u) { return u.id === 'coord' ? 'coordenação titular' : u.perfil === 'coord' && u.dsei ? 'coordenação e referência técnica' : (NOME_PERFIL[u.perfil] || ''); }
/* ---------- 4. abas Acessos e Uso (auditoria) ---------- */
// Reorganização da aba Acessos: junta as abas cujo nome começa com "Acessos" (uma aba com cabeçalho trocado é
// renomeada por obterAba), do mais recente para o mais antigo. Nenhum evento é apagado.
/** @param {any} ss */
function migrarAcessos(ss) {
  /** @type {any[]} */ const linhas = [];
  /** @type {any[]} */ const abas = ss.getSheets().filter(function (a) { return /^Acessos/.test(a.getName()); });
  abas.forEach(function (aba) {
    if (aba.getLastRow() < 2) return;
    const v = aba.getDataRange().getValues();
    if (String(v[0][0]) !== 'data') return;
    for (let i = 1; i < v.length; i++) {
      const x = v[i].map(function (c) { return c instanceof Date ? fmtDia(c) : c; });
      if (x[7]) linhas.push(x.slice(0, CAB_ACESSOS.length));
    }
  });
  linhas.sort(function (a, b) { return (String(b[0]) + String(b[1])).localeCompare(String(a[0]) + String(a[1])); });
  abas.forEach(function (a) { if (a.getName() !== 'Acessos') ss.deleteSheet(a); });
  reescreverAba(ss, 'Acessos', CAB_ACESSOS, linhas, 1);
  return { eventos: linhas.length };
}
// Uma linha por pessoa com acesso: entradas, consultas e exames.
// As entradas e consultas já contadas são mantidas; os números de exames são refeitos a partir dos exames.
/** @param {any} ss @param {any[]} regs */
function recalcularUso(ss, regs) {
  const abaU = ss.getSheetByName('Uso'), porId = {};
  if (abaU && abaU.getLastRow() > 1) abaU.getRange(2, 1, abaU.getLastRow() - 1, CAB_USO.length).getValues().forEach(function (l) {
    porId[String(l[0])] = { ultimo: l[5] instanceof Date ? l[5].toISOString() : String(l[5] || ''), mes: Number(l[6]) || 0, mesRef: String(l[7] || ''), entradas: Number(l[8]) || 0, consultas: Number(l[9]) || 0 };
  });
  // Soma as entradas e consultas guardadas como contador desde a última vez.
  const pr = PropertiesService.getScriptProperties(), props = pr.getProperties(), mesAtual = fmtDia(new Date()).slice(0, 7), usados = [];
  Object.keys(props).forEach(function (k) {
    if (k.indexOf(PREFIXO_USO) !== 0) return;
    /** @type {any} */ let p = {}; try { p = JSON.parse(props[k]); } catch (x) {}
    const id = k.slice(PREFIXO_USO.length), o = porId[id] = porId[id] || { ultimo: '', mes: 0, mesRef: mesAtual, entradas: 0, consultas: 0 };
    if (o.mesRef !== mesAtual) { o.mesRef = mesAtual; o.mes = 0; }
    o.entradas += p.e || 0; o.consultas += p.c || 0; o.mes += (p.em || {})[mesAtual] || 0;
    if (String(p.ult || '') > String(o.ultimo || '')) o.ultimo = p.ult;
    usados.push(k);
  });
  const us = lerUsuarios().filter(function (x) { return x.status === 'ativo' || x.status === 'desativado'; });
  const pessoas = us.slice();
  if (emailConfigurado()) pessoas.unshift({ id: 'coord', nome: 'Coordenação', email: emailCoord(), perfil: 'coord', dsei: '', ultimo_acesso: '' });
  const mes = fmtDia(new Date()).slice(0, 7);
  const linhas = pessoas.map(function (x) {
    const o = porId[String(x.id)] || { ultimo: '', mes: 0, mesRef: mes, entradas: 0, consultas: 0 };
    const meus = regs.filter(function (r) { return ehDoUsuario(r, x); });
    const validos = meus.filter(exameValido);
    const ult = validos.reduce(function (m, r) { return String(r.dataExame || '') > m ? String(r.dataExame || '') : m; }, '');
    const ultimoAcesso = String(x.ultimo_acesso || '');
    const acesso = ultimoAcesso && !isNaN(new Date(ultimoAcesso).getTime()) ? fmtDia(new Date(ultimoAcesso)) + ' ' + fmtHora(new Date(ultimoAcesso)) : o.ultimo;
    return [x.id, x.nome, x.email, perfilTexto(x), x.dsei || '', acesso, o.mesRef === mes ? o.mes : 0, mes, o.entradas, o.consultas, validos.length, meus.length - validos.length, ult];
  });
  reescreverAba(ss, 'Uso', CAB_USO, linhas, 2);
  usados.forEach(function (k) { pr.deleteProperty(k); });
  return linhas.length;
}
/* A aba Uso não é mais regravada a cada pedido (isso custava quase 2 segundos por envio): entradas e consultas viram
 * um contador leve (uma propriedade por pessoa) e a aba é refeita de madrugada, na tarefa diária, com os exames contados
 * a partir da aba Exames. */
const PREFIXO_USO = 'uso_';
/** @param {any} u @param {any} tipo */
function atualizarUso(u, tipo) {
  if (!u || !u.id || (tipo !== 'entrada' && tipo !== 'consulta')) return;
  const pr = PropertiesService.getScriptProperties(), k = PREFIXO_USO + u.id, agora = new Date(), mes = fmtDia(agora).slice(0, 7);
  /** @type {any} */ let o = {}; try { o = JSON.parse(pr.getProperty(k) || '{}'); } catch (x) {}
  o.e = (o.e || 0) + (tipo === 'entrada' ? 1 : 0); o.c = (o.c || 0) + (tipo === 'consulta' ? 1 : 0);
  o.em = o.em || {}; if (tipo === 'entrada') o.em[mes] = (o.em[mes] || 0) + 1;
  o.ult = fmtDia(agora) + ' ' + fmtHora(agora);
  pr.setProperty(k, JSON.stringify(o));
}
// Exames contados na tarefa diária (recalcularUso), não a cada envio.
/** @param {any} u @param {any[]} regs */
function atualizarUsoExames(u, regs) {}


/* ---------- 5. entrada dos pedidos: cada pedido do app chega aqui (doPost) ---------- */
/** @param {any} e */
function doPost(e) {
  MEMO = null;
  /** @type {any} */ let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return saida({ ok: false, erro: 'Pedido inválido.' }); }
  if (!d.acao) return saida({ ok: false, erro: 'Pedido sem ação. Abra o app com internet e recarregue a página.' });
  const A = ACOES[d.acao];
  if (!A) return saida({ ok: false, erro: 'Ação desconhecida: ' + d.acao });
  // Reorganização da planilha depois de atualizar o código:
  // - planilha sem exames (instalação nova): acontece sozinha, com backup antes;
  // - planilha com exames: NUNCA sozinha. Fica pendente até a coordenação titular ver o relatório do que muda e
  //   confirmar na Administração. Enquanto isso, só leituras funcionam; os exames esperam guardados no aparelho.
  let pendente = false;
  if (!formatoAtual()) {
    const tf = LockService.getScriptLock(); tf.waitLock(30000); COM_TRAVA = true;
    try {
      // Confere de novo já com a trava: outra requisição pode ter acabado de reorganizar.
      if (!formatoAtual()) { if (!lerExames().length) reorganizarAgora(); else pendente = true; }
    } catch (err) { return saida({ ok: false, passageiro: true, erro: registrarErro(err, 'reorganizar', null).mensagem }); } finally { concluirGravacao(); COM_TRAVA = false; tf.releaseLock(); }
  }
  if (pendente && A.escreve && !A.reorganiza) return saida({ ok: false, manutencao: true, erro: 'A planilha está esperando uma atualização da coordenação. Nada foi perdido: os exames ficam guardados no aparelho e serão enviados quando a coordenação concluir. Tente de novo mais tarde.' });
  // Quem grava passa pela trava, um de cada vez. Em vez de deixar o celular esperando até 30 segundos (e entupir a fila),
  // o servidor espera no máximo ESPERA_TRAVA_MS e responde "ocupado": o app tenta de novo sozinho, cada um num tempo diferente.
  const trava = A.escreve ? LockService.getScriptLock() : null;
  if (trava && !trava.tryLock(ESPERA_TRAVA_MS)) return saida({ ok: false, ocupado: true, passageiro: true, tenteEm: TENTE_EM_MIN + Math.floor(Math.random() * (TENTE_EM_MAX - TENTE_EM_MIN + 1)),
    erro: 'O servidor está ocupado com outros envios. O app vai tentar de novo sozinho em alguns segundos.' });
  const prop0 = MEMO && MEMO.prop; MEMO = null; if (prop0) memo().prop = prop0;
  COM_TRAVA = !!trava;
  /** @type {any} */ let quem = null;
  try {
    if (A.publica) {
      // Pedidos de acesso: no máximo 5 por e-mail por hora.
      if (d.acao === 'pedirAcesso' && !dentroDoLimite('pedido:' + normEmail(d.email), 5, 3600)) return saida({ ok: false, erro: 'Muitos pedidos com este e-mail na última hora. Espere um pouco e tente de novo.' });
      return saida(A.fn(d));
    }
    // Limite de tentativas de login (20 erradas em 15 minutos):
    // - profissionais: o código certo SEMPRE entra (quem só sabe o e-mail não consegue bloquear o dono). O código é
    //   sorteado com 12 caracteres, então tentar adivinhar é inviável; o limite só deixa de responder às erradas.
    // - coordenação titular: a senha é escolhida por pessoa e pode ser curta, então o bloqueio vale até para a senha
    //   certa (proteção contra tentativa e erro). Use uma senha longa.
    const emailL = normEmail(d.email), ehTitular = !!emailL && emailL === emailCoord();
    const bloqueado = !!emailL && limiteEsgotado('falha:' + emailL, 20);
    const msgBloq = { ok: false, semAcesso: true, bloqueado: true, erro: 'Muitas tentativas erradas com este e-mail. Espere 15 minutos e tente de novo.' };
    if (bloqueado && ehTitular) return saida(msgBloq);
    const u = autenticar(d);
    quem = u;
    if (!u && memo().sessaoVencida) return saida({ ok: false, semAcesso: true, sessaoVencida: true, erro: 'Seu acesso venceu porque o app ficou ' + DIAS_SESSAO + ' dias sem ser usado. Entre de novo com o seu código. Os exames guardados neste aparelho continuam aqui.' });
    if (!u && ehTitular && chaveCfg() && !chaveConfigurada()) return saida({ ok: false, semAcesso: true, erro: 'A senha da coordenação titular precisa ter pelo menos ' + SENHA_MINIMA + ' caracteres. No Apps Script, troque o valor de CHAVE_COORDENACAO em Propriedades do script por uma senha mais longa (vale na hora).' });
    if (!u) {
      if (emailL) dentroDoLimite('falha:' + emailL, 1000, 900);
      // Bloqueado: não registra cada tentativa de novo (evita encher a aba Acessos com um ataque).
      if (d.email && !bloqueado) registrar({ email: d.email, nome: '' }, 'Tentativa de acesso recusada', d.acao);
      return saida(bloqueado ? msgBloq : { ok: false, semAcesso: true, erro: 'E-mail ou código de acesso inválido, ou acesso desativado.' });
    }
    if (bloqueado) { try { CacheService.getScriptCache().remove('lim:falha:' + emailL); } catch (x) {} }
    if (pendente) u._reorganizacaoPendente = true;
    if (A.perfis && A.perfis.indexOf(u.perfil) < 0) return saida({ ok: false, erro: 'Seu perfil não tem permissão para isso.' });
    const resposta = A.fn(d, u);
    escreverPendentes(); // os exames novos vão para a planilha ANTES de o app saber que deram certo
    return saida(resposta);
  } catch (err) {
    return saida({ ok: false, passageiro: true, erro: registrarErro(err, d.acao, quem).mensagem });
  } finally {
    concluirGravacao();
    if (trava) { COM_TRAVA = false; trava.releaseLock(); }
  }
}
// O Google roda no máximo 30 pedidos ao mesmo tempo nesta conta, e quem espera a trava ocupa uma dessas vagas.
// Por isso a espera é curta e o "tente de novo" é sorteado entre 15 e 45 s: com 100 celulares ao mesmo tempo,
// ficam uns 12 esperando (e não mais de 30). O servidor continua gravando sem parar, então a fila esvazia no mesmo tempo.
const ESPERA_TRAVA_MS = 4000, TENTE_EM_MIN = 15, TENTE_EM_MAX = 45;

const ACOES = {
  pedirAcesso:    { publica: true, escreve: true, fn: pedirAcesso },
  reenviarCodigo: { publica: true, escreve: true, fn: reenviarCodigo },
  confirmarRecuperacao: { publica: true, escreve: true, fn: confirmarRecuperacao },
  previaReorganizacao: { perfis: ['coord'], fn: previaReorganizacao },
  reorganizar:    { perfis: ['coord'], escreve: true, reorganiza: true, fn: reorganizarPelaTitular },
  entrar:         { fn: entrar },
  enviarExame:    { escreve: true, fn: enviarExame },
  enviarExames:   { escreve: true, fn: enviarExames },
  dadosAnalise:   { fn: dadosAnalise },
  limparErros:    { perfis: ['coord'], escreve: true, fn: limparErros },
  atualizarAnalise: { perfis: ['coord'], fn: atualizarAnalisePelaTitular },
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
  limparAvisoAuditoria: { perfis: ['coord'], escreve: true, fn: limparAvisoAuditoria },
  substituirRT:   { perfis: ['coord'], escreve: true, fn: substituirRT },
  adicionarCoord: { perfis: ['coord'], escreve: true, fn: adicionarCoord },
  definirRtCoord: { perfis: ['coord'], escreve: true, fn: definirRtCoord },
  cancelarExame:  { escreve: true, fn: cancelarExame },
  buscarPessoa:   { fn: buscarPessoa },
  buscarCodigo:   { fn: buscarCodigo },
  reservarCodigo: { escreve: true, fn: reservarCodigo },
  pessoa:         { fn: pessoa },
  acompanhamento: { fn: acompanhamento },
  acoes:          { fn: acoes },
  criarAcao:      { perfis: ['coord'], escreve: true, fn: criarAcao },
  cancelarAcao:   { perfis: ['coord'], escreve: true, fn: cancelarAcao },
  inicio:         { fn: inicio },
  meuNome:        { perfis: ['coord'], escreve: true, fn: meuNome },
  atualizarPopulacao: { perfis: ['coord'], escreve: true, fn: atualizarPopulacao },
  territorios:    { fn: territorios },
  populacaoInfo:  { perfis: ['coord'], fn: populacaoInfo },
  convidar:       { perfis: ['rt', 'coord'], escreve: true, fn: convidar },
  convites:       { perfis: ['rt', 'coord'], fn: convites },
  reenviarConvite:{ perfis: ['rt', 'coord'], escreve: true, fn: reenviarConvite },
  cancelarConvite:{ perfis: ['rt', 'coord'], escreve: true, fn: cancelarConvite },
  verConvite:     { publica: true, fn: verConvite },
  aceitarConvite: { publica: true, escreve: true, fn: aceitarConvite }
};

/* ---------- 6. usuários, e-mails e endereço do app ---------- */
const normEmail = s => String(s || '').trim().toLowerCase();
function emailCoord() {
  if (emailConfigurado()) return normEmail(emailCfg());
  try { return normEmail(Session.getEffectiveUser().getEmail()); } catch (x) { return ''; }
}
// A mesma planilha (e as mesmas abas) durante o pedido inteiro: evita perguntar ao Google de novo a cada passo.
function planilha() { const m = memo(); return m.ss || (m.ss = SpreadsheetApp.getActiveSpreadsheet()); }
/* ---------- memória rápida do Google (CacheService) para listas grandes ----------
 * Cada valor guardado tem até 100 KB: uma lista maior vai em pedaços. Quem grava escreve os pedaços novos com outro
 * nome e só no fim troca o ponteiro, então quem estiver lendo ao mesmo tempo nunca pega pedaços misturados.
 * A memória pode se apagar a qualquer momento (o Google limpa): aí a lista é lida de novo da planilha. */
/** @param {string} nome @param {any} valor @param {number} seg */
function guardarNaMemoria(nome, valor, seg) {
  try {
    let txt = JSON.stringify(valor), z = 0;
    // Listas grandes vão comprimidas (cabem 3 a 5 vezes mais).
    if (txt.length > 50000) { try { txt = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(txt, 'application/json')).getBytes()); z = 1; } catch (x) {} }
    const tok = Utilities.getUuid().slice(0, 8), c = CacheService.getScriptCache(); /** @type {any} */ const m = {};
    let n = 0; for (let i = 0; i < txt.length || n === 0; i += 90000, n++) m[nome + ':' + tok + ':' + n] = txt.slice(i, i + 90000);
    if (n > PEDACOS_MAX) { c.remove(nome); return false; }
    const ks = Object.keys(m); for (let i = 0; i < ks.length; i += 20) { /** @type {any} */ const b = {}; ks.slice(i, i + 20).forEach(function (k) { b[k] = m[k]; }); c.putAll(b, seg); }
    c.put(nome, tok + ':' + n + ':' + z, seg);
    return true;
  } catch (x) { try { CacheService.getScriptCache().remove(nome); } catch (y) {} return false; }
}
const PEDACOS_MAX = 150;
/** @param {string} nome */
function lerDaMemoria(nome) {
  try {
    const c = CacheService.getScriptCache(), p = c.get(nome); if (!p) return null;
    const q = p.split(':'), tok = q[0], n = Number(q[1]), ks = []; for (let i = 0; i < n; i++) ks.push(nome + ':' + tok + ':' + i);
    /** @type {any} */ const g = {}; for (let i = 0; i < ks.length; i += 50) Object.assign(g, c.getAll(ks.slice(i, i + 50)));
    if (ks.some(function (k) { return g[k] == null; })) return null;
    let txt = ks.map(function (k) { return g[k]; }).join('');
    if (q[2] === '1') txt = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(txt), 'application/x-gzip')).getDataAsString();
    return JSON.parse(txt);
  } catch (x) { return null; }
}
/** @param {string} nome */
function esquecerDaMemoria(nome) { try { CacheService.getScriptCache().remove(nome); } catch (x) {} }

// Cadastros: lidos da memória rápida (cada pedido confere o acesso); a planilha só é lida quando a memória está vazia.
function lerUsuarios() {
  const m = memo(); if (m.usuarios) return m.usuarios;
  let l = lerDaMemoria('usuarios');
  if (!l) {
    const aba = obterAba(planilha(), 'Usuarios', CAB_USUARIOS);
    l = aba.getLastRow() < 2 ? [] : aba.getRange(2, 1, aba.getLastRow() - 1, CAB_USUARIOS.length).getValues().map(function (v, i) {
      /** @type {any} */ const u = { _linha: i + 2 };
      CAB_USUARIOS.forEach(function (k, j) { u[k] = v[j] instanceof Date ? v[j].toISOString() : String(v[j]); });
      return u;
    }).filter(function (u) { return u.id; });
    guardarNaMemoria('usuarios', l, 600);
  }
  return (m.usuarios = l);
}
// Alguém mexeu à mão na planilha (o Google chama esta função sozinho a cada edição feita na tela):
// as cópias rápidas deixam de valer e são refeitas da planilha no próximo pedido.
/** @param {any} e */
function onEdit(e) {
  try {
    const nome = e && e.range ? e.range.getSheet().getName() : '';
    if (nome === 'Exames') { marcarVersaoDados(); esquecerDaMemoria('indice+'); esquecerDaMemoria('resumos+'); }
    if (nome === 'Usuarios') esquecerDaMemoria('usuarios');
  } catch (x) {}
}
function cadastrosMudaram() { esquecerDaMemoria('usuarios'); if (MEMO) MEMO.usuarios = null; }
/** @param {any} u */
function salvarUsuario(u) {
  const aba = obterAba(planilha(), 'Usuarios', CAB_USUARIOS);
  // Neutraliza textos que a planilha leria como fórmula (o pedido de acesso é público: nome, CRO e polo vêm de fora).
  const linha = linhaSegura(CAB_USUARIOS.map(function (k) { return u[k] == null ? '' : u[k]; }));
  if (u._linha) aba.getRange(u._linha, 1, 1, linha.length).setValues([linha]);
  else { aba.appendRow(linha); u._linha = aba.getLastRow(); }
  cadastrosMudaram();
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
  const email = normEmail(d.email);
  if (!email) return null;
  // Depois de entrar com o código, o app usa uma sessão (o código não fica guardado no aparelho).
  if (d.sessao) return validarSessao(email, String(d.sessao));
  const cod = String(d.codigo || '').trim();
  if (!cod) return null;
  if (email === emailCoord() && chaveConfigurada() && cod === chaveCfg()) return titular(email);
  const h = hashCodigo(cod);
  const u = lerUsuarios().filter(function (x) { return normEmail(x.email) === email && x.status === 'ativo' && x.codigo_hash === h; })[0];
  if (!u) return null;
  return marcarAcesso(u);
}
/** @param {string} email */
function titular(email) { return { id: 'coord', nome: propriedade('NOME_COORDENACAO') || 'Coordenação', email: email, perfil: 'coord', dsei: '', uf: '', cro: '', polo: '', status: 'ativo', titular: 'sim' }; }
/** @param {any} u */
function marcarAcesso(u) {
  const hoje = new Date().toISOString().slice(0, 10);
  // Grava só a célula do último acesso (fora da trava): regravar a linha inteira poderia desfazer uma desativação
  // ou um código novo feitos no mesmo instante por outra pessoa.
  if (String(u.ultimo_acesso).slice(0, 10) !== hoje) {
    u.ultimo_acesso = new Date().toISOString();
    try { obterAba(planilha(), 'Usuarios', CAB_USUARIOS).getRange(u._linha, CAB_USUARIOS.indexOf('ultimo_acesso') + 1, 1, 1).setValues([[u.ultimo_acesso]]); cadastrosMudaram(); } catch (x) {}
  }
  return u;
}
/* ---------- sessões: o acesso vence depois de DIAS_SESSAO dias sem usar o app ----------
 * Ao entrar com o e-mail e o código, o app recebe uma sessão (um texto sorteado) e passa a usá-la no lugar do código.
 * Cada sessão fica numa propriedade própria do script (chave "sessao_" + hash): muitas pessoas entrando no mesmo
 * segundo não se atrapalham (numa aba da planilha, linhas gravadas ao mesmo tempo podiam cair uma sobre a outra).
 * Só o "hash" da sessão é guardado. A sessão deixa de valer quando: passa DIAS_SESSAO dias sem uso, o acesso é
 * desativado, um código novo é gerado para a pessoa ou a senha da coordenação titular é trocada. */
const DIAS_SESSAO = 15, PREFIXO_SESSAO = 'sessao_';
/** @param {string} t */
function hashSessao(t) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'sessao:' + t).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
/** @param {any} u @param {any} aparelho */
function criarSessao(u, aparelho) {
  const t = gerarToken() + gerarToken(), agora = new Date().toISOString();
  PropertiesService.getScriptProperties().setProperty(PREFIXO_SESSAO + hashSessao(t), JSON.stringify({ u: u.id, e: normEmail(u.email),
    c: u.id === 'coord' ? hashCodigo(chaveCfg()) : u.codigo_hash, criada: agora, uso: agora, ap: String(aparelho || '').slice(0, 40) }));
  return t;
}
/** @param {string} email @param {string} t */
function validarSessao(email, t) {
  if (!t) return null;
  const chave = PREFIXO_SESSAO + hashSessao(t), txt = propriedade(chave);
  if (!txt) return null;
  /** @type {any} */ let s; try { s = JSON.parse(txt); } catch (x) { return null; }
  if (normEmail(s.e) !== email) return null;
  const ult = new Date(s.uso);
  if (isNaN(ult.getTime()) || Date.now() - ult.getTime() > DIAS_SESSAO * 864e5) { memo().sessaoVencida = true; return null; }
  /** @type {any} */ let u;
  if (s.u === 'coord') u = email === emailCoord() && chaveConfigurada() && hashCodigo(chaveCfg()) === s.c ? titular(email) : null;
  else u = lerUsuarios().filter(function (x) { return x.id === s.u && x.status === 'ativo' && normEmail(x.email) === email && x.codigo_hash === s.c; })[0];
  if (!u) return null;
  if (fmtDia(ult) !== hojeIso()) { try { s.uso = new Date().toISOString(); PropertiesService.getScriptProperties().setProperty(chave, JSON.stringify(s)); } catch (x) {} }
  return u.id === 'coord' ? u : marcarAcesso(u);
}
// Limpeza (tarefa diária): apaga as sessões vencidas.
function limparSessoes() {
  const pr = PropertiesService.getScriptProperties(), todas = pr.getProperties();
  let n = 0;
  Object.keys(todas).forEach(function (k) {
    if (k.indexOf(PREFIXO_SESSAO) !== 0) return;
    let uso = 0; try { uso = new Date(JSON.parse(todas[k]).uso).getTime(); } catch (x) {}
    if (!uso || Date.now() - uso > DIAS_SESSAO * 864e5) { pr.deleteProperty(k); n++; }
  });
  const velha = planilha().getSheetByName('_sessoes'); if (velha) planilha().deleteSheet(velha);   // formato da versão 37
  return n;
}
/** @param {any} u @param {any} acao @param {any} detalhe */
function registrar(u, acao, detalhe) {
  if (MIGRANDO) return;
  try {
    if (ROTINA[acao]) return atualizarUso(u, ROTINA[acao]);
    const agora = new Date();
    const linha = linhaSegura([fmtDia(agora), fmtHora(agora), u.nome || '', u.email || '', perfilTexto(u), u.dsei || '', TIPO_ACAO[acao] || 'Outro', acao, detalhe || '']);
    // Durante um envio de exames, as linhas vão juntas no fim do pedido (uma escrita só).
    if (MEMO && MEMO.escrevendo && MEMO.registros) { MEMO.registros.push(linha); return; }
    const aba = obterAba(planilha(), 'Acessos', CAB_ACESSOS);
    // Mais recente em cima.
    aba.insertRowAfter(1);
    aba.getRange(2, 1, 1, linha.length).setValues([linha]);
  } catch (x) { contarFalhaAuditoria(acao, x); }
}
// O atendimento continua, mas a falha fica contada e aparece para a coordenação na Administração.
/** @param {string} acao @param {any} x */
function contarFalhaAuditoria(acao, x) {
  try {
    const pr = PropertiesService.getScriptProperties();
    pr.setProperty('AUDITORIA_FALHAS', String(Number(pr.getProperty('AUDITORIA_FALHAS') || 0) + 1));
    pr.setProperty('AUDITORIA_ULTIMA', new Date().toISOString() + ' · ' + acao + ' · ' + String(x).slice(0, 200));
  } catch (y) {}
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
/* ---------- endereço oficial do app ----------
 * Todo link que vai por e-mail (recuperação, convite, aprovação, pedido de acesso) usa este endereço, definido aqui
 * no servidor. Nunca o que o navegador manda: senão alguém poderia pedir um e-mail legítimo do sistema com o link
 * de um site falso. Para trocar (por exemplo, um domínio próprio), crie URL_APP em Propriedades do script. */
const URL_APP_PADRAO = 'https://luanabrisolla-creator.github.io/odontograma-v2/';
function urlApp() {
  const p = String(propriedade('URL_APP') || '').trim();
  return /^https:\/\/[^\s?#'"<>]+$/.test(p) ? p.replace(/\/?$/, '/') : URL_APP_PADRAO;
}
/** @param {any} u @param {any} codigo @param {any} link @param {any} novo */
function emailCodigo(u, codigo, link, novo) {
  return enviarEmail(u.email, novo ? 'Seu novo código de acesso ao Odontograma' : 'Seu acesso ao Odontograma foi aprovado',
    'Olá, ' + u.nome + '.\n\n' +
    (novo ? 'Foi gerado um novo código de acesso para você. O código anterior deixou de funcionar.\n\n'
          : 'Seu acesso como ' + NOME_PERFIL[u.perfil] + (u.dsei ? (u.perfil === 'coord' ? ' e referência técnica' : '') + ' do DSEI ' + u.dsei : '') + ' foi aprovado.\n\n') +
    'Abra o app (' + urlApp() + '), toque em "Já tenho um código" e digite:\n\n' +
    '    E-mail: ' + u.email + '\n    Código: ' + codigo + '\n\n' +
    'O código é pessoal: não compartilhe. Você pode entrar com ele no celular e no computador.\n' +
    'Se perder o código, peça outro no próprio app, em "Esqueci meu código".\n\n' + NOME_APP);
}

/* ---------- 7. pedido de acesso e recuperação do código ---------- */
function pedirAcesso(d) {
  const email = normEmail(d.email), perfil = d.perfil === 'rt' ? 'rt' : 'dentista';
  const nome = String(d.nome || '').trim(), cro = String(d.cro || '').trim(), dsei = String(d.dsei || '').trim();
  if (!nome || !cro || !dsei || !d.uf) return { ok: false, erro: 'Preencha nome, CRO, UF e DSEI.' };
  if (!dseiValido(dsei) || !ufDoDsei(d.uf, dsei)) return { ok: false, erro: 'Escolha um DSEI da lista e uma UF desse DSEI.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, erro: 'E-mail inválido.' };
  if (email === emailCoord()) return { ok: false, erro: 'Este é o e-mail da coordenação: entre com a chave da coordenação.' };
  const todos = lerUsuarios(), ex = todos.filter(function (x) { return normEmail(x.email) === email; })[0];
  if (ex && ex.status === 'ativo') return { ok: false, erro: 'Este e-mail já tem acesso. Use "Esqueci meu código" para receber um novo.' };
  if (ex && ex.status === 'pendente') return { ok: false, erro: 'Já existe um pedido com este e-mail aguardando aprovação.' };
  // Acesso desativado: o pedido vira um pedido de REATIVAÇÃO explícito. O cadastro não é trocado (DSEI e perfil
  // continuam os de antes), quem desativou é avisado e decide em "Reativar". Mudança de DSEI ou de perfil é com a coordenação.
  if (ex && ex.status === 'desativado') return pedirReativacao(ex, dsei !== ex.dsei || perfil !== ex.perfil);
  const u = ex || { id: Utilities.getUuid() };
  Object.assign(u, { nome: nome, cro: cro, email: email, uf: String(d.uf || ''), dsei: dsei, polo: String(d.polo || '').trim(), perfil: perfil,
    status: 'pendente', codigo_hash: '', pedido_em: new Date().toISOString(), aprovado_por: '', aprovado_em: '' });
  salvarUsuario(u);
  registrar(u, 'Pediu acesso', NOME_PERFIL[perfil] + ' · DSEI ' + dsei);
  const rts = perfil === 'dentista' ? rtsDo(dsei) : [];
  const destinos = rts.length ? rts.map(function (x) { return x.email; }) : [emailCoord()];
  enviarEmail(destinos.join(','), 'Novo pedido de acesso ao Odontograma',
    nome + ' (CRO ' + cro + ') pediu acesso como ' + NOME_PERFIL[perfil] + ' do DSEI ' + dsei + '.\n\nAbra o app (' + urlApp() + ')' +
    ' e vá em "' + (rts.length ? 'Equipe' : 'Administração') + '" para aprovar ou recusar.\n\n' + NOME_APP);
  return { ok: true, para: rts.length ? 'a referência técnica do DSEI ' + dsei : 'a coordenação' };
}
/** @param {any} ex @param {boolean} mudou */
function pedirReativacao(ex, mudou) {
  const quem = ex.perfil === 'dentista' && rtsDo(ex.dsei).length ? 'a referência técnica do DSEI ' + ex.dsei : 'a coordenação';
  const resposta = { ok: true, reativacao: true, para: quem, dseiCadastro: ex.dsei, mudouDados: mudou };
  // No máximo um aviso por dia para cada e-mail (a resposta é a mesma, para não revelar nada a mais).
  if (!dentroDoLimite('reativ:' + normEmail(ex.email), 1, 86400)) return resposta;
  ex.pedido_em = new Date().toISOString();
  salvarUsuario(ex);
  registrar(ex, 'Pediu reativação', NOME_PERFIL[ex.perfil] + ' · DSEI ' + ex.dsei + (mudou ? ' · pediu com DSEI ou perfil diferente do cadastro' : ''));
  const rts = ex.perfil === 'dentista' ? rtsDo(ex.dsei) : [];
  const destinos = rts.length ? rts.map(function (x) { return x.email; }) : [emailCoord()];
  enviarEmail(destinos.join(','), 'Pedido de reativação no Odontograma',
    ex.nome + ' (CRO ' + ex.cro + '), ' + NOME_PERFIL[ex.perfil] + ' do DSEI ' + ex.dsei + ', teve o acesso desativado e pediu para voltar.\n\n' +
    (mudou ? 'Atenção: no pedido, a pessoa informou um DSEI ou perfil diferente do cadastro. O cadastro não foi alterado; mudança de DSEI ou de perfil é feita pela coordenação.\n\n' : '') +
    'Se for o caso, abra o app (' + urlApp() + '), vá em "' + (rts.length ? 'Equipe' : 'Administração') + '" e toque em "Reativar". Se não for, não é preciso fazer nada.\n\n' + NOME_APP);
  return resposta;
}
/** @param {any} d */
/* ---------- "Esqueci meu código": recuperação em duas etapas ----------
 * 1. reenviarCodigo: manda por e-mail um link pessoal, válido por 1 hora. O código atual CONTINUA valendo.
 * 2. confirmarRecuperacao: quem abriu o link (e tocou em "Gerar meu novo código") recebe o código novo na tela
 *    e por e-mail; só então o código antigo deixa de funcionar.
 * Assim, alguém que só sabe o e-mail de outra pessoa não consegue derrubar o acesso dela, e uma falha no envio
 * do e-mail não deixa ninguém sem código. Pedidos por e-mail são limitados (3 por hora). */
const ABA_RECUP = '_recuperacoes', CAB_RECUP = ['token_hash', 'usuario_id', 'email', 'criado_em', 'valido_ate', 'usado_em'];
const MINUTOS_RECUP = 60;
/** @param {any} t */
function hashRecuperacao(t) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'recuperar:' + String(t || '').trim().toLowerCase())
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
/** Limite de tentativas (janela de tempo no cache do Apps Script). Sem cache disponível, não bloqueia.
 * @param {string} chave @param {number} max @param {number} segundos */
function dentroDoLimite(chave, max, segundos) {
  try {
    const c = CacheService.getScriptCache(), k = 'lim:' + chave, n = Number(c.get(k) || 0);
    if (n >= max) return false;
    c.put(k, String(n + 1), segundos);
    return true;
  } catch (x) { return true; }
}
/** @param {string} chave @param {number} max */
function limiteEsgotado(chave, max) { try { return Number(CacheService.getScriptCache().get('lim:' + chave) || 0) >= max; } catch (x) { return false; } }
/** @param {any} d */
function reenviarCodigo(d) {
  const email = normEmail(d.email);
  if (!email) return { ok: false, erro: 'Informe o e-mail.' };
  if (!dentroDoLimite('recup:' + email, 3, 3600)) return { ok: false, erro: 'Já foram pedidos vários links para este e-mail na última hora. Confira a caixa de entrada (e o spam) ou espere uma hora para pedir de novo.' };
  const u = lerUsuarios().filter(function (x) { return normEmail(x.email) === email && x.status === 'ativo'; })[0];
  if (u) {
    const t = gerarToken(), agora = new Date();
    obterAba(planilha(), ABA_RECUP, CAB_RECUP).appendRow([hashRecuperacao(t), u.id, u.email, agora.toISOString(), new Date(agora.getTime() + MINUTOS_RECUP * 60000).toISOString(), '']);
    const base = urlApp();
    enviarEmail(u.email, 'Pedido de novo código de acesso ao Odontograma',
      'Olá, ' + u.nome + '.\n\nRecebemos um pedido de novo código de acesso para este e-mail.\n\n' +
      (base ? 'Se foi você, abra este link em até ' + MINUTOS_RECUP + ' minutos e toque em "Gerar meu novo código":\n\n' + base + '?recuperar=' + t + '\n\n'
            : 'Peça o link de novo pelo app.\n\n') +
      'Enquanto você não confirmar, o seu código atual continua funcionando. Se não foi você, ignore este e-mail.\n\n' + NOME_APP);
    registrar(u, 'Pediu novo código', 'link de confirmação enviado por e-mail');
  }
  return { ok: true };
}
/** @param {any} d */
function confirmarRecuperacao(d) {
  const t = String(d.recuperar || '').trim();
  if (!/^[0-9a-f]{20,64}$/i.test(t)) return { ok: false, erro: 'Link de recuperação inválido.' };
  const aba = planilha().getSheetByName(ABA_RECUP);
  if (!aba || aba.getLastRow() < 2) return { ok: false, erro: 'Link de recuperação inválido.' };
  const v = aba.getRange(2, 1, aba.getLastRow() - 1, CAB_RECUP.length).getValues(), h = hashRecuperacao(t);
  const i = v.findIndex(function (l) { return String(l[0]) === h; });
  if (i < 0) return { ok: false, erro: 'Link de recuperação inválido.' };
  if (v[i][5]) return { ok: false, usado: true, erro: 'Este link já foi usado. Se precisar, peça outro em "Esqueci meu código".' };
  if (String(v[i][4]) < new Date().toISOString()) return { ok: false, usado: true, erro: 'Este link expirou (vale ' + MINUTOS_RECUP + ' minutos). Peça outro em "Esqueci meu código".' };
  const u = lerUsuarios().filter(function (x) { return x.id === String(v[i][1]) && x.status === 'ativo'; })[0];
  if (!u) return { ok: false, erro: 'Este acesso não está mais ativo. Fale com a coordenação.' };
  // Primeiro marca o link como usado (e invalida os outros pedidos abertos da mesma pessoa); só depois troca o código.
  // Se algo falhar no meio, o código antigo continua valendo.
  const agora = new Date().toISOString();
  v.forEach(function (l, j) { if (!l[5] && String(l[1]) === u.id) aba.getRange(j + 2, 6, 1, 1).setValues([[j === i ? agora : 'substituído ' + agora]]); });
  const c = gerarCodigo(); u.codigo_hash = hashCodigo(c); salvarUsuario(u);
  emailCodigo(u, c, '', true);
  registrar(u, 'Confirmou novo código', 'pelo link de recuperação');
  return { ok: true, email: u.email, nome: u.nome, codigo: c };
}

/* ---------- 8. ações de quem tem acesso: entrada e exames (envio, cancelamento, validação) ---------- */
function entrar(d, u) {
  registrar(u, 'Entrou no app', d.aparelho || '');
  /** @type {any} */ const r = { ok: true, versao: VERSAO, usuario: publico(u), territoriosVersao: propriedade('POP_VERSAO'),
    reorganizacaoPendente: !!u._reorganizacaoPendente, diasSessao: DIAS_SESSAO };
  // Entrou com o código: recebe uma sessão nova (o app passa a guardar a sessão, e não o código).
  if (!d.sessao) r.sessao = criarSessao(u, d.aparelho);
  return r;
}
/** @param {any} r */
// Autor do exame: sempre pelo acesso de quem enviou (usuarioId), nunca pelo CRO.
function ehDoUsuario(r, u) { return !!r.usuarioId && r.usuarioId === u.id; }
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
/* ---------- leitura e gravação da aba Exames ----------
 * Para não ficar mais lento conforme a planilha cresce, o servidor quase nunca lê a aba inteira:
 * - lerIndice(): só as primeiras colunas (id, pessoa, situação, DSEI, autor...), para achar um exame ou uma pessoa;
 * - lerResumos(): o resumo de cada exame, sem o detalhe dos dentes (Painel, página inicial, listas);
 * - lerCompletos(linhas): o exame completo, só das linhas que precisam dos dentes.
 * Tudo fica guardado durante o pedido (MEMO), então ler duas vezes não custa nada. */
/** @type {any} */ let MEMO = null;
let COM_TRAVA = false; // este pedido está com a trava (ninguém mais grava exames enquanto isso)
function memo() { return MEMO || (MEMO = {}); }
// Posição de cada coluna (o trecho compartilhado, com CAB_EXAME, fica no fim do arquivo: por isso é calculado na hora).
/** @type {any} */ let COL_EX_ = null;
function colEx() { if (!COL_EX_) { COL_EX_ = {}; CAB_EXAME.forEach(function (k, i) { COL_EX_[k] = i + 1; }); } return COL_EX_; }
function abaExames() { const m = memo(); return m.abaEx || (m.abaEx = obterAba(planilha(), 'Exames', CAB_EXAME)); }
/** @param {any} v */
function textoCelula(v) { return v instanceof Date ? (v.getHours() || v.getMinutes() ? v.toISOString() : fmtDia(v)) : String(v == null ? '' : v); }
/* ---------- cópia rápida do índice e dos resumos ----------
 * Ler milhares de linhas da aba Exames leva segundos no Google (o teste de carga mediu 7 s para 5.690 exames).
 * Por isso o servidor guarda uma cópia do índice e dos resumos na memória rápida do Google e só lê a planilha
 * quando essa cópia não existe. A cópia tem duas partes:
 * - a base (a lista inteira, grande, refeita de vez em quando);
 * - as emendas (só os exames que mudaram depois da base; pequenas, regravadas a cada envio).
 * Só quem está com a trava grava a cópia (quem grava exames, ou quem conseguiu a trava para refazer a base), então
 * ela nunca fica pela metade. Quem só lê usa a cópia que estiver lá: no pior caso, está um envio atrasada.
 * Qualquer dúvida e a cópia é descartada e refeita da planilha: linha apagada à mão (a aba fica com menos linhas
 * do que a cópia), edição feita na tela (onEdit), envio interrompido no meio, e uma vez por dia na tarefa diária. */
/** @param {any} r */
function empacotarIndice(r) { return [r.id, r.codigoIndividuo, r.numeroExame, r.situacao === 'cancelado' ? 1 : 0, r.dataExame, r.dsei, r.usuarioId, r.criadoEm, r.atualizadoEm, r.anteriorId, r.codigo, r._linha]; }
/** @param {any[]} v */
function desempacotarIndice(v) {
  return { id: v[0], codigoIndividuo: v[1], numeroExame: v[2], situacao: v[3] ? 'cancelado' : 'valido', dataExame: v[4], dsei: v[5], usuarioId: v[6],
    criadoEm: v[7], atualizadoEm: v[8], anteriorId: v[9], codigo: v[10], _linha: v[11], vinculo: v[9] ? { anteriorId: v[9], codigoIndividuo: v[1] } : null };
}
/** @type {any} */ const ID_NA_COPIA = { indice: function (/** @type {any} */ x) { return x[0]; }, resumos: function (/** @type {any} */ x) { return x.id; } };
const EMENDAS_MAX = 300; // passou disso, as emendas entram na base
const BASE_VELHA_MS = 3 * 3600 * 1000; // a memória do Google guarda por até 6 h: a base é regravada antes de sumir
/** @param {any} e */
function juntarNaBase(e) { return Object.keys(e.itens).length > EMENDAS_MAX || Date.now() - (e.criada || 0) > BASE_VELHA_MS; }
/** As emendas guardadas, se ainda valem (a aba não perdeu linhas). @param {string} nome */
function emendasDaCopia(nome) {
  const e = lerDaMemoria(nome + '+'), m = memo();
  if (!e) return null;
  if (m.ultLinha == null) m.ultLinha = abaExames().getLastRow(); // uma consulta por pedido
  return m.ultLinha >= e.n ? e : null;
}
/** A lista guardada (base + emendas), ou null. @param {string} nome */
function copiaDosExames(nome) {
  const e = emendasDaCopia(nome); if (!e) return null;
  const b = lerDaMemoria(nome); if (!b || b.id !== e.base) return null;
  const m = memo(); (m.emendas = m.emendas || {})[nome] = e;
  const it = e.itens, ks = Object.keys(it); if (!ks.length) return b.l;
  const l = b.l.filter(function (/** @type {any} */ x) { return !(ID_NA_COPIA[nome](x) in it); });
  ks.forEach(function (k) { if (it[k]) l.push(it[k]); });
  return l;
}
/** Guarda uma base nova (com emendas vazias). Só com a trava. @param {string} nome @param {any[]} l */
function guardarBase(nome, l) {
  const id = Utilities.getUuid(), m = memo(); m.emendas = m.emendas || {};
  /** @type {any} */ const e = { base: id, n: abaExames().getLastRow(), itens: {}, criada: Date.now() };
  const ok = guardarNaMemoria(nome, { id: id, l: l }, 21600) && guardarNaMemoria(nome + '+', e, 21600);
  if (!ok) esquecerDaMemoria(nome + '+');
  m.emendas[nome] = ok ? e : null;
  try { CacheService.getScriptCache().remove('refazer:' + nome); } catch (x) {}
}
/** Lê da planilha. Se der para pegar a trava na hora (ninguém gravando), aproveita e guarda a base nova;
 * senão, deixa o pedido para o próximo envio refazer. @param {string} nome @param {() => any[]} ler @param {(l: any[]) => any[]} empacotar */
function lerEGuardar(nome, ler, empacotar) {
  if (COM_TRAVA) { const l = ler(); if (!memo().escrevendo) guardarBase(nome, empacotar(l)); return l; }
  const t = LockService.getScriptLock();
  if (!t.tryLock(0)) { try { CacheService.getScriptCache().put('refazer:' + nome, '1', 21600); } catch (x) {} return ler(); }
  COM_TRAVA = true;
  try { const l = ler(); guardarBase(nome, empacotar(l)); return l; } finally { COM_TRAVA = false; t.releaseLock(); }
}
function lerIndice() {
  const m = memo(); if (m.indice) return m.indice;
  m.emendas = m.emendas || {};
  const c = m.escrevendo ? null : copiaDosExames('indice');
  if (c) { m.indice = c.map(desempacotarIndice); m.indiceDaCopia = true; return m.indice; }
  m.indice = lerEGuardar('indice', lerIndiceDaPlanilha, function (l) { return l.map(empacotarIndice); });
  return m.indice;
}
function lerIndiceDaPlanilha() {
  const aba = abaExames(), n = aba.getLastRow() - 1;
  /** @type {any[]} */ const l = [];
  if (n > 0) aba.getRange(2, 1, n, CAB_INDICE.length).getValues().forEach(function (v, i) {
    if (!v[0]) return;
    l.push({ id: String(v[0]), codigoIndividuo: String(v[1]), numeroExame: Number(v[2]) || 1, situacao: v[3] === 'cancelado' ? 'cancelado' : 'valido',
      dataExame: textoCelula(v[4]), dsei: String(v[5]), usuarioId: String(v[6]), criadoEm: textoCelula(v[7]), atualizadoEm: textoCelula(v[8]),
      anteriorId: String(v[9] || ''), codigo: String(v[10] || ''), _linha: i + 2,
      vinculo: v[9] ? { anteriorId: String(v[9]), codigoIndividuo: String(v[1]) } : null });
  });
  return l;
}
/** @param {string} id */
function linhaDoExame(id) { const x = lerIndice().filter(function (r) { return r.id === id; })[0]; return x ? x._linha : 0; }
/** Lê uma coluna só das linhas pedidas, juntando as linhas seguidas num pedido só. @param {number[]} linhas @param {number} col */
function lerCelulas(linhas, col) {
  /** @type {any} */ const out = {}, pend = memo().pendentes || {};
  linhas = linhas.filter(function (l) { if (pend[l]) { out[l] = pend[l][col - 1]; return false; } return true; });
  const aba = abaExames(), ord = linhas.slice().sort(function (a, b) { return a - b; });
  for (let i = 0; i < ord.length;) {
    let j = i; while (j + 1 < ord.length && ord[j + 1] === ord[j] + 1) j++;
    aba.getRange(ord[i], col, ord[j] - ord[i] + 1, 1).getValues().forEach(function (v, k) { out[ord[i] + k] = v[0]; });
    i = j + 1;
  }
  return out;
}
/** @param {any} v @param {number} linha */
function parseExame(v, linha) {
  if (typeof v !== 'string' || v.charAt(0) !== '{') return null;
  try { const r = JSON.parse(v); if (!r || !r.resultado) return null; if (!r.dsei) r.dsei = 'Sem DSEI'; if (!r.codigoIndividuo) r.codigoIndividuo = r.codigo || r.id; r._linha = linha; return r; } catch (x) { return null; }
}
/** O exame completo (com os dentes) das linhas pedidas. @param {number[]} linhas */
function lerCompletos(linhas) {
  const m = memo(); m.completos = m.completos || {};
  const faltam = linhas.filter(function (l) { return !m.completos[l]; });
  if (faltam.length) { const c = lerCelulas(faltam, colEx().dados_completos_json); faltam.forEach(function (l) { m.completos[l] = parseExame(c[l], l); }); }
  return linhas.map(function (l) { return m.completos[l]; }).filter(Boolean);
}
/** Exame completo pelo id (ou null). @param {string} id */
function lerExameCompleto(id) { const l = linhaDoExame(id); return l ? lerCompletos([l])[0] || null : null; }
/** Resumo de todos os exames (sem o detalhe dos dentes), com o número de cada exame da pessoa já certo. */
function lerResumos() {
  const m = memo(); if (m.resumos) return m.resumos;
  m.emendas = m.emendas || {};
  const c = m.escrevendo ? null : copiaDosExames('resumos');
  m.resumos = c ? numerarResumos(c) : lerEGuardar('resumos', lerResumosDaPlanilha, function (l) { return l; });
  return m.resumos;
}
function lerResumosDaPlanilha() {
  const aba = abaExames(), n = aba.getLastRow() - 1;
  /** @type {any} */ const porId = {};
  if (n > 0) aba.getRange(2, colEx().resumo_json, n, 1).getValues().forEach(function (v, i) {
    const r = parseExame(v[0], i + 2);
    if (r && (!porId[r.id] || String(r.atualizadoEm || '') > String(porId[r.id].atualizadoEm || ''))) porId[r.id] = r;
  });
  return numerarResumos(Object.keys(porId).map(function (k) { return porId[k]; }));
}
/** Número de cada exame da pessoa (1º, 2º...), pela ordem dos exames válidos. @param {any[]} l */
function numerarResumos(l) {
  /** @type {any} */ const grupos = {};
  l.filter(exameValido).forEach(function (r) { (grupos[r.codigoIndividuo] = grupos[r.codigoIndividuo] || []).push(r); });
  Object.keys(grupos).forEach(function (k) { grupos[k].sort(ordemExame).forEach(function (r, i) { r.numeroExame = i + 1; }); });
  return l;
}
/** Chamado no primeiro exame gravado de um pedido (com a trava): prepara as emendas das cópias. */
function comecarGravacao() {
  const m = memo(); if (m.escrevendo) return;
  m.emendas = m.emendas || {};
  const c = CacheService.getScriptCache();
  // Um envio anterior parou no meio (o Google interrompeu): a cópia pode não ter o que ele gravou. Refaz da planilha.
  if (c.get('gravando')) { esquecerDaMemoria('indice+'); esquecerDaMemoria('resumos+'); m.indice = null; m.resumos = null; m.emendas = {}; }
  lerIndice();
  // Resumos: se não houver cópia, lê da planilha uma vez aqui (com a trava); os próximos envios só emendam.
  if (!m.emendas.resumos) { const e = emendasDaCopia('resumos'); if (e && c.get('resumos')) m.emendas.resumos = e; else guardarBase('resumos', lerResumosDaPlanilha()); }
  c.put('gravando', '1', 21600);
  m.mudados = {}; m.pendentes = {}; m.registros = [];
  m.escrevendo = true;
}
/** Grava de vez os exames novos (em blocos de linhas seguidas) e as linhas de Acessos guardadas durante o envio.
 * Roda antes de responder ao app: se falhar, o app recebe erro passageiro e manda de novo (nada se perde). */
function escreverPendentes() {
  const m = MEMO; if (!m || !m.pendentes) return;
  const pend = m.pendentes, ls = Object.keys(pend).map(Number).sort(function (a, b) { return a - b; });
  try {
    if (ls.length) {
      const aba = abaExames();
      for (let i = 0; i < ls.length;) {
        let j = i; while (j + 1 < ls.length && ls[j + 1] === ls[j] + 1) j++;
        aba.getRange(ls[i], 1, j - i + 1, pend[ls[i]].length).setValues(ls.slice(i, j + 1).map(function (l) { return pend[l]; }));
        i = j + 1;
      }
    }
    m.pendentes = {};
  } catch (x) { m.falhouGravar = true; throw x; }
  const rs = m.registros || []; m.registros = [];
  if (rs.length) {
    try {
      const a = obterAba(planilha(), 'Acessos', CAB_ACESSOS);
      a.insertRowsAfter(1, rs.length);
      a.getRange(2, 1, rs.length, rs[0].length).setValues(rs.slice().reverse()); // mais recente em cima
    } catch (x) { contarFalhaAuditoria('várias', x); }
  }
}
function marcarVersaoDados() { try { CacheService.getScriptCache().put('dadosVersao', String(Date.now()) + '-' + Utilities.getUuid().slice(0, 6), 21600); } catch (x) {} }
/** No fim do pedido, ainda com a trava: grava de vez na planilha e guarda as emendas (os exames deste pedido). */
function concluirGravacao() {
  const m = MEMO; if (!m || !m.escrevendo) return;
  m.escrevendo = false;
  marcarVersaoDados();
  const c = CacheService.getScriptCache();
  try {
    escreverPendentes();
    if (m.falhouGravar) throw new Error('gravação incompleta');
    SpreadsheetApp.flush();
    const n = abaExames().getLastRow(), ids = Object.keys(m.mudados);
    const eI = m.emendas.indice;
    if (eI && m.indice) {
      /** @type {any} */ const porId = {}; m.indice.forEach(function (r) { porId[r.id] = r; });
      ids.forEach(function (id) { eI.itens[id] = porId[id] ? empacotarIndice(porId[id]) : null; });
      if (juntarNaBase(eI) || c.get('refazer:indice')) guardarBase('indice', m.indice.map(empacotarIndice));
      else { eI.n = n; if (!guardarNaMemoria('indice+', eI, 21600)) esquecerDaMemoria('indice+'); }
    } else if (m.indice) guardarBase('indice', m.indice.map(empacotarIndice)); // índice lido da planilha neste pedido: já está certo
    else esquecerDaMemoria('indice+');
    const eR = m.emendas.resumos;
    if (eR) {
      ids.forEach(function (id) { eR.itens[id] = parseExame(m.mudados[id].t, m.mudados[id].linha); });
      if (juntarNaBase(eR) || c.get('refazer:resumos')) {
        m.emendas.resumos = eR; eR.n = n;
        guardarNaMemoria('resumos+', eR, 21600);
        const l = copiaDosExames('resumos');
        guardarBase('resumos', numerarResumos(l || lerResumosDaPlanilha()));
      } else { eR.n = n; if (!guardarNaMemoria('resumos+', eR, 21600)) esquecerDaMemoria('resumos+'); }
    } else if (m.refazerCopias) guardarBase('resumos', lerResumosDaPlanilha());
    else esquecerDaMemoria('resumos+');
    c.remove('gravando');
  } catch (x) { esquecerDaMemoria('indice+'); esquecerDaMemoria('resumos+'); try { c.remove('gravando'); } catch (y) {} }
}
/** Resumos só das linhas pedidas. @param {number[]} linhas */
function lerResumosLinhas(linhas) { const c = lerCelulas(linhas, colEx().resumo_json); return linhas.map(function (l) { return parseExame(c[l], l); }).filter(Boolean); }
/** Grava o exame na mesma linha (se já existe) ou numa linha nova, e atualiza o índice do pedido. @param {any} reg */
function gravarRegistro(reg) {
  comecarGravacao();
  const m = memo(), aba = abaExames(), valores = linhaSegura(linhaExame(reg)), pend = m.pendentes;
  let linha = reg._linha || linhaDoExame(reg.id);
  // Por garantia, antes de escrever por cima, confere se a linha é mesmo deste exame (alguém pode ter mexido à mão).
  if (linha && !pend[linha] && m.indiceDaCopia && String(aba.getRange(linha, 1, 1, 1).getValues()[0][0]) !== String(reg.id)) {
    escreverPendentes();
    esquecerDaMemoria('indice+'); esquecerDaMemoria('resumos+'); m.indice = null; m.indiceDaCopia = false; m.emendas = {}; m.completos = null;
    m.indice = lerIndiceDaPlanilha(); linha = linhaDoExame(reg.id); m.refazerCopias = true;
    delete reg._linha; if (linha) reg._linha = linha;
  }
  // Exames novos ficam juntos e vão para a planilha de uma vez no fim do pedido (escreverPendentes): bem mais rápido
  // que uma escrita por exame. Quem lê essas linhas antes disso (lerCelulas) recebe o que está esperando.
  if (linha && pend[linha]) pend[linha] = valores;
  else if (linha) aba.getRange(linha, 1, 1, valores.length).setValues([valores]);
  else { const nova = m.proxLinha || Math.max(1, aba.getLastRow()) + 1; pend[nova] = valores; reg._linha = nova; m.proxLinha = nova + 1; }
  const i = (m.indice || []).filter(function (x) { return x.id === reg.id; })[0];
  const novo = { id: String(reg.id), codigoIndividuo: codigoIndividuoDe(reg), numeroExame: reg.numeroExame || 1, situacao: exameValido(reg) ? 'valido' : 'cancelado',
    dataExame: reg.dataExame || '', dsei: reg.dsei || '', usuarioId: reg.usuarioId || '', criadoEm: reg.criadoEm || '', atualizadoEm: reg.atualizadoEm || '',
    anteriorId: (reg.vinculo || {}).anteriorId || '', codigo: reg.codigo || '', _linha: reg._linha || linha,
    vinculo: (reg.vinculo || {}).anteriorId ? { anteriorId: reg.vinculo.anteriorId, codigoIndividuo: codigoIndividuoDe(reg) } : null };
  if (m.indice) { if (i) Object.assign(i, novo); else m.indice.push(novo); }
  if (m.completos) m.completos[novo._linha] = reg;
  m.resumos = null;
  m.mudados[novo.id] = { t: valores[colEx().resumo_json - 1], linha: novo._linha };
}
// Muda a cada gravação de exame (o Painel guardado deixa de valer).
function versaoDados() { try { return CacheService.getScriptCache().get('dadosVersao') || '0'; } catch (x) { return '0'; } }
// Atualiza o número (1º, 2º...) dos exames da pessoa, se a ordem mudou. "extra" é o exame que está sendo gravado.
/** @param {string} cod @param {any} extra */
function renumerarPessoa(cod, extra) {
  const linhas = lerIndice().filter(function (r) { return r.codigoIndividuo === cod && r.situacao !== 'cancelado' && (!extra || r.id !== extra.id); }).map(function (r) { return r._linha; });
  const l = lerResumosLinhas(linhas).filter(exameValido);
  if (extra && exameValido(extra) && codigoIndividuoDe(extra) === cod) l.push(extra);
  l.sort(ordemExame).forEach(function (r, i) {
    if (r.numeroExame === i + 1) return;
    if (extra && r.id === extra.id) { r.numeroExame = i + 1; return; }
    const c = lerCompletos([r._linha])[0];
    if (c) { c.numeroExame = i + 1; gravarRegistro(c); }
  });
}
/** @param {any} d @param {any} u */
function enviarExame(d, u) { const r = processarExame(d.registro, u, false); return r; }
// Vários exames num pedido só (o app manda até LOTE_MAX de uma vez): uma passagem pela trava para todos.
const LOTE_MAX = 10;
/** @param {any} d @param {any} u */
function enviarExames(d, u) {
  const l = Array.isArray(d.registros) ? d.registros.slice(0, LOTE_MAX) : [];
  if (!l.length) return { ok: false, erro: 'Nenhum exame recebido.' };
  const resultados = l.map(function (reg) {
    try { return Object.assign({ id: reg && reg.id }, processarExame(reg, u, true)); }
    catch (err) { const e = registrarErro(err, 'enviarExames', u); return { id: reg && reg.id, ok: false, passageiro: true, erro: e.mensagem }; }
  });
  if (resultados.some(function (x) { return x.ok; })) atualizarUsoExames(u, lerIndice());
  return { ok: true, resultados: resultados };
}
// Campos que um exame pode ter. O que vier além disso é descartado (e fica anotado em Acessos).
const CAMPOS_EXAME = ['id', 'versao', 'dono', 'criadoEm', 'atualizadoEm', 'dataExame', 'profissional', 'municipio', 'uf', 'codPolo', 'codAldeia', 'codTI', 'ti', 'codMunicipio',
  'dsei', 'polo', 'aldeia', 'sufixo', 'codigo', 'crianca', 'idadeAnos', 'denticao', 'localAtendimento', 'vigilancia', 'protese', 'placa', 'gengivite', 'fluorose', 'gerais',
  'insumos', 'observacoes', 'dentes', 'resultado', 'codigoIndividuo', 'numeroExame', 'vinculo', 'situacao'];
const CAMPOS_DENTE = ['status', 'faces', 'dor', 'abscesso', 'procs', 'obs'];
/** @param {any} o @param {string[]} campos @param {string} onde @param {string[]} fora */
function soCampos(o, campos, onde, fora) {
  /** @type {any} */ const r = {};
  Object.keys(o || {}).forEach(function (k) { if (campos.indexOf(k) >= 0) r[k] = o[k]; else fora.push(onde + k); });
  return r;
}
/** @param {any} reg @param {any} u */
function camposPermitidos(reg, u) {
  /** @type {string[]} */ const fora = [];
  const r = soCampos(reg, CAMPOS_EXAME, '', fora);
  if (r.crianca) r.crianca = soCampos(r.crianca, ['nascimento', 'sexo'], 'crianca.', fora);
  if (r.protese) r.protese = soCampos(r.protese, ['sup', 'inf', 'usoSup', 'usoInf', 'naoAvaliado'], 'protese.', fora);
  if (r.vinculo) r.vinculo = soCampos(r.vinculo, ['codigoIndividuo', 'chaves', 'numero'], 'vinculo.', fora);
  if (r.resultado) r.resultado = soCampos(r.resultado, ['classe', 'risco', 'descricao', 'motivos', 'ceod', 'cpod', 'agrupamento'], 'resultado.', fora);
  if (r.profissional) r.profissional = soCampos(r.profissional, ['nome', 'cro'], 'profissional.', fora);
  if (r.dentes && typeof r.dentes === 'object') {
    /** @type {any} */ const ds = {};
    Object.keys(r.dentes).forEach(function (n) {
      const d = soCampos(r.dentes[n], CAMPOS_DENTE, 'dente ' + n + '.', fora);
      if (d.faces) d.faces = soCampos(d.faces, ['O', 'M', 'D', 'V', 'L'], 'dente ' + n + '.faces.', fora);
      ds[n] = d;
    });
    r.dentes = ds;
  }
  if (fora.length) registrar(u, 'Campos descartados de um exame', String(reg.id || '') + ': ' + fora.slice(0, 10).join(', ') + (fora.length > 10 ? '…' : ''));
  return r;
}
/** Confere e grava um exame. Em lote, a aba Uso é atualizada uma vez só, no fim. @param {any} reg @param {any} u @param {boolean} emLote */
function processarExame(reg, u, emLote) {
  if (!reg || !reg.id || !reg.resultado) return { ok: false, erro: 'Exame incompleto.' };
  // CD e RT só registram exames no DSEI do próprio cadastro, mesmo que o DSEI tenha sido alterado no navegador.
  if (dseiClinico(u) !== null && String(reg.dsei || '') !== dseiClinico(u)) {
    registrar(u, 'Tentativa de acesso recusada', 'exame no DSEI ' + (reg.dsei || '(vazio)') + ', fora do DSEI do cadastro (' + (u.dsei || 'sem DSEI') + ')');
    return { ok: false, dseiInvalido: true, erro: u.dsei
      ? 'Você só pode registrar exames no DSEI ' + u.dsei + ', o do seu cadastro. Este exame está marcado no DSEI ' + (reg.dsei || '(vazio)') + ' e não foi gravado.'
      : 'Seu cadastro está sem DSEI. Peça à coordenação para corrigir o seu cadastro antes de enviar exames.' };
  }
  const anterior = lerIndice().filter(function (r) { return r.id === reg.id; })[0];
  // Só quem fez o exame pode alterá-lo.
  if (anterior && !ehDoUsuario(anterior, u)) return { ok: false, erro: 'Só o profissional que fez este exame pode alterá-lo.' };
  if (anterior && !exameValido(anterior)) return { ok: false, erro: 'Este exame foi cancelado e não pode ser alterado.' };
  // Um exame nunca muda de DSEI (senão a mesma pessoa ficaria com exames em dois DSEIs).
  if (anterior && String(anterior.dsei || '') !== String(reg.dsei || '')) {
    registrar(u, 'Tentativa de acesso recusada', 'exame ' + reg.id + ' do DSEI ' + anterior.dsei + ' enviado como do DSEI ' + (reg.dsei || '(vazio)'));
    return { ok: false, dseiInvalido: true, erro: 'Este exame foi registrado no DSEI ' + anterior.dsei + ' e não pode passar para outro DSEI. Nada foi alterado na planilha.' };
  }
  // Exame feito por outra pessoa no mesmo aparelho: espera o dono entrar para ser enviado.
  if (!anterior && reg.dono && reg.dono !== u.id) return { ok: false, erro: 'Este exame foi feito por outro profissional neste aparelho e só pode ser enviado por ele.' };
  reg = sanear(camposPermitidos(JSON.parse(registroParaJson(reg)), u));
  // Dor de dente e abscesso dentoalveolar da vigilância vêm sempre dos dentes (o servidor confere, não confia no app).
  if (Array.isArray(reg.vigilancia) && reg.vigilancia.length) reg.vigilancia = completarVigilancia(reg);
  const faltas = problemasDoExame(reg);
  if (faltas.length) return { ok: false, exameIncompleto: true, faltam: faltas,
    erro: 'O exame não foi gravado. Falta ou está errado: ' + faltas.join('; ') + '. Abra o exame no app, corrija e salve de novo. Se o app não pedir esses campos, atualize o app (feche e abra de novo com internet).' };
  const classeDoApp = (reg.resultado || {}).classe;
  recalcularResultado(reg);
  if (classeDoApp && classeDoApp !== reg.resultado.classe) registrar(u, 'Resultado recalculado', 'Exame ' + reg.id + ': o app mandou classe ' + classeDoApp + ', o servidor calculou ' + reg.resultado.classe);
  if (u.id === 'coord') return { ok: false, erro: 'A coordenação titular não registra exames.' };
  if (u.perfil === 'coord' && !u.dsei) return { ok: false, erro: 'Para registrar exames, a pessoa da coordenação precisa ser também RT de um DSEI.' };
  reg.profissional = { nome: u.nome, cro: u.cro };
  reg.usuarioId = u.id;
  reg.situacao = 'valido'; delete reg.cancelamento;
  if (anterior && anterior.criadoEm) reg.criadoEm = anterior.criadoEm;
  const outros = lerIndice().filter(function (r) { return r.id !== reg.id; });
  const v = reg.vinculo;
  let novoVinculo = false;
  if (v && v.codigoIndividuo) {
    // Mesma pessoa: confere dente a dente com o exame anterior.
    const daPessoa = outros.filter(function (r) { return exameValido(r) && codigoIndividuoDe(r) === v.codigoIndividuo; });
    if (!daPessoa.length) return { ok: false, vinculoInvalido: true, erro: 'A pessoa ' + v.codigoIndividuo + ' não tem mais exames válidos (o exame anterior pode ter sido cancelado). Abra este exame e confirme de novo se é a mesma pessoa.' };
    const dsP = dseisDaPessoa(daPessoa);
    if (dsP.length > 1) { alertarCodigoEmVariosDseis(v.codigoIndividuo, dsP, u); return { ok: false, vinculoInvalido: true, erro: 'O código ' + v.codigoIndividuo + ' está em conferência pela coordenação e não pode receber exames agora. Registre o exame como pessoa nova e avise a sua RT.' }; }
    if (dsP[0] !== reg.dsei) return { ok: false, vinculoInvalido: true, erro: 'A pessoa ' + v.codigoIndividuo + ' é de outro DSEI. Só dá para juntar exames do mesmo DSEI.' };
    const ref = lerCompletos([exameReferencia(daPessoa, reg)._linha])[0];
    if (!ref) return { ok: false, passageiro: true, erro: 'Não foi possível ler o exame anterior da pessoa agora. O app vai tentar de novo sozinho.' };
    const nascRef = (ref.crianca || {}).nascimento || '', sexoRef = (ref.crianca || {}).sexo || '';
    if ((nascRef && nascRef !== (reg.crianca || {}).nascimento) || (sexoRef && sexoRef !== (reg.crianca || {}).sexo))
      return { ok: false, erro: 'A data de nascimento ou o sexo não batem com os exames anteriores da pessoa ' + v.codigoIndividuo + ' (' + dataBR(nascRef) + ', ' + ({ F: 'feminino', M: 'masculino' }[sexoRef] || 'sexo não informado') + '). Confira o código de acompanhamento ou marque que não é a mesma pessoa.' };
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
      // Pessoa nova: o código do indivíduo é o código do exame. Ele já foi mostrado e anotado,
      // então nunca é trocado aqui. Com 8 caracteres sorteados e a reserva feita antes de mostrar, a repetição é
      // praticamente impossível; se mesmo assim acontecer, o exame é recusado (nunca juntado à outra pessoa) e o profissional avisado.
      const cod = String(reg.codigo || reg.id);
      if (!codigoBemFormado(cod, reg.dsei)) return { ok: false, exameIncompleto: true, faltam: ['código de acompanhamento'],
        erro: 'O código de acompanhamento ' + cod + ' não está no formato do app ou não é de uma UF do DSEI ' + reg.dsei + '. Abra o exame, toque em "Trocar identificação" e gere um código novo.' };
      const dono = outros.filter(function (r) { return codigoIndividuoDe(r).toUpperCase() === cod.toUpperCase(); })[0]
        || lerReservas().filter(function (r) { return r.codigo === cod.toUpperCase() && r.exameId !== String(reg.id); })[0];
      if (dono) {
        registrar(u, 'Código repetido', cod + ' · DSEI ' + reg.dsei);
        return { ok: false, codigoRepetido: true, erro: 'O código ' + cod + ' já pertence a outra pessoa. Abra este exame, toque em "Trocar identificação", gere um código novo e corrija a ficha. Nada foi alterado na planilha.' };
      }
      reg.codigoIndividuo = cod;
    }
  }
  if (anterior) reg._linha = anterior._linha;
  renumerarPessoa(reg.codigoIndividuo, reg);
  if (!reg.numeroExame) reg.numeroExame = 1;
  gravarRegistro(reg);
  if (anterior && anterior.codigoIndividuo && anterior.codigoIndividuo !== reg.codigoIndividuo) renumerarPessoa(anterior.codigoIndividuo, reg);
  if (novoVinculo) registrar(u, 'Registrou novo exame de pessoa já examinada', reg.codigoIndividuo + ' · ' + reg.numeroExame + 'º exame · DSEI ' + reg.dsei);
  if (!emLote) atualizarUsoExames(u, lerIndice());
  return { ok: true, id: reg.id, codigoIndividuo: reg.codigoIndividuo, numeroExame: reg.numeroExame, vinculo: reg.vinculo || null, resultado: reg.resultado };
}
/** @param {any} d @param {any} u */
function cancelarExame(d, u) {
  const r = lerExameCompleto(String(d.id || ''));
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
  renumerarPessoa(codigoIndividuoDe(r), r);
  registrar(u, 'Cancelou exame', (r.codigo || r.id) + ' · ' + motivo + (obs ? ': ' + obs : ''));
  atualizarUsoExames(u, lerIndice());
  delete r._linha;
  return { ok: true, exame: r };
}
/** @param {any} t */
function normTexto(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
/* ---------- regra territorial: cada CD e cada RT atua só no DSEI do próprio cadastro ----------
 * Validada aqui no servidor, nunca só no app (um valor alterado no navegador não muda nada):
 * - Cirurgião-dentista e RT estão vinculados a um único DSEI (u.dsei, da aba Usuarios). Em tudo o que envolve
 *   território, o servidor usa u.dsei e ignora o DSEI que chega do app:
 *     enviarExame (recusa exame de outro DSEI), buscarPessoa, buscarCodigo, reservarCodigo, pessoa (histórico),
 *     territorios (lista de aldeias do exame), equipe, convites, ações do Dia B e a lista de aldeias sem exame.
 * - Exceção de propósito: o Painel e o acompanhamento mostram DADOS AGREGADOS (números de 1 a 4 ocultados).
 *   Qualquer perfil vê a visão geral, qualquer DSEI e a comparação entre DSEIs. Nenhuma pessoa é identificada ali.
 * - A coordenação é o único perfil que trabalha com vários DSEIs, nas funções de GESTÃO (painel, histórico,
 *   administração). Nas funções CLÍNICAS (registrar exame, buscar pessoa, reservar código), a coordenação que
 *   também é RT fica no DSEI de RT do cadastro, como qualquer RT (veja dseiClinico).
 * - Continuidade do cuidado: a RT e os cirurgiões-dentistas do DSEI da pessoa veem o histórico dela, inclusive
 *   os exames feitos por outros profissionais do DSEI (veja podeVerPessoa).
 */
/* ---------- validação no servidor do que chega do app ----------
 * O app já impede estes erros, mas uma versão antiga em cache ou uma requisição feita à mão não passa por ele. */
/** @param {any} dsei */
function dseiValido(dsei) { return DSEIS.indexOf(String(dsei || '')) >= 0; }
/** @param {any} uf @param {any} dsei */
function ufDoDsei(uf, dsei) { return UFS.indexOf(String(uf || '')) >= 0 && (DSEI_UF[String(uf)] || []).indexOf(String(dsei || '')) >= 0; }
const FACES_VALIDAS = ['', 'ca', 'cc', 'restc', 'rest', 'mba', 'mbi', 'sel'];
/** Lista do que falta ou está fora do permitido no exame (vazia = ok). @param {any} r */
function problemasDoExame(r) {
  // "Hoje" no fuso do script (Brasília). Nenhum DSEI fica à frente desse horário, então o exame nunca é de amanhã.
  const f = [], hoje = hojeIso(), cr = r.crianca || {};
  if (!dataValida(r.dataExame)) f.push('data do exame');
  else if (r.dataExame > hoje) f.push('data do exame (está no futuro)');
  else if (r.dataExame < '2015-01-01') f.push('data do exame (antes de 2015)');
  if (!dataValida(cr.nascimento)) f.push('data de nascimento');
  else if (dataValida(r.dataExame) && cr.nascimento > r.dataExame) f.push('data de nascimento (depois da data do exame)');
  else if (cr.nascimento < '1900-01-01') f.push('data de nascimento');
  if (cr.sexo !== 'F' && cr.sexo !== 'M') f.push('sexo');
  if (['decidua', 'mista', 'permanente'].indexOf(r.denticao) < 0) f.push('dentição');
  if (!dseiValido(r.dsei)) f.push('DSEI (fora da lista)');
  else if (!ufDoDsei(r.uf, r.dsei)) f.push('UF (não é uma UF do DSEI ' + r.dsei + ')');
  if (!String(r.polo || '').trim() || String(r.polo).length > 150) f.push('polo base');
  if (!String(r.aldeia || '').trim() || String(r.aldeia).length > 150) f.push('aldeia ou comunidade');
  if (LOCAIS_ATENDIMENTO.indexOf(r.localAtendimento) < 0) f.push('local de atendimento');
  const vig = Array.isArray(r.vigilancia) ? r.vigilancia : [];
  if (!vig.length || vig.some(function (v) { return VIGILANCIA.indexOf(v) < 0; }) || (vig.length > 1 && vig.indexOf(VIG_NENHUM) >= 0)) f.push('vigilância em saúde bucal');
  if (!Array.isArray(r.gerais || []) || (r.gerais || []).some(function (g) { return GERAIS.indexOf(g) < 0; })) f.push('procedimentos coletivos (fora da lista)');
  if (!Array.isArray(r.insumos || []) || (r.insumos || []).some(function (g) { return INSUMOS.indexOf(g) < 0; })) f.push('insumos (fora da lista)');
  if (r.observacoes != null && (typeof r.observacoes !== 'string' || r.observacoes.length > 2000)) f.push('observações (texto até 2.000 caracteres)');
  if (typeof r.placa !== 'boolean') f.push('placa visível (Sim ou Não)');
  if (typeof r.gengivite !== 'boolean') f.push('gengivite (Sim ou Não)');
  // Prótese: necessidade e uso nas duas arcadas, todos respondidos, ou nenhum ("Não foi possível avaliar").
  const pr = r.protese || {}, pv = [pr.sup, pr.inf, pr.usoSup, pr.usoInf].map(function (x) { return x || ''; });
  if (pv.some(function (x) { return ['', 'nao', 'sim'].indexOf(x) < 0; }) || (pv.some(function (x) { return x; }) && pv.some(function (x) { return !x; }))
      || (!pv.some(function (x) { return x; }) && pr.naoAvaliado !== true)) f.push('prótese (necessidade e uso nas duas arcadas, ou "Não foi possível avaliar")');
  const ds = r.dentes && typeof r.dentes === 'object' ? r.dentes : {}, permitidos = dentesDaDenticao(r.denticao).map(String);
  const chaves = Object.keys(ds);
  if (!chaves.length) f.push('dentes (odontograma vazio)');
  const fora = chaves.filter(function (n) { return permitidos.indexOf(String(n)) < 0; });
  if (fora.length) f.push('dentes fora da dentição escolhida (' + fora.slice(0, 5).join(', ') + ')');
  // O app sempre manda a dentição inteira: faltar dente é odontograma incompleto.
  const faltamD = permitidos.filter(function (n) { return chaves.map(String).indexOf(n) < 0; });
  if (chaves.length && faltamD.length) f.push('odontograma incompleto (faltam os dentes ' + faltamD.slice(0, 6).join(', ') + (faltamD.length > 6 ? '…' : '') + ')');
  const procRuim = chaves.filter(function (n) {
    const d = ds[n] || {}, p = d.procs || {};
    if (d.dor != null && typeof d.dor !== 'boolean') return true;
    if (d.abscesso != null && typeof d.abscesso !== 'boolean') return true;
    // Só o dente presente tem sinais e tratamento; as duas exodontias não vão juntas no mesmo dente.
    if (d.status !== 'presente' && (d.dor || d.abscesso || Object.keys(p).some(function (k) { return p[k]; }))) return true;
    if (p.exo_carie && p.exodontia) return true;
    if (d.obs != null && (typeof d.obs !== 'string' || d.obs.length > 500)) return true;
    if (typeof p !== 'object' || Array.isArray(p)) return true;
    return Object.keys(p).some(function (k) { return !NOMES_PROC[k] || ['', 'indicado', 'realizado'].indexOf(p[k]) < 0; });
  });
  if (procRuim.length) f.push('sinais, tratamento ou observação dos dentes ' + procRuim.slice(0, 5).join(', '));
  const ruins = chaves.filter(function (n) {
    const d = ds[n] || {}, fc = d.faces || {};
    if (STATUS_DENTE.indexOf(d.status) < 0 || (d.status === 'esfoliado' && !decidDe(n))) return true;
    if (d.status !== 'presente' && Object.keys(fc).some(function (k) { return fc[k]; })) return true;
    return Object.keys(fc).some(function (k) { return ['O', 'M', 'D', 'V', 'L'].indexOf(k) < 0 || FACES_VALIDAS.indexOf(fc[k] || '') < 0; });
  });
  if (ruins.length) f.push('situação ou faces dos dentes ' + ruins.slice(0, 5).join(', '));
  return f;
}
// Código de acompanhamento de pessoa nova: UF-POLO-ALDEIA-8 caracteres, com 1 a 3 letras ou números no polo e na
// aldeia e a UF de um estado do DSEI do exame.
const RE_CODIGO = /^([A-Z]{2})-([A-Z0-9]{1,3})-([A-Z0-9]{1,3})-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;
/** @param {string} cod @param {string} dsei */
function codigoBemFormado(cod, dsei) {
  const m = RE_CODIGO.exec(String(cod || '').toUpperCase());
  return !!m && ufDoDsei(m[1], dsei);
}
/** Escopo ADMINISTRATIVO (equipe, convites, listas): CD e RT ficam no DSEI do cadastro; coordenação vê vários. @param {any} u */
function atuaEmUmDsei(u) { return u.perfil !== 'coord'; }
/** Escopo CLÍNICO (registrar exame, buscar pessoa, reservar código): todo profissional que registra exames,
 * inclusive a coordenação que também é RT, atua só no DSEI de RT do cadastro. null = coordenação titular,
 * que não registra exames. @param {any} u */
function dseiClinico(u) { return u.perfil === 'coord' ? (u.dsei ? String(u.dsei) : null) : String(u.dsei || ''); }

/* ---------- 9. pessoas: busca, código de acompanhamento e histórico ---------- */
/** @param {any} d @param {any} u */
function dseiDaConsulta(d, u) {
  const pedido = String(d.dsei || '');
  const proprio = dseiClinico(u);
  if (proprio === null) return { dsei: pedido, negado: false };
  return { dsei: proprio, negado: !proprio || (!!pedido && pedido !== proprio) };
}
// Pessoas já examinadas no DSEI com a mesma aldeia, data de nascimento e sexo.
/** @param {any} d @param {any} u */
function buscarPessoa(d, u) {
  const q = dseiDaConsulta(d, u);
  if (q.negado) return { ok: true, candidatos: [], foraDoDsei: u.dsei || '(sem DSEI no cadastro)' };
  const dsei = q.dsei, aldeia = normTexto(d.aldeia), nasc = String(d.nascimento || ''), sexo = String(d.sexo || '');
  if (!dsei || !aldeia || !nasc || (sexo !== 'F' && sexo !== 'M')) return { ok: true, candidatos: [] };
  const nomePor = nomesUsuarios();
  // 1º: mesma aldeia, nascimento e sexo. 2º (se não achar): qualquer aldeia do mesmo DSEI, com o mesmo nascimento
  // e sexo; esses candidatos voltam marcados (outraAldeia) para o app avisar que o exame anterior foi em outra aldeia.
  // Nunca liga sozinho: o profissional confere e escolhe.
  /** @type {any} */ const grupos = {}, outros = {};
  lerResumos().forEach(function (r) {
    if (!exameValido(r) || r.id === d.excetoId || r.dsei !== dsei) return;
    if ((r.crianca || {}).nascimento !== nasc || (r.crianca || {}).sexo !== sexo) return;
    const k = codigoIndividuoDe(r), alvo = normTexto(r.aldeia) === aldeia ? grupos : outros;
    (alvo[k] = alvo[k] || []).push(r);
  });
  const montar = function (g, outra) {
    return Object.keys(g).map(function (k) {
      const l = g[k].sort(ordemExame), ult = lerCompletos([l[l.length - 1]._linha])[0] || l[l.length - 1];
      ult.profissionalNome = nomePor[ult.usuarioId] || (ult.profissional || {}).nome || '';
      return { codigoIndividuo: k, exames: l.length, ultimo: ult, outraAldeia: outra ? (ult.aldeia || '') : '' };
    }).sort(function (a, b) { return String(b.ultimo.dataExame).localeCompare(String(a.ultimo.dataExame)); }).slice(0, 5);
  };
  // Uma pessoa com exames na aldeia e fora dela aparece só uma vez, como da mesma aldeia.
  Object.keys(grupos).forEach(function (k) { delete outros[k]; });
  const candidatos = montar(grupos, false);
  return { ok: true, candidatos: candidatos.length ? candidatos : montar(outros, true), outrasAldeias: !candidatos.length && Object.keys(outros).length > 0 };
}
// Busca uma pessoa pelo código de acompanhamento (ou pelo código de um dos exames dela), só no DSEI do atendimento.
/** @param {any} d @param {any} u */
function buscarCodigo(d, u) {
  // O código buscado vem em codigoBusca (o campo codigo é o código de acesso de quem está entrando).
  const q = dseiDaConsulta(d, u);
  if (q.negado) return { ok: true, pessoa: null, foraDoDsei: u.dsei || '(sem DSEI no cadastro)' };
  const cod = String(d.codigoBusca || '').trim().toUpperCase(), dsei = q.dsei;
  if (!cod) return { ok: true, pessoa: null };
  const regs = lerIndice().filter(function (r) { return exameValido(r) && r.id !== d.excetoId; });
  const ex = regs.filter(function (r) { return codigoIndividuoDe(r).toUpperCase() === cod || String(r.codigo || '').toUpperCase() === cod; })[0];
  if (!ex) return { ok: true, pessoa: null };
  const ci = codigoIndividuoDe(ex);
  const l = regs.filter(function (r) { return codigoIndividuoDe(r) === ci; }).sort(ordemExame);
  const ds = dseisDaPessoa(l);
  if (ds.length > 1) {
    alertarCodigoEmVariosDseis(ci, ds, u);
    return u.perfil === 'coord' ? { ok: true, pessoa: null, emConferencia: true, outroDsei: ds.join(', ') } : { ok: true, pessoa: null, foraDoSeuDsei: true };
  }
  // Para CD e RT, um código de outro DSEI é só "não localizado no seu DSEI" (sem dizer qual é o DSEI).
  if (l[0].dsei !== dsei) return u.perfil === 'coord' ? { ok: true, pessoa: null, outroDsei: l[0].dsei } : { ok: true, pessoa: null, foraDoSeuDsei: true };
  const ult = lerCompletos([l[l.length - 1]._linha])[0], nomePor = nomesUsuarios();
  if (!ult) return { ok: true, pessoa: null };
  ult.profissionalNome = nomePor[ult.usuarioId] || (ult.profissional || {}).nome || '';
  return { ok: true, pessoa: { codigoIndividuo: ci, exames: l.length, ultimo: ult } };
}
/* ---------- reserva de códigos de acompanhamento ---------- */
// Com internet, o app reserva aqui o código sorteado ANTES de mostrá-lo. A ação roda com a trava do script
// (escreve: true), então dois aparelhos nunca recebem o mesmo código. Sem internet, o código sorteado no
// aparelho vale como definitivo; a conferência no envio do exame fica só como proteção extrema.
const ABA_RESERVAS = '_codigos_reservados';
const CAB_RESERVAS = ['codigo', 'exame_id', 'dsei', 'usuario_id', 'reservado_em'];
function lerReservas() {
  const m = memo(); if (m.reservas) return m.reservas;
  const aba = planilha().getSheetByName(ABA_RESERVAS);
  if (!aba || aba.getLastRow() < 2) return (m.reservas = []);
  return (m.reservas = aba.getRange(2, 1, aba.getLastRow() - 1, 2).getValues().map(function (l) { return { codigo: String(l[0]).trim().toUpperCase(), exameId: String(l[1]) }; }));
}
/** @param {any} d @param {any} u */
function reservarCodigo(d, u) {
  // O código vem em codigoReserva (o campo codigo é o código de acesso de quem está usando o app).
  const cod = String(d.codigoReserva || '').trim().toUpperCase(), id = String(d.exameId || '');
  // Formato UF-POLO-ALDEIA-XXXXXXXX (8 caracteres sem 0, O, 1, I e L) e UF do DSEI de quem reserva.
  const m = cod.match(RE_CODIGO);
  if (!m || !id) return { ok: false, erro: 'Código inválido para reserva.' };
  const dseiR = dseiClinico(u) !== null ? dseiClinico(u) : String(d.dsei || '');
  if (dseiR && !ufDoDsei(m[1], dseiR)) return { ok: false, erro: 'A UF do código não é do DSEI ' + dseiR + '.' };
  const ja = lerReservas().filter(function (r) { return r.codigo === cod; })[0];
  if (ja) return ja.exameId === id ? { ok: true, reservado: true } : { ok: true, ocupado: true };
  const usado = lerIndice().some(function (r) { return r.id !== id && (codigoIndividuoDe(r).toUpperCase() === cod || String(r.codigo || '').toUpperCase() === cod); });
  if (usado) return { ok: true, ocupado: true };
  obterAba(planilha(), ABA_RESERVAS, CAB_RESERVAS).appendRow([cod, id, dseiR, u.id, new Date()]);
  memo().reservas = null;
  return { ok: true, reservado: true };
}
/** DSEIs (sem repetir) dos exames de uma pessoa. @param {any[]} l */
function dseisDaPessoa(l) {
  /** @type {any} */ const v = {};
  l.forEach(function (r) { v[String(r.dsei || '')] = 1; });
  return Object.keys(v).sort();
}
// Código de acompanhamento com exames em mais de um DSEI: fica registrado em Acessos e a coordenação recebe um e-mail
// (no máximo um aviso por código a cada 6 horas, para não lotar a caixa).
/** @param {string} cod @param {string[]} dseis @param {any} u */
function alertarCodigoEmVariosDseis(cod, dseis, u) {
  try {
    const c = CacheService.getScriptCache(), k = 'multi:' + cod;
    if (c.get(k)) return;
    c.put(k, '1', 21600);
  } catch (x) { /* sem cache: avisa mesmo assim */ }
  registrar(u, 'Código em mais de um DSEI', cod + ' · DSEIs ' + dseis.join(', ') + ' · consulta bloqueada para CD e RT');
  const para = emailCoord();
  if (para) enviarEmail(para, 'Odontograma: código em mais de um DSEI',
    'O código de acompanhamento ' + cod + ' tem exames em mais de um DSEI (' + dseis.join(', ') + ').\n\n' +
    'Isso não deveria acontecer. Enquanto não for corrigido, cirurgiões-dentistas e RTs não conseguem ver nem juntar exames a esse código. ' +
    'Confira na planilha (aba Exames, coluna codigo_individuo) e, se for o caso, cancele o exame que ficou no DSEI errado.\n\n' +
    'Quem tentou acessar: ' + (u.nome || '') + ' (' + (perfilTexto(u) || '') + (u.dsei ? ', DSEI ' + u.dsei : '') + ').');
}
function nomesUsuarios() {
  /** @type {any} */ const m = { coord: 'Coordenação' };
  lerUsuarios().forEach(function (x) { m[x.id] = x.nome; });
  return m;
}
// Quem pode ver a linha do tempo de uma pessoa (regra de continuidade do cuidado):
// - a coordenação, sempre;
// - a RT e os cirurgiões-dentistas do mesmo DSEI da pessoa (u.dsei, do cadastro), para que quem atende
//   depois veja os exames anteriores, mesmo que tenham sido feitos por outro profissional;
// - ninguém de fora do DSEI (CD e RT atuam só no DSEI do cadastro).
// Toda consulta ao histórico feita por quem não fez todos os exames fica registrada nos Acessos.
/** @param {any[]} l @param {any} u */
function podeVerPessoa(l, u) {
  // Defesa: um código com exames em mais de um DSEI não deveria existir. Só a coordenação vê, e ela é avisada.
  const ds = dseisDaPessoa(l);
  if (ds.length > 1) { alertarCodigoEmVariosDseis(codigoIndividuoDe(l[0]), ds, u); return u.perfil === 'coord'; }
  if (u.perfil === 'coord') return true;
  // RT e dentistas do DSEI da pessoa veem o histórico dela (continuidade do cuidado). Fora do DSEI do cadastro, não.
  return !!u.dsei && l.some(function (r) { return r.dsei === u.dsei; });
}
/** @param {any} d @param {any} u */
function pessoa(d, u) {
  const cod = String(d.codigoIndividuo || '');
  const l = lerCompletos(lerIndice().filter(function (r) { return exameValido(r) && codigoIndividuoDe(r) === cod; }).map(function (r) { return r._linha; })).sort(ordemExame);
  l.forEach(function (r, i) { r.numeroExame = i + 1; });
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
  const regs = lerResumos().filter(exameValido);
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
// A coordenação titular guarda o próprio nome nas Propriedades do script (NOME_COORDENACAO).
/** @param {any} d @param {any} u */
function meuNome(d, u) {
  if (!u.titular) return { ok: false, erro: 'O nome das outras pessoas vem do cadastro de acesso.' };
  const nome = String(d.nome || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!nome) return { ok: false, erro: 'Digite o seu nome.' };
  PropertiesService.getScriptProperties().setProperty('NOME_COORDENACAO', nome);
  return { ok: true, usuario: { nome: nome } };
}
/* ---------- 10. ações do Dia B e página inicial ---------- */
// Só a coordenação cria. Não há meta: o app conta os exames feitos no DSEI, nas aldeias e no período da ação.
// Aldeias em branco = todas as aldeias do DSEI.
const CAB_ACOES = ['id', 'nome', 'dsei', 'aldeias', 'data_inicio', 'data_fim', 'situacao', 'criada_por', 'criada_em', 'cancelada_por', 'cancelada_em'];
const MESES_REAVALIACAO = 6;
function hojeIso() { return fmtDia(new Date()); }
function lerAcoes() {
  const aba = planilha().getSheetByName('Acoes');
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB_ACOES.length).getValues().map(function (l) {
    /** @type {any} */ const a = {};
    CAB_ACOES.forEach(function (k, j) { a[k] = l[j] instanceof Date ? (k.indexOf('data_') === 0 ? fmtDia(l[j]) : l[j].toISOString()) : String(l[j]); });
    return a;
  }).filter(function (a) { return a.id; });
}
/** @param {any} a */
function salvarAcao(a) {
  const aba = obterAba(planilha(), 'Acoes', CAB_ACOES);
  const linha = linhaSegura(CAB_ACOES.map(function (k) { return a[k] == null ? '' : a[k]; }));
  const n = aba.getLastRow();
  const ids = n > 1 ? aba.getRange(2, 1, n - 1, 1).getValues().map(function (l) { return String(l[0]); }) : [];
  const i = ids.indexOf(String(a.id));
  if (i >= 0) aba.getRange(i + 2, 1, 1, CAB_ACOES.length).setValues([linha]); else aba.appendRow(linha);
}
/** @param {any} a */
function aldeiasDe(a) { return String(a.aldeias || '').split(';').map(normTexto).filter(function (x) { return x; }); }
/** @param {any} r @param {any} a */
function exameNaAcao(r, a) {
  const d = String(r.dataExame || ''), al = aldeiasDe(a);
  return r.dsei === a.dsei && d >= a.data_inicio && d <= a.data_fim && (!al.length || al.indexOf(normTexto(r.aldeia)) >= 0);
}
/** @param {any} a @param {string} hoje */
function andamentoDe(a, hoje) { return hoje < a.data_inicio ? 'proxima' : hoje > a.data_fim ? 'encerrada' : 'andamento'; }
/** @param {any} u */
function acoesVisiveis(u) {
  return lerAcoes().filter(function (a) { return a.situacao !== 'cancelada' && (u.perfil === 'coord' || a.dsei === u.dsei); });
}
/** @param {any} a @param {any[]} regs @param {any} u @param {string} hoje */
function resumoAcao(a, regs, u, hoje) {
  const l = regs.filter(function (r) { return exameNaAcao(r, a); });
  /** @type {any} */ const pessoas = {}, alto = {};
  l.forEach(function (r) { const c = codigoIndividuoDe(r); pessoas[c] = 1; if (nivelDaClasse((r.resultado || {}).classe) === 'Alto risco') alto[c] = 1; });
  return { id: a.id, nome: a.nome || 'Dia B', dsei: a.dsei, aldeias: String(a.aldeias || '').split(';').map(function (x) { return x.trim(); }).filter(function (x) { return x; }),
    inicio: a.data_inicio, fim: a.data_fim, andamento: andamentoDe(a, hoje), criadaPor: a.criada_por || '',
    pessoas: Object.keys(pessoas).length, exames: l.length, alto: ocultarNumero(Object.keys(alto).length),
    meus: l.filter(function (r) { return ehDoUsuario(r, u); }).length };
}
/** @param {any} d @param {any} u */
function acoes(d, u) {
  const regs = lerResumos().filter(exameValido), hoje = hojeIso();
  const l = acoesVisiveis(u).map(function (a) { return resumoAcao(a, regs, u, hoje); })
    .sort(function (x, y) { return String(y.inicio).localeCompare(String(x.inicio)); });
  return { ok: true, versao: VERSAO, hoje: hoje, acoes: l, podeCriar: u.perfil === 'coord' };
}
/** @param {any} v */
// Data AAAA-MM-DD que existe de verdade: confere dia, mês e ano um a um (31/02 não vira 03/03).
function dataValida(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); if (!m) return false;
  const a = +m[1], me = +m[2], di = +m[3], d = new Date(Date.UTC(a, me - 1, di));
  return d.getUTCFullYear() === a && d.getUTCMonth() === me - 1 && d.getUTCDate() === di;
}
/** @param {any} d @param {any} u */
function criarAcao(d, u) {
  const dsei = String(d.dsei || '').trim();
  if (!dsei) return { ok: false, erro: 'Escolha o DSEI da ação.' };
  if (!dseiValido(dsei)) return { ok: false, erro: 'Escolha um DSEI da lista.' };
  if (!dataValida(d.inicio) || !dataValida(d.fim)) return { ok: false, erro: 'Informe as datas de início e de fim.' };
  if (String(d.fim) < String(d.inicio)) return { ok: false, erro: 'A data de fim é antes da data de início.' };
  const lista = (Array.isArray(d.aldeias) ? d.aldeias : String(d.aldeias || '').split(/[;,\n]/)).map(function (x) { return String(x).trim(); }).filter(function (x) { return x; });
  const a = { id: 'ACAO-' + Utilities.getUuid(), nome: String(d.nome || '').trim() || 'Dia B', dsei: dsei, aldeias: lista.join('; '),
    data_inicio: String(d.inicio), data_fim: String(d.fim), situacao: 'ativa', criada_por: u.nome || u.email, criada_em: new Date().toISOString(), cancelada_por: '', cancelada_em: '' };
  salvarAcao(a);
  registrar(u, 'Criou ação do Dia B', a.nome + ' · DSEI ' + dsei + ' · ' + dataBR(a.data_inicio) + ' a ' + dataBR(a.data_fim) + (lista.length ? ' · ' + a.aldeias : ' · todas as aldeias'));
  return { ok: true, acao: resumoAcao(a, lerResumos().filter(exameValido), u, hojeIso()) };
}
/** @param {any} d @param {any} u */
function cancelarAcao(d, u) {
  const a = lerAcoes().filter(function (x) { return x.id === d.id; })[0];
  if (!a || a.situacao === 'cancelada') return { ok: false, erro: 'Ação não encontrada.' };
  a.situacao = 'cancelada'; a.cancelada_por = u.nome || u.email; a.cancelada_em = new Date().toISOString();
  salvarAcao(a);
  registrar(u, 'Cancelou ação do Dia B', a.nome + ' · DSEI ' + a.dsei + ' · ' + dataBR(a.data_inicio) + ' a ' + dataBR(a.data_fim));
  return { ok: true };
}
// Página inicial: quem faz exames vê a própria produção; a coordenação (sem DSEI) vê todos os DSEIs.
/** @param {any} d @param {any} u */
function inicio(d, u) {
  const todos = lerResumos().filter(exameValido), hoje = hojeIso();
  const minha = u.perfil !== 'coord' || !!u.dsei;
  const meus = minha ? todos.filter(function (r) { return ehDoUsuario(r, u); }) : todos;
  /** @type {any} */ const ultimo = {};
  todos.slice().sort(ordemExame).forEach(function (r) { ultimo[codigoIndividuoDe(r)] = r; });
  /** @type {any} */ const cods = {};
  meus.forEach(function (r) { cods[codigoIndividuoDe(r)] = 1; });
  const pessoas = Object.keys(cods);
  const alto = pessoas.filter(function (c) { return nivelDaClasse(((ultimo[c] || {}).resultado || {}).classe) === 'Alto risco'; }).length;
  const reavaliar = minha ? pessoas.filter(function (c) { return mesesEntre((ultimo[c] || {}).dataExame, hoje) >= MESES_REAVALIACAO; })
    .map(function (c) { const r = ultimo[c]; return { codigo: c, data: r.dataExame, aldeia: r.aldeia || '', polo: r.polo || '', dsei: r.dsei, classe: (r.resultado || {}).classe || '' }; })
    .sort(function (x, y) { return String(x.data).localeCompare(String(y.data)); }) : [];
  const vis = acoesVisiveis(u), ano = hoje.slice(0, 4);
  const acoesL = vis.filter(function (a) { return andamentoDe(a, hoje) !== 'encerrada'; }).map(function (a) { return resumoAcao(a, todos, u, hoje); })
    .sort(function (x, y) { return String(x.inicio).localeCompare(String(y.inicio)); });
  return { ok: true, versao: VERSAO, hoje: hoje, escopo: minha ? 'minha' : 'geral', pessoas: pessoas.length, exames: meus.length, alto: alto,
    acoesAno: vis.filter(function (a) { return String(a.data_inicio).slice(0, 4) === ano; }).length,
    reavaliar: reavaliar.slice(0, 200), totalReavaliar: reavaliar.length, mesesReavaliacao: MESES_REAVALIACAO, acoes: acoesL };
}
/** @param {any} d @param {any} u */
function meusExames(d, u) {
  // Só o resumo: o exame completo (com os dentes) vem por verExame quando o profissional abre um deles.
  const l = lerResumos().filter(function (r) { return ehDoUsuario(r, u); })
    .sort(function (a, b) { return String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || '')); }).slice(0, 1000);
  return { ok: true, exames: l };
}
/** @param {any} d @param {any} u */
function verExame(d, u) {
  const r = lerExameCompleto(String(d.id || ''));
  if (!r) return { ok: false, erro: 'Exame não encontrado.' };
  const pode = u.perfil === 'coord' || ehDoUsuario(r, u) || (u.perfil === 'rt' && r.dsei === u.dsei);
  if (!pode) return { ok: false, erro: 'Você não tem acesso a este exame.' };
  if (!ehDoUsuario(r, u)) registrar(u, 'Viu um exame', (r.codigo || r.id) + ' · DSEI ' + r.dsei);
  return { ok: true, exame: r };
}

/* ---------- 11. equipe, administração e coordenação ---------- */
/** @param {any} d @param {any} u */
function equipe(d, u) {
  const dsei = atuaEmUmDsei(u) ? u.dsei : String(d.dsei || '');
  if (!dsei) return { ok: false, erro: 'Escolha o DSEI.' };
  const us = lerUsuarios().filter(function (x) { return x.dsei === dsei && x.status !== 'recusado'; });
  const regs = lerResumos();
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
  return { ok: true, dsei: dsei, membros: membros, pedidos: pedidos, exames: exames, convites: listaConvites(u, dsei) };
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
  const foi = emailCodigo(a, c, '', false);
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
  a.status = status;
  // Reativar é uma nova aprovação: fica registrado quem reativou e quando (e some o aviso de "pediu reativação").
  if (status === 'ativo') Object.assign(a, { aprovado_por: u.nome, aprovado_em: new Date().toISOString() });
  salvarUsuario(a);
  registrar(u, status === 'ativo' ? 'Reativou acesso' : 'Desativou acesso', a.nome + ' · DSEI ' + a.dsei);
  return { ok: true };
}
/** @param {any} d @param {any} u */
function novoCodigoPara(d, u) {
  const a = alvoDe(d);
  if (!a || a.status !== 'ativo') return { ok: false, erro: 'O acesso precisa estar ativo.' };
  if (!podeGerir(u, a)) return { ok: false, erro: 'Você não pode alterar este acesso.' };
  const c = gerarCodigo(); a.codigo_hash = hashCodigo(c); salvarUsuario(a);
  const foi = emailCodigo(a, c, '', true);
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
  return { ok: true, usuarios: us.map(publico), acessos: acessos, dseisRT: dseisRT, qtdEquipe: qtdEquipe, titular: !!u.titular, convites: listaConvites(u, ''), populacao: populacaoInfo(d, u),
    reorganizacaoPendente: !formatoAtual(), senhaCurta: !!u.titular && chaveCfg().length < SENHA_MINIMA,
    instalacao: diagnostico(), versaoServidor: VERSAO,
    erros: u.titular ? errosRecentes() : null, espaco: u.titular ? espacoPlanilha() : null, analise: u.titular ? (estadoAnalise() || {}) : null,
    tarefaDiaria: u.titular ? { criada: (function () { try { return !garantirTarefaDiaria(); } catch (x) { return false; } })(), ultima: propriedade('TAREFA_DIARIA_EM') || '' } : null,
    auditoria: { falhas: Number(propriedade('AUDITORIA_FALHAS') || 0), ultima: propriedade('AUDITORIA_ULTIMA') || '' } };
}
/** A coordenação titular dá o aviso de falha na aba Acessos como visto (fica registrado). @param {any} d @param {any} u */
function limparAvisoAuditoria(d, u) {
  if (!u.titular) return { ok: false, erro: 'Só a coordenação titular pode limpar este aviso.' };
  const pr = PropertiesService.getScriptProperties(), n = Number(pr.getProperty('AUDITORIA_FALHAS') || 0), ult = pr.getProperty('AUDITORIA_ULTIMA') || '';
  pr.deleteProperty('AUDITORIA_FALHAS'); pr.deleteProperty('AUDITORIA_ULTIMA');
  registrar(u, 'Limpou aviso de auditoria', n + (n === 1 ? ' registro não gravado' : ' registros não gravados') + (ult ? ' · último: ' + ult.slice(0, 180) : ''));
  return { ok: true };
}
// Só a coordenação titular adiciona pessoas à coordenação. Elas entram com código pessoal.
// Com UF, DSEI e CRO, a pessoa é também RT daquele DSEI (recebe os pedidos e registra exames).
/** @param {any} d */
function dadosRT(d) {
  const dsei = String(d.dsei || '').trim(), cro = String(d.cro || '').trim(), uf = String(d.uf || '').trim();
  if (!dsei) return { ok: true, dsei: '', cro: cro, uf: '' };
  if (!uf || !cro) return { ok: false, erro: 'Para ser também RT, informe UF, DSEI e CRO.' };
  if (!dseiValido(dsei) || !ufDoDsei(uf, dsei)) return { ok: false, erro: 'Escolha um DSEI da lista e uma UF desse DSEI.' };
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
  const a = ex || { id: Utilities.getUuid() };
  const c = gerarCodigo();
  Object.assign(a, { nome: nome, cro: rt.cro, email: email, uf: rt.uf, dsei: rt.dsei, polo: '', perfil: 'coord', status: 'ativo', codigo_hash: hashCodigo(c),
    pedido_em: new Date().toISOString(), aprovado_por: u.nome, aprovado_em: new Date().toISOString() });
  salvarUsuario(a);
  const foi = emailCodigo(a, c, '', false);
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
      foi = emailCodigo(nova, c, '', false); cod = foi ? '' : c;
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

/* ---------- 12. convites ---------- */
// A coordenação convida referências técnicas e dentistas de qualquer DSEI; a RT convida dentistas do próprio DSEI.
// O convite vai por e-mail com um link pessoal. Quem abre o link completa nome e CRO e já entra, sem esperar aprovação.
// Na planilha fica só o resumo do link (token_hash), nunca o link em si.
const CAB_CONVITES = ['id', 'email', 'perfil', 'dsei', 'situacao', 'token_hash', 'convidado_por', 'convidado_por_id', 'convidado_por_email', 'criado_em', 'valido_ate', 'aceito_em', 'usuario_id'];
const DIAS_CONVITE = 30;
const MAX_CONVITES = 50;
function lerConvites() {
  const aba = planilha().getSheetByName('Convites');
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, CAB_CONVITES.length).getValues().map(function (l) {
    /** @type {any} */ const c = {};
    CAB_CONVITES.forEach(function (k, j) { c[k] = l[j] instanceof Date ? (k === 'valido_ate' ? fmtDia(l[j]) : l[j].toISOString()) : String(l[j]); });
    return c;
  }).filter(function (c) { return c.id; });
}
/** @param {any} c */
function salvarConvite(c) {
  const aba = obterAba(planilha(), 'Convites', CAB_CONVITES);
  const linha = linhaSegura(CAB_CONVITES.map(function (k) { return c[k] == null ? '' : c[k]; }));
  const n = aba.getLastRow();
  const ids = n > 1 ? aba.getRange(2, 1, n - 1, 1).getValues().map(function (l) { return String(l[0]); }) : [];
  const i = ids.indexOf(String(c.id));
  if (i >= 0) aba.getRange(i + 2, 1, 1, CAB_CONVITES.length).setValues([linha]); else aba.appendRow(linha);
}
function gerarToken() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40); }
/** @param {any} t */
// Em hexadecimal: nunca começa com "+" ou "=", que a planilha leria como fórmula.
function hashToken(t) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'convite:' + String(t || '').trim().toLowerCase())
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function somarDias(dias) { const d = new Date(); d.setDate(d.getDate() + dias); return fmtDia(d); }
/** @param {any} c */
function situacaoConvite(c) { return c.situacao === 'pendente' && String(c.valido_ate) < hojeIso() ? 'expirado' : c.situacao; }
/** @param {any} u @param {any} perfil @param {any} dsei */
function podeConvidar(u, perfil, dsei) {
  if (u.perfil === 'coord') return perfil === 'rt' || perfil === 'dentista';
  return u.perfil === 'rt' && perfil === 'dentista' && dsei === u.dsei;
}
/** @param {any} link @param {any} token */
function linkDoConvite(link, token) { return String(link || '').split('?')[0].split('#')[0] + '?convite=' + token; }
/** @param {any} c @param {any} link @param {any} u */
function emailConvite(c, link, u) {
  return enviarEmail(c.email, 'Convite para o Odontograma',
    'Olá.\n\n' + u.nome + ' convidou você para usar o Odontograma como ' + NOME_PERFIL[c.perfil] + ' do DSEI ' + c.dsei + '.\n\n' +
    'Para aceitar, abra este link no celular ou no computador:\n\n    ' + link + '\n\n' +
    'Você só vai precisar completar seu nome e CRO. Depois disso, já entra no app e recebe seu código de acesso por e-mail.\n' +
    'O link é pessoal e vale até ' + dataBR(c.valido_ate) + '. Se ele vencer, peça um novo a quem convidou.\n\n' + NOME_APP);
}
/** @param {any} c */
function convitePublico(c) {
  return { id: c.id, email: c.email, perfil: c.perfil, dsei: c.dsei, situacao: situacaoConvite(c), convidado_por: c.convidado_por, criado_em: c.criado_em, valido_ate: c.valido_ate, aceito_em: c.aceito_em };
}
// Convites que a pessoa pode ver: a coordenação vê todos (ou os de um DSEI); a RT vê os do seu DSEI.
/** @param {any} u @param {any} dsei */
function listaConvites(u, dsei) {
  return lerConvites().filter(function (c) {
    if (c.situacao === 'substituido') return false;
    if (u.perfil === 'coord') return !dsei || c.dsei === dsei;
    return c.dsei === u.dsei && c.perfil === 'dentista';
  }).sort(function (a, b) { return String(b.criado_em).localeCompare(String(a.criado_em)); }).slice(0, 300).map(convitePublico);
}
/** @param {any} d @param {any} u */
function convidar(d, u) {
  const perfil = d.perfil === 'rt' ? 'rt' : 'dentista';
  const dsei = atuaEmUmDsei(u) ? u.dsei : String(d.dsei || '').trim();
  if (!dsei) return { ok: false, erro: 'Escolha o DSEI.' };
  if (!dseiValido(dsei)) return { ok: false, erro: 'Escolha um DSEI da lista.' };
  if (!podeConvidar(u, perfil, dsei)) return { ok: false, erro: u.perfil === 'rt' ? 'A referência técnica convida só cirurgiões-dentistas do próprio DSEI.' : 'Você não pode enviar este convite.' };
  const lista = String(d.emails || '').split(/[\s,;]+/).map(normEmail).filter(function (x, i, l) { return x && l.indexOf(x) === i; });
  if (!lista.length) return { ok: false, erro: 'Informe pelo menos um e-mail.' };
  if (lista.length > MAX_CONVITES) return { ok: false, erro: 'Envie no máximo ' + MAX_CONVITES + ' convites de uma vez.' };
  const us = lerUsuarios(), cs = lerConvites();
  const resultados = lista.map(function (email) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { email: email, res: 'invalido' };
    if (email === emailCoord()) return { email: email, res: 'ja_tem', msg: 'É o e-mail da coordenação titular.' };
    const ex = us.filter(function (x) { return normEmail(x.email) === email && x.status !== 'recusado'; })[0];
    if (ex && ex.status === 'ativo') return { email: email, res: 'ja_tem', msg: ex.nome + ' já tem acesso como ' + NOME_PERFIL[ex.perfil] + (ex.dsei ? ' do DSEI ' + ex.dsei : '') + '.' };
    if (ex && ex.status === 'desativado') return { email: email, res: 'desativado', msg: 'O acesso de ' + ex.nome + ' está desativado: reative em vez de convidar.' };
    if (ex && ex.status === 'pendente') return { email: email, res: 'pedido', msg: ex.nome + ' já pediu acesso: aprove o pedido.' };
    // Convite anterior ainda aberto para o mesmo e-mail: o novo substitui (o link antigo para de funcionar).
    cs.filter(function (c) { return c.email === email && c.situacao === 'pendente'; }).forEach(function (c) { c.situacao = 'substituido'; salvarConvite(c); });
    const token = gerarToken();
    const c = { id: Utilities.getUuid(), email: email, perfil: perfil, dsei: dsei, situacao: 'pendente', token_hash: hashToken(token),
      convidado_por: u.nome, convidado_por_id: u.id, convidado_por_email: u.email, criado_em: new Date().toISOString(), valido_ate: somarDias(DIAS_CONVITE), aceito_em: '', usuario_id: '' };
    salvarConvite(c);
    const link = linkDoConvite(urlApp(), token);
    return { email: email, res: emailConvite(c, link, u) ? 'enviado' : 'sem_email', link: link };
  });
  const enviados = resultados.filter(function (r) { return r.link; });
  if (enviados.length) registrar(u, 'Enviou convite', NOME_PERFIL[perfil] + ' · DSEI ' + dsei + ' · ' + enviados.map(function (r) { return r.email; }).join(', '));
  return { ok: true, resultados: resultados, convites: listaConvites(u, u.perfil === 'coord' ? String(d.filtroDsei || '') : u.dsei) };
}
/** @param {any} d @param {any} u */
function convites(d, u) { return { ok: true, convites: listaConvites(u, u.perfil === 'coord' ? String(d.dsei || '') : u.dsei) }; }
/** @param {any} d @param {any} u */
function conviteGerido(d, u) {
  const c = lerConvites().filter(function (x) { return x.id === String(d.id || ''); })[0];
  if (!c || c.situacao === 'substituido') return { erro: 'Convite não encontrado.' };
  if (!podeConvidar(u, c.perfil, c.dsei)) return { erro: 'Você não pode alterar este convite.' };
  return { c: c };
}
/** @param {any} d @param {any} u */
function reenviarConvite(d, u) {
  const g = conviteGerido(d, u); if (g.erro) return { ok: false, erro: g.erro };
  const c = g.c, sit = situacaoConvite(c);
  if (sit !== 'pendente' && sit !== 'expirado') return { ok: false, erro: sit === 'aceito' ? 'Este convite já foi aceito.' : 'Este convite foi cancelado. Envie um convite novo.' };
  const ex = lerUsuarios().filter(function (x) { return normEmail(x.email) === c.email && x.status === 'ativo'; })[0];
  if (ex) return { ok: false, erro: ex.nome + ' já tem acesso.' };
  const token = gerarToken();
  Object.assign(c, { situacao: 'pendente', token_hash: hashToken(token), valido_ate: somarDias(DIAS_CONVITE), criado_em: new Date().toISOString(), convidado_por: u.nome, convidado_por_id: u.id, convidado_por_email: u.email });
  salvarConvite(c);
  const link = linkDoConvite(urlApp(), token), foi = emailConvite(c, link, u);
  registrar(u, 'Reenviou convite', c.email + ' · DSEI ' + c.dsei);
  return { ok: true, emailEnviado: foi, link: link };
}
/** @param {any} d @param {any} u */
function cancelarConvite(d, u) {
  const g = conviteGerido(d, u); if (g.erro) return { ok: false, erro: g.erro };
  const c = g.c;
  if (situacaoConvite(c) === 'aceito') return { ok: false, erro: 'Este convite já foi aceito. Para tirar o acesso, desative a pessoa.' };
  c.situacao = 'cancelado'; salvarConvite(c);
  registrar(u, 'Cancelou convite', c.email + ' · DSEI ' + c.dsei);
  return { ok: true };
}
/** @param {any} d */
function conviteDoToken(d) {
  const t = String(d.convite || '').trim();
  if (!/^[0-9a-f]{40}$/i.test(t)) return { erro: 'Este link de convite não é válido. Confira se ele foi copiado inteiro.' };
  const h = hashToken(t), c = lerConvites().filter(function (x) { return x.token_hash === h; })[0];
  if (!c || c.situacao === 'substituido') return { erro: 'Este link de convite não vale mais. Se recebeu um convite mais novo, use o link dele.' };
  const sit = situacaoConvite(c);
  if (sit === 'aceito') return { erro: 'Este convite já foi aceito. Entre com seu e-mail e o código que chegou por e-mail.', usado: true };
  if (sit === 'cancelado') return { erro: 'Este convite foi cancelado. Em caso de dúvida, procure quem convidou você.' };
  if (sit === 'expirado') return { erro: 'Este convite venceu em ' + dataBR(c.valido_ate) + '. Peça um novo a ' + c.convidado_por + '.' };
  return { c: c };
}
/** @param {any} d */
function verConvite(d) {
  const g = conviteDoToken(d); if (g.erro) return { ok: false, erro: g.erro, usado: !!g.usado };
  const c = g.c;
  return { ok: true, convite: { email: c.email, perfil: c.perfil, dsei: c.dsei, convidado_por: c.convidado_por, valido_ate: c.valido_ate } };
}
/** @param {any} d */
function aceitarConvite(d) {
  const g = conviteDoToken(d); if (g.erro) return { ok: false, erro: g.erro, usado: !!g.usado };
  const c = g.c, nome = String(d.nome || '').trim(), cro = String(d.cro || '').trim(), uf = String(d.uf || '').trim();
  if (!nome || !cro || !uf) return { ok: false, erro: 'Preencha nome, CRO e UF.' };
  if (!ufDoDsei(uf, c.dsei)) return { ok: false, erro: 'Escolha uma UF do DSEI ' + c.dsei + '.' };
  const us = lerUsuarios(), ex = us.filter(function (x) { return normEmail(x.email) === c.email; })[0];
  if (ex && ex.status === 'ativo') return { ok: false, erro: 'Este e-mail já tem acesso. Entre com seu código ou use "Esqueci meu código".', usado: true };
  const novo = ex || { id: Utilities.getUuid() };
  const cod = gerarCodigo(), agora = new Date().toISOString();
  Object.assign(novo, { nome: nome, cro: cro, email: c.email, uf: uf, dsei: c.dsei, polo: String(d.polo || '').trim(), perfil: c.perfil, status: 'ativo',
    codigo_hash: hashCodigo(cod), pedido_em: agora, aprovado_por: c.convidado_por + ' (convite)', aprovado_em: agora, ultimo_acesso: agora });
  salvarUsuario(novo);
  Object.assign(c, { situacao: 'aceito', aceito_em: agora, usuario_id: novo.id }); salvarConvite(c);
  emailCodigo(novo, cod, '', false);
  if (c.convidado_por_email) enviarEmail(c.convidado_por_email, nome + ' aceitou o convite do Odontograma',
    nome + ' (CRO ' + cro + ') aceitou o convite e já tem acesso como ' + NOME_PERFIL[c.perfil] + ' do DSEI ' + c.dsei + '.\n\n' + NOME_APP);
  registrar(novo, 'Aceitou convite', NOME_PERFIL[c.perfil] + ' · DSEI ' + c.dsei + ' · convite de ' + c.convidado_por);
  return { ok: true, email: c.email, codigo: cod, usuario: publico(novo) };
}

function lerExames() {
  // Lê todas as abas cujo nome começa com "Exames" (inclusive uma guardada por obterAba com cabeçalho trocado)
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

/* ---------- 13. painel: só números agregados, nunca dados individuais ---------- */
// O Painel é a consulta mais pesada (soma todos os exames). O resultado de cada recorte fica guardado por 5 minutos:
// com muita gente abrindo o Painel ao mesmo tempo, só o primeiro pedido faz a conta.
const PAINEL_CACHE_S = 300;
/** @param {any} p @param {any} u */
function painel(p, u) {
  const chave = ['de', 'ate', 'dsei', 'f_faixa', 'f_sexo', 'f_classe', 'f_proc', 'f_coletivo', 'f_vig'].map(function (k) { return String(p[k] || ''); }).join('|') + '|' + (p.minha ? u.id : '');
  const k = 'painel:' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, chave));
  // Vale a conta guardada enquanto nenhum exame mudar (cada gravação muda a versão dos dados).
  const versao = versaoDados();
  try {
    const c = CacheService.getScriptCache().get(k);
    if (c) { const o = JSON.parse(c); if (o.v === versao) return Object.assign(o.r, { doCache: true }); }
  } catch (x) {}
  const r = calcularPainel(p, u);
  try { const t = JSON.stringify({ v: versao, t: Date.now(), r: r }); if (t.length < 95000) CacheService.getScriptCache().put(k, t, PAINEL_CACHE_S); } catch (x) {}
  return r;
}
/** @param {any} p @param {any} u */
function calcularPainel(p, u) {
  const regs = lerResumos().filter(exameValido);
  const de = p.de || '', ate = p.ate || '', agrup = 'tres';
  const noPeriodo = regs.filter(function (r) {
    const d = String(r.dataExame || '');
    return (!de || d >= de) && (!ate || d <= ate);
  });
  const filtros = { faixa: p.f_faixa || '', sexo: p.f_sexo || '', classe: p.f_classe || '', proc: p.f_proc || '', coletivo: p.f_coletivo || '', vig: p.f_vig || '' };
  // Dados agregados: qualquer perfil escolhe a visão geral ou qualquer DSEI (com ocultação de números menores que 5).
  const dr = String(p.dsei || '');
  const doRecorte = p.minha ? noPeriodo.filter(function (r) { return ehDoUsuario(r, u); })
    : dr ? noPeriodo.filter(function (r) { return r.dsei === dr; }) : noPeriodo;
  const blocos = montarPainel(doRecorte, filtros, agrup);
  // Na produção do próprio profissional não há ocultação: são os exames dele.
  if (!p.minha) Object.keys(blocos).forEach(function (k) { blocos[k] = ocultar(blocos[k]); });

  const porDsei = {}, ultP = idsUltimoPorPessoa(noPeriodo.filter(exameValido));
  noPeriodo.filter(function (r) { return exameCombina(r, filtros); }).forEach(function (r) { (porDsei[r.dsei] = porDsei[r.dsei] || []).push(r); });
  const comparacao = p.minha ? [] : Object.keys(porDsei).map(function (d) {
    const a = agregarExames(porDsei[d], agrup, ultP);
    if (a.n < MINIMO) return { dsei: d, n: '<5' };
    // O percentual some junto quando o número (ou o que falta para o total) é de 1 a 4 pessoas: senão ele revelaria o número.
    const alto = a.nivel.Alto, pctOk = !(alto > 0 && alto < MINIMO) && !(a.n - alto > 0 && a.n - alto < MINIMO);
    return { dsei: d, n: a.n, alto: ocultarNumero(alto), pctAlto: pctOk ? Math.round(alto / a.n * 100) : null,
             ceod: a.ceod.n >= MINIMO ? a.ceodMedia : null, cpod: a.cpod.n >= MINIMO ? a.cpodMedia : null, procs: a.procsRealizados };
  }).sort(function (x, y) { return (typeof y.n === 'number' ? y.n : 0) - (typeof x.n === 'number' ? x.n : 0); });

  const profs = {};
  doRecorte.filter(function (r) { return exameCombina(r, filtros); }).forEach(function (r) { const k = r.usuarioId; if (k) profs[k] = 1; });

  return { ok: true, versao: VERSAO, geradoEm: new Date().toISOString(), dseis: Object.keys(porDsei).sort(),
           totalExames: regs.length, recorteDsei: p.minha ? '' : dr, participantes: Object.keys(profs).length,
           resumo: blocos.resumo, blocos: blocos, filtros: filtros, comparacao: comparacao,
           cobertura: p.minha ? null : (function () { const pop = lerPopulacao(); return pop ? cobertura(noPeriodo, pop, dr, u) : { vazio: true }; })() };
}

/* ---------- população e territórios (planilha da SESAI) ---------- */
// A coordenação envia a planilha baixada do painel da população indígena da SESAI. O app lê o Excel,
// junta por aldeia, sexo e faixa etária e manda para cá. Fica guardado em duas abas:
// "População" (uma linha por aldeia, para consulta) e "_populacao" (o mesmo, em texto, para o app ler rápido).
const ABA_POP = 'População', ABA_POP_DADOS = '_populacao', TAM_PEDACO = 40000;
/** @type {any} */ let POP_CACHE = null;
function lerPopulacao() {
  if (POP_CACHE) return POP_CACHE;
  const aba = planilha().getSheetByName(ABA_POP_DADOS);
  if (!aba || aba.getLastRow() < 2) return null;
  const txt = aba.getRange(2, 1, aba.getLastRow() - 1, 1).getValues().map(function (l) { return String(l[0] || '').replace(/^'?#/, ''); }).join('');
  try { POP_CACHE = JSON.parse(txt); } catch (x) { return null; }
  return POP_CACHE;
}
/** @param {any} d @param {any} u */
function atualizarPopulacao(d, u) {
  const p = d.populacao;
  if (!p || typeof p !== 'object' || !p.aldeias || !p.pop || !p.polos || !p.dseis) return { ok: false, erro: 'Dados de população inválidos.' };
  const nAld = Object.keys(p.aldeias).length;
  if (nAld < 10) return { ok: false, erro: 'A planilha tem poucas aldeias (' + nAld + '). Confira se é a planilha completa da SESAI.' };
  if (!/^\d{4}$/.test(String(p.ano))) return { ok: false, erro: 'Não foi possível ler o ano da planilha.' };
  const base = { ano: Number(p.ano), dseis: p.dseis, polos: p.polos, tis: p.tis || {}, muns: p.muns || {}, aldeias: p.aldeias, pop: p.pop,
    pessoas: Number(p.pessoas) || 0, enviadoPor: u.nome, enviadoEm: new Date().toISOString(), arquivo: String(d.arquivo || '').slice(0, 120) };
  const ss = planilha(), txt = JSON.stringify(base), pedacos = [];
  // Cada pedaço começa com "#" para a planilha nunca ler o texto como fórmula.
  for (let i = 0; i < txt.length; i += TAM_PEDACO) pedacos.push(['#' + txt.slice(i, i + TAM_PEDACO)]);
  reescreverAba(ss, ABA_POP_DADOS, ['dados_populacao_json'], pedacos, null);
  const cab = ['codigo_dsei', 'dsei', 'codigo_polo_base', 'polo_base', 'codigo_terra_indigena', 'terra_indigena', 'codigo_municipio_ibge', 'municipio', 'uf', 'codigo_aldeia', 'aldeia', 'ano', 'populacao_total'];
  FAIXAS_POP.forEach(function (f) { cab.push('F ' + f, 'M ' + f); });
  const linhas = Object.keys(base.aldeias).map(function (ca) {
    const a = base.aldeias[ca], po = base.polos[a[1]] || ['', ''], v = base.pop[ca] || [];
    return [po[1], base.dseis[po[1]] || '', a[1], po[0], a[2], base.tis[a[2]] || '', a[3], base.muns[a[3]] || '', a[4], ca, a[0], base.ano,
      v.reduce(function (s, x) { return s + (Number(x) || 0); }, 0)].concat(v);
  }).sort(function (x, y) { return String(x[1]).localeCompare(String(y[1])) || String(x[3]).localeCompare(String(y[3])) || String(x[10]).localeCompare(String(y[10])); });
  reescreverAba(ss, ABA_POP, cab, linhas, null);
  POP_CACHE = base;
  const versao = base.ano + ' · ' + base.enviadoEm;
  PropertiesService.getScriptProperties().setProperty('POP_VERSAO', versao);
  registrar(u, 'Atualizou a população', 'Ano ' + base.ano + ' · ' + nAld + ' aldeias · ' + base.pessoas + ' pessoas');
  return { ok: true, versao: versao, ano: base.ano, aldeias: nAld, polos: Object.keys(base.polos).length, dseis: Object.keys(base.dseis).length, pessoas: base.pessoas };
}
/** @param {any} d @param {any} u */
function populacaoInfo(d, u) {
  const p = lerPopulacao();
  if (!p) return { ok: true, vazio: true };
  return { ok: true, ano: p.ano, aldeias: Object.keys(p.aldeias).length, polos: Object.keys(p.polos).length, dseis: Object.keys(p.dseis).length,
    pessoas: p.pessoas, enviadoPor: p.enviadoPor, enviadoEm: p.enviadoEm, arquivo: p.arquivo };
}
// Lista de DSEIs, polos e aldeias para o formulário do exame. Quem não é da coordenação recebe só o próprio DSEI.
/** @param {any} d @param {any} u */
function territorios(d, u) {
  const p = lerPopulacao();
  if (!p) return { ok: true, vazio: true, versao: '' };
  const nomeDsei = atuaEmUmDsei(u) ? String(u.dsei || '') || '(sem DSEI no cadastro)' : String(d.dsei || '');
  const cods = Object.keys(p.dseis).filter(function (c) { return !nomeDsei || p.dseis[c] === nomeDsei; });
  /** @type {any} */ const polos = {}, aldeias = {}, tis = {}, muns = {}, dseis = {};
  Object.keys(p.polos).forEach(function (c) { if (cods.indexOf(String(p.polos[c][1])) >= 0) polos[c] = p.polos[c]; });
  Object.keys(p.aldeias).forEach(function (c) {
    const a = p.aldeias[c];
    if (!polos[a[1]]) return;
    aldeias[c] = a; if (a[2]) tis[a[2]] = p.tis[a[2]]; if (a[3]) muns[a[3]] = p.muns[a[3]];
  });
  cods.forEach(function (c) { dseis[c] = p.dseis[c]; });
  return { ok: true, versao: propriedade('POP_VERSAO'), ano: p.ano, escopo: nomeDsei || 'todos', dseis: dseis, polos: polos, aldeias: aldeias, tis: tis, muns: muns };
}
// Em qual aldeia da lista o exame foi feito: pelo código; se a aldeia foi digitada à mão, pelo nome (no mesmo DSEI).
/** @param {any} p */
function indiceAldeias(p) {
  /** @type {any} */ const porNome = {}, porPolo = {};
  Object.keys(p.aldeias).forEach(function (c) {
    const a = p.aldeias[c], po = p.polos[a[1]] || ['', ''], ds = p.dseis[po[1]] || '';
    const k1 = normNome(ds) + '|' + normNome(po[0]) + '|' + normNome(a[0]), k2 = normNome(ds) + '|' + normNome(a[0]);
    porPolo[k1] = c; porNome[k2] = porNome[k2] && porNome[k2] !== c ? '?' : c;
  });
  /** @param {any} r */
  return function (r) {
    if (r.codAldeia && p.aldeias[r.codAldeia]) return String(r.codAldeia);
    const k1 = normNome(r.dsei) + '|' + normNome(r.polo) + '|' + normNome(r.aldeia), k2 = normNome(r.dsei) + '|' + normNome(r.aldeia);
    return porPolo[k1] || (porNome[k2] && porNome[k2] !== '?' ? porNome[k2] : '');
  };
}
// Cobertura: pessoas examinadas no período (cada uma uma vez, pelo último exame) sobre a população da SESAI.
// Números de 1 a 4 pessoas viram "<5", como no resto do painel.
/** @param {any} regs @param {any} p @param {any} nomeDsei @param {any} u */
function cobertura(regs, p, nomeDsei, u) {
  /** @param {any} c */
  const dentro = function (c) { const a = p.aldeias[c]; return !!a && (!nomeDsei || p.dseis[(p.polos[a[1]] || [])[1]] === nomeDsei); };
  const achar = indiceAldeias(p);
  /** @type {any} */ const ultimo = {};
  regs.forEach(function (r) {
    if (nomeDsei && r.dsei !== nomeDsei) return;
    const k = codigoIndividuoDe(r) || r.id;
    if (!ultimo[k] || ordemExame(ultimo[k], r) < 0) ultimo[k] = r;
  });
  const zeros = function (n) { const v = []; for (let i = 0; i < n; i++) v.push(0); return v; };
  /** @type {any} */ const exPorAldeia = {};
  const faixaEx = zeros(32), faixaSemSexo = zeros(16);
  let semLista = 0, total = 0;
  Object.keys(ultimo).forEach(function (k) {
    const r = ultimo[k], c = achar(r), f = faixaPop(r.idadeAnos), sx = (r.crianca || {}).sexo;
    total++;
    if (f >= 0) { if (sx === 'F' || sx === 'M') faixaEx[f * 2 + (sx === 'F' ? 0 : 1)]++; else faixaSemSexo[f]++; }
    if (!c || !dentro(c)) { semLista++; return; }
    exPorAldeia[c] = (exPorAldeia[c] || 0) + 1;
  });
  const faixaPopV = zeros(32), nivel = nomeDsei ? 'polo' : 'dsei';
  /** @type {any} */ const grupos = {}, porTi = {};
  /** @type {any[]} */ const semExame = [];
  let popTotal = 0;
  Object.keys(p.aldeias).forEach(function (c) {
    if (!dentro(c)) return;
    const a = p.aldeias[c], v = p.pop[c] || [], po = p.polos[a[1]] || ['', ''];
    let s = 0;
    for (let i = 0; i < 32; i++) { faixaPopV[i] += Number(v[i]) || 0; s += Number(v[i]) || 0; }
    popTotal += s;
    const g = nivel === 'polo' ? po[0] : (p.dseis[po[1]] || '');
    const G = grupos[g] || (grupos[g] = { nome: g, pop: 0, ex: 0, aldeias: 0, comExame: 0 });
    G.pop += s; G.ex += exPorAldeia[c] || 0; G.aldeias++; if (exPorAldeia[c]) G.comExame++;
    if (a[2]) {
      const T = porTi[a[2]] || (porTi[a[2]] = { c: a[2], nome: p.tis[a[2]] || '', pop: 0, ex: 0 });
      T.pop += s; T.ex += exPorAldeia[c] || 0;
    }
    if (!exPorAldeia[c] && s > 0) semExame.push({ aldeia: a[0], polo: po[0], pop: s });
  });
  semExame.sort(function (x, y) { return y.pop - x.pop; });
  // A lista de aldeias sem exame é para busca ativa: a coordenação vê de qualquer DSEI; a RT, só do próprio.
  const podeAldeias = u.perfil === 'coord' || (u.perfil === 'rt' && nomeDsei === u.dsei);
  return {
    ano: p.ano, escopo: nomeDsei || 'todos', nivel: nivel, populacao: popTotal, examinados: ocultarNumero(total), foraDaLista: ocultarNumero(semLista),
    aldeias: Object.keys(p.aldeias).filter(dentro).length, aldeiasComExame: Object.keys(exPorAldeia).filter(dentro).length,
    faixas: FAIXAS_POP.map(function (n, i) {
      return { faixa: n, popF: faixaPopV[i * 2], popM: faixaPopV[i * 2 + 1], exF: ocultarNumero(faixaEx[i * 2]), exM: ocultarNumero(faixaEx[i * 2 + 1]), exNI: ocultarNumero(faixaSemSexo[i]) };
    }),
    grupos: Object.keys(grupos).map(function (k) { const G = grupos[k]; return { nome: G.nome, pop: G.pop, ex: ocultarNumero(G.ex), aldeias: G.aldeias, comExame: G.comExame }; })
      .sort(function (x, y) { return y.pop - x.pop; }),
    tis: Object.keys(porTi).map(function (k) { const T = porTi[k]; return { c: T.c, nome: T.nome, pop: T.pop, ex: ocultarNumero(T.ex) }; }),
    semExame: podeAldeias && nomeDsei ? semExame.slice(0, 60) : null, totalSemExame: semExame.length
  };
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
  if (r.vigilancia) obj(r.vigilancia); if (r.local) obj(r.local); if (r.protese) obj(r.protese);
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

/* ---------- 14. trecho compartilhado com o app, dicionário e utilidades ---------- */
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
    var pr = procsDe(e)[f.proc];
    if (!pr || !(pr.indicado || pr.realizado)) return false;
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

/* ---------- nomes usados na planilha ---------- */
var NOMES_STATUS = {presente: "Presente", nao_erupc: "Não erupcionado", esfoliado: "Esfoliado", ausente: "Ausente por outro motivo", ausente_carie: "Extraído por cárie"};
var NOMES_FACE = {"": "Hígida", ca: "Cárie ativa", cc: "Cárie crônica", mba: "Mancha branca ativa", mbi: "Mancha branca inativa",
  rest: "Restaurada sem cárie", restc: "Restaurada com cárie", sel: "Selante"};
var NOMES_PROC = {exo_carie: "Exodontia devido à cárie", exodontia: "Exodontia por outros motivos", selante: "Selante", art: "ART (restauração atraumática)", civ: "Restauração em ionômero de vidro", resina: "Restauração em resina",
  amalgama: "Restauração em amálgama", verniz: "Verniz fluoretado", cdf: "Cariostático (diamino fluoreto de prata)", selprov: "Selamento provisório / adequação do meio",
  pulpotomia: "Pulpotomia", pulpectomia: "Pulpectomia", coroa: "Coroa de aço"};
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
  "Fendas ou fissuras lábio palatais": "vig_fendas_labio_palatais", "Fluorose dentária moderada ou severa": "vig_fluorose", "Traumatismo dentoalveolar": "vig_traumatismo", "Não identificado": "vig_nao_identificado"};
var COL_FACE = {ca: "carie_ativa", cc: "carie_cronica", mba: "mancha_branca_ativa", mbi: "mancha_branca_inativa", rest: "restaurada_sem_carie", restc: "restaurada_com_carie", sel: "selante"};
var COL_STATUS = {presente: "presentes", nao_erupc: "nao_erupcionados", esfoliado: "esfoliados", ausente: "ausentes_outro_motivo", ausente_carie: "extraidos_carie"};
var CAB_P1 = ["codigo_individuo", "numero_exame", "data_exame", "situacao_registro", "uf", "dsei", "polo_base", "aldeia_comunidade", "municipio", "terra_indigena",
  "codigo_polo_base", "codigo_aldeia", "codigo_municipio_ibge", "codigo_terra_indigena", "local_atendimento", "nascimento", "idade_anos", "faixa_etaria", "sexo", "denticao",
  "classe_risco", "nivel_risco", "ceod_c", "ceod_e", "ceod_o", "ceod", "cpod_c", "cpod_p", "cpod_o", "cpod"]
  .concat(Object.keys(COL_VIG).map(function (k) { return COL_VIG[k]; }))
  .concat(["protese_sup_necessita", "protese_inf_necessita", "protese_sup_usa", "protese_inf_usa", "placa_visivel", "gengivite", "procedimentos_coletivos", "insumos", "observacoes"]);
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
  var prot = function (/** @type {any} */ x) { return pr.naoAvaliado ? "não avaliado" : ({sim: "sim", nao: "não"})[x || ""] || "não avaliado"; };
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
    placa_visivel: sn(e.placa), gengivite: sn(e.gengivite), procedimentos_coletivos: (e.gerais || []).join("; "), insumos: (e.insumos || []).join("; "), observacoes: e.observacoes || "",
    codigo_exame: e.codigo || "", aldeia_fora_da_lista: e.codAldeia ? "não" : (e.aldeia ? "sim" : ""), codigo_confere_local: codigoConfereLocal(e),
    conferencia_vinculo: v.anteriorId ? (v.conferidos && v.conferidos.length ? "compatível, com mudança conferida" : "compatível") : "1º exame",
    alertas_vinculo: (v.conferidos || []).join(" · "), exame_anterior_id: v.anteriorId || "",
    motivo_cancelamento: c.motivo || "", observacao_cancelamento: c.observacao || "", cancelado_em: c.em || "", cancelado_por: c.por || "",
    profissional: (e.profissional || {}).nome || "", cro: (e.profissional || {}).cro || "", criado_em: e.criadoEm || "", atualizado_em: e.atualizadoEm || "", usuario_id: e.usuarioId || ""
  };
  Object.keys(COL_VIG).forEach(function (k) { o[COL_VIG[k]] = sn((e.vigilancia || []).indexOf(k) >= 0); });
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

/* ---------- aba Dicionário: o que é cada coluna ---------- */
const DICIONARIO = [
  ['Exames', 'id_exame', 'Identificador único do exame (gerado pelo app).', 'texto'],
  ['Exames', 'codigo_individuo', 'Identifica a pessoa sem nome nem Cartão SUS. É o mesmo em todos os exames dela e nunca muda. Use esta coluna para ligar os exames de uma mesma pessoa. O prefixo (UF, polo e aldeia) mostra onde foi o PRIMEIRO cadastro, não onde a pessoa mora hoje: para o local atual, use as colunas de local do exame mais recente.', 'UF-POLO-ALDEIA-8 caracteres'],
  ['Exames', 'numero_exame', 'Ordem do exame desta pessoa, pela data do exame. Exames cancelados não contam.', '1, 2, 3…'],
  ['Exames', 'situacao_registro', 'Se o exame vale para análise. Filtre "válido" antes de calcular qualquer indicador.', 'válido · cancelado'],
  ['Exames', 'data_exame', 'Data em que o exame foi feito.', 'AAAA-MM-DD'],
  ['Exames', 'dsei', 'DSEI do atendimento.', 'nome do DSEI'],
  ['Exames', 'usuario_id', 'Identificador do acesso do profissional (aba Usuarios).', 'texto'],
  ['Exames', 'criado_em', 'Quando o exame foi salvo pela primeira vez.', 'data e hora'],
  ['Exames', 'atualizado_em', 'Última alteração do exame.', 'data e hora'],
  ['Exames', 'exame_anterior_id', 'id_exame do exame usado na conferência.', 'texto'],
  ['Exames', 'codigo_exame', 'Código gerado no momento deste exame. No 1º exame é igual ao codigo_individuo.', 'mesmo formato do codigo_individuo'],
  ['Exames', 'uf', 'UF do atendimento.', 'sigla'],
  ['Exames', 'polo_base', 'Polo base do atendimento.', 'texto'],
  ['Exames', 'aldeia_comunidade', 'Aldeia ou comunidade do atendimento.', 'texto'],
  ['Exames', 'municipio', 'Município da aldeia (da lista da SESAI) ou, se a aldeia não estiver na lista, o informado pelo profissional.', 'texto'],
  ['Exames', 'terra_indigena', 'Terra Indígena da aldeia, da planilha de população da SESAI.', 'texto'],
  ['Exames', 'codigo_polo_base', 'Código do polo base na planilha da SESAI.', 'número'],
  ['Exames', 'codigo_aldeia', 'Código da aldeia na planilha da SESAI. Em branco quando a aldeia foi digitada à mão.', 'número'],
  ['Exames', 'codigo_municipio_ibge', 'Código IBGE do município da aldeia, da planilha de população da SESAI.', 'número'],
  ['Exames', 'codigo_terra_indigena', 'Código da Terra Indígena na planilha da SESAI.', 'número'],
  ['Exames', 'local_atendimento', 'Tipo de local onde o atendimento foi feito.', LOCAIS_ATENDIMENTO.join(' · ')],
  ['Exames', 'nascimento', 'Data de nascimento.', 'AAAA-MM-DD'],
  ['Exames', 'idade_anos', 'Idade na data do exame, em anos com uma casa decimal.', 'número'],
  ['Exames', 'faixa_etaria', 'Faixa etária da SESAI na data do exame.', FAIXAS_ETARIAS.join(' · ')],
  ['Exames', 'sexo', 'Sexo informado.', 'F · M · vazio (não informado)'],
  ['Exames', 'denticao', 'Dentição registrada.', 'decidua · mista · permanente'],
  ['Exames', 'classe_risco', 'Classe de risco de cárie pela atividade de doença.', 'A · B · C · D · E · F'],
  ['Exames', 'nivel_risco', 'Nível de risco pela classe, igual para todos: A e B baixo, C e D moderado, E e F alto.', 'Baixo risco · Risco moderado · Alto risco'],
  ['Exames', 'ceod_c', 'Dentes decíduos cariados (c do ceo-d): face com cárie ativa ou crônica, ou restaurada com cárie. Mancha branca não conta.', '0 a 20'],
  ['Exames', 'ceod_e', 'Dentes decíduos com exodontia devido à cárie, indicada ou realizada no exame (e do ceo-d). Decíduo extraído por cárie, esfoliado ou ausente não conta.', '0 a 20'],
  ['Exames', 'ceod_o', 'Dentes decíduos restaurados sem cárie (o do ceo-d).', '0 a 20'],
  ['Exames', 'ceod', 'ceo-d da pessoa: c + e + o. Cada dente conta uma vez, pela pior situação: exodontia devido à cárie > cariado > obturado. Calculado pelo servidor a partir dos dentes.', '0 a 20'],
  ['Exames', 'cpod_c', 'Dentes permanentes cariados (C do CPO-D): face com cárie ativa ou crônica, restaurada com cárie, ou exodontia devido à cárie indicada ou realizada no exame. Mancha branca não conta.', '0 a 32'],
  ['Exames', 'cpod_p', 'Dentes permanentes perdidos (P do CPO-D): extraídos por cárie antes do exame.', '0 a 32'],
  ['Exames', 'cpod_o', 'Dentes permanentes restaurados sem cárie (O do CPO-D).', '0 a 32'],
  ['Exames', 'cpod', 'CPO-D da pessoa: C + P + O. Cada dente conta uma vez, pela pior situação: perdido > cariado > obturado. Calculado pelo servidor a partir dos dentes.', '0 a 32'],
  ['Exames', 'vig_abscesso_dentoalveolar · vig_tecidos_moles · vig_dor_de_dente · vig_fendas_labio_palatais · vig_fluorose · vig_traumatismo · vig_nao_identificado', 'Vigilância em saúde bucal: uma coluna para cada condição. Dor de dente e abscesso vêm dos dentes (o servidor confere).', 'sim · não'],
  ['Exames', 'protese_sup_necessita', 'Necessidade de prótese na arcada superior. "não avaliado" quando não foi possível avaliar.', 'sim · não · não avaliado'],
  ['Exames', 'protese_inf_necessita', 'Necessidade de prótese na arcada inferior.', 'sim · não · não avaliado'],
  ['Exames', 'protese_sup_usa', 'Se a pessoa usa prótese na arcada superior.', 'sim · não · não avaliado'],
  ['Exames', 'protese_inf_usa', 'Se a pessoa usa prótese na arcada inferior.', 'sim · não · não avaliado'],
  ['Exames', 'placa_visivel', 'Placa visível.', 'sim · não'],
  ['Exames', 'gengivite', 'Gengivite (sangramento gengival).', 'sim · não'],
  ['Exames', 'procedimentos_coletivos', 'Procedimentos coletivos e de boca toda realizados.', 'lista separada por ;'],
  ['Exames', 'insumos', 'Insumos de higiene bucal fornecidos.', 'Escova dental; Creme dental; Fio dental'],
  ['Exames', 'observacoes', 'Observações do exame (sem dados que identifiquem a pessoa).', 'texto'],
  ['Exames', 'n_dentes_presentes · n_dentes_nao_erupcionados · n_dentes_esfoliados · n_dentes_ausentes_outro_motivo · n_dentes_extraidos_carie', 'Contas prontas: quantos dentes em cada situação.', 'números'],
  ['Exames', 'n_dentes_<condição> · n_faces_<condição>', 'Contas prontas: quantos dentes têm pelo menos uma face com a condição, e quantas faces no total. Condições: carie_ativa, carie_cronica, mancha_branca_ativa, mancha_branca_inativa, restaurada_sem_carie, restaurada_com_carie, selante.', 'números'],
  ['Exames', 'n_dentes_dor · n_dentes_abscesso_fistula', 'Contas prontas: quantos dentes com dor e com abscesso ou fístula.', 'números'],
  ['Exames', 'n_<tratamento>_indicado · n_<tratamento>_realizado', 'Contas prontas: em quantos dentes cada tratamento foi indicado e em quantos foi realizado. Tratamentos: ' + Object.keys(NOMES_PROC).map(function (k) { return k + ' (' + NOMES_PROC[k] + ')'; }).join(', ') + '.', 'números'],
  ['Exames', 'aldeia_fora_da_lista', 'Se a aldeia foi digitada à mão, por não estar na lista da SESAI.', 'sim · não'],
  ['Exames', 'codigo_confere_local', 'Se o começo do código de acompanhamento (UF-polo-aldeia) bate com o local deste exame. O código nunca muda depois de mostrado: "não" aparece quando a pessoa foi examinada em outra aldeia ou quando o polo ou a aldeia foram corrigidos depois. Serve para conferência, não é erro por si só.', 'sim · não'],
  ['Exames', 'conferencia_vinculo', 'Resultado da conferência dente a dente com o exame anterior da mesma pessoa.', '1º exame · compatível · compatível, com mudança conferida'],
  ['Exames', 'alertas_vinculo', 'Mudanças raras que o dentista conferiu na boca (ex.: restauração que caiu).', 'texto'],
  ['Exames', 'motivo_cancelamento', 'Motivo escolhido por quem cancelou.', MOTIVOS_CANCELAMENTO.join(' · ')],
  ['Exames', 'observacao_cancelamento', 'Explicação do cancelamento (obrigatória em "Outro").', 'texto'],
  ['Exames', 'cancelado_em', 'Data e hora do cancelamento.', 'data e hora'],
  ['Exames', 'cancelado_por', 'Profissional que cancelou (sempre quem fez o exame).', 'texto'],
  ['Exames', 'profissional', 'Nome do cirurgião-dentista que fez o exame.', 'texto'],
  ['Exames', 'cro', 'CRO do profissional.', 'texto'],
  ['Exames', 'resumo_json', 'Resumo do exame para o sistema (Painel e listas), sem o detalhe dos dentes. Não apague.', 'texto do sistema'],
  ['Exames', 'dados_completos_json', 'Todos os dados do exame, usados pelo app. Não precisa usar na análise.', 'JSON'],
  ['_erros', 'data · hora · tipo · acao · quem · detalhe', 'Erros do servidor, com o detalhe técnico. A Administração mostra o motivo em linguagem simples.', 'texto do sistema'],
  ['População', 'codigo_dsei · dsei · codigo_polo_base · polo_base · codigo_aldeia · aldeia', 'Uma linha por aldeia, da planilha de população indígena da SESAI enviada pela coordenação em Administração.', 'texto'],
  ['População', 'codigo_terra_indigena · terra_indigena · codigo_municipio_ibge · municipio · uf', 'Terra Indígena e município da aldeia.', 'texto'],
  ['População', 'ano · populacao_total · F 0 a 4 … M 75 ou mais', 'Ano da população e número de pessoas por sexo (F, M) e faixa etária de 5 anos.', 'número'],
  ['_recuperacoes', 'token_hash · usuario_id · email · criado_em · valido_ate · usado_em', 'Pedidos de "Esqueci meu código". O link vai por e-mail e vale 1 hora; o código só muda quando a pessoa confirma pelo link. O link em si não fica na planilha. Não edite.', 'texto'],
  ['_codigos_reservados', 'codigo · exame_id · dsei · usuario_id · reservado_em', 'Códigos de acompanhamento reservados pelo app antes de serem mostrados ao profissional (quando há internet). Garante que dois aparelhos nunca recebam o mesmo código. Não edite.', 'texto'],
  ['_populacao', 'dados_populacao_json', 'A mesma população em texto, para o app ler rápido. Não edite: é trocada a cada envio.', 'texto'],
  ['Convites', 'id · email · perfil · dsei', 'Convite enviado pela coordenação (referências técnicas e dentistas) ou pela referência técnica (dentistas do DSEI).', 'perfil: rt · dentista'],
  ['Convites', 'situacao', 'Situação do convite. "substituido" é um convite antigo trocado por um mais novo para o mesmo e-mail.', 'pendente · aceito · cancelado · substituido'],
  ['Convites', 'token_hash', 'Resumo do link do convite. O link em si não fica na planilha.', 'texto'],
  ['Convites', 'convidado_por · convidado_por_id · convidado_por_email · criado_em', 'Quem enviou (ou reenviou) o convite e quando.', 'texto'],
  ['Convites', 'valido_ate · aceito_em · usuario_id', 'Até quando o link vale (' + 30 + ' dias), quando foi aceito e o id da pessoa na aba Usuarios.', 'AAAA-MM-DD · data e hora · texto'],
  ['Acoes', 'id · nome · dsei', 'Ação do Dia B criada pela coordenação.', 'texto'],
  ['Acoes', 'aldeias', 'Aldeias ou comunidades da ação, separadas por ;. Em branco: todas as aldeias do DSEI.', 'texto'],
  ['Acoes', 'data_inicio · data_fim', 'Período da ação. Os exames feitos no DSEI, nas aldeias e nesse período entram na ação sozinhos.', 'AAAA-MM-DD'],
  ['Acoes', 'situacao · criada_por · criada_em · cancelada_por · cancelada_em', 'Situação da ação e quem criou ou cancelou.', 'ativa · cancelada'],
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
function escreverDicionario(ss) { reescreverAba(ss, 'Dicionário', CAB_DICIONARIO, DICIONARIO, 4); }

/* ---------- utilidades ---------- */
function obterAba(planilha, nome, cabecalho) {
  const cache = MEMO && planilha === MEMO.ss ? (MEMO.abas = MEMO.abas || {}) : null;
  if (cache && cache[nome]) return cache[nome];
  /** @type {any} */ let aba = planilha.getSheetByName(nome);
  if (aba && aba.getLastRow() > 0) {
    const atual = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
    const compativel = atual.every(function (c, i) { return c === '' || c === cabecalho[i]; });
    if (!compativel) {
      // Cabeçalho diferente do esperado: a aba é guardada com outro nome (nada se perde) e uma nova é criada.
      aba.setName(nome + ' - formato antigo ' + Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd HH-mm'));
      aba = null;
    }
  }
  // Duas requisições ao mesmo tempo podem tentar criar a mesma aba: se outra já criou, usa a que existe.
  if (!aba) { try { aba = planilha.insertSheet(nome); } catch (x) { aba = planilha.getSheetByName(nome); if (!aba) throw x; } }
  if (aba.getLastRow() === 0 || aba.getLastColumn() < cabecalho.length) {
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  if (cache) cache[nome] = aba;
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
  const txt = JSON.stringify(obj, function (k, v) { return k.charAt(0) === '_' ? undefined : v; });
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}
