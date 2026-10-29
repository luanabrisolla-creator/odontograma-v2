// Simulador do Google Apps Script para testar o Codigo.gs no computador ou no GitHub (sem Google, sem dados reais).
// Imita só o que o Codigo.gs usa: planilha, propriedades, trava, e-mail, cache, Drive (backup) e gatilhos.
// Também anota toda célula gravada que o Google Sheets leria como fórmula, para os testes conferirem.
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");

function criar(opcoes) {
  opcoes = opcoes || {};
  const est = { sheets: {}, order: [], props: Object.assign({}, opcoes.props || {}), mails: [], cache: {}, backups: [], formulas: [], falharBackup: false, triggers: [] };
  const rows = n => est.sheets[n];
  const ehFormula = v => typeof v === "string" && /^[=+\-@]/.test(v) && v.length > 1;
  const gravar = (nome, r, c, v) => { if (ehFormula(v)) est.formulas.push({ aba: nome, linha: r, coluna: c, valor: v }); return v; };
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
          getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (rows(self._nome)[r - 1 + i] || [])[c - 1 + j]; return v == null ? "" : typeof v === "string" && v[0] === "'" ? v.slice(1) : v; })),
          setValues: v => { if (v.length !== nr || v.some(l => l.length !== nc)) throw new Error("setValues: tamanho diferente do intervalo"); v.forEach((l, i) => { const R = rows(self._nome); while (R.length < r + i) R.push([]); l.forEach((x, j) => { R[r - 1 + i][c - 1 + j] = gravar(self._nome, r + i, c + j, x instanceof Date ? x.toISOString() : x); }); }); return rg; },
          setValue: x => rg.setValues([[x]]),
          setFontWeight: () => rg
        };
        return rg;
      },
      appendRow: l => { const R = rows(self._nome); const n = self.getLastRow(); R.length = n; R.push(l.map((x, j) => gravar(self._nome, n + 1, j + 1, x instanceof Date ? x.toISOString() : x))); return self; },
      insertRowAfter: i => { rows(self._nome).splice(i, 0, []); return self; },
      deleteRows: (i, n) => { rows(self._nome).splice(i - 1, n); return self; },
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
  const iter = l => { let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; };
  const pastas = {};
  const pasta = nome => (pastas[nome] = pastas[nome] || { nome, arquivos: [], setSharing() {}, setDescription() {}, getFiles: () => iter(pastas[nome].arquivos.filter(f => !f.lixo)) });
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => planilha },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => est.props[k] == null ? null : String(est.props[k]),
      setProperty: (k, v) => { est.props[k] = String(v); },
      deleteProperty: k => { delete est.props[k]; },
      getProperties: () => Object.assign({}, est.props) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({
      get: k => { const x = est.cache[k]; return x && x.exp > Date.now() ? x.v : null; },
      put: (k, v, t) => { est.cache[k] = { v: String(v), exp: Date.now() + (t || 600) * 1000 }; },
      remove: k => { delete est.cache[k]; } }) },
    MailApp: { sendEmail: o => { if (est.falharEmail) throw new Error("cota de e-mail"); est.mails.push(typeof o === "string" ? { to: arguments[0] } : o); }, getRemainingDailyQuota: () => 100 },
    DriveApp: {
      Access: { PRIVATE: "PRIVATE" }, Permission: { NONE: "NONE" },
      getFoldersByName: n => iter(pastas[n] ? [pastas[n]] : []),
      createFolder: n => pasta(n),
      getFileById: () => ({ makeCopy: (nome, p) => {
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
      formatDate: (d, tz, f) => {
        const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d).map(x => [x.type, x.value]));
        return (f || "yyyy-MM-dd HH-mm").replace("yyyy", p.year).replace("MM", p.month).replace("dd", p.day).replace("HH", p.hour).replace("mm", p.minute).replace("ss", p.second);
      }
    },
    Logger: { log: m => { if (process.env.LOG) console.log("  " + m); } },
    console, Date, JSON, Math, String, Number, Object, Array, RegExp, Error, Intl
  };
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
