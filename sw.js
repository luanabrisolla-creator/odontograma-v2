# Odontograma · Saúde Bucal Indígena

Guia do aplicativo: o que ele é, como instalar do zero, como atualizar e como funciona por dentro.
Versão atual: **app 36 · servidor 33 · formato da planilha 24**.

## Versão 36: limpeza do código (mesmas funções)

Nada muda no uso do app. O código foi reescrito de forma mais limpa:
- **Servidor (`Codigo.gs`):** saíram as conversões de formatos antigos (aba Acessos antiga, envio do app da versão 14, código com CRO) e o reconhecimento de autor pelo CRO. O arquivo ganhou um índice no começo e seções numeradas.
- **App (`index.html`):** o estilo visual estava em camadas, uma por versão, com regras repetidas. As repetições foram juntadas e as partes que não existem mais (paleta de marcação, "aplicar a vários dentes", confirmação antiga do dente) saíram. A tela ficou igual: isso foi conferido em 68 telas, no celular e no computador.
- **Saiu o botão "São meus"** em Meus exames. Cada exame guardado no aparelho pertence ao acesso de quem o fez.
- **A ilustração da página inicial** virou o arquivo `paisagem-faixa.webp`, em vez de ficar escrita dentro do `index.html`. Com isso o app ficou cerca de 150 KB mais leve.
- **Uma correção:** quando a planilha é reorganizada, a aba Uso **mantém** o número de entradas e consultas de cada pessoa. Antes, esses números voltavam para zero.

**Como instalar a 36 (faça nesta ordem):**
1. **Apps Script:** cole o `Codigo.gs` inteiro e salve. Publique **pelo lápis**: Implantar > Gerenciar implantações > lápis > Versão: Nova versão > Implantar. Não crie uma implantação nova e não arquive a que está ativa.
2. **Confira o servidor:** abra o endereço /exec. Deve aparecer `"versao":33`.
3. **GitHub:** use Add file > Upload files e arraste de uma vez:
   - os arquivos `index.html`, `sw.js`, `Codigo.gs`, `compartilhado.js`, `LEIA-ME.md` e **`paisagem-faixa.webp` (arquivo novo)**;
   - as pastas `ferramentas` e `testes` inteiras.
4. **Actions:** a verificação deve ficar com ✓ verde.
5. **No celular:** feche e abra o app com internet. Em Conta deve aparecer "app versão 36".

A planilha não muda de formato nesta versão.

---

## Como o app é montado

São duas partes:
- **O app** (`index.html` e os arquivos ao lado dele), publicado no GitHub Pages. Funciona no celular, no tablet e no computador, inclusive sem internet.
- **O servidor** (`Codigo.gs`), que roda no Apps Script ligado a uma planilha Google. A planilha é o banco de dados e fica só no Drive da coordenação.

O exame é guardado primeiro no aparelho. Com internet, o app envia sozinho para a planilha. Sem internet, o exame espera e sai quando a conexão voltar.

**Arquivos do repositório:**

| Arquivo | Para que serve |
|---|---|
| `index.html` | O app inteiro (telas, estilo e programação) |
| `sw.js` | Guarda o app no aparelho para funcionar sem internet |
| `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png` | Instalação na tela inicial do celular |
| `paisagem.webp`, `paisagem-faixa.webp` | Ilustrações da tela de entrada e da página inicial |
| `mapa-ti.json` | Mapa usado na cobertura do Painel |
| `Codigo.gs` | O servidor (sem senha nem e-mail escritos nele) |
| `compartilhado.js` | Regras que o app e o servidor usam iguais (classe de risco, índices, colunas da planilha) |
| `montar.py` | Copia o `compartilhado.js` para dentro do `index.html` e do `Codigo.gs` |
| `ferramentas/`, `testes/`, `.github/workflows/` | Verificação automática a cada envio ao GitHub (aba Actions) |

**Regras de segurança do repositório:**
- O `Codigo.gs` do repositório não tem senha. **Nunca envie para o GitHub uma cópia com a senha escrita** (por exemplo, um "Codigo-preenchido.gs").
- A senha da coordenação fica só em **Propriedades do script** (`CHAVE_COORDENACAO`).
- Não use logotipos de órgãos públicos nem de universidades.

