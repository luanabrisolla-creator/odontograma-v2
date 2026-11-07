# Histórico de versões

O que mudou em cada versão, da mais nova para a mais antiga. O guia do app como ele é hoje está no [LEIA-ME](../LEIA-ME.md).

## Versões 47.1 a 47.5 (correções depois da instalação)

- **47.5:** nomes das pessoas num padrão só (Maria das Dores e Silva); barra da classificação de risco em degradê do verde ao vinho; gráfico do indicador no tamanho real, com os valores do Brasil e da meta; "Como este número é calculado" em forma de conta; palavras dos cabeçalhos das tabelas sem quebrar no meio; texto da meta do PDSI com os 8 indicadores.

- **47.4:** correções da auditoria técnica: um retorno não escreve mais por cima de outro; a Ficha 7 conta a conclusão do tratamento uma vez por plano; procedimento indicado pode ficar "Não será feito" no retorno; retorno pode ser cancelado por quem registrou; cache do painel separado por perfil; Termo de Ciência exigido pelo servidor quando ligado. Pedidos da coordenação: painel mostra todos os números (sem "<5") e soma os retornos; busca de exames anteriores só no mesmo polo base; dentes em dúvida pela idade obrigatórios e em destaque; confirmação "todos hígidos"; face escolhida em destaque; placa e gengivite sem "Não avaliado"; tratamento básico em destaque; Fichas 3 e 7 num arquivo Excel só; urgência sem odontograma; Guia do app em Minha conta.

- **47.1:** gráfico do indicador com 2026 como ponto solto e números nos pontos; barras com a cor da meta alcançada; indicadores em dois grupos (PDSI e SIPLAM) e meta do PDSI só para os 3 pactuados; histórico que aparece para todos os perfis; CPO-D aos 12 anos separado; tabelas sem rolagem lateral; explicação de "Onde a pessoa mora".
- **47.2:** o app volta a abrir quando há um exame começado guardado no aparelho.
- **47.3:** tudo pelo exame, pessoa por pessoa: sai o registro de atividade coletiva à parte; a Ficha 3 sai dos exames (escovação, flúor-gel e insumos); Ações do Dia B vira uma síntese da ação; a exportação das Fichas 3 e 7 vai para Painel › Dados do app.

## Versão 47 (app 47 · servidor 47 · formato da planilha 26): Fichas do SIASI, plano de tratamento e histórico

Uma atualização única que fecha as decisões pendentes. Como instalar: [INSTALAR-VERSAO-47.md](INSTALAR-VERSAO-47.md).

- **Início:** "Pessoas atendidas" e "Atendimentos registrados"; alto risco e "reavaliar" pelo último exame **com odontograma**; a linha "Seus atendimentos desde…" mostra quando a base recomeçou.
- **Cores da classe de risco** revistas (A verde-escuro a F vinho), com letra escura nas cores claras.
- **Condições:** a página não desce mais sozinha para o resumo.
- **Exame (Fichas 4 e 7 do SIASI):** localidade de residência; gestante (Sim/Não e semanas, só para mulheres de 10 a 49 anos); fluorose pelo índice de Dean (10 a 19 anos); placa e gengivite com "Não avaliado"; prótese por arcada (sem, parcial ou total; 18, 28, 38 e 48 ausentes não lembram prótese); encaminhamentos por especialidade, com situação; prescrições; nomes do SIASI nos procedimentos (menos "Verniz fluoretado"); selos amarelo (indicado) e verde (realizado) nos dentes.
- **Necessidade sem conduta:** dente com cárie, dor ou abscesso precisa de um procedimento, de um encaminhamento ou de "acompanhamento" com o motivo.
- **Tratamento básico (APS):** o app sugere "concluído" quando não há pendências da APS e o CD confirma; "não concluído" pede o motivo. O nível de cada procedimento (APS ou especializada) tem uma lista padrão e ajuste por DSEI (Administração).
- **Retorno:** qualquer CD do mesmo DSEI registra o que fez no plano do último exame com odontograma; um odontograma completo novo fecha o plano anterior e herda as pendências.
- **Atividade coletiva** registrada à parte (Dia B), e **exportação das Fichas 7 e 3** para o SIASI (RT e coordenação).
- **Painel em três abas:** **Indicadores** (os 8 da NT 3/2025, com o histórico oficial do SIASI de 2020 a 2026 para os 34 DSEIs e o Brasil, dados abertos por polo e aldeia, meta de cada ano e meta do PDSI), **Dicas** (aprovadas pela coordenação titular; RT e coordenação sugerem) e **Dados do app** (o painel de antes, em 6 blocos, com idades-índice e necessidades). Comparações em ordem alfabética.
- **Histórico do SIASI** numa planilha separada ("Odontograma - histórico SIASI"), enviada pela titular uma vez por ano. Não se mistura com os exames.
- **Termo de Ciência** pronto e desligado: a titular liga, muda o texto (versões guardadas) e acompanha quem aceitou.
- **Marcar como duplicado** (titular): desativa o cadastro que sobra, guarda "duplicado de" e encerra as sessões. Nada é apagado.
- **Limpeza:** saíram o backup semanal antigo (fica o incremental, de madrugada), funções sem uso e o envio em lote antigo. O servidor recusa exames de apps anteriores ao 45.
- **Zerar exames** leva também os retornos para o arquivo.
- Guia para aprender: [MAPA-DO-CODIGO.md](MAPA-DO-CODIGO.md).

