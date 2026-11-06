# Odontograma · Saúde Bucal Indígena

Guia do aplicativo: o que ele é, como instalar do zero, como atualizar e como funciona por dentro.
Versão atual: **app 47 · servidor 47 · formato da planilha 26**.

- **Instalar a versão 47:** [docs/INSTALAR-VERSAO-47.md](docs/INSTALAR-VERSAO-47.md)
- **O que mudou em cada versão:** [docs/HISTORICO-DE-VERSOES.md](docs/HISTORICO-DE-VERSOES.md)
- **Para aprender como o código funciona:** [docs/MAPA-DO-CODIGO.md](docs/MAPA-DO-CODIGO.md)

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
| `exceljs.min.js`, `exceljs-LICENCA.txt` | Leitor e gerador de Excel (ExcelJS 4.4.0), usado na planilha de população e no arquivo de análise |
| `mapa-ti.json` | Mapa usado na cobertura do Painel |
| `dados/historico-siasi.json` | Histórico do SIASI (indicadores oficiais por DSEI e dados abertos por aldeia), enviado pela titular em Administração. Não fica guardado no celular |
| `Codigo.gs` | O servidor (sem senha nem e-mail escritos nele) |
| `compartilhado.js` | Regras que o app e o servidor usam iguais (classe de risco, índices, colunas da planilha) |
| `montar.py` | Copia o `compartilhado.js` para dentro do `index.html` e do `Codigo.gs` |
| `ferramentas/`, `testes/`, `.github/workflows/` | Verificação automática a cada envio ao GitHub (aba Actions) |
| `docs/` | Mapa do código (para aprender), histórico de versões e guia de instalação da versão atual |

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
   - `CHAVE_COORDENACAO`: a senha da coordenação titular, com **pelo menos 12 caracteres** (use uma frase longa).
4. Volte ao **Editor** (ícone `< >`). Na lista ao lado de **Executar**, escolha **testarInstalacao** e clique em **Executar**. Autorize: Revisar permissões > sua conta > Avançado > Acessar > Permitir. Deve aparecer **TUDO CERTO**.
5. **Implantar > Nova implantação** > engrenagem > **App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Clique em **Implantar** e copie o endereço que termina em `/exec`.
6. Abra esse endereço no navegador. Deve aparecer `"versao":47`. A situação completa da instalação aparece em Administração.

O backup é automático: toda madrugada o servidor atualiza a planilha **Odontograma - backup**, na pasta **Odontograma - backups** do Drive, e refaz a planilha de análise. Essas tarefas são criadas sozinhas no primeiro uso.

**B. App no GitHub**
7. Crie um repositório e envie todos os arquivos da tabela acima, com os nomes exatos (sem "(1)").
8. **Settings > Pages > Deploy from a branch**, **main** e **/(root)**, **Save**. Espere o "pages build and deployment" ficar verde em **Actions**.

**C. Primeiro acesso**
9. Abra o app pelo endereço do GitHub Pages seguido de `?s=` e do trecho do /exec que fica entre `/s/` e `/exec`.
10. Toque em **Já tenho um código** e entre com o e-mail e a senha das Propriedades do script.
11. Em **Administração**, envie convites para as referências técnicas.
12. Em **Administração > Histórico do SIASI e metas**, toque em **Enviar o histórico que vem com o app**.

Se algo não funcionar, **Administração > Situação do servidor** mostra o que falta.

## Atualizar depois

- **Servidor:** cole o `Codigo.gs` novo, salve e publique **pelo lápis** (Gerenciar implantações > lápis > Nova versão > Implantar). Assim o endereço /exec não muda. As Propriedades do script continuam lá. **Nunca arquive a implantação ativa.** Implantações antigas que não são a ativa podem ser arquivadas.
- **App:** a cada mudança no `index.html`, o número do `sw.js` (`odontograma-vNN-N`) precisa mudar, e a `VERSAO_APP` do `index.html` precisa ser igual ao NN. A verificação do GitHub avisa se estiverem diferentes. Os celulares recebem a versão nova quando abrem o app com internet. Os exames guardados não se perdem.
- **Mudança no `compartilhado.js`:** rode `python3 montar.py` antes de enviar, para copiar o trecho para o app e o servidor.
- **Trocar a senha da coordenação:** mude `CHAVE_COORDENACAO` em Propriedades do script e salve. Vale na hora.
- **Backup à mão:** em Administração (titular) ou, no Apps Script, escolha **fazerBackup** e clique em **Executar**. O backup é uma planilha só, que nunca apaga: o que mudou fica na aba Historico dela. A pasta tem dados de saúde: não a compartilhe.
- **Histórico do SIASI, uma vez por ano:** a titular envia o arquivo novo em **Administração > Histórico do SIASI e metas**. Ele vai para a planilha separada "Odontograma - histórico SIASI".
- **Quando o formato da planilha muda** (colunas novas): uma planilha sem exames se reorganiza sozinha. Com exames, a coordenação titular confirma em **Administração > Atualização da planilha pendente** ("Ver o que vai mudar" e depois "Fazer backup e atualizar"). Até isso ser feito, os exames esperam guardados nos aparelhos.

