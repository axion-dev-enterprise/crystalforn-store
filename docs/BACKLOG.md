# Backlog Crystalforn

Atualizado em 28/10/2026 após nova leitura da conversa de Mateus Alves Fernandes na Workana. O cliente considera a API próxima do rumo esperado e detalhou filtros, nomes de rank/divisão, atributos dos cards, inventários por jogo, escala, preço e o fluxo futuro de compra. Este documento reúne o backlog funcional, visual e operacional; status representam evidência no código/documentação, não autorização para ativar operações comerciais.

## Estado e limites atuais

- A loja permanece em **demonstração somente**, sem catálogo real, cobrança, compra, entrega automática ou integração ativa com gateway. Ver [DEMO_MODE.md](DEMO_MODE.md) e [COMPATIBILIDADE_COMERCIAL.md](COMPATIBILIDADE_COMERCIAL.md).
- A release de aplicação `f4e8e13` foi promovida à produção em 28/10/2026: API e web ficaram saudáveis, `/`, `/api/v1/health`, `/api/v1/legal/terms/status` e `/api/v1/catalog` responderam HTTP 200, com modo demo ativo, catálogo público vazio e pagamentos/sincronização desativados. A release anterior permanece preservada para rollback.
- A inspeção renderizada da vitrine confirmou 10 exemplos fictícios em duas páginas; o detalhe Fortnite mostrou seis itens textuais em quatro grupos, sem imagens individuais. A implementação que acrescenta capas Steam aos exemplos foi criada depois dessa release e ainda aguarda build/deploy; as URLs testadas são somente arte pública de jogos e não validam inventário real.
- A API pode exibir resultados de integração em ambiente de desenvolvimento, mas isso não comprova capacidade de importar dezenas de milhares de anúncios, consistência de inventário ou prontidão para produção.
- Toda tarefa que consulte dados reais da LZT, processe pagamentos, entregue credenciais ou movimente saldo depende de revisão própria de contrato, segurança e compatibilidade comercial. Os itens marcados como bloqueados não devem ser liberados por este backlog.
- As quantidades de 20 mil a 40 mil anúncios são metas solicitadas pelo cliente, ainda sem validação de limites, cotas, custo ou garantias do fornecedor.
- Nesta revisão, a vitrine pública foi conferida em modo demo: `skinName=Travis Scott` retornou 1 exemplo Fortnite, `steamGame=Portal 2` retornou 2 exemplos Steam e `rank=Ouro&minLevel=1` retornou 1 exemplo LoL. Esses resultados provam somente a filtragem das fixtures fictícias; nenhuma consulta autenticada ao fornecedor ocorreu.
- A página pública de detalhe Fortnite foi inspecionada: mostra seis itens textuais em quatro grupos (skins, picaretas, emotes e asas-delta) e avisa que a amostra é fictícia e incompleta. Não há URLs de imagem nos dados demonstrativos, portanto miniaturas reais ainda não foram verificadas.
- Verificação da revisão atual: GitHub Actions Build [40781639640](https://github.com/axion-dev-enterprise/crystalforn-store/actions/runs/40781639640) passou para `7f34190`, compilando web, API e workers e executando o benchmark sintético. A revisão de interface `55323b9` também passou no auditor anti-slop (15 arquivos, 0 problemas) e em `git diff --check`. A execução atual confirma a compilação da lista demonstrativa de ranks/divisões; não verifica sua renderização em navegador. O benchmark mede serialização e divisão local de lotes; não comprova escala do fornecedor, cobertura de payloads reais, autenticação em runtime ou operação comercial.

## Delta das mensagens mais recentes do cliente — 28/10/2026

- **Sinal de progresso:** Mateus disse que o resultado da API está agradável e que, com os ajustes de filtros, títulos e inventários, considera a parte da API concluída para avançar à etapa seguinte. Isso registra a percepção e o critério comercial do cliente; não prova capacidade técnica, cobertura de dados, desempenho em produção ou aceite formal do trabalho.
- **Escopo mínimo de descoberta:** priorizar filtros úteis para personagens/skins de Fortnite, jogos desejados na Steam, rank em LoL e Valorant e nível quando o payload oferecer esse campo. O cliente esclareceu que não espera uma cópia integral do fórum russo ou da Legas; quer filtros essenciais e uma amostra de conteúdo com qualidade equivalente.
- **Títulos:** mapear os ranks e divisões fornecidos para títulos de LoL e Valorant somente. Rank em título não substitui os filtros de descoberta; não inferir rank, divisão ou inventário quando o anúncio não trouxer o dado.
- **Inventário:** exibir nomes e imagens quando os dados e recursos confiáveis existirem; incluir gamepasses Roblox e demais itens apenas se o contrato/payload realmente os fornecer. A meta é transparência e uma amostra representativa por jogo, identificando listas parciais.
- **Paginação:** o cliente observou respostas pequenas (10–30 anúncios e 120 para Steam) e reiterou a expectativa de 20–40 mil. O alvo permanece não validado; o código e limites documentados não garantem sincronização em tempo real.
- **Próxima etapa citada:** gateway e testes de entrega depois dos ajustes. Isso não altera o modo demo vigente: qualquer operação real segue bloqueada e requer revisão/aprovação independente.

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
- Uma eventual ativação exige revisão de compatibilidade comercial, termos, autenticação, segurança, gateway e operação, com decisão registrada separadamente.
- A documentação e a interface deixam claro quando exibem somente dados fictícios ou uma prévia não comercial.

**Dependências:** decisão comercial documentada e aprovação de release.

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

**Estado:** Parcial. O detalhe Fortnite foi inspecionado na vitrine pública: seis itens textuais agrupados em skins, picaretas, emotes e asas-delta, com aviso de que a amostra fictícia não é completa. A página também apresenta miniaturas por item quando o registro fornece URL HTTPS de domínio oficial permitido; para Fortnite, Valorant e LoL, solicita uma prévia agregada pelos tipos de imagem oficiais compatíveis com cada jogo. Inclui a seção de gamepasses quando há uma lista retornada. O exemplo fornecido pelo cliente é apenas Fortnite e traz nomes em `featured_skins`, sem imagens/ícones por item ou listas detalhadas dos outros grupos; também não inclui gamepasses individuais Roblox. A documentação não lista imagens de inventário Steam ou gamepasses Roblox, e a cobertura efetiva dos payloads ainda não está comprovada. A nova mensagem pede qualidade consistente nos catálogos e uma boa amostra do conteúdo, sem afirmar que todos os campos ou itens de cada anúncio devam ser reproduzidos.

Mostrar imagens junto aos nomes das skins e ampliar os detalhes visuais do inventário. Para Roblox, investigar gamepasses e os demais itens efetivamente disponibilizados pelo Market API. Fornecer uma amostra organizada e representativa para cada jogo, deixando explícito quando a lista retornada for parcial; o cliente não exige copiar todos os campos do fórum ou da Legas.

**Critérios de aceite**

- Cada item exibe imagem quando o fornecedor ou uma fonte oficial fornece um recurso identificável; indisponibilidade de imagem tem fallback visual acessível.
- Roblox mostra gamepasses e demais campos apenas quando presentes e documentados no anúncio retornado.
- Fortnite, Valorant, LoL e Steam apresentam os itens de inventário que o contrato realmente entrega, com nomes, imagens e agrupamento por tipo quando houver dados.
- A página de detalhes diferencia inventário completo de uma amostra ou lista parcial; não chama de completo quando houver truncamento ou limite de dados.
- Há uma matriz por jogo dos campos e itens presentes em payloads autorizados, com seção visual útil mesmo quando um tipo de inventário não é fornecido.
- Imagens têm texto alternativo útil e a interface continua utilizável em telas móveis e com teclado.

**Dependências:** BL-02, licença/origem dos recursos de imagem, limites de payload e revisão de desempenho.

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

**Estado:** Ajustado localmente após inspeção da página pública em modo demo: o H1 de produto deixou o limite estreito de `14ch`, ganhou largura fluida até `24ch` e teto menor no desktop; em telas de até 520 px há escala e largura próprias. A grade do detalhe já se reorganiza abaixo de 700 px, com filtros horizontais roláveis e navegação móvel. A URL de produto apontada anteriormente agora responde “Produto indisponível”; a inspeção atual usou somente a rota fictícia. Falta validar a aparência do título longo em larguras representativas e a leitura visual do inventário renderizado.

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

**Estado:** A marca já está integrada no cabeçalho, rodapé e favicon, com wordmarks para fundos claro e escuro; o botão de tema SVG persiste a escolha em `localStorage`. Falta conferir renderização, contraste e persistência nos fluxos reais. Evidência estática não comprova aparência final em navegador.

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

**Estado:** Parcial. A UI inclui histórico paginado, carteira, estados de entrega e fluxo central de identidade com consulta de tenant/papéis; login e cadastro locais estão desativados. A inspeção pública confirmou que `/cliente` também redireciona a `/entrar`, e a página informa que o acesso de clientes espera a configuração de identidade. Nenhuma sessão foi criada ou testada. A demonstração bloqueia pagamentos e entrega reais; autorização/isolamento de dados autenticados e integração final com Auth Center permanecem sem verificação.

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
