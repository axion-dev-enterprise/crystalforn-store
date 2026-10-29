# Backlog Crystalforn

> Fila executável consolidada: [BACKLOG_EXECUTIVO_ATUAL.md](BACKLOG_EXECUTIVO_ATUAL.md). Este documento preserva os requisitos detalhados e o histórico das revisões.

## Backlog executivo vigente — revisão de 28/10/2026

Esta seção é o recorte de execução atual, consolidado após ler as mensagens mais recentes de Mateus Alves Fernandes na conversa da Workana. As seções abaixo preservam o histórico e os critérios detalhados; em caso de repetição, este quadro resume a ordem e o estado atual. A opinião do cliente de que a API está “quase lá” define uma expectativa de produto, não comprova aceite técnico.

### Decisão de produto que continua valendo

A versão permanece **demonstração somente**: sem estoque LZT publicado, vendas, pagamentos, entrega de credenciais ou movimentação de carteira. O cliente descreveu gateway e testes de entrega como próximos passos depois do trabalho da API; isso não altera a decisão explícita do operador de manter a demonstração. Ver [DEMO_MODE.md](DEMO_MODE.md) e [COMPATIBILIDADE_COMERCIAL.md](COMPATIBILIDADE_COMERCIAL.md).

### Fila priorizada

| Prioridade | Item | Estado observado | Critério de conclusão |
| --- | --- | --- | --- |
| P1 | Fechar filtros essenciais por jogo | Parcial: filtros demonstrativos existem sobre fixtures. As mensagens do cliente relatam buscas pequenas (10–30 anúncios; 120 na Steam), sem medição independente nesta atualização. | Mapear filtros documentados da Market API por categoria; Fortnite busca skins/personagens, Steam busca jogos, LoL e Valorant filtram rank/divisão e nível quando o payload oferecer os campos. Deixar claro que fixtures não são estoque real. |
| P1 | Normalizar títulos de contas | Parcial: normalização e títulos demonstrativos estão no código; faltam payloads autorizados para comprovar a cobertura real de cada categoria. | Remover texto russo/vago quando houver atributos estruturados. Usar a matriz de ranks/divisões enviada pelo cliente somente em LoL e Valorant; usar título neutro para dados ausentes ou inválidos. |
| P1 | Tornar inventários transparentes e visuais | Parcial: há detalhes por jogo e amostra Fortnite textual; imagens por item, gamepasses e cobertura de payload não estão confirmados em todas as categorias. | Agrupar somente os dados que a API realmente retorna; apresentar nome e imagem quando a origem for confiável e a exibição estiver autorizada; marcar amostra truncada/parcial e campos não fornecidos. Investigar gamepasses Roblox sem afirmar lista individual se o contrato não a fornecer. |
| P1 | Revisar identidade e responsividade | Parcial: tema claro/escuro e persistência já foram verificados em uma rota; vitrine e detalhe encerram consultas principais após 15 s e oferecem erro recuperável com retry. Falta inspeção consolidada de catálogo, detalhe, admin e área do cliente nos dois temas e em larguras móveis/desktop. | Validar navegação, hierarquia, estados vazio/erro, contraste, foco e ausência de overflow em rotas representativas. A alternância não pode sugerir que a loja esteja em operação comercial. |
| P1 | Oferecer entrada de cliente pelo Auth Center | Na release `085baa6`, a rota central falha fechada com HTTP 503 e motivo seguro de configuração; `/api/v1/auth/me` sem sessão retorna 401. Callback, tenant e papel ainda não foram verificados com uma sessão válida. | Concluir login/cadastro somente via OAuth central e confirmar callback, tenant `crystalforn`, papel `store_customer` e isolamento da área do cliente. Sem configuração ou identidade válida, permanecer fechado com erro explícito `503`, sem sessão simulada. |
| P2 | Validar paginação em massa e sincronização | Benchmark sintético de 20k/40k existe; não comprova importação LZT, limites do fornecedor ou “tempo real”. O worker permanece desligado na demonstração. | Apurar contrato, cotas, semântica de paginação, memória, duração, retomada e falhas com evidência autorizada. Não reconciliar catálogo após varredura incompleta nem anunciar escala/latência não medidas. |
| P2 | Especificar indisponibilidade e concorrência | Parcial no desenho/código: existem revalidação antes do pedido e idempotência de crédito; evento instantâneo do fornecedor e fluxo comercial não foram comprovados em runtime. | Definir como impedir entrega obsoleta em corrida, reconciliar timeouts ambíguos e creditar saldo uma única vez após indisponibilidade confirmada. Só prometer remoção imediata se o fornecedor oferecer mecanismo documentado e a latência for medida. |
| P2 | Completar operações do painel administrativo | Parcial: resumo, catálogo, regras e histórico têm estrutura; métricas e ações autenticadas não foram verificadas nesta revisão. | Priorizar rastreabilidade de sincronização, pedidos, falhas e ações; identificar origem demo/real; validar permissões no servidor e não oferecer controles que abram vendas ou integração real enquanto o gate estiver fechado. |
| P3 | Gateway, checkout, entrega e reembolso reais | Bloqueado pela decisão atual de manter demonstração e pela revisão comercial pendente. | Só iniciar após revisão independente que autorize o modelo comercial, confirme compatibilidade dos provedores e aprove identidade, termos, segurança, entrega e testes isolados. Este item não autoriza transações. |

### Registro da releitura atual da conversa — 28/10/2026

Mateus avaliou positivamente a direção da API e disse que ela está próxima do esperado, mas listou lacunas que ainda impedem considerar essa etapa pronta. Esta leitura atualiza o contexto dos itens BL-02 a BL-09; os critérios detalhados permanecem nas seções correspondentes abaixo.

- **Volume e paginação:** o cliente relata que as consultas terminam na primeira página, normalmente com 10–30 anúncios e até 120 na Steam. Pede capacidade na faixa de 20 mil a 40 mil. Esses números e a expectativa de atualização em tempo real são relatos/metas do cliente; não foram medidos contra o fornecedor.
- **Conteúdo visual:** ele confirma que nomes de skins aparecem, mas as imagens individuais não. Considera boas as imagens de contas Roblox e pede gamepasses e mais detalhes visuais nas categorias. Exibir apenas campos e imagens disponibilizados por fontes utilizáveis; indicar amostra parcial e dados ausentes.
- **Filtros e referência:** usar as seções do fórum como referência para mapear filtros essenciais, sem reproduzir o fórum inteiro. Priorizar personagens Fortnite, jogos Steam e rank/nível em LoL e Valorant quando existirem no payload.
- **Ranks e títulos:** ranks/divisões seguem a matriz informada por Mateus; o destaque de rank nos títulos vale somente para LoL e Valorant. Valores ausentes ou desconhecidos não devem ser inferidos.
- **Próxima fase:** gateway e testes de entrega são apresentados pelo cliente como etapa posterior. Permanecem bloqueados enquanto a decisão vigente de demonstração não for revista.

O comentário positivo é feedback de progresso, não confirmação de aceite técnico ou formal.

### Sequência de trabalho

1. Fechar a matriz de campos e filtros por categoria a partir do contrato/documentação oficial, distinguindo dados do exemplo, fixtures e dados efetivamente fornecidos.
2. Completar os títulos e os detalhes demonstrativos sem inventar atributos, disponibilidade, imagens ou inventários.
3. Revisar todas as rotas prioritárias em tema claro/escuro e em viewport estreito/largo; registrar evidência da revisão.
4. Manter o benchmark sintético separado da futura medição LZT; documentar paginação, checkpoint e comportamento de falha antes de qualquer promessa de escala.
5. Documentar o fluxo de corrida e indisponibilidade sem ativar checkout ou carteira.
6. Manter pagamentos e entrega real bloqueados até a revisão comercial independente.

### Leitura factual das mensagens

Mateus reiterou que quer filtros essenciais, títulos próprios em vez de texto russo, maior transparência visual do conteúdo das contas e qualidade de amostra semelhante à organização do fórum/Legas, sem exigir cópia integral. Ele informou ranks/divisões de LoL e Valorant e restringiu a regra de títulos a esses dois jogos. Pediu que depois dessa etapa se avance para gateway e testes de entrega. Os relatos de volume, o desejo de atualização “em tempo real” e a expectativa de conclusão são requisitos do cliente, não resultados de execução nem aceite formal.

Atualizado em 28/10/2026 após nova leitura da conversa de Mateus Alves Fernandes na Workana. O cliente considera a API próxima do rumo esperado e detalhou filtros, nomes de rank/divisão, atributos dos cards, inventários por jogo, escala, preço e o fluxo futuro de compra. Este documento reúne o backlog funcional, visual e operacional; status representam evidência no código/documentação, não autorização para ativar operações comerciais.