## Versão 46 (app 46 · servidor 46): pessoas sem classificação de risco

- **Sem odontograma, sem classificação:** na página inicial ("Últimos exames"), o atendimento sem odontograma aparece com **"–"** e a etiqueta **"Sem classificação"**. Antes ele aparecia, por engano, como "?" e "Baixo".
- **Painel:** o quadro "Atendimentos e odontograma" mostra também as **pessoas sem classificação de risco**, que só tiveram atendimentos sem odontograma no período. Quem teve pelo menos um exame com odontograma no período tem classificação.
- **Rótulo:** o número em destaque do painel passa a se chamar "pessoas com classificação de risco". A conta é a mesma de antes: pessoas com exame clínico.

**Como instalar a 46:** cole o `Codigo.gs` no Apps Script e publique **pelo lápis**. Confira o /exec: `"versao":46`. No celular, feche e abra o app com internet.

## Versão 45 (app 45 · servidor 45): odontograma opcional e condições gerais sem pular

### Odontograma opcional, incentivado
- Depois de Local e Indivíduo, o app pergunta: **"O odontograma foi preenchido neste atendimento?"**. Vigilância e prótese esperam essa resposta.
- **Sim:** o odontograma abre como antes.
- **Não:** aparece a mensagem *Registro odontológico* ("O preenchimento do odontograma contribui para o acompanhamento das condições de saúde bucal e o planejamento do cuidado. Sempre que possível, realize esse registro.") e a pergunta **"Qual foi o principal motivo?"**, com uma resposta obrigatória:
  1. Tempo insuficiente para realizar o odontograma
  2. A pessoa recusou o exame odontológico
  3. Não foi possível realizar o exame por dificuldade de colaboração
  4. Falta de condições adequadas (iluminação, espaço ou materiais)
  5. Condição clínica impediu a realização do exame
  6. Atendimento direcionado exclusivamente a ações coletivas
  7. Outro motivo (especifique): o texto é obrigatório
- **Sem odontograma, o app não registra nada que dependa do exame clínico:** vigilância, prótese, placa visível, gengivite, profilaxia/remoção de placa e raspagem supragengival. Continuam os outros procedimentos coletivos (inclusive o encaminhamento para especialidade), os insumos e as observações. O servidor confere tudo isso.
- **Sem odontograma não é dente hígido:** o exame não tem classe de risco nem ceo-d/CPO-D. Na planilha, no backup e no Looker, as contas por dente, os índices, a placa, a gengivite, a vigilância e a prótese ficam **vazias** (nunca 0 ou "não"). Esse exame não gera linhas em Dentes, Procedimentos e Faces e fica fora do acompanhamento da pessoa.
- **Painel:** um quadro novo, **Atendimentos e odontograma**, mostra:
  - atendimentos individuais registrados;
  - atendimentos com odontograma preenchido e sem odontograma (número e %), com os motivos;
  - atendimentos exclusivamente coletivos (motivo 6), à parte.

  A classe de risco, o ceo-d e o CPO-D contam só quem teve odontograma, pelo último exame clínico da pessoa. A comparação entre DSEI ganha o % de odontogramas preenchidos.
- **Looker (aba Exames):** colunas novas no fim: `odontograma_preenchido`, `motivo_sem_odontograma`, `motivo_sem_odontograma_outro`, `tipo_atendimento` (individual ou exclusivamente coletivo), `fez_procedimentos_coletivos` e `entregou_insumos`.

### Condições gerais e procedimentos
- Duas perguntas novas, com resposta obrigatória:
  - **"Foram realizados procedimentos coletivos ou de boca toda?"**: Não, ou Sim e quais;
  - **"Foram fornecidos insumos de higiene bucal?"**: Não, ou Sim e quais.
- O resumo só libera com todas as respostas, inclusive placa e gengivite quando há odontograma. A página não pula mais para o resumo antes de os coletivos e os insumos serem respondidos.

### Compatibilidade
- Este app precisa do servidor 45 (o aviso de servidor desatualizado aparece até ele ser publicado).
- O servidor 45 continua aceitando exames do app antigo, que contam como "odontograma preenchido".

**Como instalar a 45:**
1. **GitHub:** junte o pull request (ele inclui o servidor 44, do recomeço da base).
2. **Apps Script:** cole o `Codigo.gs`, salve e publique **pelo lápis**. Confira o /exec: `"versao":45`.
3. **Celular:** feche e abra o app com internet. Em Conta deve aparecer "app versão 45 · servidor versão 45".
4. **Looker:** em Exames, **Atualizar campos**.

