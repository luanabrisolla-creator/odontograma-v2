/**
 * Banco de dados do Odontograma (Google Planilhas) - versão 10: acesso individual por perfil.
 * Cole este código em: Planilha > Extensões > Apps Script (substituindo o anterior).
 * Depois: Implantar > Gerenciar implantações > lápis > Versão: Nova versão > Implantar.
 * Na primeira vez, o Google pede autorização para enviar e-mails em seu nome: aceite.
 *
 * Perfis: cirurgião-dentista, referência técnica (RT) do DSEI e coordenação.
 * - A coordenação entra com o e-mail da conta dona desta planilha e com a CHAVE_COORDENACAO abaixo.
 * - A coordenação aprova as referências técnicas; cada RT aprova os dentistas do seu DSEI.
 * - Em DSEI sem RT ativa, os pedidos de dentistas vão para a coordenação.
 * - Ao aprovar, o código de acesso pessoal vai por e-mail automaticamente.
 */
const CHAVE_COORDENACAO = 'TROQUE-POR-UMA-CHAVE-SUA';
const EMAIL_COORDENACAO = ''; // vazio = e-mail da conta dona da planilha
const NOME_APP = 'Odontograma · SESAI';

// Recortes com 1 a 4 pessoas aparecem como "<5" no painel, para proteger a identidade.
const MINIMO = 5;

const CAB_USUARIOS = ['id', 'nome', 'cro', 'email', 'uf', 'dsei', 'polo', 'perfil', 'status', 'codigo_hash', 'pedido_em', 'aprovado_por', 'aprovado_em', 'ultimo_acesso'];
const CAB_ACESSOS = ['quando', 'email', 'nome', 'acao', 'detalhe'];
const NOME_PERFIL = { dentista: 'cirurgião-dentista', rt: 'referência técnica', coord: 'coordenação' };

function doGet() {
  return saida({ ok: true, mensagem: 'Servidor do odontograma ativo', versao: 10 });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (x) { return saida({ ok: false, erro: 'Pedido inválido.' }); }
  if (!d.acao) return saida({ ok: false, erro: 'Esta versão do app está desatualizada. Abra o app com internet e recarregue a página para receber a versão com acesso individual.' });
  const A = ACOES[d.acao];
  if (!A) return saida({ ok: false, erro: 'Ação desconhecida: ' + d.acao });
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
  substituirRT:   { perfis: ['coord'], escreve: true, fn: substituirRT }
};

