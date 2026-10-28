# Odontograma: guia de instalação

## Versão 30: código de acompanhamento novo, campos obrigatórios e correções da revisão (inclui tudo da 29)

**Como instalar.** Desta vez o servidor muda. Faça tudo de uma vez e nesta ordem, sem misturar arquivos novos com os antigos do GitHub:
1. **Apps Script:** cole o `Codigo.gs` inteiro e publique **pelo lápis** (Gerenciar implantações > lápis > Nova versão > Implantar).
2. **Confira:** abra o endereço /exec. Ele deve mostrar `"versao":26`. Só passe para o passo 3 depois disso. O servidor novo continua aceitando o app antigo, então os celulares não param enquanto o GitHub não é atualizado.
3. **GitHub, tudo no mesmo envio:** `index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`, `mapa-ti.json`, `paisagem.webp` e o `Codigo.gs` (o do GitHub estava na versão 18; ele não tem senha, então pode ir).
4. **Verificação automática (opcional, recomendado):** no mesmo envio, mande a pasta `.github/workflows` com o `verificar.yml` e a pasta `ferramentas` com o `verificar.js`, e apague o arquivo vazio `.github/workflows/main.yml`. A cada envio, a aba **Actions** do GitHub mostra um ✓ verde ou um ✗ vermelho com o problema explicado.
5. **Teste antes de usar com dados reais:**
   - entrar como dentista, como RT e como coordenação;
   - pessoa nova com internet e pessoa nova sem internet (modo avião);
   - reavaliação pelo código e exame em outro aparelho;
   - tentar salvar sem local, sem vigilância e sem placa ou gengivite;
   - exame feito sem internet sendo enviado quando a internet volta;
   - instalar o app no celular e abrir sem internet;
   - ação do Dia B.

**O que mudou:**
- **Código de acompanhamento sem CRO.** Pessoas novas recebem um código como `RR-SUR-HAK-42E64K9P`: UF, 3 letras do polo, 3 letras da aldeia e 8 caracteres sorteados.
  - O sorteio não usa letras e números que se confundem (O/0, I/1, L). São 31 caracteres possíveis em cada posição, o que dá mais de 850 bilhões de combinações para cada aldeia.
  - **Com internet:** antes de mostrar o código, o app pede ao servidor que o **reserve**. A reserva é feita com trava, então dois aparelhos nunca recebem o mesmo código. Se o código sorteado já existir, o app sorteia outro antes de mostrar. As reservas ficam na aba `_codigos_reservados`.
  - **Sem internet:** o código é sorteado no aparelho e vale como definitivo.
  - Depois de mostrado, o código nunca muda, nem se a aldeia for corrigida.
  - Os códigos antigos (com o CRO) continuam valendo e são encontrados normalmente.
- **O servidor não acrescenta mais “-2”.** A conferência no envio ficou só como proteção extrema. Ela só pode disparar se dois aparelhos sem internet sortearem os mesmos 8 caracteres na mesma aldeia, algo praticamente impossível. Nesse caso, o exame não é juntado ao de outra pessoa: ele é recusado com um aviso, e o caso fica nos Acessos como “Código repetido”.
- **O código mostrado é imutável em toda a tela.** Depois de gerado, o app sempre mostra o mesmo código, mesmo que a UF, o polo ou a aldeia sejam corrigidos. Se a pessoa for vinculada por engano e depois voltar a ser "pessoa nova", volta o mesmo código, e não um recalculado. Um código mostrado sem internet também nunca é trocado quando a internet volta.
- **Cada cirurgião-dentista e cada RT atua só no DSEI do próprio cadastro.** A regra vale no app e é conferida de novo no servidor, então um valor alterado no navegador não passa.
  - **No exame:** o DSEI vem do cadastro e o campo fica travado ("Do seu cadastro. Para mudar de DSEI, fale com a coordenação."). A UF é escolhida entre as do DSEI.
  - **No envio:** o servidor recusa qualquer exame de CD ou RT marcado com outro DSEI (ou sem DSEI), inclusive na edição de um exame já enviado. Nada é gravado e a tentativa fica nos Acessos como "Tentativa de acesso recusada".
  - **Nas buscas:** a busca por código, a busca por dados e a reserva de código usam sempre o DSEI do cadastro. Se o app pedir outro DSEI, a busca volta vazia com um aviso.
  - **Lista de aldeias do exame, Equipe, convites e ações do Dia B:** também só do DSEI do cadastro.
  - **Exceção, de propósito: o Painel.** Ele mostra dados agregados, sem identificar ninguém, e números de 1 a 4 aparecem como "<5". Por isso todos os perfis veem a visão Geral, qualquer DSEI e a comparação entre DSEIs, além da Minha produção. Fica restrita só a lista de aldeias sem exame (para busca ativa): a RT vê a do próprio DSEI e a coordenação a de qualquer um.
  - **Coordenação:** é o único perfil que trabalha com vários DSEIs, conforme as permissões de gestão. Isso inclui a coordenação que também é RT.
  - **Para mudar alguém de DSEI:** a coordenação desativa o acesso atual e a pessoa faz um novo pedido de acesso com o DSEI novo. Não existe ainda um botão "mudar DSEI". Os exames que ela fez no DSEI antigo continuam na planilha, mas ela não consegue mais editá-los.
- **Continuidade do cuidado:** o histórico de uma pessoa pode ser visto pela coordenação e pela RT e pelos cirurgiões-dentistas do DSEI da pessoa, inclusive os exames feitos por outros profissionais do DSEI. Quem é de outro DSEI não vê. Cada consulta ao histórico feita por quem não fez todos os exames fica registrada na aba Acessos ("Viu o acompanhamento de uma pessoa").
- **Campos obrigatórios:** o exame só é salvo com o local de atendimento, a vigilância em saúde bucal (ou “Não identificado”), a placa visível e a gengivite respondidos (Sim ou Não). Placa e gengivite começam sem resposta, em vez de “Não”. A etapa Condições só fica ✓ com as três respostas.
- **Aviso de servidor desatualizado:** o app compara com a **versão mínima** de que precisa (26), não exige número igual. Servidor 26, 27 ou mais novo é compatível. Servidor mais antigo, ou que nem informa a versão, mostra uma faixa vermelha no topo: a coordenação vê o que fazer e os dentistas veem um aviso simples. Minha conta mostra as duas versões (app 30 · servidor 26).
- **Modo sem internet consertado:** o `sw.js` tentava guardar o `icon.svg`, que não estava no GitHub, e por isso a instalação para uso offline falhava. Agora ele guarda primeiro o essencial (o app) e os outros arquivos sem travar se algum faltar.
- **Nome do app:** “Odontograma · Saúde Bucal Indígena”, no ícone do celular e nos e-mails.