## Servidor 44: recomeçar a base de exames do zero

Para a base de exames recomeçar do zero **sem mexer nos cadastros**, a coordenação titular roda uma vez, no editor do Apps Script, a função **`zerarExames`**. Nesta ordem, ela:
1. **atualiza o backup.** Se o backup falhar, nada muda;
2. **arquiva tudo:** todos os exames (válidos e cancelados) e as versões anteriores vão para uma planilha nova, **"Odontograma - exames arquivados até AAAA-MM-DD"**, na pasta do backup. Antes de esvaziar a base, ela confere se o arquivo tem todas as linhas;
3. **esvazia a aba Exames:** o painel, a página inicial, Meus exames e o Looker recomeçam do zero;
4. **troca o backup:** o backup antigo passa a se chamar **"Odontograma - backup (exames até AAAA-MM-DD)"**, com os exames, as versões e os alertas de antes, e um backup novo começa limpo;
5. **recusa exames de antes do recomeço:** um exame criado antes (guardado num celular sem internet, ou um exame antigo corrigido) é recusado com explicação e fica no aparelho como "Precisa de correção". Se ele precisar entrar, o profissional faz um exame novo.

**Não mudam:** cadastros, códigos de acesso, sessões, convites, ações do Dia B, população e Acessos. O recomeço fica anotado em Acessos ("Zerou a base de exames").

Uma pessoa examinada antes do recomeço entra como **pessoa nova**: o código de acompanhamento antigo não tem mais exames na base.

**Como fazer:**
1. Peça para todos enviarem os exames pendentes **antes** do recomeço (em Meus exames, nada "A enviar").
2. **Apps Script:** cole o `Codigo.gs`, salve e publique **pelo lápis**. Confira o /exec: `"versao":44`.
3. No editor, escolha **`zerarExames`** e clique em **Executar**. O registro de execução mostra quantos exames foram arquivados e os links do arquivo e do backup novo.
4. No Looker, as fontes continuam ligadas às mesmas abas: os gráficos ficam vazios até chegarem exames novos.

## Versão 43 (app 43 · servidor 43): corrigir o e-mail de um cadastro

Quem aceita um convite fica com o e-mail **do convite**. Se outra pessoa abrir o link (por exemplo, uma dentista abrir o convite feito para a RT), o cadastro dela fica com o e-mail errado. Agora a **coordenação titular** pode corrigir isso:

- **Administração > Usuários > Corrigir e-mail**, na linha da pessoa. Digite o e-mail certo e confirme.
- **O que continua igual:** o cadastro (nome, CRO, DSEI, perfil) e os exames, que continuam ligados a ela.
- **O que muda:** só o e-mail. O código antigo e os aparelhos conectados deixam de valer, e um **código novo vai para o e-mail certo**. Se o e-mail falhar, o código aparece na tela para repassar. Se o acesso estiver desativado, ele continua desativado e recebe um código novo ao ser reativado.
- **O e-mail antigo fica livre:** dá para convidar de novo a pessoa certa (no exemplo, a RT).
- A correção fica em Acessos ("Corrigiu e-mail do cadastro", com o e-mail antigo e o novo) e no Historico do backup.
- Só a titular faz isso. O e-mail novo não pode ser de outro cadastro nem o da titular.

**Exemplo (dentista que entrou pelo convite da RT):**
1. Se ainda não fez, mude o perfil dela para cirurgiã-dentista.
2. **Corrigir e-mail** na linha dela, com o e-mail dela. Ela recebe o código novo e passa a entrar com o e-mail dela.
3. Convide de novo a RT, no e-mail da RT.

Os exames que ela registrou enquanto o cadastro estava como RT continuam dizendo "referência técnica" no perfil da época, porque era assim que o cadastro estava quando os exames foram feitos.

**Como instalar a 43:** cole o `Codigo.gs` no Apps Script e publique **pelo lápis**. Confira o /exec: `"versao":43`.

## Versão 42 (app 42 · servidor 42): resetar todos os acessos

Para recomeçar os acessos do zero (por exemplo, quando há dúvida sobre quem ainda tem código), a coordenação titular roda uma vez no editor do Apps Script a função **`resetarTodosOsAcessos`**:
- todas as pessoas da aba Usuarios que tinham acesso (ativas ou desativadas) ficam **desativadas**, menos a coordenação titular, que entra pelas Propriedades do script;
- os **códigos são apagados**: nenhum código antigo volta a funcionar;
- as **sessões de todos os aparelhos** acabam na hora;
- **cadastros, exames e histórico continuam** como estão. O reset fica anotado em Acessos, e cada mudança aparece no Historico do backup;
- pedidos pendentes e convites em aberto não mudam.

**Como as pessoas voltam:**
1. A pessoa abre o app e pede acesso com o mesmo e-mail. Isso vira um **pedido de reativação**, e o app avisa que vai chegar um código novo.
2. Quem gere o acesso (RT do DSEI, coordenação ou titular) toca em **Reativar**, em Equipe ou na Administração. A pessoa recebe um **código novo por e-mail**. Se o e-mail falhar, o código aparece na tela de quem reativou, para repassar.
3. **Comece reativando as RTs** (e as pessoas da coordenação). Enquanto um DSEI não tiver RT ativa, os pedidos dos dentistas desse DSEI vão para a coordenação.