---

## Perfis e acesso

- **Coordenação titular:** entra com o e-mail e a senha das Propriedades do script. É a única que mexe em outras pessoas da coordenação, confirma a reorganização da planilha e limpa o aviso de auditoria.
- **Coordenação:** aprova as referências técnicas e pode ser também RT de um DSEI.
- **Referência técnica (RT):** aprova os cirurgiões-dentistas do seu DSEI. Em DSEI sem RT ativa, os pedidos vão para a coordenação.
- **Cirurgião-dentista (CD):** registra exames e retornos.

Todos veem o histórico do SIASI de todos os DSEIs (Painel > Indicadores). Só a titular envia o histórico, aprova as dicas, liga o Termo de Ciência e marca cadastros duplicados.

Cada pessoa tem um código pessoal, recebido por e-mail, e entra com o mesmo e-mail e código em qualquer aparelho. Depois de entrar, o aparelho guarda uma sessão (não o código), que vence depois de 15 dias sem usar o app. CD e RT registram exames só no DSEI do próprio cadastro. O servidor confere isso, e não só o app. Há também convites por e-mail, "Esqueci meu código" (em duas etapas) e pedido de reativação para quem foi desativado.

**Termo de Ciência:** vem desligado. Ligado pela titular, cada pessoa aceita depois de entrar, uma vez por versão; a versão e a data ficam no cadastro. Pode ser lido a qualquer hora em Conta.

## O exame

**Uma página só**, em partes que se liberam sozinhas: Local → Indivíduo → Odontograma (com vigilância e prótese) → Condições → Resumo e salvar.

**Indivíduo:** sem nome, sem Cartão SUS e sem nenhum dado que identifique a pessoa. Ela recebe um **código de acompanhamento** (`UF-POLO-ALDEIA-8 caracteres`), que nunca muda. No exame seguinte, o app procura a pessoa pela aldeia, pela data de nascimento e pelo sexo, ou pelo código. Também pede a localidade de residência e, para mulheres de 10 a 49 anos, se está gestante (e as semanas).

**Odontograma** (pode ficar de fora, com o motivo; sem odontograma não há classe de risco):
- A data de nascimento escolhe a dentição. Os dentes que a idade garante já vêm como não erupcionado ou esfoliado. Os que a idade deixa em dúvida aparecem com contorno amarelo pontilhado.
- Dente sem marcação é presente e hígido. Tocar no dente abre o painel do dente: situação → desenho (toque na face) → condição da face → sinais → tratamento → conduta.
- **Situação:** Presente, Não erupcionado (NE), Esfoliado (Es, só no decíduo), Ausente por outro motivo (A), Extraído por cárie (E).
- **Faces:** Hígida, Cárie ativa, Cárie crônica, Mancha branca ativa, Mancha branca inativa, Restaurada sem cárie, Restaurada com cárie, Selante.
- **Sinais:** Dor; Abscesso ou fístula.
- **Tratamento:** cada procedimento (com o nome do SIASI) é Indicado ou Realizado. Selo amarelo no dente = indicado; verde = realizado. Pulpectomia e coroa de aço são só para decíduos.
- **Necessidade sem conduta:** dente com cárie, dor ou abscesso precisa de um procedimento, de um encaminhamento ou de "acompanhamento" com o motivo.

**Vigilância:** dor de dente e abscesso vêm do odontograma; as outras condições depois de um "Sim". Fluorose pelo índice de Dean, de 10 a 19 anos.
**Prótese:** por arcada, sem, parcial ou total, e se usa. Dentes 18, 28, 38 e 48 ausentes não lembram prótese.
**Condições:** placa visível e gengivite (Sim, Não ou Não avaliado); procedimentos coletivos e insumos.
**Encaminhamentos e prescrições:** por especialidade, com a situação (pendente ou realizado).
**Tratamento básico (APS):** o app sugere "concluído" quando não há pendências da APS; o CD confirma. "Não concluído" pede o motivo. O que é APS ou especializada segue a lista padrão, com ajuste por DSEI em Administração.

