# Instalar a versão 47

Passo a passo para a coordenação titular, **na ordem**. Use sempre a mesma conta Google (a dona da planilha).
Leva cerca de 30 minutos. O que mudou: [HISTORICO-DE-VERSOES.md](HISTORICO-DE-VERSOES.md).

**Por que esta ordem:** o app 47 precisa do servidor 47, mas o servidor 47 aceita os apps 45 e 46. Por isso o servidor
vem antes do app: os celulares que ainda não atualizaram continuam enviando normalmente.

---

## 1. Zerar os exames de teste (com o servidor que está lá hoje)

A versão 47 muda as colunas da aba Exames (formato 26). Com a base vazia, a planilha se ajusta sozinha.

1. Na planilha **Odontograma**: **Extensões > Apps Script**.
2. Na lista ao lado de **Executar**, escolha **zerarExames** e clique em **Executar**.
3. Espere aparecer no **Registro de execução**: "Base de exames zerada". Ele mostra o link do arquivo com os exames antigos.

O que acontece: faz um backup, copia todos os exames para a planilha "Odontograma - exames arquivados até …" (na pasta
**Odontograma - backups**), esvazia a aba Exames e recomeça o backup. **Cadastros, códigos de acesso, população e ações
do Dia B não mudam.** Exames que ainda estavam esperando num celular, feitos antes do recomeço, não entram na base nova:
o app explica isso para quem estiver com eles.

## 2. Servidor: colar o Codigo.gs novo

1. No GitHub, abra o `Codigo.gs` da versão 47 e copie tudo (botão de copiar, no alto à direita do arquivo).
2. No Apps Script, no arquivo **Código**: selecione tudo, apague, cole e salve (**Ctrl+S**).
3. Publique **pelo lápis**: **Implantar > Gerenciar implantações** > **lápis** > Versão: **Nova versão** > **Implantar**.
   Assim o endereço /exec continua o mesmo. **Não crie uma implantação nova e não arquive a ativa.**
4. Abra o endereço /exec no navegador. Deve aparecer `"versao":47`.

Se o Google pedir autorização de novo, autorize (Revisar permissões > sua conta > Avançado > Acessar > Permitir).

## 3. App: juntar a atualização no GitHub

1. Na página do pedido de mudança (pull request) da versão 47, clique em **Merge pull request** e confirme.
2. Em **Actions**, espere a verificação e o "pages build and deployment" ficarem com ✓ verde.

## 4. Conferir a instalação

1. Abra o app no computador com internet e entre como titular.
2. **Conta:** deve aparecer "app versão 47 · servidor 47". Se ainda mostrar 46, feche a aba e abra de novo.
3. **Administração > Situação do servidor:** tudo com ✓.
4. Se aparecer **"Atualização da planilha pendente"**, toque em "Ver o que vai mudar" e depois em "Fazer backup e atualizar".
   Com a base zerada, normalmente não aparece.

## 5. Enviar o histórico do SIASI

1. **Administração > Histórico do SIASI e metas > Enviar o histórico que vem com o app.**
2. Espere a mensagem "Histórico … gravado na planilha "Odontograma - histórico SIASI"". Pode levar alguns minutos (são
   cerca de 34 mil linhas de aldeias): deixe a página aberta.
3. Confira em **Painel > Indicadores**: escolha o DSEI Litoral Sul e o ano 2025. A 1ª consulta programática deve
   mostrar 49,3%.

O histórico fica numa planilha separada, nunca na aba Exames. Para atualizar no ano que vem, peça um arquivo novo
(mesmo formato) e use **Enviar outro arquivo**.

## 6. Revisar o que só a titular decide

- **Dicas** (Painel > Dicas): leia o catálogo, ajuste o texto se quiser e aprove as que devem aparecer para as equipes.
  Nada aparece antes da sua aprovação.
- **Metas do PDSI** (Administração): só se o DSEI pactuou uma meta diferente da nacional. Sem isso, vale a meta da NT 3/2025.
- **Nível dos procedimentos** (Administração): a lista padrão diz o que é da APS e o que é da especializada.
  Ajuste por DSEI só se precisar.
- **Termo de Ciência** (Administração): vem **desligado**. Revise o texto sugerido. Quando ligar, cada pessoa aceita
  depois de entrar.
- **Cadastro duplicado** da Bruna Melo Lopes: em **Administração > Usuários**, no cadastro que sobra, toque em
  **Marcar como duplicado** e escolha o cadastro certo.

## 7. Looker Studio

- Na fonte de dados da aba **Exames** da planilha "Odontograma - análise": **Recurso > Gerenciar fontes de dados >
  Editar > Atualizar campos**. Há colunas novas no fim (localidade_residencia, gestante, semanas_gestacao, fluorose_dean,
  tratamento_aps, tratamento_aps_motivo, pendencias_aps, situacao_encaminhamento, encaminhamento_…, prescricao_…,
  vig_interferencia_freios). Os gráficos antigos continuam ligados.
- A planilha de análise é refeita de madrugada: os campos novos aparecem com dados depois dos primeiros exames do app 47.
- **Histórico do SIASI no Looker (opcional):** crie uma fonte nova com a planilha "Odontograma - histórico SIASI",
  abas **Indicadores_DSEI** (um DSEI por ano) e **Aldeias_ano** (uma aldeia por ano). São dados agregados do Ministério.
  Não some esses números com os do app.
- **Retornos e atividades coletivas** ficam na planilha principal (abas Retornos e Atividades) e saem nas Fichas 7 e 3
  (aba **Ações do Dia B > Fichas 3 e 7 do SIASI**, para RT e coordenação). **Não ligue o Looker na planilha principal**, porque ela tem os dados de acesso.

## 8. Celulares e tablets

Peça a cada pessoa para **fechar e abrir o app com internet**. Em **Conta** deve aparecer "app versão 47". Os exames
que estavam guardados no aparelho não se perdem.

---

## Se algo der errado

- **Administração > Situação do servidor** mostra o que falta.
- Para voltar o servidor: **Implantar > Gerenciar implantações > lápis > Versão:** escolha a anterior > **Implantar**.
- O backup de antes de zerar e o arquivo com os exames antigos ficam na pasta **Odontograma - backups**.