---

## Instalação do zero

Use sempre **a mesma conta Google** em todos os passos (confira a foto no canto superior direito do navegador).

**A. Planilha e servidor**
1. Em drive.google.com: **Novo > Planilhas Google**. Dê o nome "Odontograma".
2. Na planilha: **Extensões > Apps Script**. Apague o que estiver lá, cole todo o `Codigo.gs` e salve (Ctrl+S).
3. Clique na **engrenagem (Configurações do projeto)** > **Propriedades do script** e crie as duas propriedades abaixo. Depois clique em **Salvar propriedades do script**.
   - `EMAIL_COORDENACAO`: o e-mail da conta dona da planilha.
   - `CHAVE_COORDENACAO`: a senha da coordenação titular. Use uma frase longa (o app avisa se tiver menos de 12 caracteres).
4. Volte ao **Editor** (ícone `< >`). Na lista ao lado de **Executar**, escolha **testarInstalacao** e clique em **Executar**. Autorize: Revisar permissões > sua conta > Avançado > Acessar > Permitir. Deve aparecer **TUDO CERTO**.
5. Escolha **ativarBackupSemanal** e clique em **Executar**, uma vez só. Toda segunda-feira de madrugada vai uma cópia da planilha para a pasta **Odontograma - backups** do Drive. As 8 mais recentes ficam guardadas.
6. **Implantar > Nova implantação** > engrenagem > **App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Clique em **Implantar** e copie o endereço que termina em `/exec`.
7. Abra esse endereço no navegador. Deve aparecer `"versao":33` e `"pronto":true`.

**B. App no GitHub**
8. Crie um repositório e envie todos os arquivos da tabela acima, com os nomes exatos (sem "(1)").
9. **Settings > Pages > Deploy from a branch**, **main** e **/(root)**, **Save**. Espere o "pages build and deployment" ficar verde em **Actions**.

**C. Primeiro acesso**
10. Abra o app pelo endereço do GitHub Pages seguido de `?s=` e do trecho do /exec que fica entre `/s/` e `/exec`.
11. Toque em **Já tenho um código** e entre com o e-mail e a senha das Propriedades do script.
12. Em **Administração**, envie convites para as referências técnicas.

Se algo não funcionar, **Administração > Situação do servidor** mostra o que falta.

## Atualizar depois

- **Servidor:** cole o `Codigo.gs` novo, salve e publique **pelo lápis** (Gerenciar implantações > lápis > Nova versão > Implantar). Assim o endereço /exec não muda. As Propriedades do script continuam lá. **Nunca arquive a implantação ativa.** Implantações antigas que não são a ativa podem ser arquivadas.
- **App:** a cada mudança no `index.html`, o número do `sw.js` (`odontograma-vNN-N`) precisa mudar, e a `VERSAO_APP` do `index.html` precisa ser igual ao NN. A verificação do GitHub avisa se estiverem diferentes. Os celulares recebem a versão nova quando abrem o app com internet. Os exames guardados não se perdem.
- **Mudança no `compartilhado.js`:** rode `python3 montar.py` antes de enviar, para copiar o trecho para o app e o servidor.
- **Trocar a senha da coordenação:** mude `CHAVE_COORDENACAO` em Propriedades do script e salve. Vale na hora.
- **Backup à mão:** escolha **fazerBackup** e clique em **Executar**. Para restaurar, abra a cópia na pasta de backups e copie as abas de volta. A pasta tem dados de saúde: não a compartilhe.
- **Quando o formato da planilha muda** (colunas novas): uma planilha sem exames se reorganiza sozinha. Com exames, a coordenação titular confirma em **Administração > Atualização da planilha pendente** ("Ver o que vai mudar" e depois "Fazer backup e atualizar"). Até isso ser feito, os exames esperam guardados nos aparelhos.

---

## Perfis e acesso