**Retorno:** na pessoa, "Registrar consulta de retorno" anota o que foi feito no plano do último exame com odontograma. Qualquer CD do mesmo DSEI pode registrar. Um odontograma completo novo fecha o plano anterior e herda as pendências.

**Atividade coletiva** (aba Ações do Dia B): registrada à parte, para a Ficha 3 sair completa. RT e coordenação baixam as **Fichas 3 e 7 do SIASI** do mês, por aldeia.

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

O Painel tem três abas:
- **Indicadores:** os 8 indicadores da Nota Técnica 3/2025 com o histórico oficial do SIASI (34 DSEIs e Brasil, 2020 ao 1º semestre de 2026), dados abertos por polo e aldeia (2019 a 2024), a meta de cada ano (a do PDSI, quando houver) e o ponto do app, marcado como "não oficial". Comparações em ordem alfabética.
- **Dicas:** só as aprovadas pela titular, quando o indicador está abaixo da meta. RT e coordenação podem sugerir dicas.
- **Dados do app:** o que foi registrado no app, em 6 blocos (produção, registro clínico, situação de saúde bucal, indicadores, necessidades e cobertura).

O histórico do SIASI e os dados do app nunca se somam: cada número mostra a fonte. O Painel mostra só números somados, nunca exames de uma pessoa. Quando um recorte tem de 1 a 4 pessoas, aparece "<5" no lugar do número. Para mudar esse limite, altere `const MINIMO = 5;` no `Codigo.gs`. Mostra a cobertura pela população da SESAI (enviada pela coordenação em Administração), o acompanhamento de quem tem 2 ou mais exames e os filtros cruzados. Sem internet, mostra os últimos números baixados.

## A planilha

| Aba | O que tem |
|---|---|
| Exames | Uma linha por exame (sem identificação da pessoa): o exame, as contas prontas, o resumo e o exame completo (com cada dente) |
| Acessos | Registro do que cada pessoa fez (auditoria), do mais recente para o mais antigo |
| Uso | Uma linha por pessoa com acesso: entradas, consultas e exames (atualizada toda madrugada) |
| Usuarios, Convites | Cadastros e convites |
| Dicionário | O que significa cada coluna |
| Acoes | Ações do Dia B |
| Retornos | Um retorno por linha, ligado ao exame do plano |
| Atividades | Atividades coletivas |
| Sugestoes_dicas | Dicas sugeridas por RT e coordenação |
| Termo_versoes | Versões do Termo de Ciência (aparece quando o texto muda) |
| População | População da SESAI por aldeia |

**Planilhas separadas** (na pasta do Drive da coordenação): "Odontograma - backup", "Odontograma - análise" e "… - faces" (para o Looker Studio, sem dados de acesso), "Odontograma - arquivo de acessos" e "Odontograma - histórico SIASI" (dados agregados do Ministério). Ligue o Looker só na de análise e na do histórico, nunca na planilha principal.

As abas que começam com `_` são de uso interno do servidor: não mexa nelas.

## Testes automáticos

A cada envio ao GitHub, a aba Actions roda:
- a conferência de que app, servidor e `sw.js` combinam;
- **492 verificações do servidor**, num simulador do Apps Script e sem dados reais;
- a abertura do app no celular e no computador;
- **214 verificações no navegador**, com os fluxos principais, no horário de Brasília.

Para rodar no seu computador: `node ferramentas/verificar.js`, `node testes/servidor.test.js`, `node ferramentas/abrir-app.js` e `node testes/navegador.test.js`. O [mapa do código](docs/MAPA-DO-CODIGO.md) explica cada um.

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
- O app não registra o tipo de consulta (1ª consulta programática, agendamento, demanda espontânea): nas Fichas 7 essas colunas saem vazias, e o indicador de tratamento concluído do app usa como denominador o 1º exame com odontograma no ano ("não oficial").
- Os números de produção do Painel ainda não somam os procedimentos feitos nos retornos (eles saem nas Fichas 7).
- A planilha Google atende bem a milhares de exames. Para muitos anos de dados de uma rede inteira, vale migrar depois para um banco de dados próprio.