O Google envia cerca de 100 e-mails por dia numa conta Gmail comum. Se houver muita gente para reativar, faça isso ao longo de alguns dias, ou repasse o código que aparece na tela.

**Como instalar a 42:**
1. **Apps Script:** cole o `Codigo.gs`, salve e publique **pelo lápis**. Confira o /exec: `"versao":42`.
2. **Só quando quiser resetar:** no editor, escolha `resetarTodosOsAcessos` e clique em **Executar**. O registro de execução mostra quantos acessos foram resetados.

## Versão 41 (app 41 · servidor 41): aparelho compartilhado, sessões e cancelamento com aviso

### Aparelho usado por mais de uma pessoa
- **O exame em andamento é de quem o começou.** Se a sessão de alguém vence (ou o acesso cai) no meio de um exame, ele sai da tela e fica guardado no aparelho para essa pessoa. Quem entrar depois começa com o exame em branco. Quando a dona ou o dono entrar de novo, o exame volta, com o aviso "O exame que você tinha começado neste aparelho foi recuperado".
- **Quando o acesso cai**, as listas e os números que vieram do servidor (exames na nuvem, página inicial, equipe, Administração) saem da memória do app. Os exames não enviados continuam guardados.
- **A cópia de segurança** (Meus exames > Mais opções) leva só os exames de quem está no aparelho, não os de outras pessoas.

### Sessões
- **Desativar um acesso encerra na hora as sessões da pessoa em todos os aparelhos.** Se ela for reativada, entra de novo com o mesmo código. Uma sessão antiga, como a de um celular perdido, não volta a valer. O registro em Acessos diz quantas sessões foram encerradas.
- **"Sair deste aparelho" também encerra a sessão no servidor**, quando há internet. Sem internet, a pessoa sai do aparelho do mesmo jeito.
- Trocar o perfil ou o DSEI **não** derruba a sessão: a cada pedido, o servidor confere o cadastro atual, então a permissão nova vale na hora.

### Cancelar um exame que serviu de referência
- Se o exame foi usado como referência (na conferência dente a dente) por um exame posterior da mesma pessoa, o app **avisa e pede confirmação**, com a data desses exames.
- Os exames posteriores **não mudam**: continuam apontando para o exame usado na época. Só a ordem dos exames da pessoa (1º, 2º...) é refeita.
- O cancelamento guarda quais exames usaram este como referência e quais exames da pessoa eram posteriores. Isso aparece:
  - no backup e na aba Exames da análise, nas colunas `cancelado_era_referencia_de` e `cancelado_com_exames_posteriores`;
  - em Acessos.

**Como instalar a 41:**
1. **Apps Script:** cole o `Codigo.gs`, salve e publique **pelo lápis**. Confira o /exec: `"versao":41`.
2. **App:** feche e abra com internet. Em Conta deve aparecer "app versão 41 · servidor versão 41".
3. **Looker (opcional):** em Exames, **Atualizar campos** (duas colunas novas no fim).

## Versão 40 (app 40 · servidor 40): o passado protegido desde o primeiro envio, cancelados no Looker

### Backup
- **O original agora é o primeiro envio.** Quando um exame já enviado é corrigido, o servidor guarda **na hora** a versão que estava na planilha, na aba `_versoes_exames` da planilha principal, antes de gravar a nova. O backup da madrugada junta essas versões: `dados_originais_json` é sempre o que chegou ao servidor da primeira vez, e cada correção vira uma versão em `Exames_versoes`, mesmo se aconteceu antes do backup.
- **O perfil da época não é reescrito numa correção.** Se a pessoa era cirurgiã-dentista quando fez o exame e depois virou RT, a correção mantém "cirurgião-dentista" e o DSEI daquela época no exame. O perfil de hoje aparece à parte, em `perfil_profissional_atual`.
- **Cancelar não cria versão nova:** os dados clínicos não mudam.
- **Gravação incremental de verdade:** o backup só regrava as linhas que mudaram. `conferido_em` passa a ser a última vez que a linha mudou; a data da conferência geral fica na aba Sobre.

### Looker
- **Os cancelados entram em todas as abas** (Exames, Dentes, Procedimentos e Faces), com a coluna `situacao_registro` = válido ou cancelado. O motivo do cancelamento fica na aba Exames.
- ⚠️ **Nos painéis que já existem, ponha um filtro `situacao_registro = válido`** nas fontes (Recurso > Gerenciar fontes de dados > Editar > Filtro, ou um filtro em cada gráfico). Sem isso, os números passam a contar também os exames cancelados.
- **Nova coluna `id_exame_dente`** (por exemplo, `EX123|16`) em Dentes, Procedimentos e Faces. Use essa coluna para ligar dente com procedimento e face. Para ligar com a aba Exames, use `id_exame`.