/* ---------- usuários ---------- */
const normEmail = s => String(s || '').trim().toLowerCase();
const normCro = s => String(s || '').replace(/\D/g, '') || String(s || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
function emailCoord() { return normEmail(EMAIL_COORDENACAO || Session.getEffectiveUser().getEmail()); }
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
function salvarUsuario(u) {
  const aba = obterAba(planilha(), 'Usuarios', CAB_USUARIOS);
  const linha = CAB_USUARIOS.map(function (k) { return u[k] == null ? '' : u[k]; });
  if (u._linha) aba.getRange(u._linha, 1, 1, linha.length).setValues([linha]);
  else { aba.appendRow(linha); u._linha = aba.getLastRow(); }
}
function publico(u) {
  const o = {};
  ['id', 'nome', 'cro', 'email', 'uf', 'dsei', 'polo', 'perfil', 'status', 'pedido_em', 'aprovado_por', 'aprovado_em', 'ultimo_acesso'].forEach(function (k) { o[k] = u[k] || ''; });
  return o;
}
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
function autenticar(d) {
  const email = normEmail(d.email), cod = String(d.codigo || '').trim();
  if (!email || !cod) return null;
  if (email === emailCoord() && cod === CHAVE_COORDENACAO && CHAVE_COORDENACAO !== 'TROQUE-POR-UMA-CHAVE-SUA') {
    return { id: 'coord', nome: 'Coordenação', email: email, perfil: 'coord', dsei: '', uf: '', cro: '', polo: '', status: 'ativo' };
  }
  const h = hashCodigo(cod);
  const u = lerUsuarios().filter(function (x) { return normEmail(x.email) === email && x.status === 'ativo' && x.codigo_hash === h; })[0];
  if (!u) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  if (String(u.ultimo_acesso).slice(0, 10) !== hoje) { u.ultimo_acesso = new Date().toISOString(); salvarUsuario(u); }
  return u;
}
function registrar(u, acao, detalhe) {
  try { obterAba(planilha(), 'Acessos', CAB_ACESSOS).appendRow([new Date(), u.email || '', u.nome || '', acao, detalhe || '']); } catch (x) {}
}
function rtsDo(dsei) { return lerUsuarios().filter(function (x) { return x.perfil === 'rt' && x.status === 'ativo' && x.dsei === dsei; }); }
function podeGerir(u, alvo) {
  if (u.perfil === 'coord') return true;
  return u.perfil === 'rt' && alvo.perfil === 'dentista' && alvo.dsei === u.dsei && alvo.id !== u.id;
}

/* ---------- e-mails ---------- */
function enviarEmail(para, assunto, texto) {
  try { MailApp.sendEmail({ to: para, subject: assunto, body: texto, name: NOME_APP }); return true; } catch (x) { return false; }
}
function emailCodigo(u, codigo, link, novo) {
  return enviarEmail(u.email, novo ? 'Seu novo código de acesso ao Odontograma' : 'Seu acesso ao Odontograma foi aprovado',
    'Olá, ' + u.nome + '.\n\n' +
    (novo ? 'Foi gerado um novo código de acesso para você. O código anterior deixou de funcionar.\n\n'
          : 'Seu acesso como ' + NOME_PERFIL[u.perfil] + (u.dsei ? ' do DSEI ' + u.dsei : '') + ' foi aprovado.\n\n') +
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
function autorDe(r) { return r.usuarioId || ''; }
function ehDoUsuario(r, u) {
  if (r.usuarioId) return r.usuarioId === u.id;
  return !!u.cro && normCro((r.profissional || {}).cro) === normCro(u.cro);
}
function enviarExame(d, u) {
  if (!d.id || !d.linhaExame || !d.cabecalhoExame) return { ok: false, erro: 'Exame incompleto.' };
  const exames = obterAba(planilha(), 'Exames', d.cabecalhoExame);
  const dentes = obterAba(planilha(), 'Dentes', d.cabecalhoDentes);
  const iJson = d.cabecalhoExame.indexOf('dados_completos_json');
  // Só quem fez o exame pode alterá-lo (a coordenação também pode).
  const anterior = lerExames().filter(function (r) { return r.id === d.id; })[0];
  if (anterior && u.perfil !== 'coord' && !ehDoUsuario(anterior, u)) return { ok: false, erro: 'Só o profissional que fez este exame pode alterá-lo.' };
  const linha = d.linhaExame.slice();
  let reg = {};
  try { reg = JSON.parse(linha[iJson]); } catch (x) {}
  if (u.perfil !== 'coord') {
    reg.profissional = { nome: u.nome, cro: u.cro };
    const ip = d.cabecalhoExame.indexOf('profissional'), ic = d.cabecalhoExame.indexOf('cro');
    if (ip >= 0) linha[ip] = u.nome;
    if (ic >= 0) linha[ic] = u.cro;
  }
  reg.usuarioId = u.id;
  linha[iJson] = JSON.stringify(reg);
  const iu = d.cabecalhoExame.indexOf('usuario_id');
  if (iu >= 0) linha[iu] = u.id;
  removerLinhas(exames, d.id);
  removerLinhas(dentes, d.id);
  exames.appendRow(linha);
  if (d.linhasDentes && d.linhasDentes.length) {
    dentes.getRange(dentes.getLastRow() + 1, 1, d.linhasDentes.length, d.linhasDentes[0].length).setValues(d.linhasDentes);
  }
  return { ok: true, id: d.id };
}
function meusExames(d, u) {
  const l = lerExames().filter(function (r) { return ehDoUsuario(r, u); })
    .sort(function (a, b) { return String(b.atualizadoEm || '').localeCompare(String(a.atualizadoEm || '')); }).slice(0, 1000);
  return { ok: true, exames: l };
}
function verExame(d, u) {
  const r = lerExames().filter(function (x) { return x.id === d.id; })[0];
  if (!r) return { ok: false, erro: 'Exame não encontrado.' };
  const pode = u.perfil === 'coord' || ehDoUsuario(r, u) || (u.perfil === 'rt' && r.dsei === u.dsei);
  if (!pode) return { ok: false, erro: 'Você não tem acesso a este exame.' };
  if (!ehDoUsuario(r, u)) registrar(u, 'Viu um exame', (r.codigo || r.id) + ' · DSEI ' + r.dsei);
  return { ok: true, exame: r };
}
function equipe(d, u) {
  const dsei = u.perfil === 'rt' ? u.dsei : String(d.dsei || '');
  if (!dsei) return { ok: false, erro: 'Escolha o DSEI.' };
  const us = lerUsuarios().filter(function (x) { return x.dsei === dsei && x.status !== 'recusado'; });
  const regs = lerExames();
  const mes = new Date().toISOString().slice(0, 7);
  const membros = us.filter(function (x) { return x.status !== 'pendente'; }).map(function (x) {
    const meus = regs.filter(function (r) { return ehDoUsuario(r, x); });
    const ult = meus.reduce(function (m, r) { const t = String(r.atualizadoEm || r.dataExame || ''); return t > m ? t : m; }, '');
    return Object.assign(publico(x), { total: meus.length, mes: meus.filter(function (r) { return String(r.dataExame || '').slice(0, 7) === mes; }).length, ultimoEnvio: ult });
  });
  const nomePor = {};
  us.forEach(function (x) { nomePor[x.id] = x.nome; });
  const exames = regs.filter(function (r) { return r.dsei === dsei; })
    .sort(function (a, b) { return String(b.dataExame || '').localeCompare(String(a.dataExame || '')); }).slice(0, 500)
    .map(function (r) { return { id: r.id, codigo: r.codigo || '', dataExame: r.dataExame, profissional: nomePor[r.usuarioId] || (r.profissional || {}).nome || '', usuarioId: r.usuarioId || '',
      idade: r.idadeAnos, classe: (r.resultado || {}).classe || '', ceod: ((r.resultado || {}).ceod || {}).total, cpod: ((r.resultado || {}).cpod || {}).total }; });
  const pedidos = us.filter(function (x) { return x.status === 'pendente' && (x.perfil === 'dentista' || u.perfil === 'coord'); }).map(publico);
  registrar(u, 'Consultou a equipe', 'DSEI ' + dsei);
  return { ok: true, dsei: dsei, membros: membros, pedidos: pedidos, exames: exames };
}
function alvoDe(d) { return lerUsuarios().filter(function (x) { return x.id === d.id; })[0]; }
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
function mudarStatus(d, u, status) {
  const a = alvoDe(d);
  if (!a || a.status === 'pendente') return { ok: false, erro: 'Usuário não encontrado.' };
  if (!podeGerir(u, a)) return { ok: false, erro: 'Você não pode alterar este acesso.' };
  a.status = status; salvarUsuario(a);
  registrar(u, status === 'ativo' ? 'Reativou acesso' : 'Desativou acesso', a.nome + ' · DSEI ' + a.dsei);
  return { ok: true };
}
function novoCodigoPara(d, u) {
  const a = alvoDe(d);
  if (!a || a.status !== 'ativo') return { ok: false, erro: 'O acesso precisa estar ativo.' };
  if (!podeGerir(u, a)) return { ok: false, erro: 'Você não pode alterar este acesso.' };
  const c = gerarCodigo(); a.codigo_hash = hashCodigo(c); salvarUsuario(a);
  const foi = emailCodigo(a, c, d.link, true);
  registrar(u, 'Gerou novo código', a.nome);
  return { ok: true, emailEnviado: foi, codigo: foi ? '' : c };
}
function admin(d, u) {
  const us = lerUsuarios().filter(function (x) { return x.status !== 'recusado'; });
  const aba = obterAba(planilha(), 'Acessos', CAB_ACESSOS);
  const n = aba.getLastRow() - 1;
  const acessos = n > 0 ? aba.getRange(Math.max(2, aba.getLastRow() - 199), 1, Math.min(n, 200), CAB_ACESSOS.length).getValues().reverse()
    .map(function (l) { return [l[0] instanceof Date ? l[0].toISOString() : String(l[0]), l[1], l[2], l[3], l[4]]; }) : [];
  const dseisRT = {};
  us.forEach(function (x) { if (x.perfil === 'rt' && x.status === 'ativo') (dseisRT[x.dsei] = dseisRT[x.dsei] || []).push(x.nome); });
  const qtdEquipe = {};
  us.forEach(function (x) { if (x.status === 'ativo') qtdEquipe[x.dsei] = (qtdEquipe[x.dsei] || 0) + 1; });
  return { ok: true, usuarios: us.map(publico), acessos: acessos, dseisRT: dseisRT, qtdEquipe: qtdEquipe };
}
function substituirRT(d, u) {
  const us = lerUsuarios(), antiga = us.filter(function (x) { return x.id === d.antigaId; })[0];
  if (!antiga || antiga.perfil !== 'rt') return { ok: false, erro: 'Referência técnica não encontrada.' };
  let nova = null, foi = true, cod = '';
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
  return Object.keys(porId).map(function (k) { return porId[k]; });
}

/* ---------- painel: só números agregados, nunca dados individuais ---------- */
function painel(p, u) {
  const regs = lerExames();
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

  return { ok: true, versao: 10, geradoEm: new Date().toISOString(), dseis: Object.keys(porDsei).sort(),
           totalExames: regs.length, participantes: Object.keys(profs).length,
           resumo: blocos.resumo, blocos: blocos, filtros: filtros, comparacao: comparacao };
}

function ocultarNumero(v) { return typeof v === 'number' && v > 0 && v < MINIMO ? '<5' : v; }

function ocultar(r) {
  if (r.n > 0 && r.n < MINIMO) return { n: '<5', poucos: true };
  function obj(x) { Object.keys(x).forEach(function (k) { x[k] = ocultarNumero(x[k]); }); }
  // Índice de um grupo: só aparece com 5 pessoas ou mais (senão, só o "<5").
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

/* ---------- Painel: código compartilhado (o mesmo no app e no Codigo.gs da planilha) ---------- */
// Faixas etárias da SESAI (Ficha 4)
var FAIXAS_ETARIAS = ["0 a 5 anos", "6 a 11 anos", "12 a 18 anos", "Adulto (19 a 59 anos)", "Pessoa idosa (60 anos ou mais)", "Idade não informada"];
function faixaEtaria(i) {
  if (i === "" || i == null || isNaN(Number(i))) return FAIXAS_ETARIAS[5];
  i = Math.floor(Number(i));
  return i <= 5 ? FAIXAS_ETARIAS[0] : i <= 11 ? FAIXAS_ETARIAS[1] : i <= 18 ? FAIXAS_ETARIAS[2] : i <= 59 ? FAIXAS_ETARIAS[3] : FAIXAS_ETARIAS[4];
}
function sexoDe(e) { return e.crianca && (e.crianca.sexo === "F" || e.crianca.sexo === "M") ? e.crianca.sexo : "NI"; }
// Filtro cruzado: faixa, sexo, classe, proc (procedimento por dente) e coletivo. "exceto" ignora algumas dimensões.
function exameCombina(e, f, exceto) {
  exceto = exceto || [];
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
function montarPainel(regs, f, agrup) {
  function ag(exceto) { return agregarExames(regs.filter(function (e) { return exameCombina(e, f, exceto); }), agrup); }
  return {resumo: ag([]), risco: ag(["classe"]), tabela: ag(["faixa", "sexo", "classe"]), faixa: ag(["faixa"]), proc: ag(["proc"]), coletivo: ag(["coletivo"])};
}
function agregarExames(regs, agrup) {
  var CL = ["A", "B", "C", "D", "E", "F"], FX = FAIXAS_ETARIAS;
  function nivel(c) {
    var i = CL.indexOf(c);
    if (agrup === "tres") return i < 2 ? "Baixo" : i < 4 ? "Moderado" : "Alto";
    return i < 3 ? "Baixo" : "Alto";
  }
  function zeros(ks) { var o = {}; ks.forEach(function (k) { o[k] = 0; }); return o; }
  function idxVazio() { return {n: 0, soma: 0, c: 0, e: 0, p: 0, o: 0}; }
  function somar(alvo, ind, perdido) { alvo.n++; alvo.soma += Number(ind.total) || 0; alvo.c += Number(ind.c) || 0; alvo[perdido] += Number(ind[perdido]) || 0; alvo.o += Number(ind.o) || 0; }
  var r = {n: 0, sexo: zeros(["F", "M", "NI"]), classe: zeros(CL), nivel: zeros(["Baixo", "Moderado", "Alto"]), faixas: {}, meses: {},
    ceod: idxVazio(), cpod: idxVazio(), cpod12: {soma: 0, n: 0}, procs: {}, gerais: {}, insumos: {}, placa: 0, gengivite: 0, fluorose: 0, procsRealizados: 0};
  FX.forEach(function (f) { r.faixas[f] = {n: 0, sexo: zeros(["F", "M", "NI"]), classe: zeros(CL), ceod: idxVazio(), cpod: idxVazio()}; });
  regs.forEach(function (e) {
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
    (e.gerais || []).forEach(function (g) { r.gerais[g] = (r.gerais[g] || 0) + 1; });
    (e.insumos || []).forEach(function (g) { r.insumos[g] = (r.insumos[g] || 0) + 1; });
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
  function media(o) { return o.n ? Math.round(o.soma / o.n * 100) / 100 : null; }
  r.ceodMedia = media(r.ceod); r.cpodMedia = media(r.cpod); r.cpod12Media = media(r.cpod12);
  var m = r.cpod12Media == null ? null : Math.round(r.cpod12Media * 10) / 10;
  r.cpod12Severidade = m == null ? null : m <= 1.1 ? "Muito baixa" : m <= 2.6 ? "Baixa" : m <= 4.4 ? "Moderada" : m <= 6.5 ? "Alta" : "Muito alta";
  return r;
}

/* ---------- utilidades ---------- */
function obterAba(planilha, nome, cabecalho) {
  let aba = planilha.getSheetByName(nome);
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

function removerLinhas(aba, id) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return;
  const ids = aba.getRange(2, 1, ultima - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === String(id)) aba.deleteRow(i + 2);
  }
}

function saida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
