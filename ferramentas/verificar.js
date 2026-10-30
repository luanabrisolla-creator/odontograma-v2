// Verificação automática do Odontograma. Roda no GitHub a cada envio de arquivos (e pode rodar no computador: node ferramentas/verificar.js).
// Confere se o app (index.html), o servidor (Codigo.gs) e o modo sem internet (sw.js) combinam entre si.
const fs = require("fs"), path = require("path");
// Funciona com o arquivo em ferramentas/ (como no pacote) ou solto na raiz do repositório.
const raiz = fs.existsSync(path.join(__dirname, "index.html")) ? __dirname : path.join(__dirname, "..");
const ler = f => fs.readFileSync(path.join(raiz, f), "utf8");
const existe = f => fs.existsSync(path.join(raiz, f.replace(/^\.\//, "")));
const erros = [], avisos = [];
const ok = (cond, msg) => { if (!cond) erros.push(msg); };

for (const f of ["index.html", "Codigo.gs", "sw.js", "manifest.webmanifest"]) ok(existe(f), `Falta o arquivo ${f}.`);
if (erros.length) fim();
const html = ler("index.html"), gs = ler("Codigo.gs"), sw = ler("sw.js");

// 1. Sintaxe
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((c, i) => { try { new Function(c); } catch (e) { erros.push(`Erro de sintaxe no script ${i + 1} do index.html: ${e.message}`); } });
try { new Function(gs); } catch (e) { erros.push(`Erro de sintaxe no Codigo.gs: ${e.message}`); }
try { new Function(sw); } catch (e) { erros.push(`Erro de sintaxe no sw.js: ${e.message}`); }
try { JSON.parse(ler("manifest.webmanifest")); } catch (e) { erros.push(`manifest.webmanifest não é um JSON válido: ${e.message}`); }

// 2. Toda ação que o app pede existe no servidor
const bloco = (gs.match(/const ACOES = \{([\s\S]*?)\n\};/) || [])[1] || "";
const acoesServidor = new Set([...bloco.matchAll(/^\s*([A-Za-z]+)\s*:/gm)].map(m => m[1]));
ok(acoesServidor.size > 10, "Não encontrei a lista ACOES no Codigo.gs.");
const acoesApp = new Set([...html.matchAll(/api\("([A-Za-z]+)"/g)].map(m => m[1]));
const faltando = [...acoesApp].filter(a => !acoesServidor.has(a));
ok(!faltando.length, `O app chama ações que o Codigo.gs não tem: ${faltando.join(", ")}. O Codigo.gs do GitHub está mais antigo que o index.html?`);

// 3. Versões
const versaoServidor = Number((gs.match(/const VERSAO = (\d+);/) || [])[1]);
const minimo = Number((html.match(/const SERVIDOR_MIN = (\d+);/) || [])[1]);
ok(versaoServidor >= minimo, `O index.html precisa do servidor versão ${minimo}, mas o Codigo.gs está na versão ${versaoServidor}.`);
const vApp = (html.match(/const VERSAO_APP = (\d+);/) || [])[1], vCache = (sw.match(/odontograma-v(\d+)/) || [])[1];
ok(vApp && vApp === vCache, `Versão do app (${vApp}) e do sw.js (${vCache}) diferentes: troque o número no sw.js para o celular receber a versão nova.`);

// 4. Arquivos que o app e o modo sem internet usam
const listados = [...sw.matchAll(/"(\.\/[^"]*)"/g)].map(m => m[1]).filter(f => f !== "./");
listados.forEach(f => ok(existe(f), `O sw.js guarda ${f}, mas o arquivo não está no repositório.`));
const icones = (JSON.parse(ler("manifest.webmanifest")).icons || []).map(i => i.src);
icones.forEach(f => ok(existe(f), `O manifest usa ${f}, mas o arquivo não está no repositório.`));
[...html.matchAll(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/g)].forEach(m => ok(existe(m[1]), `O index.html usa o ícone ${m[1]}, que não está no repositório.`));
[...html.matchAll(/fetch\("([a-z0-9._-]+\.(?:json|webp|png))"\)|url\(([a-z0-9._-]+\.(?:webp|png|jpg))\)/g)].forEach(m => { const f = m[1] || m[2]; ok(existe(f), `O index.html usa ${f}, que não está no repositório.`); });

// 5. Código compartilhado igual nos dois lados
const comp = t => { const i = t.indexOf("/* ===== COMPARTILHADO INICIO ====="), j = t.indexOf("/* ===== COMPARTILHADO FIM ===== */"); return i < 0 || j < 0 ? null : t.slice(i, j); };
const a = comp(html), b = comp(gs);
ok(a && b && a === b, "O trecho COMPARTILHADO do index.html e do Codigo.gs está diferente: rode o montar.py antes de enviar.");
if (existe("compartilhado.js")) ok(comp(ler("compartilhado.js")) === a, "O compartilhado.js mudou e não foi copiado para o index.html e o Codigo.gs: rode o montar.py antes de enviar.");

// 6. Senha nunca no código
ok(!/CHAVE_COORDENACAO['"]?\s*[:=]\s*['"][^'"]{3,}/.test(gs), "O Codigo.gs parece ter a senha da coordenação escrita no código. Ela deve ficar só nas Propriedades do script.");

fim();
function fim() {
  avisos.forEach(m => console.log("AVISO  " + m));
  if (erros.length) { erros.forEach(m => console.log("ERRO   " + m)); console.log(`\n${erros.length} problema(s) encontrado(s).`); process.exit(1); }
  console.log("Tudo certo: app, servidor e modo sem internet combinam.");
}