**Como instalar a 40:**
1. **Apps Script:** cole o `Codigo.gs`, salve e publique **pelo lápis**. Confira o /exec: `"versao":40`.
2. **GitHub:** já está no repositório, se você juntou o pull request.
3. **App:** Administração > Planilha de análise > **Atualizar agora**.
4. **Looker:**
   - em cada fonte, **Atualizar campos**;
   - ponha o filtro `situacao_registro = válido` nos painéis de indicadores.

## Versão 39 (app 39 · servidor 39): backup incremental e análise em quatro níveis

### Backup: uma pasta e uma planilha só, que nunca apaga
- O backup semanal (uma cópia inteira da planilha toda semana, guardando só as 8 últimas) **sai**. No lugar, há **uma planilha só, "Odontograma - backup"**, na pasta "Odontograma - backups" do Drive, atualizada **toda madrugada** pela tarefa diária e pelo botão **Fazer backup agora** (Administração, só a titular).
- **Incremental:** a cada vez, o backup compara com o que já tem e só acrescenta o que é novo (exames, versões, cadastros, eventos de Acessos, população).
- **Nada é apagado:** se um registro some da planilha principal, ele continua no backup com `na_planilha_principal = não` e a data em `sumiu_da_principal_em`, e entra um **alerta** na aba Alertas. A coordenação titular recebe um e-mail.
- **O passado não é reescrito:**
  - **Exames:** `dados_originais_json` guarda o exame completo (com cada dente) como entrou no backup e nunca muda. O cancelamento (motivo, observação, data, nome e id de quem cancelou) vai para as colunas de situação atual.
  - **Profissional:** `perfil_profissional_no_exame` e `dsei_profissional_no_exame` mostram como era o cadastro no momento do exame. `perfil_profissional_atual`, `dsei_profissional_atual` e `situacao_profissional_atual` mostram como está hoje. A partir do servidor 39, o próprio exame guarda o perfil e o DSEI de quem o salvou. Nos exames antigos, vale o cadastro do dia em que o exame entrou no backup (a coluna `origem_perfil_no_exame` diz qual dos dois).
  - **Cadastros, ações do Dia B, convites e códigos reservados:** as colunas `_inicial` guardam como era o registro quando entrou no backup, e as demais mostram como está hoje. Cada mudança (por exemplo, de CD para RT ou de DSEI) vai para a aba **Historico**, com o valor anterior, o novo e a data.
- **Exame alterado depois de enviado:** a versão nova entra em **Exames_versoes** (com o que mudou, por exemplo "dentes 16, 26"), a original continua, e entra um alerta. Hoje o app ainda deixa corrigir um exame já enviado. O recomendado é cancelar o exame errado e registrar um novo.
- **Para reconstruir o sistema:** use a versão mais recente de cada exame (em Exames_versoes, ou em `dados_originais_json` se não houver versão) com a situação atual. Nas outras abas, use as colunas com o mesmo nome da planilha principal. A aba **Sobre** do backup explica cada aba.
- **Antes de uma reorganização da planilha**, o servidor atualiza este mesmo backup em vez de fazer uma cópia inteira. Se o backup falhar, nada muda.
- As cópias antigas ("Backup Odontograma ...") que já estão no Drive **não são apagadas**: apague à mão quando quiser.

### Planilhas de análise (Looker Studio) em quatro níveis, sem dados de acesso
- **"Odontograma - análise"**: abas **Exames** (uma linha por exame), **Dentes** (uma por dente), **Procedimentos** (nova: uma por procedimento indicado ou realizado em cada dente) e **Sobre**.
  - **Exames** ganha no fim o perfil do profissional no exame e hoje, mais contas prontas (dentes com cárie, faces com cárie, dentes com dor ou abscesso, procedimentos indicados e realizados).
  - **Dentes** mantém as colunas antigas na mesma ordem e ganha no fim: uf, classe_risco, arcada, lado, grupo_dente, presente, estado, tem_carie_ativa, dor_ou_abscesso e o número de procedimentos.
  - **Procedimentos** traz em cada linha a condição daquele mesmo dente (tem_carie, tem_carie_ativa, faces_com_carie, dor, abscesso_fistula) e `momento` = indicado ou realizado. Exemplo de pergunta que ela responde: "entre os dentes com cárie, quantos receberam ART?". Ainda **não** há regra de tratamento adequado: isso depende da regra clínica que relaciona condição e procedimento esperado.
- **"Odontograma - análise - faces"** (planilha nova): aba **Faces**, com uma linha por face de cada dente presente. A coluna `face` traz a letra usada naquele dente (O ou I, V, L ou P, M, D), e `face_nome` junta as faces equivalentes (oclusal/incisal, lingual/palatina) para comparar mesial, distal, vestibular, oclusal/incisal e lingual/palatina.
  - Ela fica à parte porque tem cerca de 5 linhas por dente e o Google aceita até 10 milhões de células por planilha.
  - É refeita por uma tarefa própria, às 4h, porque o Google dá 6 minutos a cada tarefa.