## Versão 29: DSEI → polo base → aldeia em todo o app e Equipes só para acompanhar (inclui tudo da 28)

**Como instalar:** cole o `Codigo.gs` no Apps Script e publique **pelo lápis**: a única mudança no servidor é mandar o polo junto na lista de reavaliação, e o /exec continua mostrando `"versao":25`. No GitHub, troque o `index.html` e o `sw.js`. Se a 27 e a 28 ainda não foram instaladas, envie também o `mapa-ti.json` e o `paisagem.webp`.

- **Ordem do local:** no exame, o DSEI vem primeiro. A UF é escolhida entre as do DSEI, e quando a aldeia vem da lista ela é preenchida sozinha. Depois vêm o polo base e a aldeia.
- **Polo antes da aldeia em todas as telas:**
  - no cabeçalho do exame ("Polo Surucucu · Kataroa · UBSI · data");
  - em Meus exames ("Surucucu › Kataroa");
  - na linha do tempo da pessoa e na lista de reavaliação;
  - no exame aberto para leitura;
  - na lista de aldeias sem exame do Painel.
- **Equipes da coordenação** passou a ser só para acompanhar: profissionais, exames do mês, último envio e exames do DSEI. Convites, pedidos de acesso, código novo e desativação ficam só na **Administração**, e um aviso leva até ela.
- **A RT continua convidando dentistas e aprovando pedidos na aba Equipe**, porque ela não tem a aba Administração.

## Versão 28: cores da Saúde Indígena, polo antes da aldeia e ilustração na entrada (inclui tudo da 27)

**Como instalar:** no GitHub, troque o `index.html` e o `sw.js` e **envie o arquivo novo `paisagem.webp`**, na mesma pasta. Se a versão 27 ainda não foi instalada, siga também os passos dela (o `Codigo.gs` e o `mapa-ti.json` estão neste pacote). O Apps Script continua na versão 25.

- **Ordem do local:** DSEI, depois polo base, depois aldeia. A busca de aldeia aparece só depois de escolher o polo e procura só nas aldeias desse polo (quando o polo tem mais de 8 aldeias).
- **Cores da Saúde Indígena** (vermelho, amarelo, verde e azul), mais fortes:
  - uma faixa colorida no alto;
  - os quatro blocos da página inicial, um em cada cor;
  - as etapas do exame, cada uma com a sua cor, e o mesmo tom na borda de cada parte do formulário;
  - o nível de risco colorido na barra de baixo (verde, amarelo e vermelho);
  - "Na nuvem", "A enviar" e "Erro" em verde, amarelo e vermelho;
  - os botões de escolha (Não ou Sim, Mista, Indicado ou Realizado) ficam preenchidos quando marcados;
  - o item atual do menu lateral fica azul cheio.
- **Tela de entrada:** a ilustração da aldeia ocupa o fundo inteiro. No celular, ela fica parada atrás e o conteúdo rola por cima.

## Versão 27: população da SESAI, listas de aldeias, cobertura e mapa (inclui tudo da 25 e da 26)

