// Simulador do Google Apps Script para testar o Codigo.gs no computador ou no GitHub (sem Google, sem dados reais).
// Imita só o que o Codigo.gs usa: planilha, propriedades, trava, e-mail, cache, Drive (backup) e gatilhos.
// Também anota toda célula gravada que o Google Sheets leria como fórmula, para os testes conferirem.
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");

const G_blob = buf => ({ getBytes: () => [...buf].map(b => b > 127 ? b - 256 : b), getDataAsString: () => buf.toString("utf8"), _buf: buf });
function criar(opcoes) {
  opcoes = opcoes || {};
  const est = { sheets: {}, order: [], props: Object.assign({}, opcoes.props || {}), mails: [], cache: {}, leituras: {}, escritas: {}, falharEscrita: null, backups: [], formulas: [], falharBackup: false, triggers: [] };
  const rows = n => est.sheets[n];
  const ehFormula = v => typeof v === "string" && /^[=+\-@]/.test(v) && v.length > 1;
  const gravar = (nome, r, c, v) => { if (ehFormula(v)) est.formulas.push({ aba: nome, linha: r, coluna: c, valor: v }); return v; };
  est.max = {};
  const maxDe = n => (est.max[n] = est.max[n] || { r: 1000, c: 26 });
  function aba(nome0) {
    const self = {
      _nome: nome0,
      getName: () => self._nome,
      setName: n => { const R = est.sheets[self._nome]; delete est.sheets[self._nome]; est.sheets[n] = R; est.order = est.order.map(x => x === self._nome ? n : x); self._nome = n; return self; },
      getLastRow: () => { const R = rows(self._nome); let n = R.length; while (n > 0 && (R[n - 1] || []).every(x => x === "" || x == null)) n--; return n; },
      getLastColumn: () => Math.max(0, ...rows(self._nome).map(r => r.length)),
      getDataRange: () => self.getRange(1, 1, Math.max(1, self.getLastRow()), Math.max(1, self.getLastColumn())),
      getRange: (r, c, nr, nc) => {
        nr = nr || 1; nc = nc || 1;
        const rg = {
          // Como no Google Sheets: um texto gravado com apóstrofo na frente (proteção contra fórmula) é lido sem ele.
          getValues: () => (r > 1 && (est.leituras[self._nome] = (est.leituras[self._nome] || 0) + nr * nc), 0) || Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (rows(self._nome)[r - 1 + i] || [])[c - 1 + j]; return v == null ? "" : typeof v === "string" && v[0] === "'" ? v.slice(1) : v; })),
          setValues: v => { est.escritas[self._nome] = (est.escritas[self._nome] || 0) + 1; if (est.falharEscrita === self._nome) throw new Error("Serviço indisponível (simulado)"); if (v.length !== nr || v.some(l => l.length !== nc)) throw new Error("setValues: tamanho diferente do intervalo"); v.forEach((l, i) => { const R = rows(self._nome); while (R.length < r + i) R.push([]); l.forEach((x, j) => { R[r - 1 + i][c - 1 + j] = gravar(self._nome, r + i, c + j, x instanceof Date ? x.toISOString() : x); }); }); return rg; },
          setValue: x => rg.setValues([[x]]),
          setFontWeight: () => rg
        };
        return rg;
      },
      appendRow: l => { const R = rows(self._nome); const n = self.getLastRow(); R.length = n; R.push(l.map((x, j) => gravar(self._nome, n + 1, j + 1, x instanceof Date ? x.toISOString() : x))); return self; },
      insertRowAfter: i => { rows(self._nome).splice(i, 0, []); return self; },
      insertRowsAfter: (i, n) => { rows(self._nome).splice(i, 0, ...Array.from({ length: n }, () => [])); return self; },
      deleteRows: (i, n) => { rows(self._nome).splice(i - 1, n); const m = maxDe(self._nome); m.r = Math.max(1, m.r - n); return self; },
      // Como no Google: a aba nasce com 1000 linhas e 26 colunas (contam no limite de células mesmo vazias).
      getMaxRows: () => Math.max(maxDe(self._nome).r, rows(self._nome).length),
      getMaxColumns: () => { let c = maxDe(self._nome).c; for (const l of rows(self._nome)) if (l.length > c) c = l.length; return c; },
      deleteColumns: (i, n) => { const m = maxDe(self._nome); m.c = Math.max(1, m.c - n); rows(self._nome).forEach(l => l.splice(i - 1, n)); return self; },
      setFrozenRows: () => self
    };
    return self;
  }
  const planilha = {
    getId: () => "planilha-teste",
    getSheetByName: n => est.sheets[n] ? aba(n) : null,
    getSheets: () => est.order.map(aba),
    insertSheet: n => { if (est.sheets[n]) throw new Error("aba já existe: " + n); est.sheets[n] = []; est.order.push(n); return aba(n); },
    deleteSheet: a => { delete est.sheets[a.getName()]; est.order = est.order.filter(x => x !== a.getName()); },
    setActiveSheet: a => { planilha._ativa = a.getName(); return a; },
    moveActiveSheet: pos => { const n = planilha._ativa; est.order = est.order.filter(x => x !== n); est.order.splice(pos - 1, 0, n); }
  };
  est.extras = {};
  // Planilha separada (ex.: arquivo de acessos): guarda as abas em est.extras[id].abas.
  function criarExtra(nome, id) {
    const abas = {}, ordem = [], maxx = {}, ids = {}; let proxId = 1;
    const ultima = n => { const R = abas[n]; let k = R.length; while (k > 0 && (R[k - 1] || []).every(x => x === "" || x == null)) k--; return k; };
    const mk = n => {
      const sh = { getName: () => n, getSheetId: () => ids[n], getLastRow: () => ultima(n),
        insertRowsAfter: (i, k) => { maxx[n].r = sh.getMaxRows() + k; return sh; },
        insertColumnsAfter: (i, k) => { maxx[n].c = sh.getMaxColumns() + k; return sh; }, getLastColumn: () => abas[n].reduce((m, l) => Math.max(m, l.length), 0),
        getMaxRows: () => Math.max(maxx[n].r, abas[n].length), getMaxColumns: () => Math.max(maxx[n].c, sh.getLastColumn()),
        deleteRows: (i, k) => { abas[n].splice(i - 1, k); maxx[n].r = Math.max(1, sh.getMaxRows() - k); },
        deleteColumns: (i, k) => { maxx[n].c = Math.max(1, maxx[n].c - k); },
        getRange: (r, c, nr, nc) => ({ getValues: () => Array.from({ length: nr || 1 }, (_, i) => Array.from({ length: nc || 1 }, (_, j) => { const v = (abas[n][r - 1 + i] || [])[c - 1 + j]; return v == null ? "" : typeof v === "string" && v[0] === "'" ? v.slice(1) : v; })),
          setValues: v => { if (r - 1 + v.length > sh.getMaxRows() || c - 1 + (v[0] || []).length > sh.getMaxColumns()) throw new Error("Esta ação adicionaria células além do tamanho da aba (simulado)"); v.forEach((l, i) => { while (abas[n].length < r + i) abas[n].push([]); l.forEach((x, j) => { abas[n][r - 1 + i][c - 1 + j] = x; }); }); return { setFontWeight() {} }; }, setFontWeight() {},
          clearContent: () => { for (let i = 0; i < (nr || 1); i++) if (abas[n][r - 1 + i]) for (let j = 0; j < (nc || 1); j++) abas[n][r - 1 + i][c - 1 + j] = ""; } }),
        setFrozenRows() {}, appendRow: l => { abas[n].push(l); },
        setName: novo => { abas[novo] = abas[n]; maxx[novo] = maxx[n]; ids[novo] = ids[n]; delete abas[n]; delete maxx[n]; delete ids[n]; ordem[ordem.indexOf(n)] = novo; n = novo; return sh; } };
      return sh;
    };
    const ss = { nome, abas, ordem, getId: () => id, getName: () => nome, getUrl: () => "https://docs.google.com/spreadsheets/d/" + id,
      getSheetByName: n => abas[n] ? mk(n) : null,
      insertSheet: n => { abas[n] = []; maxx[n] = { r: 1000, c: 26 }; ids[n] = proxId++; ordem.push(n); return mk(n); },
      getSheets: () => ordem.map(mk),
      deleteSheet: a => { const n = a && a.getName ? a.getName() : a; delete abas[n]; delete maxx[n]; const i = ordem.indexOf(n); if (i >= 0) ordem.splice(i, 1); },
      setActiveSheet: a => { ss._ativa = a.getName(); return a; },
      moveActiveSheet: pos => { const n = ss._ativa; ordem.splice(ordem.indexOf(n), 1); ordem.splice(pos - 1, 0, n); } };
    if (opcoes.folhaPadrao !== false) ss.insertSheet("Página1");
    return ss;
  }
  const iter = l => { let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; };
  const pastas = {};
  const pasta = nome => (pastas[nome] = pastas[nome] || { nome, arquivos: [], setSharing() {}, setDescription() {}, getFiles: () => iter(pastas[nome].arquivos.filter(f => !f.lixo)) });
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => planilha, flush() {},
      create: nome => { const id = "planilha-" + (Object.keys(est.extras).length + 1); est.extras[id] = criarExtra(nome, id); return est.extras[id]; },
      openById: id => { if (!est.extras[id]) throw new Error("planilha não encontrada"); return est.extras[id]; } },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => est.props[k] == null ? null : String(est.props[k]),
      setProperty: (k, v) => { est.props[k] = String(v); },
      deleteProperty: k => { delete est.props[k]; },
      getProperties: () => Object.assign({}, est.props) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => !est.travaOcupada, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({
      get: k => { const x = est.cache[k]; return x && x.exp > Date.now() ? x.v : null; },
      put: (k, v, t) => { est.cache[k] = { v: String(v), exp: Date.now() + (t || 600) * 1000 }; },
      putAll: (m, t) => { for (const k in m) { if (String(m[k]).length > 100000) throw new Error("valor grande demais para a memória (simulado)"); est.cache[k] = { v: String(m[k]), exp: Date.now() + (t || 600) * 1000 }; } },
      getAll: ks => { const r = {}; ks.forEach(k => { const x = est.cache[k]; if (x && x.exp > Date.now()) r[k] = x.v; }); return r; },
      remove: k => { delete est.cache[k]; } }) },
    MailApp: { sendEmail: o => { if (est.falharEmail) throw new Error("cota de e-mail"); est.mails.push(typeof o === "string" ? { to: arguments[0] } : o); }, getRemainingDailyQuota: () => 100 },
    DriveApp: {
      Access: { PRIVATE: "PRIVATE" }, Permission: { NONE: "NONE" },
      getFoldersByName: n => iter(pastas[n] ? [pastas[n]] : []),
      createFolder: n => pasta(n),
      getFileById: () => ({ moveTo() {}, makeCopy: (nome, p) => {
        if (est.falharBackup) throw new Error("Drive indisponível (simulado)");
        const f = { nome, criado: new Date(), lixo: false, getName: () => nome, getDateCreated: () => f.criado, setTrashed: v => { f.lixo = v; } };
        p.arquivos.push(f); est.backups.push({ nome, copia: JSON.parse(JSON.stringify(est.sheets)) }); return f; } })
    },
    ScriptApp: { WeekDay: { MONDAY: 1 }, getProjectTriggers: () => est.triggers, deleteTrigger: t => { est.triggers = est.triggers.filter(x => x !== t); },
      newTrigger: fn => { const t = { fn, timeBased: () => t, onWeekDay: () => t, atHour: () => t, everyDays: () => t, create: () => { est.triggers.push(t); return t; }, getHandlerFunction: () => fn }; return t; } },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: s => ({ setMimeType: () => ({ t: s, getContent: () => s }) }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => "dona@teste.org" }), getScriptTimeZone: () => "America/Sao_Paulo" },
    Utilities: {
      computeDigest: (alg, s) => [...crypto.createHash("sha256").update(s).digest()].map(b => b > 127 ? b - 256 : b),
      base64Encode: b => Buffer.from(b.map(x => x & 255)).toString("base64"),
      getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 1 },
      // Blobs e compressão (para a memória rápida): bytes com sinal, como no Google.
      newBlob: (dados, tipo) => { const buf = typeof dados === "string" ? Buffer.from(dados, "utf8") : Buffer.from(dados.map(x => x & 255));
        return { getBytes: () => [...buf].map(b => b > 127 ? b - 256 : b), getDataAsString: () => buf.toString("utf8"), getContentType: () => tipo || null, _buf: buf }; },
      gzip: blob => { const z = require("zlib").gzipSync(blob._buf); return G_blob(z); },
      ungzip: blob => G_blob(require("zlib").gunzipSync(blob._buf)),
      base64Decode: s => [...Buffer.from(s, "base64")].map(b => b > 127 ? b - 256 : b),
      formatDate: (d, tz, f) => {
        const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d).map(x => [x.type, x.value]));
        return (f || "yyyy-MM-dd HH-mm").replace("yyyy", p.year).replace("MM", p.month).replace("dd", p.day).replace("HH", p.hour).replace("mm", p.minute).replace("ss", p.second);
      }
    },
    Logger: { log: m => { if (process.env.LOG) console.log("  " + m); } },
    console, Date, JSON, Math, String, Number, Object, Array, RegExp, Error, Intl
  };
  // Opcional: conta cada chamada aos serviços do Google (para achar o que deixa um pedido lento).
  if (opcoes.contar) {
    est.chamadas = {};
    const embrulhar = (o, nome) => o && typeof o === "object" && !Array.isArray(o) && !(o instanceof Date) ? new Proxy(o, { get(t, k) {
      const v = t[k]; if (typeof v !== "function") return v;
      return (...a) => { const n = nome + "." + String(k); est.chamadas[n] = (est.chamadas[n] || 0) + 1; return embrulhar(v.apply(t, a), String(k)); }; } }) : o;
    ["SpreadsheetApp", "CacheService", "PropertiesService", "LockService"].forEach(k => { ctx[k] = embrulhar(ctx[k], k); });
  }
  vm.createContext(ctx);
  const arquivo = opcoes.codigo || process.env.CODIGO || path.join(__dirname, "..", "Codigo.gs");
  vm.runInContext(fs.readFileSync(arquivo, "utf8"), ctx, { filename: "Codigo.gs" });
  return {
    ctx, est,
    post: d => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(d) } }).t),
    get: () => JSON.parse(ctx.doGet().t)
  };
}
module.exports = criar;