- Nenhuma planilha de análise tem hashes, tokens, sessões ou senhas.
- Todas ligam pelo `id_exame`.

**Como instalar a 39:**
1. **Apps Script:** cole o `Codigo.gs`, salve e publique **pelo lápis**. Confira o /exec: `"versao":39`.
2. **Apps Script, uma vez só:** escolha `ativarBackup` e clique em Executar (autorize se pedir). Isso desliga o backup semanal antigo, cria as tarefas da madrugada e faz o primeiro backup.
3. **GitHub, na raiz:** `index.html`, `sw.js`, `Codigo.gs` e `LEIA-ME.md`. **Dentro de `testes`:** `servidor.test.js`, `navegador.test.js` e `gas-simulado.js`.
4. **Actions:** ✓ verde. **Celular:** feche e abra o app com internet; em Conta deve aparecer "app versão 39 · servidor versão 39".
5. **Administração > Planilha de análise > Atualizar agora** (cria a planilha de faces). Depois:
   - **Looker Studio:** adicione as fontes novas (aba Procedimentos e planilha de faces).
   - Nas fontes Exames e Dentes que já existem, clique em **Atualizar campos** para as colunas novas aparecerem. Os gráficos que já existem continuam funcionando.

## Servidor 38: planilha de análise sem perder a ligação com o Looker Studio

- A planilha de análise passa a ser reescrita **dentro das mesmas abas**. Antes, cada atualização criava abas novas e apagava as antigas; o Looker Studio guarda o número interno de cada aba e mostrava "A planilha à qual você está tentando se conectar não existe mais".
- Durante a atualização, a aba Sobre mostra "Atualização em andamento"; se essa linha continuar lá, a atualização não terminou (veja Erros recentes).
- O botão "Atualizar agora" diz o motivo quando não consegue (por exemplo, falta autorizar no Apps Script) e o que fazer.

**Como instalar o servidor 38:**
1. **Apps Script:** cole o `Codigo.gs`, salve e publique **pelo lápis**. Confira o /exec: `"versao":38`.
2. **GitHub, na raiz:** `Codigo.gs` e `LEIA-ME.md`. **Dentro de `testes`:** `servidor.test.js` e `gas-simulado.js`.
3. **App:** Administração > Planilha de análise > **Atualizar agora**.
4. **Looker Studio, uma vez só:** em cada fonte (Exames e Dentes), Recurso > Gerenciar fontes de dados adicionadas > Editar > **Editar conexão** > a mesma planilha e a mesma aba > **Reconectar** > Aplicar. Os gráficos continuam iguais.

## Versão 38: exame numa página só e planilha de análise (Looker Studio)

### Planilha de análise (servidor 37)
- O servidor cria e mantém uma planilha separada, **"Odontograma - análise"**, na pasta "Odontograma - backups" do Drive. Ela é só da conta dona da planilha (a coordenação titular).
- Abas: **Exames** (uma linha por exame válido, com as mesmas colunas da aba Exames do app, sem as duas colunas do sistema), **Dentes** (uma linha por dente de cada exame válido: situação, faces, dor, abscesso, tratamentos indicados e realizados, observação, mais `tem_carie` e `faces_com_carie`; cada linha traz também id do exame, data, DSEI, polo, aldeia, faixa etária, sexo e idade) e **Sobre** (quando foi atualizada e quantos exames tem).
- É refeita **toda madrugada** pela tarefa diária e pelo botão **Atualizar agora** em Administração (só a titular). No fim, o servidor confere se o número de exames bate com a planilha do app; se não bater, aparece em Erros recentes. A versão anterior só é trocada quando a nova está completa.
- O **Looker Studio lê esta cópia**, nunca a planilha do app: ele não atrapalha os envios dos dentistas.
- Espaço: com todos os dentes, um exame de dentição mista ocupa 52 linhas na aba Dentes; a planilha de análise comporta cerca de 6 mil exames de dentição mista (mais, se houver exames de dentição decídua ou permanente). A Administração mostra o espaço usado.
- No editor do Apps Script, `atualizarPlanilhaAnalise` refaz a planilha na hora e mostra o endereço dela no registro.