**Como instalar:**
1. Cole o `Codigo.gs` no Apps Script e publique **pelo lápis** (Gerenciar implantações > lápis > Versão: Nova versão > Implantar). O endereço continua o mesmo, e o /exec deve mostrar `"versao":25`. No primeiro uso, a planilha é reorganizada sozinha, com backup antes, porque a aba Exames ganha colunas novas.
2. No GitHub, troque o `index.html` e o `sw.js` e **envie o arquivo novo `mapa-ti.json`**, na mesma pasta.
3. Entre como coordenação, vá em **Administração > População e aldeias da SESAI** e envie a planilha baixada do [painel da população indígena da SESAI](https://infoms.saude.gov.br/extensions/sesai_pop_indigena/sesai_pop_indigena.html). Repita uma vez por ano, quando a SESAI atualizar a população.

**O que muda:**
- **Risco em três níveis para todos:** A e B baixo, C e D moderado, E e F alto. A escolha de agrupamento saiu de Minha conta. A coluna `nivel_risco` da planilha é recalculada pela classe, inclusive nos exames antigos.
- **Polo e aldeia da lista oficial:** depois do envio da planilha, o exame mostra os polos do DSEI e as aldeias do polo, com uma busca por nome. O exame guarda os códigos da aldeia, do polo, da Terra Indígena e do município (IBGE). A UF vem da aldeia.
- **Aldeia ou polo fora da lista:** as opções "Outra aldeia" e "Outro polo" abrem um campo para digitar. Na planilha, a coluna `aldeia_fora_da_lista` marca esses exames.
- **UFs que faltavam:** GO, RJ, RS, SP, RN e ES entraram na lista, com os DSEIs de cada uma.
- **Cobertura no Painel:** mostra a porcentagem da população examinada no período, uma pirâmide etária com faixas de 5 anos (as da planilha da SESAI), a tabela por DSEI (visão geral) ou por polo (visão por DSEI) e, só para a RT e a coordenação, as aldeias sem nenhum exame, para busca ativa. Cada pessoa conta uma vez no período, e números de 1 a 4 aparecem como "<5".
- **Mapa por Terra Indígena:** cada Terra Indígena é pintada conforme a cobertura. Tocar numa delas mostra a população e as pessoas examinadas. Os contornos são da FUNAI (junho de 2025), via geobr/IPEA. Quem vive fora de Terra Indígena entra nos números, mas não no mapa.
- **Na planilha:** a aba nova **População** tem uma linha por aldeia, com a população por sexo e faixa etária. A aba **_populacao** guarda o mesmo conteúdo em texto para o app; não edite essa aba.
- Exames antigos, feitos antes da lista, são ligados às aldeias pelo nome, no mesmo DSEI.

## Versão 26: convites (inclui tudo da 25)

**Como instalar:** cole o `Codigo.gs` no Apps Script e publique **pelo lápis** (Gerenciar implantações > lápis > Versão: Nova versão > Implantar). O endereço /exec continua o mesmo e deve mostrar `"versao":24`. No GitHub, troque o `index.html` e o `sw.js`.

- **Quem convida:** a coordenação convida referências técnicas e cirurgiões-dentistas de qualquer DSEI, na aba **Administração**, ou na aba **Equipes** para o DSEI escolhido. A referência técnica convida cirurgiões-dentistas do próprio DSEI, na aba **Equipe**.
- **Um ou vários de uma vez:** basta colar os e-mails, um por linha ou separados por vírgula (até 50). O app mostra o resultado de cada e-mail: convite enviado, já tem acesso, já pediu acesso (aí é só aprovar o pedido), acesso desativado (reative em vez de convidar) ou e-mail inválido.
- **O que a pessoa recebe:** um e-mail com um link pessoal, válido por 30 dias. Ao abrir o link, a pessoa vê quem a convidou, o perfil e o DSEI, completa nome, CRO, UF e polo base (este é opcional) e já entra no app, **sem esperar aprovação**. O código de acesso aparece na tela e também chega por e-mail, para ela entrar em outros aparelhos.
- **Quem convidou é avisado** por e-mail quando o convite é aceito.
- **Convites enviados:** a lista mostra os convites em aberto e os já aceitos. Dá para **reenviar**, o que gera um link novo, invalida o anterior e renova o prazo, ou **cancelar**. Convites vencidos podem ser enviados de novo.
- **Se o e-mail não sair**, por exemplo porque acabou a cota diária do Google, o app mostra o botão **Copiar link**, e o convite pode ser enviado por WhatsApp. O link é pessoal: envie só para a pessoa convidada.
- **Na planilha**, a aba nova **Convites** guarda o e-mail, o perfil, o DSEI, a situação e quem convidou. O link em si não fica guardado, só um resumo dele que não permite recriá-lo. Os convites também ficam registrados na aba Acessos.
- O pedido de acesso pela tela de entrada continua funcionando para quem não recebeu convite. O "Link do app" segue na Administração para isso.

## Versão 25: confirmar dente na boca e dica do dente (inclui tudo da 24)

**Como instalar:** só o GitHub: troque o `index.html` e o `sw.js`. O servidor continua na versão 23, sem mudança no Apps Script.

- **Dentes a confirmar na boca:** a faixa acima do odontograma diz quantos dentes faltam e tem um botão para cada um. No odontograma, esses dentes ficam em amarelo, com um selo laranja "!".
- Ao abrir um dente a confirmar, a pergunta "O dente está na boca?" vem com dois cartões grandes (por exemplo, Presente e Não erupcionado). Depois de escolher, aparece a confirmação em verde e o app passa para o próximo dente.
- **Dica do dente no computador:** ao passar o mouse sobre um dente, aparece um cartão com o nome do dente, as faces marcadas (por exemplo, "Cariado, lesão ativa: O, D"), dor, procedimentos indicados ou realizados, observação e o aviso do exame anterior, com o botão "Editar dente". No celular, tocar no dente continua abrindo os detalhes.
- O sinal de dor no dente passou a ser vermelho, para não se confundir com o selo laranja de confirmar.

## Versão 24: aviso de ação do Dia B em andamento (inclui tudo da 23)

**Como instalar:** só o GitHub: troque o `index.html` e o `sw.js`. O servidor continua na versão 23, sem mudança no Apps Script.

- Quando há uma ação do Dia B em andamento no DSEI da pessoa, aparece um **aviso ao entrar no app**, uma vez por dia para cada ação, com as aldeias, o período, quantos exames dela já entraram e os botões "Começar exame" e "Ver a ação".
- Enquanto a ação durar, a página inicial mostra uma **faixa laranja** no alto com a ação.
- A coordenação vê a faixa, mas não recebe o aviso, porque acompanha todas as ações ao mesmo tempo.

## Versão 23: ajustes (inclui tudo da 22)

**Como instalar:** cole o `Codigo.gs` no Apps Script e publique **pelo lápis** (Gerenciar implantações > lápis > Versão: Nova versão > Implantar). O /exec deve mostrar `"versao":23`. No GitHub, troque o `index.html` e o `sw.js`.

- **Nome da coordenação titular:** em **Minha conta**, a titular digita o próprio nome. Ele aparece na página inicial ("Olá, …") e nos registros da aba Acessos, e fica guardado nas Propriedades do script como `NOME_COORDENACAO`.
- **Local de atendimento** sem "Polo base", que já é informado no campo de cima. Ficam: UBSI, CASAI, Domicílio, Escola ou creche, Unidade móvel e Outro.
- **Aplicar a vários dentes** sem a opção "Tirar". Ficam Indicado e Realizado.
- **Erupcionar e esfoliar** no lugar de "nascer" e "cair" nos avisos do odontograma.
- **Ilustração nova** em alta resolução na tela de entrada e na página inicial.

## Versão 22: página inicial e Ações do Dia B (inclui tudo da 21)

**Como instalar**
1. **Apps Script:** cole o `Codigo.gs` novo e salve. Publique **pelo lápis** da implantação que termina em `...H4djW_f4r3Ig/exec`: **Gerenciar implantações > lápis > Versão: Nova versão > Implantar**. Não use "Nova implantação": assim o endereço continua o mesmo. O /exec deve mostrar `"versao":22`.
2. **GitHub:** troque o `index.html` e o `sw.js`.
3. Feche e abra o app (no computador, **Ctrl+Shift+R**).

A planilha não é reorganizada desta vez. Ela ganha a aba **Acoes** quando a coordenação criar a primeira ação.

**O que muda no app**
- **Página inicial**, que abre depois de entrar: saudação com a ilustração, quatro botões coloridos, números principais, últimos exames, ações em andamento e pendências.
  - Para quem faz exames: Novo exame, Acompanhar pessoa (abre o exame já em "Tenho o código"), Ações do Dia B e Painel. Os números são da sua produção.
  - Para a coordenação: Nova ação do Dia B, Gestão de acessos, Equipes e Painel. Os números são de todos os DSEIs.
- **Pendências:** exames aguardando envio, exame começado e não salvo e **pessoas para reavaliação** (último exame há 6 meses ou mais). Na lista de reavaliação, "Novo exame" já abre o exame com o código da pessoa.
- **No computador**, o menu fica numa coluna à esquerda, com o seu nome no alto à direita.
- **Fonte Inter** no app inteiro.
- **Ações do Dia B:**
  - Só a coordenação cria uma ação: nome, DSEI, aldeias (ou todas as aldeias do DSEI) e período.
  - Não há meta. O app conta sozinho as pessoas examinadas, os exames e as pessoas em alto risco.
  - Os exames entram na ação sozinhos, pelo DSEI, pela aldeia (sem diferenciar acentos e maiúsculas) e pela data.
  - Dentistas e RTs veem as ações do seu DSEI e quantos exames deles entraram em cada uma.
  - A coordenação pode cancelar uma ação. Os exames continuam valendo; só a ação deixa de aparecer.

## Versão 21: tela de entrada nova, azul como cor principal e servidor novo (inclui tudo da 20)

**Como instalar**
1. **Apps Script:** o servidor passa a ser a implantação que termina em `...H4djW_f4r3Ig/exec`. Confira se o projeto dessa implantação está com o `Codigo.gs` da versão 20 (o servidor não mudou na 21). Se não estiver, cole o `Codigo.gs` e publique **nessa implantação**: **Gerenciar implantações > lápis > Versão: Nova versão > Implantar**. O /exec deve mostrar `"versao":20`.
2. **GitHub:** troque o `index.html` e o `sw.js`.
3. Feche e abra o app (no computador, **Ctrl+Shift+R**).

**Atenção ao endereço novo.** Ao abrir a versão 21, todos os aparelhos passam a usar o servidor `...H4djW_f4r3Ig/exec`. Ele precisa ser do mesmo projeto do Apps Script, ligado à mesma planilha, com as mesmas Propriedades do script. Se for de outro projeto, as pessoas não conseguem entrar com o código que já têm. Depois de conferir, deixe ativa só essa implantação e arquive as outras.

**O que muda no app**
- **Tela de entrada nova:** à esquerda, ODONTOGRAMA, o texto sobre o Dia B, os três destaques e a ilustração. À direita, "Já tenho acesso" e "Ainda não tenho acesso". O app abre direto em Entrar.
- **Código de acesso escondido**, com o olho para mostrar.
- **No celular**, o cartão de entrada aparece logo abaixo do título e da ilustração. O texto e os destaques ficam depois.
- **Azul como cor principal** do app inteiro, com títulos em azul-marinho e a fonte Montserrat nos títulos. As cores das classes de risco (A a F) e do odontograma não mudam.
- No topo do app, o subtítulo passa a ser "Dia B · Saúde Indígena".

## Versão 20: visual novo e campos dos prontuários eletrônicos (inclui tudo da 17, 18 e 19)

**Como instalar**
1. **Apps Script:** cole o `Codigo.gs` novo e salve. Publique na implantação de sempre, a que termina em `...NobjcbKww7NZF0MJiA/exec`: **Gerenciar implantações > lápis > Versão: Nova versão > Implantar**. O /exec deve mostrar `"versao":20`.
2. **GitHub:** troque o `index.html` e o `sw.js`.
3. Feche e abra o app (no computador, **Ctrl+Shift+R**).

**A planilha ganha colunas novas.** No primeiro uso depois da atualização, o servidor faz um backup ("Antes da reorganização", na pasta "Odontograma - backups") e reescreve as abas Exames e Dentes com as colunas novas. Nenhum exame se perde. Se preferir fazer na hora, rode **reorganizarPlanilha** no Apps Script.
- Aba **Exames**: `local_atendimento` (depois de `municipio`); `vigilancia_saude_bucal`, `protese_superior` e `protese_inferior` (depois de `fluorose_moderada_severa`).
- Aba **Dentes**: `sigla` (depois de `situacao`), com a sigla do dente: H, Hs, C, R, Rc, M, Mi, A, E, Ei, RR ou NE.
- Nos exames antigos essas colunas ficam vazias. O Dicionário explica cada uma.

**O que muda no app**
- **Visual "Clínico claro":** fundo claro, verde como cor de destaque, cartões arredondados. No celular, o menu fica embaixo, com ícones; no computador, continua em cima.
- **Etapas no topo do exame:** Local, Indivíduo, Odontograma e Condições. A etapa feita ganha um ✓. Tocar numa etapa leva até ela.
- **Risco numa barra fina** acima do menu: classe, nível, ceo-d, CPO-D e o botão Salvar. Tocar na barra mostra os motivos.
- **Siglas nos dentes**, como nos odontogramas dos prontuários eletrônicos (H, Hs, C, R, Rc, M, Mi, A, E, Ei, RR, NE). A legenda e o painel do dente usam os mesmos nomes.
- **Local de atendimento:** UBSI, Polo base, CASAI, Domicílio, Escola ou creche, Unidade móvel ou Outro. O app lembra o último usado.
- **Vigilância em saúde bucal**, com os termos dos prontuários. A fluorose passou para cá. **Dor de dente** e **Abscesso dentoalveolar** levam à classe F. "Não identificado" desmarca os outros itens.
- **Necessidade de prótese** superior e inferior: Não avaliado, Não ou Sim.
- **Aplicar a vários dentes:** escolha um procedimento (por exemplo, verniz fluoretado realizado) e marque os dentes, um por um ou em grupo (todos os presentes, permanentes, decíduos, superiores, inferiores).
- **Copiar o código de acompanhamento** num toque, no cartão da pessoa e em Meus exames. O aviso lembra que dá para colar nas observações do paciente no prontuário eletrônico.
- **Meus exames:** busca por código ou aldeia, filtros (Todos, A enviar, Na nuvem, Cancelados), lista agrupada por dia. Tocar num exame mostra Abrir, Copiar código, Cancelar e Excluir. CSV e Reenviar ficam em **Mais opções**.
- **Painel:** classes A a F numa barra só e três blocos novos: Vigilância em saúde bucal (toque num item para filtrar), Necessidade de prótese e Local de atendimento.

## Versão 19 (inclui tudo da 17 e da 18)

Instale do mesmo jeito: cole o `Codigo.gs`, publique como **Nova versão** na implantação ativa e troque o `index.html` e o `sw.js` no GitHub. O /exec deve mostrar `"versao":19`.

**Novidade: identificação do indivíduo em passos.**
1. O dentista escolhe **"Tenho o código de acompanhamento"** ou **"Não tenho o código"**.
2. **Com código:** digita o código e toca em **Buscar**. A busca é só no DSEI do atendimento e aceita também o código de um exame posterior da pessoa.
3. **Pessoa localizada:** **Ver histórico** mostra a linha do tempo; **Usar esta pessoa** faz o vínculo.
4. **Pessoa vinculada:** data de nascimento e sexo vêm dos exames anteriores e ficam travados. Siga para o odontograma.
5. **Sem código:** informa data de nascimento e sexo e toca em **Buscar possíveis exames anteriores**. A busca usa o DSEI e a aldeia do atendimento.
6. Aparecem as possíveis pessoas, com **Ver histórico** e **É esta pessoa**. Na dúvida, use **Continuar como nova pessoa**.
7. **Nova pessoa:** o app gera o código de acompanhamento na hora, com **Copiar código**. O código fica reservado: não muda se a aldeia for corrigida depois.
8. O código fica visível durante todo o exame: anote na ficha da equipe.

- O exame **só pode ser salvo depois de identificar** o indivíduo. O odontograma pode ser preenchido antes.
- **Sem internet:** a busca é feita nos exames do aparelho. Se o código não for encontrado, dá para **usar mesmo assim**, e ele é conferido no envio.
- O servidor confere se o código existe no DSEI e se a data de nascimento e o sexo batem com os exames anteriores da pessoa.
- RTs e dentistas do mesmo DSEI podem ver o histórico da pessoa.

## Versão 18 (inclui tudo da 17)

Instale do mesmo jeito descrito abaixo para a 17. O /exec deve mostrar `"versao":18`.

**Novidade: exames guardados com dono.**
- Ao **sair do aparelho**, os exames que ainda não foram enviados **ficam guardados**.
- Quando o mesmo profissional entra de novo nesse aparelho, eles aparecem em Meus exames e são **enviados sozinhos** quando houver internet.
- Outra pessoa que entrar no mesmo aparelho **não vê nem envia** esses exames. Ela só vê um aviso de que há exames de outro profissional guardados. O servidor também recusa um exame enviado por quem não o fez.
- Ao sair, o exame **em andamento e ainda não salvo** é descartado, e o app avisa antes. Para guardar, toque em Salvar exame antes de sair.

## Atualizar para a versão 17 (endereço do servidor gravado no app)

1. **Apps Script:** cole o `Codigo.gs` novo, salve e publique **na implantação que termina em `...NobjcbKww7NZF0MJiA/exec`**: **Gerenciar implantações > lápis > Versão: Nova versão > Implantar**. Não crie implantação nova: o endereço precisa continuar o mesmo. O /exec deve mostrar `"versao":17` (ou 18, se instalar a 18).
2. **GitHub:** troque o `index.html` e o `sw.js`.
3. Em **Gerenciar implantações**, deixe ativa **só essa implantação** e arquive as outras.

**O que muda:**
- **O endereço do servidor fica gravado no app.** Todos os aparelhos passam a usar sempre esse servidor, mesmo os que tinham guardado o endereço de uma implantação antiga. Ninguém precisa abrir link novo: basta abrir o app com internet.
- **Abas "Acessos - formato antigo" são juntadas sozinhas** na aba Acessos, e as entradas antigas são somadas na aba Uso.

**Se um dia você precisar criar uma implantação nova,** abra o `index.html` no GitHub, procure `ENDERECO_PADRAO`, troque o endereço entre as aspas pelo novo /exec e salve.

## Atualizar para a versão 16 (coordenação que também é RT)

1. **Apps Script:** cole o `Codigo.gs` novo e salve. Publique em **Implantar > Gerenciar implantações** > implantação **App da Web** que o app usa > **lápis > Versão: Nova versão > Implantar**. O /exec deve mostrar `"versao":16`.
2. **GitHub:** troque o `index.html` e o `sw.js`.
3. Feche e abra o app (ou **Ctrl+Shift+R**).

**Novidade:** uma pessoa da coordenação pode ser também referência técnica de um DSEI, com um login só. Para isso, informe a UF, o DSEI e o CRO ao adicioná-la, ou depois, em **Tornar RT de um DSEI**. Com isso:
- o DSEI conta como "com RT";
- os pedidos e e-mails de dentistas desse DSEI vão para ela;
- ela ganha as abas **Exame** e **Meus exames**.

Se o e-mail adicionado já for de uma RT, ela continua RT, passa a ser também coordenação e mantém o mesmo código. Para tirar só a parte de RT, use **Deixar de ser RT**.

## Atualizar da versão 14 para a 15

**1. Servidor (Apps Script).** Cole o `Codigo.gs` novo no lugar do antigo e salve. As Propriedades do script continuam as mesmas: não precisa cadastrar nada.
- Escolha **reorganizarPlanilha** e clique em **Executar**. Ela faz um backup antes, chamado "Antes da reorganização", na pasta "Odontograma - backups", e reorganiza as abas. Se você não rodar, a reorganização acontece sozinha no primeiro uso.
- Publique em **Implantar > Gerenciar implantações > lápis > Versão: Nova versão > Implantar**.
- Abra o endereço /exec: deve aparecer `"versao":15` e `"formato":"ok"`.

**2. App (GitHub).** Suba `index.html` e `sw.js` no lugar dos antigos. Os outros arquivos não mudaram.

**3. No celular e no computador,** feche e abra o app uma vez para ele pegar a versão nova.

**O que muda na planilha:**
- **Exames** e **Dentes**: as colunas foram reorganizadas. As primeiras são `codigo_individuo`, `numero_exame` e `situacao_registro`, e os dados completos (JSON) ficam na última coluna. Para qualquer análise, filtre `situacao_registro = válido`.
- **Acessos**: só os eventos importantes, do mais recente para o mais antigo, com as colunas tipo, perfil e DSEI. As entradas no app saem daqui e viram contadores na aba **Uso**.
- **Uso**: aba nova, com uma linha por pessoa: entradas no mês, total de entradas, exames válidos e cancelados.
- **Dicionário**: aba nova, que explica cada coluna e cada valor possível.
- Os dados antigos não se perdem: a cópia completa de antes fica no backup.

## Novidades da versão 15

- **Mais pessoas na coordenação.** Em Administração > Coordenação, a titular adiciona uma pessoa pelo nome e e-mail, e ela recebe o código pessoal por e-mail. A pessoa adicionada vê tudo e aprova RTs, mas só a titular adiciona ou desativa alguém da coordenação.
- **Cancelar exame.** Em Meus exames > Cancelar exame, só quem fez o exame pode cancelar, e o motivo é obrigatório (digitado errado, exame em duplicidade, pessoa errada ou outro, com explicação). O exame continua na planilha, marcado como cancelado, e sai do painel, dos índices e do acompanhamento. A coordenação também não altera exames de dentistas.
- **Mesma pessoa, novo exame.** Ao preencher aldeia, data de nascimento e sexo, o app procura no DSEI uma pessoa já examinada e pergunta se é a mesma. Se for, o exame vira o 2º (3º...) dessa pessoa, com o mesmo **código do indivíduo**. O dentista vê o exame anterior e quem o fez.
- **Conferência dente a dente.** Mudanças que não acontecem na boca, como um decíduo que esfoliou e volta a aparecer, impedem salvar como a mesma pessoa: ou o dentista corrige o dente, ou marca "não é a mesma pessoa". Mudanças raras, como uma restauração que virou hígida, precisam ser conferidas na boca. O exame anterior nunca é alterado.
- **Acompanhamento no painel.** A visão geral mostra o resultado por faixa etária do 1º exame. A visão por pessoa mostra a linha do tempo de cada uma, exame por exame, e o que mudou em cada dente. A melhora é medida pelos dentes cariados, pela classe de risco, pela cárie nova e pela dor ou abscesso, porque o CPO-D não diminui.

## Instalação do zero (versão 15)

Use sempre **a mesma conta Google** (por exemplo, luanabrisolla@gmail.com) em todos os passos. Se o navegador tiver mais de uma conta, confira a foto no canto superior direito.

O `Codigo.gs` **não tem senha nem e-mail escritos nele**. Eles ficam guardados à parte, nas **Propriedades do script**. Por isso o código pode ser guardado ou compartilhado sem expor a senha.

**A. Planilha e servidor (Google, não Excel)**
1. Em drive.google.com: **Novo > Planilhas Google**. Dê o nome "Odontograma".
2. Na planilha: **Extensões > Apps Script**. Apague o que estiver lá, cole todo o `Codigo.gs` e salve (**Ctrl+S**). Não precisa mudar nada no código.
3. No menu da esquerda, clique na **engrenagem (Configurações do projeto)**. Role até **Propriedades do script** > **Adicionar propriedade do script** e crie as duas:
   - Propriedade `EMAIL_COORDENACAO`, valor: o seu e-mail
   - Propriedade `CHAVE_COORDENACAO`, valor: a sua senha de coordenação (pelo menos 6 caracteres)
   Clique em **Salvar propriedades do script**. Os nomes das propriedades precisam ser exatamente esses, em maiúsculas.
4. Volte ao **Editor** (ícone `< >`). Na lista ao lado de **Executar**, escolha **testarInstalacao** e clique em **Executar**. Autorize (Revisar permissões > sua conta > Avançado > Acessar > Permitir). No Registro de execução deve aparecer **TUDO CERTO**.
5. Na mesma lista, escolha **ativarBackupSemanal** e clique em **Executar** (uma vez só). O Google pede uma autorização nova, para o Drive: é para criar as cópias. A primeira cópia aparece na pasta **Odontograma - backups** do seu Drive. Depois, uma cópia é feita sozinha toda segunda-feira de madrugada. As 8 mais recentes ficam guardadas, e as mais antigas vão para a lixeira.
6. **Implantar > Nova implantação**. Na engrenagem, escolha **App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Clique em **Implantar** e copie o endereço de **App da Web** (termina em `/exec`).
7. Abra esse endereço no navegador: deve aparecer `"versao":15` e `"pronto":true`.

**B. App no GitHub**
8. Crie um repositório **público** e envie os seis arquivos: `index.html`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png` (nomes exatos, sem "(1)"). O `Codigo.gs` não precisa ir para o GitHub.
9. **Settings > Pages > Deploy from a branch**, **main** e **/(root)**, **Save**. Espere o "pages build and deployment" ficar verde em **Actions**.

**C. Primeiro acesso**
10. Abra `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/?s=` seguido do trecho do endereço `/exec` que fica entre `/s/` e `/exec`.
11. Toque em **Já tenho um código** e entre com o e-mail e a senha das Propriedades do script.
12. Em **Administração**, copie o **link de convite** e envie para as referências técnicas.

Se o login não funcionar, o app mostra embaixo a **Situação do servidor**, dizendo exatamente o que falta.

**Trocar a senha da coordenação:** mude o valor de `CHAVE_COORDENACAO` em Propriedades do script e salve. Vale na hora, sem publicar nova versão.

**Backup à mão:** escolha **fazerBackup** e clique em **Executar**. Para parar os automáticos, use **desativarBackupSemanal**. **Para restaurar:** abra a cópia desejada na pasta de backups e copie as abas de volta para a planilha principal. A pasta contém dados de saúde: não a compartilhe.

**Para atualizar o servidor depois:** cole o código novo, salve e use **Implantar > Gerenciar implantações > lápis > Versão: Nova versão > Implantar** (assim o endereço não muda). As Propriedades do script continuam lá: não precisa cadastrar de novo.

---


## Novidades das versões 2 a 12

**Versão 12: acesso individual por perfil, produção na nuvem.**
- A chave única deixou de existir. Cada pessoa pede acesso no próprio app (cirurgião-dentista ou referência técnica do DSEI) e recebe **um código pessoal por e-mail** quando o pedido é aprovado.
- **Quem aprova:** a coordenação aprova as referências técnicas; cada referência técnica aprova os dentistas do seu DSEI. Em DSEI sem referência técnica, os pedidos de dentistas vão para a coordenação. Um DSEI pode ter mais de uma referência técnica.
- **Na nuvem:** o profissional entra com o mesmo e-mail e código no celular e no computador. "Meus exames" e "Minha produção" mostram os exames de todos os aparelhos. Só quem fez o exame pode corrigi-lo.
- **Aba Equipe (referência técnica):** pedidos de acesso, profissionais do DSEI (exames no mês, total, último envio), desativar, reativar e novo código, e a lista de exames do DSEI com código anonimizado, só para leitura.
- **Aba Administração (coordenação):** pedidos, link de convite, referências técnicas ativas com **substituição** (a equipe fica ligada ao DSEI, não à pessoa), mapa dos 34 DSEIs, usuários e registro de acessos. A planilha ganha as abas **Usuarios** e **Acessos**.

**Como ativar a versão 12 (nesta ordem):**
1. **Apps Script:** cole o novo `Codigo.gs`. Na linha `const CHAVE_COORDENACAO`, coloque a sua senha de coordenação (pode ser a chave de antes). Deixe `EMAIL_COORDENACAO` vazio para usar o e-mail da conta dona da planilha. Salve e publique: **Implantar > Gerenciar implantações > lápis > Versão: Nova versão > Implantar**. O Google vai pedir autorização para **enviar e-mails em seu nome**: clique em Autorizar; se aparecer "app não verificado", clique em **Avançado** e depois em **Acessar**.
2. **GitHub:** envie `index.html`, `sw.js` e `manifest.webmanifest` (confira os nomes, sem "(1)").
3. **Entre como coordenação:** abra o app, toque em "Já tenho um código" e use o **e-mail da conta dona da planilha** e a **CHAVE_COORDENACAO**.
4. Em **Administração**, copie o **link de convite** e envie para as referências técnicas e dentistas. O link já abre o app conectado ao servidor.
5. Aprove as referências técnicas. Elas passam a aprovar os dentistas dos seus DSEIs.

Os exames enviados antes da versão 12 continuam no banco e são ligados ao profissional pelo CRO. Uma conta Gmail comum envia cerca de 100 e-mails por dia; se um e-mail não sair, o app mostra o código na tela para ser repassado.


**Versões 10 e 11: dentição pela idade, qualquer idade, índices por faixa e painel interativo.**
- O app passa a se chamar **Odontograma** e atende qualquer idade: o bloco "Criança" virou **Indivíduo**.
- Ao informar a data de nascimento, o app escolhe a dentição e monta o odontograma pela tabela da ADA: antes da faixa de idade o dente aparece como não erupcionado; depois, como presente (ou ausente, no decíduo que já caiu); **dentro da faixa, aparece com ? e precisa ser conferido na boca**. Terceiros molares sempre aparecem com ? a partir dos 17 anos. **O exame só salva depois que todos os dentes com ? forem conferidos.**
- CPO-D e ceo-d continuam sendo a soma de dentes atacados por pessoa (C + P + O e c + e + o).
- O painel usa as faixas etárias da SESAI (0 a 5, 6 a 11, 12 a 18, adulto de 19 a 59 e pessoa idosa de 60 ou mais) e mostra o ceo-d e o CPO-D médios de cada faixa divididos em cariados, perdidos e obturados.
- **Painel interativo:** toque numa faixa etária, sexo, classe de risco, procedimento por dente ou procedimento coletivo para ver o painel só daquele grupo. Os filtros aparecem no topo e podem ser tirados um a um. Nos painéis Geral e Por DSEI, cada toque consulta a planilha (precisa de internet) e continua respeitando a regra dos grupos com menos de 5 pessoas. Precisa do `Codigo.gs` desta versão.



**Versão 8: insumos de higiene bucal.** Em "Condições gerais e procedimentos" entrou o grupo **Insumos de higiene bucal fornecidos** (escova dental, creme dental e fio dental). Vai para a planilha na coluna `insumos_fornecidos` e aparece no painel.


**Versão 7: fluorose.** Em "Condições gerais e procedimentos" entrou a pergunta **Fluorose moderada ou severa** (Sim/Não). Ela vai para a planilha na coluna `fluorose_moderada_severa` e aparece no painel. Não muda a classificação de risco A–F.


**Versão 6: visual e correção do painel.** Novo visual com as cores da identidade da saúde indígena (vermelho, amarelo, verde e azul), fundo claro e títulos em Montserrat, sem nenhum logotipo. As cores clínicas do odontograma e das classes de risco não mudaram. O painel agora avisa quando a planilha está rodando um código antigo e lê os exames mesmo que a aba tenha ficado com o cabeçalho desalinhado. Em Exames salvos, o botão **Reenviar todos** manda de novo os exames do aparelho, sem duplicar.


**Versão 5: painel geral.** O painel tem três visões: **Geral** (abre por padrão: todos os exames de todos os profissionais e de todos os DSEIs, com o número de profissionais participantes e a comparação entre DSEIs), **Por DSEI** (todos os profissionais de um DSEI escolhido) e **Minha produção** (só os exames do próprio aparelho). A contagem de profissionais participantes precisa do `Codigo.gs` desta versão.


**Versão 4: cadastro primeiro e código com o profissional.** A primeira aba agora é **Cadastro**: na primeira vez, o app abre nela e mostra o que falta preencher (nome, CRO, UF e DSEI). O botão "Salvar cadastro e ir para o exame" leva para a tela de exame, que passa a ser a tela inicial depois disso. No exame, o nome e o CRO do profissional aparecem no topo, e os campos ficam em dois blocos: **Local do atendimento** e **Criança**. O código da criança passa a incluir o número do CRO (ex.: `MT-LEO-KAM-4521-0007`), então dois dentistas nunca geram o mesmo código.


**Versão 3: sem identificação da criança.** O app não tem mais os campos de nome, Cartão SUS, escola e turma. A criança passa a ser diferenciada por UF, DSEI, polo base, aldeia/comunidade, data de nascimento e sexo, e recebe um **código anonimizado** no formato da planilha da SESAI: UF + 3 letras do polo + 3 letras da aldeia + número sequencial, com o CRO do profissional a partir da versão 4.

**Versão 2: painel por DSEI.** Aba **Painel** com os números agregados por DSEI e a opção "Minha produção".

**Como atualizar (faça nesta ordem):**

1. **Planilha:** abra o Apps Script, apague o código antigo e cole o novo `Codigo.gs`. Troque a chave na linha `const CHAVE` pela mesma de antes. Salve. Depois clique em **Implantar > Gerenciar implantações**, no **lápis**, em "Versão" escolha **Nova versão** e clique em **Implantar**. O endereço /exec continua o mesmo.
2. **App:** no Netlify, entre no seu site, aba **Deploys**, e arraste a pasta nova inteira.
3. **Dentistas:** ao abrir o app com internet, ele se atualiza sozinho. Quem ainda não tem cadastro completo cai direto na aba **Cadastro** e preenche nome, CRO, UF, DSEI e polo base.

**O que acontece com os dados antigos:**
- No primeiro envio da versão nova, a planilha renomeia as abas antigas (que têm nome e Cartão SUS) para "Exames - formato antigo..." e "Dentes - formato antigo...", e cria abas novas, já sem identificação. **Apague essas abas antigas** (botão direito na aba > Excluir).
- Em cada aparelho, a versão nova apaga o nome e o Cartão SUS dos exames guardados e os reenvia no formato novo. Esses exames aparecem como "Exame sem código", porque não tinham polo base e aldeia.
- Um aparelho que ainda esteja com a versão antiga não consegue mais enviar: recebe o aviso "Aplicativo desatualizado" e o exame fica guardado até o app ser atualizado.

**Como o painel protege os dados:** o app nunca baixa exames individuais. A planilha faz as contas e envia só números prontos, e só para quem tem a chave. Quando um recorte tem de 1 a 4 crianças, aparece "<5" no lugar do número, e médias só aparecem com 5 crianças ou mais. Se o recorte inteiro tiver menos de 5 crianças, os detalhes não são mostrados. Para mudar esse limite, altere `const MINIMO = 5;` no `Codigo.gs`.

**O que o painel mostra:** crianças examinadas, percentual em alto risco, ceo-d e CPO-D médios, procedimentos realizados, distribuição por classe de risco (A a F), idade × sexo × risco, CPO-D aos 12 anos com a severidade da OMS, procedimentos indicados e realizados, procedimentos coletivos, exames por mês e a comparação entre DSEIs. Em "Minha produção", cada dentista vê os números dos exames do próprio aparelho, sem ocultação, e só ele vê.

**Sem internet:** o painel mostra os últimos números baixados, com a data e a hora em que foram atualizados.

---


O aplicativo tem duas partes. A primeira é o app que os dentistas usam no celular ou tablet (arquivos `index.html`, `sw.js`, `manifest.webmanifest` e os ícones). A segunda é uma planilha Google que funciona como banco de dados e fica só com você (arquivo `Codigo.gs`).

Os exames são guardados primeiro no próprio aparelho do dentista. Quando há internet, o app envia sozinho para a sua planilha. Sem internet, o exame fica na fila e sai quando a conexão voltar.

## Passo 1: criar o banco de dados (Google Planilhas)

1. No Google Drive, crie uma planilha nova, por exemplo "Odontograma - banco de dados".
2. Menu **Extensões > Apps Script**. Apague o que estiver lá e cole todo o conteúdo de `Codigo.gs`.
3. Na linha `const CHAVE = 'TROQUE-POR-UMA-CHAVE-SUA';` troque o texto por uma senha sua (ex.: `odonto-2026-xk47`). Salve.
4. Clique em **Implantar > Nova implantação**. Em "Tipo", escolha **App da Web**.
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Autorize o acesso quando o Google pedir. Copie o endereço gerado, que termina em `/exec`.

As abas **Exames** (uma linha por criança) e **Dentes** (uma linha por dente) são criadas automaticamente no primeiro envio. As duas se ligam pela coluna `id_exame`.

"Qualquer pessoa" só permite *enviar* dados com a chave correta. Ninguém consegue ler a planilha por esse endereço; ela continua privada no seu Drive.

## Passo 2: colocar o app na internet (gratuito)

O app precisa de um endereço https para funcionar offline e ser instalado no celular. Duas opções simples:

**Netlify (mais fácil):** crie uma conta gratuita em netlify.com, vá em "Add new site > Deploy manually" e arraste a pasta `odontograma` inteira (sem o `Codigo.gs` e este guia, se preferir). Você recebe um endereço como `https://odontograma-xyz.netlify.app`.

**GitHub Pages:** crie um repositório, envie os arquivos e ative Pages em Settings > Pages.

## Passo 3: enviar para os dentistas

Mande para cada dentista três informações: o endereço do app, o endereço de envio (`.../exec`) e a chave. Cada um deve:

1. Abrir o endereço do app no celular ou tablet **com internet** (na primeira vez).
2. Instalar na tela inicial: no Android/Chrome, menu ⋮ > "Instalar app" ou "Adicionar à tela inicial"; no iPhone/Safari, botão Compartilhar > "Adicionar à Tela de Início".
3. Na aba **Cadastro** (o app abre nela na primeira vez), preencher nome, CRO, UF, DSEI, polo base, endereço de envio e chave, tocar em "Testar conexão" e depois em "Salvar cadastro e ir para o exame".

Depois disso o app abre e funciona sem internet.

## Como o app classifica o risco

A classe é calculada a partir do odontograma e das condições gerais, prevalecendo sempre a mais grave:

| Classe | Situação | O que dispara no app |
|---|---|---|
| F | Dor e/ou abscesso | Qualquer dente marcado com "Dor ou abscesso" |
| E | Cavidade em lesão ativa | Face com "Cárie ativa" ou "Restaurada com cárie" |
| D | Placa, gengivite e/ou mancha branca ativa | "Placa visível: sim", "Gengivite: sim" ou face com "Mancha branca ativa" |
| C | Cavidade em lesão crônica | Face com "Cárie crônica", "Raiz residual" ou "Extração indicada" |
| B | História de restauração, sem atividade | Face "Restaurada", "Mancha branca inativa" ou "Extraído por cárie" |
| A | Sem lesão, placa, gengivite ou mancha ativa | Nenhuma das anteriores |

O agrupamento em nível de risco pode ser escolhido no Cadastro: baixo (A–C) e alto (D–F), ou baixo (A–B), moderado (C–D) e alto (E–F).

Decisões que tomei e que vale você conferir com o protocolo que usa: raiz residual e extração indicada entram como cavidade crônica (C); mancha branca inativa entra como história de doença (B); e quando há cavidade crônica junto com placa ou gengivite, prevalece D.

O app também calcula **ceo-d** (decíduos) e **CPO-D** (permanentes). Cada dente conta uma vez, nesta ordem: extraído por cárie ou extração indicada (e/P), cariado ou raiz residual (c/C), restaurado sem cárie (o/O). Selante não entra no índice.

## Cuidados com dados (LGPD)

São dados de saúde de crianças, considerados sensíveis. O app não coleta nome, Cartão SUS, CPF, filiação nem endereço, e os campos de observação pedem que nada identificável seja escrito. Mesmo assim: compartilhe a planilha só com quem precisa, siga o que o comitê de ética aprovou e troque a chave se ela vazar (edite o `Codigo.gs` e reimplante como nova versão).

## Atualizar o app

Se mudar o `index.html`, abra o `sw.js` e aumente o número da versão (esta já está em `odontograma-v13`; a próxima seria `odontograma-v14`) e publique de novo. Os aparelhos recebem a versão nova na próxima vez que abrirem o app com internet. Os exames guardados não se perdem.

## Limitações conhecidas

- Os exames ficam na memória do navegador do aparelho até serem enviados. Se o dentista apagar os dados do navegador antes de enviar, eles se perdem. O contador no topo mostra quantos faltam enviar.
- No iPhone, o Safari pode apagar dados de sites não usados por várias semanas. Instalar na tela inicial reduz esse risco; o ideal é enviar os exames no mesmo dia.
- A planilha Google atende bem a milhares de exames. Para uma rede municipal inteira, com muitos anos de dados, vale migrar depois para um banco de dados dedicado.