## Estado e limites atuais

- A loja permanece em **demonstração somente**, sem catálogo real, cobrança, compra, entrega automática ou integração ativa com gateway. Ver [DEMO_MODE.md](DEMO_MODE.md) e [COMPATIBILIDADE_COMERCIAL.md](COMPATIBILIDADE_COMERCIAL.md).
- A API e a web do commit `085baa6` foram publicadas na Hostinger. A verificação confirmou API/web/PostgreSQL saudáveis, `/api/v1/health` e `/api/v1/legal/terms/status` HTTP 200, catálogo `demoOnly: true` com zero anúncios comerciais e worker parado. O login central sem configuração retorna `503` com detalhe seguro; `/api/v1/auth/me` sem sessão retorna `401`. O registro operacional detalhado permanece na documentação local de implantação.
- Uma inspeção anterior encontrou capas Steam externas nos fixtures; nesta revisão, elas foram removidas até a análise de origem/licença. Os nomes e horas continuam no inventário textual. A observação anterior de respostas HTTP `200 image/jpeg` só demonstra disponibilidade técnica e não é autorização de uso. O detalhe Fortnite ainda não dispõe de imagens individuais do JSON de exemplo.
- A API pode exibir resultados de integração em ambiente de desenvolvimento, mas isso não comprova capacidade de importar dezenas de milhares de anúncios, consistência de inventário ou prontidão para produção.
- Toda tarefa que consulte dados reais da LZT, processe pagamentos, entregue credenciais ou movimente saldo depende de revisão própria de contrato, segurança e compatibilidade comercial. Os itens marcados como bloqueados não devem ser liberados por este backlog.
- As quantidades de 20 mil a 40 mil anúncios são metas solicitadas pelo cliente, ainda sem validação de limites, cotas, custo ou garantias do fornecedor.
- Nesta revisão, a vitrine pública foi conferida em modo demo: `skinName=Travis Scott` retornou 1 exemplo Fortnite, `steamGame=Portal 2` retornou 2 exemplos Steam e `rank=Ouro&minLevel=1` retornou 1 exemplo LoL. Esses resultados provam somente a filtragem das fixtures fictícias; nenhuma consulta autenticada ao fornecedor ocorreu.
- O detalhe Fortnite usa a estrutura do JSON de exemplo: agora mostra dois nomes de skins em destaque, as contagens informadas para as quatro categorias e explica quando não há nomes individuais. Os dados permanecem fictícios; o exemplo não inclui imagens/ícones, então miniaturas por item continuam pendentes.
- A arte individual de Fortnite não foi adicionada: o exemplo do cliente traz nomes, sem imagens ou URLs. O detalhe Roblox explicita quando o anúncio não retorna nomes individuais de gamepasses; isso não afirma que a conta não tenha passes. Capas Steam externas foram removidas da demo e deixam de ser derivadas de `appid`; qualquer arte de fornecedor continua bloqueada até revisão de origem/direitos. Consulte [COMPATIBILIDADE_COMERCIAL.md](COMPATIBILIDADE_COMERCIAL.md).
- Verificação da revisão atual: GitHub Actions Build [40781639640](https://github.com/axion-dev-enterprise/crystalforn-store/actions/runs/40781639640) passou para `7f34190`, compilando web, API e workers e executando o benchmark sintético. A revisão de interface `55323b9` também passou no auditor anti-slop (15 arquivos, 0 problemas) e em `git diff --check`. A execução atual confirma a compilação da lista demonstrativa de ranks/divisões; não verifica sua renderização em navegador. O benchmark mede serialização e divisão local de lotes; não comprova escala do fornecedor, cobertura de payloads reais, autenticação em runtime ou operação comercial.

## Delta das mensagens mais recentes do cliente — 28/10/2026

- **Sinal de progresso:** Mateus disse que o resultado da API está agradável e que, com os ajustes de filtros, títulos e inventários, considera a parte da API concluída para avançar à etapa seguinte. Isso registra a percepção e o critério comercial do cliente; não prova capacidade técnica, cobertura de dados, desempenho em produção ou aceite formal do trabalho.
- **Escopo mínimo de descoberta:** priorizar filtros úteis para personagens/skins de Fortnite, jogos desejados na Steam, rank em LoL e Valorant e nível quando o payload oferecer esse campo. O cliente esclareceu que não espera uma cópia integral do fórum russo ou da Legas; quer filtros essenciais e uma amostra de conteúdo com qualidade equivalente.
- **Títulos:** mapear os ranks e divisões fornecidos para títulos de LoL e Valorant somente. Rank em título não substitui os filtros de descoberta; não inferir rank, divisão ou inventário quando o anúncio não trouxer o dado.
- **Inventário:** exibir nomes e imagens quando os dados e recursos confiáveis existirem; incluir gamepasses Roblox e demais itens apenas se o contrato/payload realmente os fornecer. A meta é transparência e uma amostra representativa por jogo, identificando listas parciais.
- **Paginação:** o cliente observou respostas pequenas (10–30 anúncios e 120 para Steam) e reiterou a expectativa de 20–40 mil. O alvo permanece não validado; o código e limites documentados não garantem sincronização em tempo real.
- **Próxima etapa citada:** gateway e testes de entrega depois dos ajustes. Isso não altera o modo demo vigente: qualquer operação real segue bloqueada e requer revisão/aprovação independente.

### Leitura mais recente no Brave — 28/10/2026

Na conversa aberta da Workana, Mateus reforçou que considera a API concluída quando a descoberta, os títulos e a transparência do inventário estiverem alinhados. Ele pediu para usar anúncios do fórum apenas como referência de qualidade e filtros essenciais, sem copiar todo o conteúdo. Após esse marco, citou gateway e testes de entrega como próxima etapa; isso é planejamento do cliente, não autorização para habilitar cobranças ou entrega real, que permanecem desligadas pela decisão vigente de operar somente como demonstração.

| Ordem | Trabalho que falta ou precisa de evidência | Pronto quando | Situação / limite |
| --- | --- | --- | --- |
| 1 | Fechar filtros essenciais por jogo | Fortnite permite encontrar personagens/skins disponíveis; Steam filtra jogos; LoL e Valorant filtram rank/divisão e nível somente quando esses campos existem. | Distinguir resultados de fixtures dos campos documentados e de dados obtidos do fornecedor. Não apresentar resultados de fixtures como estoque. |
| 2 | Padronizar títulos em português | Títulos de LoL e Valorant refletem somente ranks/divisões válidos fornecidos; outros jogos usam atributos confirmados, como contagens e destaques, quando existirem. | Texto russo/vago não deve ser exposto como título final quando há dados estruturados. Não inferir item, rank ou quantidade ausente. |
| 3 | Aumentar transparência visual do inventário | Detalhes agrupam itens retornados; mostram imagens ao lado dos nomes quando houver URL/recurso confiável e direitos revisados; indicam quando a lista é parcial ou o provedor não fornece o campo. | Capas Steam e URLs sintetizadas por `appid` foram removidas; Roblox gamepasses individuais, imagens por item e inventários completos ainda dependem de payload/contrato e revisão de direitos. |
| 4 | Investigar volume e paginação | Evidência separa benchmark sintético de medição real de 20–40 mil anúncios; registra limite de páginas, retomada, duração, memória e falhas. | O benchmark sintético não prova sincronização em tempo real nem cotas, latência ou escala do fornecedor; sincronização real segue desligada. |
| 5 | Desenhar proteção contra venda concorrente | Há fluxo documentado para revalidar disponibilidade, evitar entrega obsoleta, tratar falhas ambíguas e tornar eventual crédito de saldo idempotente. | O cliente pediu remoção “imediata”; só prometer isso se houver evento/capacidade documentada e latência medida. Não ativar compra, cobrança, entrega nem reembolso nesta demonstração. |
| 6 | Revisar o marco da API com evidência | Registrar quais filtros, títulos e inventários foram demonstrados, quais dependem de payload real e quais limitações permanecem. | “Quase concluída” é a avaliação do cliente, não aceite formal nem prova de integração completa. |
| 7 | Preparar a etapa comercial futura | Criar desenho e critérios de teste para gateway, checkout, aceite de termos e entrega de credenciais. | Bloqueado nesta versão: sem Pix/gateway, compra real, saldo, entrega ou teste comercial, conforme decisão explícita de manter a loja em demonstração. |

**Próximo recorte de execução do backlog:** fechar o mapa de campos e filtros por categoria; concluir a amostra demonstrativa e identificar lacunas de payload; conferir ranks de LoL/Valorant; reportar o benchmark somente como sintético; preparar a revisão de concorrência sem ligar vendas. O gateway e os testes de entrega permanecem em backlog bloqueado até uma revisão independente do modo de demonstração.

### Novo backlog — mensagens adicionais do cliente, 28/10/2026

Este recorte acrescenta os pedidos mais recentes de Mateus ao backlog existente. Os números de volume e a expectativa de “tempo real” são metas do cliente, não capacidades confirmadas da LZT. A decisão vigente continua sendo demonstração sem estoque real, checkout, cobranças, entrega de credenciais ou movimentação de carteira.

| Prioridade | Item | Trabalho e critério de conclusão | Estado / dependências |
| --- | --- | --- | --- |
| P1 | Identidade Crystalforn escura e alternância claro/escuro | Revisar o tema escuro moderno da marca e confirmar que o controle alterna, persiste a preferência e permanece acessível em celular e desktop. | Tema e alternância já existem; revisão visual completa em ambos os temas ainda pendente. Não requer ativar integrações. |
| P1 | Filtros e títulos por jogo | Fortnite: buscar personagens/skins realmente presentes. Steam: filtrar pelos jogos listados. Valorant e LoL: filtrar rank e nível apenas quando retornados. Remover títulos russos/vagos quando atributos estruturados permitirem um título Crystalforn em pt-BR. | A vitrine demo filtra fixtures; títulos são normalizados no código. Cobertura com payload autorizado por categoria ainda pendente. Não inferir valores ausentes. |
| P1 | Inventário detalhado por categoria | Mostrar itens em grupos visuais, incluindo skins, picaretas, emotes e asas-delta Fortnite, jogos Steam, gamepasses Roblox e inventários dos demais jogos quando presentes. Incluir imagens somente com URL/origem utilizável e confiável; sinalizar contagem, lista parcial e campos não fornecidos. | Fortnite demo expõe contagens e dois nomes em destaque, sem arte individual. Roblox agora informa quando faltam nomes de gamepasses. Amostras completas e direitos das imagens continuam pendentes do contrato/payload e revisão de origem/licença (BL-14). |
| P2 | Importação em massa retomável | Apurar se lotes de 15 mil, 20 mil, 30 mil ou mais anúncios cabem nas cotas e no contrato do fornecedor; documentar limites, páginas, duração, memória, checkpoint, retomada e falhas. | Benchmark CI sintético de 20k/40k existe; não comprova importação LZT nem tempo real. Worker permanece inativo no modo demo (BL-05). |
| P2 | Disponibilidade, concorrência e devolução | Desenhar revalidação antes de qualquer pagamento/entrega, remoção ou bloqueio de item indisponível, tratamento de corrida/timeout e crédito de saldo idempotente em caso de falha confirmada. Só chamar a remoção de “instantânea” com evento ou mecanismo do fornecedor e latência medida. | Planejamento parcial em BL-06. Não há venda, entrega, reembolso nem movimentação de carteira na demo; capacidade LZT e política comercial precisam ser comprovadas antes de uma futura implementação. |
| P3 | Fase comercial posterior | Planejar gateway e ensaios isolados de pagamento/entrega após revisão da API, identidade, termos, compatibilidade e segurança. | Bloqueado pela decisão vigente de demonstração (BL-01/BL-09); este item não habilita integração real. |

**Sequência sugerida:** (1) validar visual dos dois temas e filtros da demo; (2) completar e documentar a amostra de inventário por jogo sem inventar dados ou direitos de imagem; (3) medir capacidade sintética e separar claramente o que não foi medido na LZT; (4) documentar o fluxo de concorrência e crédito idempotente sem executar transações; (5) manter a fase comercial bloqueada até revisão independente. O cliente considera estes ajustes o caminho para fechar a etapa da API; isso não constitui aceite formal.

## Adendo — reanálise solicitada por Mateus hoje, 28/10/2026

Mateus pediu uma nova análise do resultado da API e avaliou a direção atual como agradável e próxima do esperado. Para considerar a etapa da API concluída, ele apontou os itens abaixo. São requisitos e observações do cliente, não validações independentes de runtime nem aceite formal.

| Prioridade | Requisito confirmado nesta reanálise | Evidência / estado | Critério de pronto |
| --- | --- | --- | --- |
| P1 | Filtros essenciais por categoria, sem copiar o fórum inteiro | O cliente relata que as listas atuais retornam 10–30 anúncios e Steam chega a 120; esses números são observações dele, não medição nossa. | Documentar filtros e campos por categoria usando contrato oficial; priorizar personagens Fortnite, jogos Steam, rank LoL/Valorant e nível quando disponível. Cada filtro opera somente com dados compatíveis com seu jogo. |
| P1 | Imagens por item e inventário útil em todos os jogos | O cliente confirma nomes de skins Fortnite, mas diz que as imagens individuais ainda faltam; pede mais conteúdo de Roblox, incluindo gamepasses, e inventário visual nos demais catálogos. | Exibir imagem ao lado do nome apenas quando houver recurso confiável e permitido; agrupar os dados realmente retornados por jogo; usar fallback acessível e marcar lista parcial. Gamepasses e inventário ausentes no contrato ficam identificados como não disponíveis. |
| P1 | Normalização dos títulos LoL/Valorant | O cliente forneceu tiers e divisões e limitou essa regra a esses dois jogos. | Títulos em pt-BR refletem rank/divisão presentes e válidos no dado; ausente ou inválido usa título neutro. Não deduzir rank a partir de nível ou texto livre. |
| P2 | Paginação e escala | O alvo pedido é 20–40 mil anúncios. Benchmark sintético local/CI não comprova esse volume no fornecedor nem sincronização em tempo real. | Manter evidência separada para benchmark sintético e medição autorizada do fornecedor; reportar limites, memória, duração, retomada e comportamento de erro antes de prometer escala ou tempo real. |
| P2 | Proteção contra anúncio vendido e concorrência | O cliente espera remoção imediata do catálogo e ausência de entrega quando o fornecedor já vendeu o anúncio. | Planejar revalidação de disponibilidade, reserva/concorrência, idempotência e reconciliação com base nas capacidades documentadas; “instantâneo” só pode ser prometido se o fornecedor oferecer evento ou mecanismo equivalente comprovado. |
| P3 | Gateway e testes de entrega como etapa seguinte | Mateus considera essa a fase posterior aos ajustes da API. | Permanecem bloqueados no modo de demonstração já escolhido. Checkout, cobrança, carteira, entrega de credenciais e reembolso não entram na implementação desta revisão. |

### Ordem revisada para execução do backlog

1. Fechar o mapa de campos e filtros por categoria, distinguindo exemplos locais de dados efetivamente suportados pelo contrato.
2. Completar a apresentação demonstrativa de inventários: imagens individuais quando disponíveis, fallback, cobertura de Roblox/gamepasses e marcação explícita de listas parciais.
3. Conferir títulos LoL/Valorant com a matriz de rank enviada pelo cliente e manter título neutro para dados desconhecidos.
4. Manter benchmark sintético identificado como tal; registrar escala real e latência do fornecedor como pendentes de autorização e evidência.
5. Preparar o desenho de concorrência e indisponibilidade para futura revisão, sem ativar venda ou entrega no demo.
6. Só retomar gateway e testes comerciais após a revisão independente que remova o bloqueio do modo demo.

## Novo backlog — detalhamento da leitura atual

Este recorte incorpora as mensagens mais novas da conversa. A coluna de estado descreve a evidência atual, e não um aceite do cliente. Itens de demonstração usam somente fixtures; itens comerciais permanecem bloqueados.

| Ordem | Entrega | Estado | Critério de conclusão |
| --- | --- | --- | --- |
| 1 | Filtros essenciais e títulos por jogo | Parcial; demonstração oferece a lista de ranks/divisões enviada pelo cliente, filtros locais e normalização existem, opções de busca LZT não estão conectadas | Fortnite pesquisa skins/personagens; Steam pesquisa jogos; LoL e Valorant filtram nível/rank quando disponíveis. Títulos em pt-BR exibem rank/divisão somente para LoL/Valorant, respeitando as listas abaixo e sem inventar dados. |
| 2 | Cards e páginas de detalhe transparentes | Parcial; há exemplos textuais e algumas prévias condicionais por URL | Cards mostram selo “Full Acesso” apenas quando sustentado pelo anúncio; Fortnite usa inventário visual quando recursos confiáveis existem; Roblox usa avatar permitido; LoL/Valorant/Steam podem usar arte genérica licenciada. Detalhes agrupam atributos por jogo e marcam listas incompletas. |
| 3 | Inventário representativo em todas as categorias | Parcial; fixture Fortnite foi inspecionada, payloads completos por categoria não foram confirmados | Mapear campos reais para skins, picaretas, emotes, asas-delta, jogos Steam, itens Riot e gamepasses; imagens e nomes aparecem lado a lado quando o payload/fonte autorizada fornecer os dados. Sem campo, imagem ou item, mostrar ausência/fallback, não inferir. |
| 4 | Paginação e ordenação em massa | Benchmark sintético 20k/40k passou; runtime LZT permanece desativado e escala real não validada | Registrar uma medição autorizada de 20k/30k/40k, memória, duração, retomada, páginas, limites e falhas. Listar preço crescente e filtrar preço/inatividade; priorizar reputação somente se houver campo confiável. Não chamar varredura periódica de “tempo real” sem evidência de evento/latência. |
| 5 | Moeda e formação de preço | Não comprovado em fluxo de produção | Especificar fonte e horário do câmbio RUB→BRL, precisão/arredondamento e fórmula de margem variável de 50%–59%; validar com exemplos sintéticos. Não publicar preço comercial nem consultar fornecedor no modo demo. |
| 6 | Checkout, indisponibilidade e pós-compra | Bloqueado pelo modo demo | Em uma futura revisão autorizada, definir aceite obrigatório dos termos, validação de disponibilidade antes de cobrar, não entrega se o fornecedor rejeitar, idempotência e crédito automático de estorno em saldo. Integrar gateway e campos de entrega somente depois de revisar compatibilidade, segurança e autorização comercial. |
| 7 | Revisão responsiva, temas e administração | Parcial; revisão pública confirmou redirecionamento de `/admin` e `/cliente` sem sessão | Verificar catálogo, detalhe e painel em celular/desktop, tema claro/escuro, foco/contraste, dados de cada indicador e permissões de sessão legítima. Sem sessão válida, manter o item marcado como não verificado. |

### Dados exatos de rank informados pelo cliente

- **League of Legends:** Ferro, Bronze, Prata, Ouro, Platina e Esmeralda; cada tier com IV, III, II e I.
- **Valorant:** Ferro, Bronze, Prata, Ouro, Platina, Diamante, Ascendente e Imortal; cada tier com III, II e I; Radiante sem divisão.
- O cliente limita o destaque automático de rank nos títulos a LoL e Valorant. Esses rótulos precisam ser conciliados com o valor presente no payload e com os enums documentados do fornecedor; texto desconhecido fica neutro.

### Catálogo, disponibilidade e checkout futuro

- O cliente quer ordenar por preço crescente, filtrar por preço e inatividade, e priorizar vendedores com boa reputação quando isso puder ser feito sem reduzir excessivamente o volume. Campos inexistentes não podem ser inferidos.
- O cliente pede conversão de RUB para BRL e margem variável de 50% a 59%. Fonte cambial, horário de referência, cálculo e arredondamento ainda precisam ser definidos antes de qualquer preço operacional.
- O texto de aceite solicitado para um checkout futuro é: “Li e aceito os Termos de Compra e vou gravar a tela até o primeiro login (necessário para o suporte em caso de problema).” O requisito permanece bloqueado junto com checkout e cobrança.
- O fluxo futuro pedido pelo cliente inclui revalidar disponibilidade antes da cobrança/entrega, evitar entregar item indisponível e creditar eventual reembolso no saldo. A alegação de remoção instantânea depende de capacidades documentadas e medidas do fornecedor.
- Os dados de entrega citados pelo cliente (login, senha, e-mail, senha do e-mail e link de acesso) são altamente sensíveis e não devem aparecer em fixtures, logs ou demonstrações. A entrega real permanece desligada.

## Execução priorizada — recorte anterior

Este recorte transforma as mensagens mais recentes em tarefas executáveis. A sequência abaixo vale para a demonstração atual e não autoriza consultas autenticadas ao fornecedor, venda, pagamento ou entrega real.

| Ordem | Tarefa | Itens | Pronto quando |
| --- | --- | --- | --- |
| 1 | Fazer revisão visual responsiva do catálogo e detalhe | BL-10, BL-11 | Capturas em larguras móvel e desktop confirmam hierarquia legível, inventário organizado, navegação sem overflow e os dois temas com contraste/foco adequados; defeitos encontrados viram correções pontuais. |
| 2 | Fechar matriz de filtros e títulos por categoria | BL-02, BL-03 | Uma tabela liga cada filtro e regra de título ao campo documentado; LoL/Valorant exibem rank apenas quando fornecido; exemplos sem dado ficam neutros; fixtures demonstrativas cobrem Fortnite, Steam, Roblox, Valorant e LoL. |
| 3 | Preparar amostras visuais honestas de inventário | BL-04, BL-08 | Cada categoria mostra os atributos que o payload realmente sustenta; imagens ausentes têm fallback consistente; listas parciais são identificadas; gamepasses Roblox não são prometidos sem campo correspondente. |
| 4 | Registrar evidência de escala sintética e manter validação de fornecedor pendente | BL-05 | Benchmark CI de 20 mil e 40 mil registros está registrado; uma futura medição autorizada separa duração, memória, retomada e limites do fornecedor, sem promessa de tempo real. |
| 5 | Consolidar estado operacional do painel em modo demo | BL-12, BL-13 | Revisão autenticada permitida confirma permissões, origem dos indicadores e estados de erro; sem autenticação legítima, registrar o bloqueio sem criar atalho ou sessão simulada. |
| 6 | Registrar revisão e pendências com o cliente | BL-07 | A revisão reporta o que foi demonstrado, o que depende de dados da LZT e o que continua bloqueado; não declarar aceite formal sem confirmação explícita do cliente. |

### Trilha bloqueada — sem execução neste ciclo

- **API LZT em produção e catálogo real:** depende de reavaliação contratual, credencial e autorização operacional próprias; nunca usar dados reais como se fossem fixtures.
- **Checkout, gateways, carteira, entrega automática e reembolso:** permanecem desligados pelo modo demo. Só replanejar após revisão comercial, segurança, identidade e autorização de release.
- **Remoção “instantânea” e garantia contra venda dupla na LZT:** depende de semântica oficial de eventos/reserva e medição de concorrência; não prometer tempo real sem evidência do fornecedor.
- **Domínio e VPS:** escolher/registrar domínio ou mudar infraestrutura exige titularidade, custo e procedimento de release definidos; não faz parte da implementação demo deste backlog.

**Ordem de trabalho derivada:** executar tarefas 1–3 com fixtures e documentação pública; medir a tarefa 4 no caminho de validação aprovado; completar a tarefa 5 somente dentro de uma sessão autenticada legítima; então preparar a tarefa 6. Os itens bloqueados continuam fora da demonstração.

## Visão rápida de entrega

| Ordem | Item | Situação | Resultado esperado |
| --- | --- | --- | --- |
| 1 | BL-01 Demonstração e compatibilidade comercial | Gate ativo; venda real bloqueada | Demo sem catálogo comercial, cobrança, entrega ou reembolso real |
| 2 | BL-10 Responsividade de produto e catálogo | Implementação presente; inspeção visual renderizada pendente | Detalhes, filtros e navegação confortáveis em celular e desktop |
| 3 | BL-11 Identidade Crystalforn e tema | Ativos integrados; validação visual completa pendente | Sistema visual escuro/claro consistente, marca aplicada e alternância acessível |
| 4 | BL-02 a BL-04 Descoberta, títulos e inventários | Parcial; payloads representativos por jogo pendentes | Filtros essenciais, títulos localizados e amostras transparentes sustentadas por dados |
| 5 | BL-08 Referência de anúncios e qualidade | Escopo reduzido; comparar só padrões úteis | Boa organização e amostra sem copiar integralmente fórum ou Legas |
| 6 | BL-05 Paginação em massa | Retomada implementada; benchmark sintético 20k/40k passou; escala real não validada | Benchmark sintético e limites documentados até a meta de 40 mil |
| 7 | BL-06 Concorrência e indisponibilidade | Parcial e bloqueado comercialmente | Nunca entregar anúncio indisponível; reconciliação/idempotência comprovadas |
| 8 | BL-07 Revisão com o cliente | Condicionada aos ajustes mínimos; sem aceite formal registrado | Revisar filtros, títulos e amostras após correções e comunicar limites observados |
| 9 | BL-12 Painel administrativo | Parcial; a borda pública redireciona sem sessão; permissões autenticadas não verificadas | Operação auditável para catálogo, pedidos, sincronização e políticas comerciais |
| 10 | BL-13 Área do cliente e segurança de conta | Parcial; a rota pública redireciona sem sessão; permissões autenticadas não verificadas | Histórico e dados de demonstração seguros; entrega real continua bloqueada |
| 11 | BL-09 Pagamentos e testes de entrega | Futuro e bloqueado pelo modo demonstração | Planejar validação somente após revisão comercial independente |

**Regra de ordenação:** primeiro corrigir experiência visual e fechar os contratos de dados; medir sincronização isoladamente; só depois submeter qualquer mudança de modo de operação à revisão comercial e de segurança. Nenhum item abaixo desativa por si só o gate de demonstração.

## Prioridade P0 — Resolver antes de qualquer ativação comercial

### BL-01 — Manter os gates de demonstração e compatibilidade comercial

**Estado:** Bloqueado para operação real.

Preservar a loja sem anúncios reais, checkout, gateway, entrega e reembolso até existir aprovação comercial e operacional documentada para o fluxo e para cada categoria de contas.

**Critérios de aceite**

- As rotas e interfaces públicas continuam incapazes de iniciar cobranças ou entregar credenciais enquanto o gate de demonstração estiver ativo.
- As rotas privadas de salvar e consultar credenciais (`POST /api/v1/admin/orders/:id/delivery` e `GET /api/v1/orders/:id/delivery`) também falham fechadas em demo, inclusive quando existirem registros antigos.
- Uma eventual ativação exige revisão de compatibilidade comercial, termos, autenticação, segurança, gateway e operação, com decisão registrada separadamente.
- A documentação e a interface deixam claro quando exibem somente dados fictícios ou uma prévia não comercial.

**Dependências:** decisão comercial documentada e aprovação de release.

### BL-14 — Revisar origem e direitos de exibição das imagens de jogos

**Estado:** Parcial. As capas Steam externas foram removidas da demonstração; nenhuma imagem é gerada por `appid`. Imagens agregadas do fornecedor e outros assets continuam sem revisão de direitos registrada. O exemplo recebido do cliente não traz arte individual Fortnite. A política oficial da Epic restringe a categoria “Fan Content” a uso pessoal e não comercial; como a Crystalforn é uma loja pública com intenção comercial futura, o uso de arte Epic precisa de avaliação específica. Esta descrição é um controle operacional, não um parecer jurídico.

**Critérios de aceite**

- Cada recurso de imagem externo tem URL/origem, titular, licença ou autorização aplicável, atribuições exigidas e contexto de uso registrados.
- URLs públicas de CDN não são tratadas como autorização.
- Até a aprovação dos recursos, a demonstração usa somente elementos tipográficos/CSS próprios e nomes de itens; capas Steam não são inferidas a partir de `appid`.
- Se não houver direitos suficientes, remover ou substituir a arte por elementos originais que não sejam apresentados como imagem do item real.
- A página mantém fallback acessível com nome do item quando imagem autorizada estiver ausente ou indisponível.
- O escopo demonstrativo e qualquer escopo comercial futuro são avaliados separadamente.

**Dependências:** documentação/licença do provedor de imagens, autorização do titular quando necessária e revisão do modelo de uso antes do lançamento comercial.

### BL-09 — Preparar a fase de gateway e testes após revisão da API

**Estado:** Futuro e bloqueado pelo modo demonstração vigente. O cliente considera gateway e testes de entrega como a etapa seguinte quando a API estiver no rumo esperado. Isso não altera a decisão anterior de manter a loja em demonstração sem catálogo ou cobranças reais.

**Critérios de aceite para planejamento futuro**

- Antes de qualquer ativação, revisar gateway, confirmação de pagamento, concorrência, indisponibilidade do anúncio, entrega de credenciais e crédito de reembolso.
- Definir testes isolados para PIX, saldo, entrega, falhas e idempotência, com remoção dos dados de teste após a execução.
- Nenhuma cobrança, compra de fornecedor ou entrega real ocorre enquanto o gate de demonstração permanecer ativo.

**Dependências:** BL-01, conclusão/revisão dos itens de API aplicáveis e autorização comercial/operacional independente.

## Prioridade P1 — Qualidade e descoberta do catálogo

### BL-02 — Mapear filtros essenciais por jogo a partir do Market API

**Estado:** Parcial. A vitrine e a API aplicam filtros de skin Fortnite, jogo Steam, rank e nível mínimo para LoL/Valorant sobre os dados locais. A inspeção do catálogo público em modo demo confirmou que cada campo específico aparece para a categoria correspondente; consultas com `Travis Scott`, `Portal 2` e `Ouro + nível mínimo` preservaram os critérios, e a última mostrou estado vazio recuperável. Esses resultados usam somente fixtures fictícias. As sugestões demonstrativas incluem agora cada rank/divisão listado pelo cliente, além de ranks presentes nas fixtures; selecionar uma opção sem fixture correspondente pode retornar estado vazio e não sugere disponibilidade real. Na demonstração, sugestões e filtragem usam os mesmos aliases (`skin_names`, `skins`, `featured_skins`; `game_names`, `games`) e aceitam itens fictícios como texto ou objetos com rótulo; nenhuma busca especializada inclui itens de outros jogos. O mapa está em [PROVIDER_FIELD_MAP.md](PROVIDER_FIELD_MAP.md); ligar as enums completas da LZT e resolver nomes de jogos Steam para IDs do fornecedor permanece adiado enquanto a sincronização real estiver fechada. Na revisão mais recente, o cliente reduziu a expectativa a filtros de descoberta essenciais e úteis, sem exigir reproduzir todos os filtros do fórum ou da Legas.

Usar documentação e catálogos oficiais do Market API para mapear filtros suportados, nomes de campo, tipos, opções e diferenças entre Fortnite, Steam, Roblox, Valorant e League of Legends (LoL). Não inferir que uma opção existe em todas as categorias.

**Critérios de aceite**

- Cada filtro disponível tem a origem e o campo do fornecedor documentados, incluindo categorias e valores aceitos; lacunas da integração permanecem identificadas como pendentes.
- A interface prioriza personagens/skins de Fortnite, jogos de Steam, rank para LoL e Valorant e nível quando o campo for útil e disponível para aquela categoria.
- Na demonstração, as opções de LoL e Valorant incluem todas as divisões enumeradas pelo cliente; isso é cobertura da interface, não evidência de que existam contas fictícias ou reais em cada rank.
- No modo demo, sugestões de Fortnite, Steam, LoL e Valorant são rotuladas como fictícias e vêm somente das fixtures; nenhum exemplo é apresentado como opção real do fornecedor.
- Em produção, opções de busca permanecem limitadas ao que o fornecedor documenta e aos dados efetivamente retornados. Na demo, listas estáticas de rank são rotuladas como sugestões ilustrativas do cliente e não como estoque.
- A interface só oferece filtros sustentados pelos dados disponíveis para a categoria selecionada.
- Filtros combinados e paginação preservam os critérios de busca e retornam estados claros quando não há resultados.
- Campos ausentes ou desconhecidos não são preenchidos com valores inventados.

**Dependências:** inspeção do contrato oficial e amostras não sensíveis por categoria. O exemplo entregue pelo cliente cobre apenas Fortnite; não comprova payloads de Steam, LoL, Valorant ou Roblox. Nenhuma chamada autenticada de produção neste item.

**Referências de contrato:** [filtros Epic Games](https://lzt-market.readme.io/reference/categoryepicgames), [filtros Steam](https://lzt-market.readme.io/reference/categorysteam), [filtros Riot](https://lzt-market.readme.io/reference/categoryriot) e [filtros Roblox](https://lzt-market.readme.io/reference/categoryroblox).

### BL-03 — Padronizar títulos de contas de LoL e Valorant por rank

**Estado:** Implementado no normalizador e nos exemplos demonstrativos; o build remoto compila web, API e workers. A verificação desta revisão encontrou e corrigiu o exemplo LoL de Esmeralda III, que antes omitia a divisão no título. Mateus confirmou que a regra de títulos por rank se aplica somente a LoL e Valorant. Falta confrontar a regra com amostras autorizadas por categoria.

Gerar títulos em português e no padrão Crystalforn, sem copiar nomes vagos ou em russo do fornecedor. Para LoL e Valorant, destacar o rank/divisão quando o dado existir e for confiável. A regra de rank descrita aqui vale somente para esses dois jogos.

**Ranks informados pelo cliente**

- **LoL:** Ferro, Bronze, Prata, Ouro, Platina e Esmeralda, cada um com divisões IV, III, II e I.
- **Valorant:** Ferro, Bronze, Prata, Ouro, Platina, Diamante, Ascendente e Imortal, cada um com divisões III, II e I; Radiante sem divisão.

**Critérios de aceite**

- Rank e divisão são normalizados para um rótulo consistente em pt-BR, preservando a distinção entre LoL e Valorant.
- Se rank ou divisão estiver ausente, inválido ou fora do mapeamento conhecido, o título usa fallback neutro sem inventar elo.
- Títulos não exibem texto russo bruto nem afirmam atributos que não estejam presentes no anúncio.
- A regra não aplica ranks de LoL ou Valorant a Fortnite, Steam ou Roblox.

**Dependências:** mapeamento de campos oficiais por categoria e exemplos anonimizados.

**Referências de contrato:** [filtros de rank Riot/Valorant](https://lzt-market.readme.io/reference/categoryriot) e [tiers, divisões e filas oficiais de LoL](https://support-leagueoflegends.riotgames.com/hc/en-us/articles/4406004330643).

### BL-04 — Melhorar a amostra visual de inventário por jogo

**Estado:** Parcial. O detalhe Fortnite apresenta os dois nomes de `featured_skins` do JSON de exemplo e as contagens de skins, picaretas, emotes e asas-delta; os grupos sem nomes individuais mostram essa lacuna explicitamente. Quando não há imagem individual, o detalhe agora usa um ícone neutro e informa a ausência por grupo; miniaturas confiáveis continuam aceitas e erros de carregamento entram no estado sem imagem. A demonstração continua identificada como fictícia e incompleta. A revisão de direitos de quaisquer imagens de terceiros ainda é requisito antes da ativação comercial. Para Fortnite, Valorant e LoL, a integração prevê prévias agregadas pelos tipos de imagem documentados, mas o gate demo impede consultá-las. Capas Steam foram removidas dos fixtures e não são mais geradas por `appid`; o inventário continua com nomes e tempo de jogo em cartões tipográficos. Gamepasses só aparecem quando a lista é fornecida, e o detalhe Roblox explicita a ausência de nomes individuais. O exemplo do cliente não contém imagens/ícones por item, listas individuais de picaretas/emotes/asas-delta ou gamepasses Roblox; a documentação também não confirma inventários individuais Steam. Cobertura efetiva de payloads permanece pendente.

Mostrar imagens junto aos nomes das skins e ampliar os detalhes visuais do inventário. Para Roblox, investigar gamepasses e os demais itens efetivamente disponibilizados pelo Market API. Fornecer uma amostra organizada e representativa para cada jogo, deixando explícito quando a lista retornada for parcial; o cliente não exige copiar todos os campos do fórum ou da Legas.

**Critérios de aceite**

- Cada item exibe imagem quando o fornecedor ou uma fonte oficial fornece um recurso identificável; indisponibilidade de imagem tem fallback visual acessível.
- Roblox mostra gamepasses e demais campos apenas quando presentes e documentados no anúncio retornado.
- Fortnite, Valorant, LoL e Steam apresentam os itens de inventário que o contrato realmente entrega, com nomes, imagens e agrupamento por tipo quando houver dados.
- A página de detalhes diferencia inventário completo de uma amostra ou lista parcial; não chama de completo quando houver truncamento ou limite de dados.
- Há uma matriz por jogo dos campos e itens presentes em payloads autorizados, com seção visual útil mesmo quando um tipo de inventário não é fornecido.
- Imagens têm texto alternativo útil e a interface continua utilizável em telas móveis e com teclado.

**Dependências:** BL-02, revisão de licença/origem dos recursos de imagem, limites de payload e revisão de desempenho. A política oficial da Epic limita Fan Content a uso pessoal e não comercial; a necessidade de revisão específica para este produto é uma conclusão operacional conservadora. Não declarar direitos com base apenas na disponibilidade de uma URL.

**Limite de contrato:** a [documentação da categoria Roblox](https://lzt-market.readme.io/reference/categoryroblox) publica filtros `gamepass_min`/`gamepass_max` para o custo agregado de gamepasses, mas não documenta nesses parâmetros uma lista individual de passes. O detalhe individual continua condicionado a campos presentes em payloads autorizados; o endpoint de imagem documentado não oferece tipo para passes Roblox.

### BL-08 — Usar anúncios do fórum como referência de qualidade e organização

**Estado:** Pendente de análise comparativa. Na mensagem mais recente, o cliente sugeriu observar anúncios do fórum e as seções por jogo para identificar padrões de apresentação e filtros essenciais. Citou a Legas como referência de qualidade, mas esclareceu que não precisa reproduzir exatamente o fórum nem todos os campos.

**Critérios de aceite**

- Para cada jogo coberto, registrar apenas os atributos de descoberta e apresentação que sejam relevantes e estejam sustentados pelo contrato/payload da API.
- Usar os anúncios como referência de organização e amostra visual, sem copiar conteúdo, identidade visual ou afirmar que os exemplos representam todo o estoque.
- Consolidar os filtros mínimos: personagens/skins de Fortnite, jogos procurados na Steam, rank em LoL e Valorant e nível quando aplicável.
- Documentar divergências entre o padrão observado em anúncios e os dados realmente retornados pela LZT; ausência de campo permanece explícita.

**Dependências:** BL-02 e BL-04; leitura de referências autorizadas e revisão do contrato do fornecedor.

## Prioridade P2 — Escala e consistência do fornecedor

### BL-05 — Paginação em massa resiliente e retomável

**Estado:** Implementação existente usa paginação por número de página, checkpoint persistido com hashes dos IDs de cada página confirmada, detecção de repetição após retomada, importação em lotes e intervalo de 3 segundos. O benchmark sintético do Build [40780762919](https://github.com/axion-dev-enterprise/crystalforn-store/actions/runs/40780762919) passou com 20 mil registros em 40 lotes (341,9 ms; RSS observado após validação 270,1 MiB; heap delta 178,5 MiB) e 40 mil em 80 lotes (736,7 ms; RSS observado após validação 412,2 MiB; heap delta 285,8 MiB). Os dois casos validaram contagem integral, até 500 registros por lote, corpo máximo observado de 0,65 MiB e zero erros. Os números são do dataset e runner sintéticos; não medem banco, rede ou fornecedor. O worker está inativo no modo demonstração.

O cliente relatou que as consultas atuais terminam em conjuntos pequenos (10, 20 ou 30 anúncios; Steam chegou a 120) e solicitou cobertura de 20 mil a 40 mil anúncios. O worker agora aceita a forma do exemplo fornecido, que não contém `hasNextPage` nem `perPage`, derivando a continuação do total acumulado; limpa o checkpoint ao detectar resposta JSON inválida, contrato malformado, página rejeitada ou repetida ou totais divergentes e não reconcilia uma varredura incompleta. A escala real continua sem validação. A API documenta o parâmetro `after`, mas o registro operacional existente informa que `page=2` retornou outra página e `after` repetiu a primeira; preserve o comportamento empiricamente observado até uma nova verificação autorizada do contrato. Não trocar para cursor sem evidência.

**Critérios de aceite**

- O sincronizador segue o cursor/indicador de continuação oficial até o fim e detecta páginas repetidas, cursor inválido, totais divergentes e respostas incompletas.
- É possível retomar uma execução interrompida sem perder progresso nem declarar sincronização completa antes da última página válida.
- Upserts são idempotentes; limites de concorrência, timeout, rate limit e backoff respeitam as cotas documentadas.
- A execução registra progresso agregado, duração, páginas e motivos de falha sem gravar tokens, credenciais de contas ou respostas privadas brutas.
- Um benchmark com dataset sintético demonstra comportamento em 20 mil e 40 mil registros, com limites documentados de memória, duração e taxa de erro. Isso não deve ser apresentado como garantia de importação em tempo real sem medição autorizada contra o fornecedor.
- Dados incompletos ou falha no meio da execução não iniciam reconciliação que esconda anúncios válidos.

**Dependências:** BL-02, limites oficiais da API, armazenamento e benchmark isolado. A configuração atual permite até 1.000 páginas por execução e impõe pelo menos 3 segundos entre buscas, ou até 20 buscas/minuto; a documentação oficial atual descreve 120 requisições/minuto num bucket compartilhado de buscas e leituras de anúncios. Para 30 mil itens a 40 por página, a estimativa do worker permanece cerca de 37,5 minutos, sem contar respostas e outros feeds. Portanto, “em tempo real” não está demonstrado. Execução autenticada contra produção exige autorização e gates próprios.

### BL-06 — Evitar venda dupla e tratar indisponibilidade sem entrega

**Estado:** Parcial no código e bloqueado para operação comercial. Já existem revalidação antes do pedido, índice único para impedir pedidos ativos duplicados do mesmo anúncio e crédito idempotente da carteira quando a compra do fornecedor confirma item indisponível. API/worker continuam desativados pelo modo demonstração; a remoção instantânea por evento do fornecedor e a verificação de concorrência em runtime continuam pendentes.

O cliente quer que uma conta vendida na LZT desapareça do catálogo e que uma compra concorrente não entregue dados obsoletos. Também solicitou reembolso automático para o saldo do cliente. O fluxo deve primeiro ser desenhado e validado; a solicitação não prova que a API suporte notificação instantânea, reserva ou compra atômica.

**Critérios de aceite para uma futura versão autorizada**

- A disponibilidade do fornecedor é revalidada antes de qualquer cobrança ou entrega, sob controle de concorrência que impeça dois pedidos locais de obter o mesmo item. O código atual faz a revalidação e usa `orders_active_product_idx` para reservar o anúncio enquanto o pedido permanece ativo.
- Item indisponível não libera credenciais e não deixa cobrança ou débito de carteira indevido.
- Reembolso de carteira, se comercialmente aprovado, é idempotente, transacional, auditável e executado uma única vez; o worker já usa chave de idempotência para essa devolução.
- Falhas ambíguas do fornecedor vão para reconciliação/revisão, sem repetir uma compra externa de forma cega.
- O item é ocultado conforme evidência confirmada de indisponibilidade; atualmente isso ocorre ao confirmar indisponibilidade no checkout ou sincronização, sem prova de evento instantâneo da LZT. A latência e a semântica de atualização devem ser documentadas em vez de prometer remoção “instantânea” sem suporte técnico.
- Há testes isolados de concorrência, falha, timeout, replay e reembolso antes de qualquer ativação comercial.

**Dependências:** BL-01, documentação oficial de disponibilidade/compra, política comercial de reembolso, gateway/carteira autorizados e revisão de segurança.

## Prioridade P3 — Retorno e comunicação

### BL-07 — Reavaliar o resultado da API com o cliente

**Estado:** Revisão condicionada aos ajustes mínimos. Mateus disse que o resultado da API está agradável e considera essa etapa concluída após filtros essenciais, títulos de LoL/Valorant e apresentação mais transparente dos inventários; apontou paginação pequena, ausência de imagens por item e cobertura de gamepasses Roblox como lacunas. Isso não equivale a verificação técnica ou aceite formal do projeto.

Registrar uma revisão do catálogo e dos títulos depois dos itens aplicáveis de BL-02 a BL-05. O cliente não exige reproduzir todos os campos do fórum ou da Legas. A mensagem “Blzzz” não contém requisito identificável.

**Critérios de aceite**

- A revisão cobre filtros por jogo, títulos de LoL/Valorant, inventários e estado de sincronização.
- Limites ou dados que dependam do fornecedor são apresentados como limitações observadas, não como garantias.
- O gate de demonstração e a decisão comercial continuam explícitos durante a revisão.

**Dependências:** BL-02 a BL-05 conforme a cobertura planejada.

## Prioridade P1 — Experiência visual e marca

### BL-10 — Refazer responsividade e hierarquia das páginas de catálogo e produto

**Estado:** Parcial, com inspeção local do branch atual. A URL de produto apontada anteriormente responde “Produto indisponível”; a revisão usou a rota fictícia `demo-steam-01` e a resposta pública da API em modo demo. Em 390 px e 1280 px, o documento não excedeu a largura do viewport (`375/390` e `1265/1280`); o título e os grupos de inventário foram inspecionados visualmente no celular e no desktop. A renderização detectou um aviso de proporção no wordmark; `Image` agora usa as dimensões reais dos PNGs e uma janela de recorte responsiva, preservando a marca sem distorção. Uma nova sessão de navegador após o ajuste não registrou avisos/erros. Nesta revisão, títulos de detalhe, home e catálogo passaram a usar escala fluida em celulares e quebra balanceada; os Builds `40795662357` e `40795918894` compilaram as alterações. A árvore de acessibilidade em produção para os exemplos Fortnite, Steam, Roblox, Valorant e LoL também foi conferida e exibiu avisos de dados fictícios e amostras parciais; não substitui a verificação visual em celular. Catálogo, painel, área do cliente e demais detalhes ainda precisam de inspeção em larguras representativas; produção não recebeu este commit.

Revisar os fluxos de catálogo, cartão, detalhe de produto e navegação em larguras móveis, tablet e desktop. Priorizar leitura do título e atributos, agrupamento do inventário, contexto de preço/estado e ação de retorno. Evitar overflow horizontal e conteúdo que obrigue rolagem excessiva antes de entender o produto.

**Critérios de aceite**

- Título de produto usa escala fluida e limite de largura; não empurra preço, atributos ou ações para fora do viewport.
- Em celular, conteúdo é ordenado para leitura por prioridade, com espaçamentos consistentes, alvos de toque de pelo menos 44×44 px e sem rolagem horizontal.
- Em desktop, grade e coluna de compra usam larguras legíveis, sem áreas vazias arbitrárias nem sobreposição.
- Catálogo, filtros, paginação, estado vazio e estado de erro permanecem utilizáveis em viewport estreito.
- Capturas de referência e verificação visual cobrem pelo menos uma largura móvel e uma desktop; os critérios WCAG 2.2 AA de foco, contraste e semântica são respeitados.
- Estado de demonstração continua claramente apresentado e não sugere que seja possível concluir uma compra.

**Dependências:** BL-11 para tokens de marca; BL-04 para a hierarquia do inventário. Sem alteração da disponibilidade comercial.

### BL-11 — Consolidar identidade da Crystalforn, logo e alternância de tema

**Estado:** A marca está integrada no cabeçalho, rodapé e favicon, com wordmarks para fundos claro e escuro. Na versão local atual, a troca entre claro/escuro foi verificada no detalhe; após alternar e recarregar, a preferência escura permaneceu. As duas versões do cabeçalho foram visualmente conferidas e os PNGs mantêm a proporção correta. Auditoria completa de contraste, navegação por teclado e demais rotas continua pendente; esta revisão local não representa implantação em produção.

Aplicar uma identidade escura, moderna e reconhecível da Crystalforn, preservando contraste e legibilidade. Usar a logo aprovada no cabeçalho, rodapé e contextos administrativos. A alternância entre tema escuro e claro deve manter a preferência do usuário e cobrir estados interativos, conteúdo e navegação.

**Critérios de aceite**

- Logo em formato e proporção adequados, versão reduzida para espaços compactos e texto alternativo acessível; a imagem gerada é revisada e integrada ao produto.
- Cores, tipografia, bordas, foco, estados de erro e botões usam tokens consistentes nos dois temas.
- Alternador é um botão semântico com rótulo/estado acessíveis, área de toque adequada e persistência da preferência entre navegações.
- Texto e controles atendem aos contrastes mínimos; o tema claro não deixa componentes ilegíveis e o tema escuro evita preto absoluto saturado com neon.
- Páginas de catálogo, produto, acesso e administração são verificadas nos dois temas.

**Dependências:** decisão visual existente da Crystalforn e BL-10. A existência de uma imagem gerada não comprova integração no site.

## Prioridade P2 — Administração e conta do cliente

### BL-12 — Definir e completar o painel administrativo

**Estado:** Parcial. O painel inclui resumo e histórico de pedidos, sincronização, filtros/ocultação de anúncios e vendedores, simulação de preço/cupom, regras de margem, auditoria e atendimento. A interface agora identifica o modo de demonstração e chama registros de sincronização de históricos quando o gate informa que o worker está desligado. A inspeção pública confirmou que `/admin` redireciona a `/entrar`, que exige e-mail e senha; nenhuma autenticação foi tentada. Fluxos autenticados e permissões em runtime seguem sem verificação; as ações administrativas existentes não habilitam vendas nem alteram o gate.

Consolidar uma interface administrativa útil para acompanhar catálogo, pedidos, cupons e sincronização, com histórico de ações e indicação clara de ambiente. Não criar ações que habilitem vendas ou executem operações reais escondidas em uma tela de demonstração.

**Capacidades solicitadas para desenho e implementação**

- Visão de pedidos e estados com busca, filtros, detalhes e trilha de auditoria; métricas devem vir de dados reais disponíveis no ambiente ou ser identificadas como demonstração.
- Estado da sincronização: último ciclo, duração, páginas, itens analisados/importados, falhas, retomada disponível e origem dos dados.
- Gestão de catálogo com filtros por categoria e `seller_id`, e controles de ocultação; mudanças reais no fornecedor ficam desativadas até revisão e autorização independentes.
- Gestão de cupons com faixa de 1% a 4%, validação de vigência e limites, exclusivamente em dados de demonstração até a revisão comercial.
- Configuração/projeção de margem de 50% a 59% sobre custo base, exibindo fórmula, moeda e arredondamento; não publicar preço comercial em modo demo.
- Registro de incidentes de sincronização e indicadores de itens desatualizados ou indisponíveis, sem expor credenciais ou dados sensíveis.
- Navegação responsiva, permissões por papel consultadas no Auth Center e confirmação customizada para ações administrativas futuras.

**Critérios de aceite**

- Cada métrica e ação tem origem, estado e permissão documentados; nenhuma métrica arbitrária ou falsa barra de progresso.
- Valores de margem e cupom são validados no servidor e cobertos por regras documentadas antes de futura ativação.
- `seller_id` é tratado como identificador de fornecedor, não como segredo ou prova de autorização.
- Logs administrativos registram ator, ação, entidade, resultado e horário sem tokens, credenciais de conta ou payloads privados.
- A interface distingue modo demo de produção e não oferece botão que contorne autenticação ou permissões.

**Dependências:** BL-01, Auth Center/roles, BL-05 e BL-06; qualquer ação real depende de aprovação operacional separada.

### BL-13 — Completar a área do cliente dentro do modo permitido

**Estado:** Parcial. A UI inclui histórico paginado, carteira, estados de entrega e fluxo central de identidade com consulta de tenant/papéis; login e cadastro locais estão desativados. A rota central falha fechada com HTTP 503 quando a configuração não está disponível; uma resposta genérica de erro foi identificada na produção, e o novo commit preserva apenas o motivo seguro de configuração pendente. `/api/v1/auth/me` sem sessão retorna 401. O callback, a configuração operacional do serviço central, o tenant/papel em runtime e o isolamento de dados continuam sem verificação; nenhuma sessão foi criada. A demonstração bloqueia pagamentos e entrega reais.

Entregar uma área de cliente que exponha apenas a identidade autenticada e registros compatíveis com o ambiente. Para demonstração, usar exemplos fictícios claramente sinalizados; preparar o desenho de pedidos e entrega sem expor credenciais reais.

**Critérios de aceite**

- Cadastro e sessão seguem o Auth Center, com `dashboard_users`, tenant e papéis; ausência de configuração de provedor resulta em erro explícito, sem login simulado.
- O usuário só vê seus próprios dados, pedidos e saldo; autorização é aplicada no servidor em todas as rotas.
- Histórico demonstra estados sem insinuar pagamento ou entrega real quando o pedido é fictício.
- Credenciais reais de contas não são armazenadas ou mostradas até que a operação comercial e o fluxo de entrega estejam aprovados; dados de demonstração são sintéticos e identificados.
- A interface informa erros e estados vazios de forma acessível, sem usar diálogos nativos do navegador.

**Dependências:** Auth Center, BL-01 e BL-09. A entrega segura de produtos reais continua bloqueada.

## Fora deste adendo

- O texto “Blzzz” não contém requisito técnico identificável.
- O botão de alternância entre tema claro e escuro e os refinamentos administrativos agora estão registrados em BL-11 e BL-12.
- Nenhum pedido neste backlog altera a decisão vigente de manter a loja somente em demonstração.

## Novo backlog — mensagens mais recentes no Brave, 28/10/2026

Leitura direta da conversa com Mateus Alves Fernandes na guia Workana aberta no Brave. O cliente avaliou a amostra atual como próxima do esperado e reiterou que a etapa da API depende de filtros essenciais, inventários mais transparentes e paginação. Essa avaliação não representa medição independente, aceite formal ou autorização para abrir vendas.

### Requisitos reafirmados

| Prioridade | Item | Critério de conclusão | Evidência e limite atual |
| --- | --- | --- | --- |
| P1 | Filtros essenciais por jogo | Fortnite pesquisa personagens/skins disponíveis; Steam filtra por jogos contidos no anúncio; LoL e Valorant filtram por rank/divisão e nível somente quando os dados existem. A regra de ranks informada pelo cliente vale apenas para LoL e Valorant. | O cliente relata respostas atuais de 10–30 itens e até 120 na Steam. Isso é observação do cliente, ainda sem medição independente contra a API. Fixtures continuam sendo demonstração. |
| P1 | Títulos Crystalforn em pt-BR | Normalizar títulos vagos ou russos usando somente campos estruturados confirmados; título neutro quando atributos necessários faltarem. | A normalização já existe no código, mas a cobertura de dados reais por jogo ainda não foi demonstrada. |
| P1 | Inventário mais completo e visual | Exibir nomes, contagens e imagens junto aos itens quando payload, URL/origem e permissões sustentarem isso. Cobrir skins e categorias Fortnite, inventário dos demais jogos, itens Steam e gamepasses Roblox quando realmente fornecidos. Marcar lista parcial e campos indisponíveis. | O cliente informou que os nomes Fortnite aparecem, mas faltam imagens individuais; pediu gamepasses Roblox e amostras de todos os jogos. A API pode não fornecer todos os dados ou recursos visuais. Não fabricar conteúdo nem assumir direitos de imagem. |
| P2 | Paginação em massa e sincronização | Investigar páginas/cursor, cotas, limites, checkpoint, retomada, memória, duração, erros e volume de 20–40 mil anúncios. Medir separadamente processamento local e chamadas reais autorizadas. | O benchmark sintético de 20 mil/40 mil não comprova capacidade, cotas ou tempo real da LZT. O worker segue desligado em modo demo. |
| P2 | Evitar entrega obsoleta em venda concorrente | Desenhar revalidação de disponibilidade, reserva/conflito, timeout ambíguo, idempotência e reconciliação. Só afirmar remoção “instantânea” após comprovar evento/mecanismo do fornecedor e latência. | A entrega de credenciais, compra e reembolso de carteira não estão ativos. O requisito comercial depende de revisão de compatibilidade e política do fornecedor. |
| P1 | Alternância de tema | Confirmar alternância claro/escuro acessível, persistente e consistente em catálogo, detalhe, acesso e administração. | Implementada parcialmente; revisão responsiva e visual consolidada continua pendente. |
| P3 | Gateway e testes de entrega | Preparar escopo e critérios para uma fase futura de gateway, checkout e entrega automática. | Bloqueado pela decisão vigente de demonstração. Não ligar pagamento, carteira, entrega ou reembolso real nesta fase. |

### Nova dependência operacional: acesso à Hostinger e SSH

Mateus pediu para ser adicionado como administrador/colaborador na Hostinger e informou que o SSH está instável, dizendo que fará uma verificação. Registrar como dependência operacional, separada dos requisitos funcionais:

- **Estado:** convite não concedido nesta atualização; instabilidade reportada pelo cliente, ainda sem diagnóstico confirmado.
- **Antes de conceder acesso:** o titular da conta deve confirmar a identidade, o motivo e o escopo. Preferir convite individual de colaborador com menor privilégio necessário, MFA, duração/revisão e trilha de auditoria.
- **Credenciais:** não compartilhar senha root, tokens ou chave privada; nenhum segredo deve entrar neste backlog.
- **Retomada de SSH:** aguardar confirmação de estabilidade; antes de operação remota, validar usuário, host key e alvo Hostinger autorizado. Não tocar outros servidores.
- **Conclusão:** acesso revisado pelo titular e limitado ao escopo aprovado, ou decisão explícita de não conceder; canal SSH estável e identidade do destino verificados antes de qualquer operação autorizada.

Essas mensagens não alteram o limite vigente: a loja permanece em demonstração, sem catálogo real, sincronização LZT ativa, pagamentos, saldo, entrega de credenciais ou reembolsos.

### Próximas ações consolidadas

1. **Concluir o acabamento da demonstração:** revisar catálogo, detalhe, acesso, área do cliente e painel administrativo em celular e desktop, nos temas claro e escuro; registrar problemas de hierarquia, espaçamento, foco, contraste, estados vazios/erro e responsividade.
2. **Fechar fidelidade dos dados visíveis:** conferir filtros Fortnite/Steam/LoL/Valorant, títulos em pt-BR e grupos de inventário contra o mapa de campos e os payloads de exemplo. Manter contagens/amostras explícitas; imagens individuais e gamepasses só entram quando existirem no payload e a origem de uso estiver revisada.
3. **Resolver a dependência do Auth Center:** obter configuração aprovada pelo responsável do serviço e validar callback, tenant, papel e isolamento em sessão legítima. Até lá, manter `503` sem sessão simulada.
4. **Especificar a paginação antes de alegar escala:** registrar limites e semântica da API, cursor/página, rate limit, checkpoint, retomada, memória, duração e reconciliação. Separar resultados sintéticos de qualquer medição autorizada no fornecedor; worker permanece inativo.
5. **Documentar concorrência e indisponibilidade:** detalhar revalidação, timeout ambíguo, não entrega de produto indisponível e idempotência de eventual reembolso, sem ativar pedido, carteira ou fornecedor real.
6. **Melhorar operações do painel somente dentro do demo:** priorizar origem dos dados, estado/falhas da sincronização, histórico e permissões. Nenhum controle deve abrir integração ou comércio.
7. **Aguardar retorno do cliente sobre Hostinger/SSH:** registrar a decisão do titular sobre eventual convite de colaborador com privilégio mínimo e aguardar confirmação de estabilidade do SSH antes de operações remotas.
8. **Manter checkout e entrega em backlog bloqueado:** gateway, saldo, credenciais e reembolsos só avançam após revisão de compatibilidade comercial e autorização explícita da mudança de escopo.