### Exame numa página só (app 38)
- **O exame fica todo numa página, de cima para baixo**, sem o botão "Continuar". As partes que ainda não podem ser preenchidas aparecem em cinza, com um cadeado e o que falta completar antes. Ao completar uma parte, a próxima fica colorida e a página desce sozinha até ela.
- **Vigilância e prótese** são liberadas junto com o odontograma. Depois do odontograma a página **não** desce sozinha: o profissional confere a dentição (mista, incompleta) e segue quando quiser.
- O que já foi liberado continua liberado, mesmo se a pessoa voltar e apagar uma resposta. A exceção é a idade: o odontograma é montado pela idade, então **mudar a data de nascimento depois de marcar dentes faz o odontograma voltar do início** (dentição e dentes esperados pela idade nova, nada marcado). Antes, o app pede confirmação; se o profissional cancelar, a data antiga e os dentes marcados ficam. O resto do exame (local, indivíduo, vigilância, prótese e condições) continua como está.
- A barra de números no topo continua: mostra em que parte a tela está e leva até cada parte.
- No fim, **"Resumo e salvar"**: o resultado, cada parte com "Editar" e o **resumo de cada dente** (os dentes com alguma marcação, um por linha; os hígidos, os não erupcionados e os esfoliados, juntos).
- O botão passa a se chamar **"Salvar e enviar"** (na barra de baixo e no fim do resumo).
- Depois de salvar, uma **janela no centro da tela** mostra o código, a classe e o que aconteceu com o envio (enviando, enviado, sem internet, ou se a planilha não aceitou e por quê). A janela se atualiza sozinha quando o envio termina.
- **Legenda do odontograma** em três colunas iguais (Dente, Faces, Marcas), com todos os ícones do mesmo tamanho e as linhas com o mesmo espaçamento.

**Como instalar a 38:**
1. **Apps Script:** cole o `Codigo.gs`, salve e publique **pelo lápis**. Confira o /exec: `"versao":38` (a partir do servidor 38).
2. **GitHub, na raiz:** `index.html`, `sw.js`, `Codigo.gs` e `LEIA-ME.md`.
3. **GitHub, dentro de `testes`:** `servidor.test.js`, `navegador.test.js` e `gas-simulado.js`.
4. **Actions:** ✓ verde. **Celular:** feche e abra o app com internet; em Conta deve aparecer "app versão 38 · servidor versão 37".
5. **Administração > Planilha de análise > Criar agora.** Depois, conecte o Looker Studio à planilha "Odontograma - análise".

## Servidores 35 e 36 (versão 37.1): correção do teste de carga

O teste de carga com 50 profissionais mostrou dois problemas. Os dois foram corrigidos só no servidor (o app continua o mesmo, versão 37).

- **Entradas perdidas com muita gente ao mesmo tempo.** As sessões ficavam numa aba da planilha e, com várias pessoas entrando no mesmo segundo, uma gravação apagava a outra. Agora cada sessão fica guardada separada, nas Propriedades do script (`sessao_...`), e a aba `_sessoes` sai.
- **Cada envio demorava uns 9 segundos.** Quase tudo era ler a aba Exames inteira (7 s com 5.690 exames) e atualizar a aba Uso (1,7 s). Agora:
  - o servidor guarda uma **cópia rápida** do índice e dos resumos dos exames e do cadastro de usuários na memória do Google, e só lê a planilha quando essa cópia não existe. Cada envio acrescenta à cópia só o que mudou;
  - os exames novos de um envio vão para a planilha **numa escrita só**, antes de o app receber o "deu certo" (se a escrita falhar, o app recebe erro passageiro e manda de novo);
  - a aba **Uso** passa a ser atualizada **uma vez por dia**, pela tarefa diária. Durante o dia, os números de cada pessoa ficam guardados nas Propriedades do script (`uso_...`).
- **A cópia rápida nunca substitui a planilha.** Ela é descartada e refeita sozinha quando alguém edita a aba Exames ou Usuarios na tela, quando uma linha é apagada à mão, quando um envio é interrompido no meio e, por garantia, toda madrugada. Antes de escrever por cima de um exame, o servidor confere na planilha se a linha é mesmo daquele exame.
- **Servidor 36: fila mais educada com 100 celulares ao mesmo tempo.** O Google roda no máximo 30 pedidos ao mesmo tempo nesta conta, e quem espera na fila ocupa uma dessas vagas. Com 100 profissionais, as vagas lotavam e alguns pedidos eram recusados pelo Google ("falha de rede"). Agora o servidor espera no máximo 4 segundos (antes 6) e manda o app tentar de novo em 15 a 45 segundos, sorteado (antes 5 a 15). A fila esvazia no mesmo tempo; cada profissional pode esperar alguns segundos a mais pela confirmação.
- Mexer à mão na aba Usuarios (por exemplo, mudar um status) vale na hora pela edição na tela. Se a mudança for feita de outro jeito (por um programa), vale em até 10 minutos.

**Como instalar o servidor 36:**
1. **Apps Script:** cole o `Codigo.gs` inteiro, salve e publique **pelo lápis** (Implantar > Gerenciar implantações > lápis > Nova versão > Implantar). Confira o /exec: `"versao":36`.
2. **GitHub:** na raiz, `Codigo.gs` e `LEIA-ME.md`. Dentro de `testes`: `servidor.test.js`, `navegador.test.js` e `gas-simulado.js`.
3. **Actions:** ✓ verde. **Celular:** "app versão 37 · servidor versão 36".

## Versão 37: planilha nova, envio mais rápido e mais segurança