- **Coordenação titular:** entra com o e-mail e a senha das Propriedades do script. É a única que mexe em outras pessoas da coordenação, confirma a reorganização da planilha e limpa o aviso de auditoria.
- **Coordenação:** aprova as referências técnicas e pode ser também RT de um DSEI.
- **Referência técnica (RT):** aprova os cirurgiões-dentistas do seu DSEI. Em DSEI sem RT ativa, os pedidos vão para a coordenação.
- **Cirurgião-dentista (CD):** registra exames.

Cada pessoa tem um código pessoal, recebido por e-mail, e entra com o mesmo e-mail e código em qualquer aparelho. CD e RT registram exames só no DSEI do próprio cadastro. O servidor confere isso, e não só o app. Há também convites por e-mail, "Esqueci meu código" (em duas etapas) e pedido de reativação para quem foi desativado.

## O exame

**Etapas:** Local → Indivíduo → Odontograma → Vigilância e prótese → Condições → Revisão. Uma etapa só abre depois que a anterior está completa. Na Revisão, o botão é "Salvar exame".

**Indivíduo:** sem nome, sem Cartão SUS e sem nenhum dado que identifique a pessoa. Ela recebe um **código de acompanhamento** (`UF-POLO-ALDEIA-8 caracteres`), que nunca muda. No exame seguinte, o app procura a pessoa pela aldeia, pela data de nascimento e pelo sexo, ou pelo código.

**Odontograma:**
- A data de nascimento escolhe a dentição. Os dentes que a idade garante já vêm como não erupcionado ou esfoliado. Os que a idade deixa em dúvida aparecem com contorno amarelo pontilhado.
- Dente sem marcação é presente e hígido. Tocar no dente abre o painel do dente, nesta ordem: situação → desenho (toque na face) → condição da face → sinais → tratamento.
- **Situação:** Presente, Não erupcionado (NE), Esfoliado (Es, só no decíduo), Ausente por outro motivo (A), Extraído por cárie (E). Só o dente presente tem faces, sinais e tratamento.
- **Faces:** Hígida, Cárie ativa, Cárie crônica, Mancha branca ativa, Mancha branca inativa, Restaurada sem cárie, Restaurada com cárie, Selante.
- **Sinais:** Dor; Abscesso ou fístula.
- **Tratamento:** cada procedimento é Indicado ou Realizado, um de cada vez, e nada vem marcado. "Exodontia devido à cárie" e "Exodontia por outros motivos" são separadas e não podem ficar juntas no mesmo dente.

**Vigilância:** dor de dente e abscesso vêm do odontograma. As outras condições são marcadas depois de um "Sim".
**Prótese:** por arcada, "Necessita de prótese?" e "Usa prótese?". Há um atalho para "Não necessita e não usa" e a opção "Não foi possível avaliar".
**Condições:** placa visível e gengivite começam sem resposta.

## Classe de risco e índices

A classe é calculada pelo odontograma e pelas condições. Vale sempre a mais grave. O servidor refaz o cálculo a cada exame gravado.

| Classe | O que dispara |
|---|---|
| F | Dor ou abscesso num dente (ou dor de dente ou abscesso na vigilância) |
| E | Face com cárie ativa ou restaurada com cárie |
| D | Face com mancha branca ativa, placa visível ou gengivite |
| C | Face com cárie crônica, ou exodontia devido à cárie (indicada ou realizada) |
| B | Face restaurada sem cárie ou com mancha branca inativa, ou dente extraído por cárie |
| A | Nenhuma das anteriores |

O nível é baixo (A e B), moderado (C e D) ou alto (E e F).

**ceo-d (decíduos) e CPO-D (permanentes):** cada dente conta uma vez, nesta ordem:
- **Perdido:** no decíduo, a exodontia devido à cárie conta como **e**. No permanente, o dente extraído por cárie conta como **P**. Decíduo extraído por cárie não conta.
- **Cariado:** cárie ativa, cárie crônica ou restaurada com cárie. No permanente, a exodontia devido à cárie também conta como **C**.
- **Obturado:** restaurada sem cárie e sem cárie em outra face.

