# Mapa do código

Um guia para entender o código do Odontograma sem ser programadora. Ele diz o que é cada arquivo, onde fica cada parte do app, o que querem dizer as palavras que aparecem no código e como conferir se uma mudança funcionou.

## 1. As três partes do app

O app é dividido em três partes, que conversam entre si.

| Parte | Arquivo | Onde roda | O que faz |
|---|---|---|---|
| **O app** | `index.html` | No celular ou no computador de quem usa | Desenha as telas, o odontograma e o painel. Guarda os exames no aparelho e funciona até sem internet. |
| **O servidor** | `Codigo.gs` | No Google (Apps Script) | Recebe os exames, confere se estão certos, grava na planilha, faz o backup, controla quem pode ver o quê e manda os e-mails. |
| **As regras comuns** | `compartilhado.js` | Nos dois lados | Regras que precisam dar o mesmo resultado no app e no servidor, como a classe de risco, o ceo-d e o CPO-D e as contas do painel. |

**Por que as regras comuns ficam num arquivo à parte?** Para não escrever a mesma conta duas vezes. O `compartilhado.js` é escrito uma vez só e copiado para dentro do `index.html` e do `Codigo.gs` pelo programa `montar.py`. A cópia fica entre as linhas `COMPARTILHADO INICIO` e `COMPARTILHADO FIM`. **Nunca edite essa parte direto no `index.html` ou no `Codigo.gs`**: edite o `compartilhado.js` e rode `python3 montar.py`.

### Os outros arquivos

| Arquivo | Para que serve |
|---|---|
| `sw.js` | O "service worker": guarda uma cópia do app no aparelho, para ele abrir sem internet. O nome `odontograma-vNN` dentro dele precisa mudar a cada versão, senão o celular continua com a versão velha. |
| `manifest.webmanifest`, `icon-*.png`, `icon.svg` | Nome, cores e ícone do app quando ele é instalado no celular. |
| `exceljs.min.js` | Biblioteca pronta (de outra pessoa) que lê e escreve arquivos do Excel. É usada para ler a planilha de população da SESAI e gerar os arquivos de análise. |
| `mapa-ti.json` | Lista das terras indígenas, usada nos territórios. |
| `paisagem*.webp` | Imagens da tela de entrada. |
| `LEIA-ME.md` | Guia do app como ele é hoje: instalação do zero, perfis, exame, painel, planilha. |
| `docs/HISTORICO-DE-VERSOES.md` | O que mudou em cada versão. |
| `docs/INSTALAR-VERSAO-47.md` | Passo a passo para instalar a versão atual. |
| `testes/` | Os testes automáticos (veja a seção 5). |
| `ferramentas/` | Conferências rápidas: `verificar.js` (o app e o servidor combinam?) e `abrir-app.js` (o app abre sem erro?). |
| `.github/workflows/verificar.yml` | Faz o GitHub rodar todos os testes sozinho a cada mudança. É o ✓ verde ou o ✗ vermelho que aparece no pull request. |

## 2. Por dentro do `index.html`

O arquivo tem três blocos, nesta ordem:

1. **`<style>` (linhas 16 a 895): a aparência.** Cores, tamanhos, espaçamentos. Exemplo: `[data-c="A"]{background:#1A7F3C}` quer dizer "tudo que tiver a classe A fica com fundo verde".
2. **`<body>` (linhas 897 a 1168): o esqueleto das telas.** Cada aba é uma `<section>`: `aba-inicio`, `aba-exame`, `aba-lista` (Meus exames), `aba-painel`, `aba-config` (Conta), `aba-equipe`, `aba-admin`. As telas começam quase vazias; o conteúdo é escrito pelo bloco seguinte.
3. **`<script>` (linhas 1169 a 5147): o comportamento.** É o JavaScript, a linguagem de programação do app. Ele está dividido em partes, cada uma com um título assim: `/* ---------- painel ---------- */`.

Onde fica cada coisa no `<script>`:

| Parte | Procure pelo título |
|---|---|
| Guardar no aparelho | `armazenamento` |
| Desenho e escolhas do dente | `desenho do dente`, `painel do dente` |
| Exame em etapas | `renderização: exame` |
| Código de acompanhamento e mesma pessoa | `identificação do indivíduo`, `mesma pessoa` |
| Envio para o servidor | `envio` |
| Painel e seus gráficos | `painel`, `filtro cruzado`, `cárie por faixa etária`, `cobertura` |
| Acompanhamento (2 ou mais exames) | `acompanhamento` |
| Página inicial | `página inicial` |
| Ações do Dia B | `ações do Dia B` |
| Entrar, convites, conta | `tela de acesso`, `aceitar convite`, `minha conta` |
| Equipe e administração | `equipe`, `administração (coordenação)` |

Dica: no GitHub ou em qualquer editor, use **Ctrl+F** e procure pelo título.

## 3. Por dentro do `Codigo.gs`

O servidor é numerado por partes:

| Nº | Parte | O que faz |
|---|---|---|
| 1 | configuração e constantes | Versão, nomes das abas, limites |
| 2 | instalação, diagnóstico e backup | `testarInstalacao`, backup incremental, tarefa da madrugada, planilhas do Looker |
| 3 | formato da planilha | Mudança de colunas entre versões, sempre com backup antes |
| 4 | abas Acessos e Uso | O registro de quem fez o quê (auditoria) |
| 5 | entrada dos pedidos | `doPost`: todo pedido do app chega aqui e é mandado para a função certa |
| 6 | usuários, e-mails e endereço | Cadastros, sessões, e-mails |
| 7 | pedido de acesso e recuperação | "Esqueci meu código" |
| 8 | exames | Envio, conferência, cancelamento, versões anteriores |
| 9 | pessoas | Busca pelo código de acompanhamento e histórico |
| 10 | ações do Dia B e página inicial | Os números da página inicial |
| 11 | equipe e administração | Ativar, desativar, corrigir e-mail, substituir RT |
| 12 | convites | |
| 13 | painel e população | Só números somados, nunca dados de uma pessoa |
| 14 | regras comuns, dicionário e utilidades | Inclui a cópia do `compartilhado.js` |

**As funções que você roda no editor do Apps Script** (escolha o nome ao lado de Executar e clique em Executar): `testarInstalacao`, `ativarBackup`, `atualizarPlanilhaAnalise`, `tarefaFaces`, `zerarExames` e `resetarTodosOsAcessos`. Cada uma tem, logo acima, um comentário explicando o que faz.

## 4. Glossário

| Palavra | O que quer dizer |
|---|---|
| **função** | Um pedaço de código com nome, que faz uma tarefa. `function nivelDaClasse(c) { ... }` recebe uma classe (`c`) e devolve "Baixo risco", "Risco moderado" ou "Alto risco". |
| **variável** | Uma "caixa" com nome que guarda um valor. `const hoje = hojeIso();` guarda a data de hoje na caixa `hoje`. `const` quer dizer que a caixa não muda depois; `let` quer dizer que pode mudar. |
| **lista** (array) | Vários valores em ordem, entre colchetes: `["A", "B", "C"]`. |
| **objeto** | Um conjunto de pares nome e valor, entre chaves: `{pessoas: 8, exames: 12}`. |
| **`.filter`** | Fica só com os itens da lista que respondem "sim" a uma pergunta. |
| **`.forEach`** | Passa por cada item da lista, um de cada vez. |
| **`.map`** | Transforma cada item da lista em outra coisa. |
| **`!`** | "Não". `!semOdontograma(e)` quer dizer "o atendimento NÃO é sem odontograma". |
| **`===`** | "É igual a". |
| **`//` e `/* ... */`** | Comentários: texto para pessoas lerem, que o computador ignora. |
| **servidor** | O computador que guarda os dados de todos. Aqui é o Google Apps Script com a planilha. |
| **API / pedido** | Quando o app pede algo ao servidor, por exemplo `api("inicio")` para os números da página inicial. |
| **cache** | Uma cópia guardada para ser mais rápido ou funcionar sem internet. |
| **versão** | Cada atualização tem um número. `VERSAO_APP` no `index.html`, `VERSAO` no `Codigo.gs` e o nome no `sw.js`. |
| **teste** | Um pequeno programa que usa o app como uma pessoa usaria e confere se o resultado é o esperado. |
| **commit** | Uma "foto" das mudanças, com uma mensagem dizendo o que mudou. |
| **branch** (ramo) | Uma cópia separada do código para trabalhar sem mexer no que está publicado. A versão 47 está no ramo `versao-47`. |
| **pull request (PR)** | O pedido para juntar um ramo ao `main`. É onde você revisa e clica em "Merge". |
| **`main`** | O ramo principal: é o que o GitHub Pages publica para os celulares. |

## 5. Como conferir se uma mudança funcionou

São quatro conferências, e o GitHub roda todas sozinho em cada pull request:

```bash
node ferramentas/verificar.js
```
Confere se o app, o servidor e o modo sem internet estão na mesma versão e se a parte comum foi copiada certo.

```bash
node testes/servidor.test.js
```
Roda o servidor num simulador do Google, com dados inventados, e confere centenas de situações (envio, cancelamento, backup, acessos, painel).

```bash
node ferramentas/abrir-app.js
```
Abre o app num navegador de teste e confere que não aparece erro.

```bash
node testes/navegador.test.js
```
Usa o app como uma pessoa: entra, faz um exame, envia, abre o painel.

Se tudo passar, cada um termina com "Tudo certo".

## 6. Um exemplo real, linha por linha

Na versão 47 foi corrigido um erro na página inicial. O servidor contava as pessoas em alto risco assim:

```js
todos.slice().sort(ordemExame).forEach(function (r) { ultimo[codigoIndividuoDe(r)] = r; });
```

- `todos` é a lista de atendimentos.
- `.slice()` faz uma cópia da lista, para não bagunçar a original.
- `.sort(ordemExame)` coloca a cópia em ordem de data.
- `.forEach(...)` passa por cada atendimento.
- `ultimo[código da pessoa] = r` guarda o atendimento na "gaveta" da pessoa. Como a lista está em ordem de data, no fim cada gaveta fica com o mais recente.

O problema: entravam também os atendimentos sem odontograma, que não têm classe de risco. A pessoa em alto risco que depois tinha um atendimento sem odontograma sumia da conta. A correção foi deixar de fora esses atendimentos antes de escolher o último, como o painel já fazia:

```js
todos.filter(function (r) { return !semOdontograma(r); })
```