**Planilha (formato 25): uma linha por exame.**
- A aba **Dentes sai**. O detalhe de cada dente fica guardado no exame completo, e a aba Exames ganha as **contas prontas** (quantos dentes e faces com cada condição, quantos tratamentos indicados e realizados). Cada exame passa a ocupar uns 110 quadradinhos em vez de mais de mil: cabem cerca de **85 mil exames**.
- Vigilância: uma coluna de sim ou não para cada condição. Prótese: `protese_sup_necessita`, `protese_sup_usa` (e as inferiores), com sim · não · não avaliado.
- **Dados para análise (Excel):** em Administração (e em Meus exames, só os próprios), um arquivo com uma linha por exame e três partes: o exame, as contas prontas e cada dente (situação, 5 faces, dor, abscesso, tratamento indicado e realizado, observação).

**Envio mais rápido com muita gente ao mesmo tempo.**
- O app manda até **10 exames por pedido** e o servidor lê só o que precisa (não a planilha inteira).
- Fila cheia: o servidor responde **"ocupado"** na hora e o app tenta de novo sozinho em alguns segundos.
- Erro passageiro: o app tenta de novo sozinho, cada vez esperando mais (2, 5 e 15 minutos). Um aviso quando o problema começa e outro quando os exames saem.
- Exame recusado pelo servidor: aparece em Meus exames como **"Precisa de correção"**, com o motivo, e o app para de tentar até o profissional corrigir.
- O Painel guarda a conta pronta enquanto nenhum exame mudar.

**Segurança.**
- **Acesso que vence em 15 dias sem usar o app.** Depois de entrar, o aparelho guarda uma sessão, e não o código. Exames guardados nunca são apagados: sem internet, o profissional continua examinando; com internet, digita o código de novo e os exames saem.
- **Senha da coordenação titular: no mínimo 12 caracteres.**
- O servidor guarda só os campos permitidos de um exame (o resto é descartado e anotado em Acessos).
- O modo sem internet só guarda a página se ela for mesmo o Odontograma (página de Wi-Fi com login ou arquivo trocado não substituem a cópia boa).
- Arquivos baixados protegidos contra fórmulas. Leitor de Excel guardado no repositório (`exceljs.min.js`), sem depender de outro site; a planilha de população passa a ser aceita em .xlsx ou .csv (.xls antigo: salve como .xlsx).
- O endereço /exec mostra só a versão. A situação da instalação fica em Administração.

**Para a coordenação titular, em Administração.**
- **Erros recentes:** o motivo em linguagem simples, o que fazer e o detalhe técnico para copiar. E-mail no máximo a cada 6 horas.
- **Espaço da planilha:** aviso a partir de 50% (e e-mail em 50, 60, 75, 85, 90 e a cada 1% de 95 a 100%), com quantos exames ainda cabem.
- **Tarefa diária** (de madrugada, criada sozinha): confere o espaço, corta linhas e colunas vazias, passa o registro de Acessos com mais de 12 meses para a planilha "Odontograma - arquivo de acessos" (na pasta de backups) e apaga sessões vencidas.

**Para o profissional, em Meus exames.** Botão "Baixar cópia de segurança dos exames não enviados" (e "Importar cópia de segurança" em outro aparelho) e aviso quando um exame está guardado há mais de 3 dias.

**Como instalar a 37 (nesta ordem):**
1. **Senha:** confira se a `CHAVE_COORDENACAO` tem pelo menos 12 caracteres (Propriedades do script). Se não tiver, troque antes.
2. **Apps Script:** cole o `Codigo.gs` e publique **pelo lápis**. Confira o /exec: `"versao":34`.
3. **Planilha:** sem exames, ela se reorganiza sozinha no primeiro uso (com backup antes). Com exames de teste, confirme em **Administração > Atualização da planilha pendente**. A aba Dentes sai (está no backup).
4. **GitHub:** na raiz, `index.html`, `sw.js`, `Codigo.gs`, `compartilhado.js`, `LEIA-ME.md`, `exceljs.min.js` e `exceljs-LICENCA.txt` (novos). Dentro de `ferramentas`: `verificar.js`. Dentro de `testes`: `servidor.test.js`, `navegador.test.js` e `gas-simulado.js`.
5. **Actions:** ✓ verde. **Celular:** "app versão 37 · servidor versão 34".

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

## Versões antigas (resumo)

- **Servidor 38:** planilha de análise reescrita nas mesmas abas (o Looker Studio não perde a ligação).
- **38 (servidor 37):** planilha de análise para o Looker Studio, refeita toda madrugada; exame numa página só, com partes liberadas aos poucos; resumo de cada dente; botão "Salvar e enviar"; janela no centro depois de salvar; legenda em três colunas.
- **37.1 (servidores 35 e 36):** sessões guardadas separadas (sem perder entradas com muita gente ao mesmo tempo); cópia rápida dos exames e envio numa escrita só; aba Uso atualizada de madrugada; fila que não lota o limite do Google.
- **37:** uma linha por exame (sem aba Dentes) e arquivo de análise em Excel; envio em lote com fila organizada; acesso que vence em 15 dias; erros explicados e avisos de espaço para a coordenação titular; cópia de segurança dos exames.
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