Selante e exodontia por outros motivos não entram nos índices.

## Painel e proteção dos dados

O Painel mostra só números somados, nunca exames de uma pessoa. Quando um recorte tem de 1 a 4 pessoas, aparece "<5" no lugar do número. Para mudar esse limite, altere `const MINIMO = 5;` no `Codigo.gs`. Mostra a cobertura pela população da SESAI (enviada pela coordenação em Administração), o acompanhamento de quem tem 2 ou mais exames e os filtros cruzados. Sem internet, mostra os últimos números baixados.

## A planilha

| Aba | O que tem |
|---|---|
| Exames | Uma linha por exame (sem identificação da pessoa) |
| Dentes | Uma linha por dente de cada exame, ligada pela coluna `id_exame` |
| Acessos | Registro do que cada pessoa fez (auditoria), do mais recente para o mais antigo |
| Uso | Uma linha por pessoa com acesso: entradas, consultas e exames |
| Usuarios, Convites | Cadastros e convites |
| Dicionário | O que significa cada coluna |
| Acoes | Ações do Dia B |
| População | População da SESAI por aldeia |

As abas que começam com `_` são de uso interno do servidor: não mexa nelas.

## Testes automáticos

A cada envio ao GitHub, a aba Actions roda:
- a conferência de que app, servidor e `sw.js` combinam;
- **175 verificações do servidor**, num simulador do Apps Script e sem dados reais;
- a abertura do app no celular e no computador;
- **88 verificações no navegador**, com os fluxos principais, no horário de Brasília.

Todas as datas e horas, no app e no servidor, usam o horário de Brasília (`America/Sao_Paulo`), qualquer que seja o fuso do aparelho.

## Cuidados com dados (LGPD)

São dados de saúde, considerados sensíveis. O app não coleta nome, Cartão SUS, CPF, filiação nem endereço, e os campos de observação pedem que nada identificável seja escrito. Mesmo assim:
- compartilhe a planilha e a pasta de backups só com quem precisa;
- siga o que o comitê de ética aprovou;
- troque a senha da coordenação se ela vazar.

## Limitações conhecidas

- Até serem enviados, os exames ficam na memória do navegador do aparelho. Se alguém apagar os dados do navegador antes do envio, eles se perdem. O contador no topo mostra quantos faltam enviar.
- No iPhone, o Safari pode apagar dados de sites que ficam semanas sem uso. Instalar o app na tela inicial reduz esse risco. O ideal é enviar os exames no mesmo dia.
- Uma conta Gmail comum envia cerca de 100 e-mails por dia. Se um e-mail não sair, o código aparece na tela para ser repassado.
- A planilha Google atende bem a milhares de exames. Para muitos anos de dados de uma rede inteira, vale migrar depois para um banco de dados próprio.

---

## Histórico resumido

- **36:** limpeza do código, sem mudar o uso. A aba Uso mantém os contadores quando a planilha é reorganizada.
- **35:** exame em etapas; odontograma novo (situação do dente, faces, sinais e tratamento separados); prótese; dor e abscesso separados; horário de Brasília em tudo; botão para limpar o aviso de auditoria.
- **34:** exame só aparece como "salvo" quando foi guardado de verdade; coluna `codigo_confere_local`; pedido de reativação.
- **33:** correções da auditoria de segurança antes do uso real.
- **31 e 32:** índices pela regra do material, painel por pessoa e servidor como fonte do resultado.
- **30:** código de acompanhamento novo (`UF-POLO-ALDEIA-8 caracteres`) e campos obrigatórios.
- **27 a 29:** população e listas da SESAI (DSEI → polo base → aldeia), cobertura, mapa e cores da Saúde Indígena.
- **25 e 26:** dica do dente e convites.
- **20 a 24:** visual novo, tela de entrada, página inicial e Ações do Dia B.
- **15 a 19:** senha fora do código (Propriedades do script), backup semanal, mesma pessoa e acompanhamento.
- **2 a 14:** acesso individual por perfil, painel, dentição pela idade e retirada de toda identificação da pessoa.
