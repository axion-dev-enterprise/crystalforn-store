# Backlog Crystalforn

Atualizado em 28/10/2026 após consolidação das mensagens de Mateus Alves Fernandes na Workana e das solicitações já registradas pelo operador. O cliente considera a integração próxima do esperado e pediu foco nos filtros essenciais por jogo, numa amostra visual de inventário com qualidade consistente e em títulos legíveis. Este documento reúne o backlog funcional, visual e operacional; status representam evidência no código/documentação, não autorização para ativar operações comerciais.

## Estado e limites atuais

- A loja permanece em **demonstração somente**, sem catálogo real, cobrança, compra, entrega automática ou integração ativa com gateway. Ver [DEMO_MODE.md](DEMO_MODE.md) e [COMPATIBILIDADE_COMERCIAL.md](COMPATIBILIDADE_COMERCIAL.md).
- A API pode exibir resultados de integração em ambiente de desenvolvimento, mas isso não comprova capacidade de importar dezenas de milhares de anúncios, consistência de inventário ou prontidão para produção.
- Toda tarefa que consulte dados reais da LZT, processe pagamentos, entregue credenciais ou movimente saldo depende de revisão própria de contrato, segurança e compatibilidade comercial. Os itens marcados como bloqueados não devem ser liberados por este backlog.
- As quantidades de 20 mil a 40 mil anúncios são metas solicitadas pelo cliente, ainda sem validação de limites, cotas, custo ou garantias do fornecedor.
- Verificação desta revisão: GitHub Actions Build #35 passou para `dd95d316765db57ff45a6cea1a515be02be0bcc6`, compilando web, API e workers; os auditores estáticos RSC, NestJS e UI também passaram. Isso não comprova paginação real da LZT, cobertura de payloads ou operação comercial.

## Visão rápida de entrega

| Ordem | Item | Situação | Resultado esperado |
| --- | --- | --- | --- |
| 1 | BL-01 Demonstração e compatibilidade comercial | Bloqueado para venda real; gate deve permanecer ativo | Demo sem catálogo comercial, cobrança, entrega ou reembolso real |
| 2 | BL-10 Responsividade de produto e catálogo | Pendente de revisão visual abrangente | Detalhes, filtros e navegação confortáveis em celular e desktop |
| 3 | BL-11 Identidade Crystalforn e tema | Parcial; identidade e logo precisam ser consolidados no produto | Sistema visual escuro/ claro consistente, marca aplicada e alternância acessível |
| 4 | BL-02 a BL-04 Descoberta e detalhes por jogo | Parcial | Filtros úteis e detalhes fiéis aos campos que a API realmente entrega |
| 5 | BL-03 Títulos localizados | Implementado parcialmente; amostras reais por categoria pendentes | Títulos em pt-BR, sem texto russo bruto ou atributos inventados |
| 6 | BL-05 Importação em massa | Código de retomada presente; escala real não validada | Paginação resiliente, progresso observável e benchmark até 40 mil registros |
| 7 | BL-06 Concorrência e indisponibilidade | Parcial e bloqueado comercialmente | Nunca entregar anúncio indisponível; reconciliação/idempotência comprovadas |
| 8 | BL-12 Painel administrativo | Pendente de especificação e implementação consolidada | Operação auditável para catálogo, pedidos, sincronização e políticas comerciais |
| 9 | BL-13 Área do cliente e segurança de conta | Parcial/pendente conforme fluxos cobertos | Histórico e dados de demonstração seguros; entrega real continua bloqueada |
| 10 | BL-09 Pagamentos e testes de entrega | Futuro e bloqueado pelo modo demonstração | Plano validado antes de qualquer integração comercial |

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

**Estado:** Parcial. A vitrine e a API aplicam filtros de skin Fortnite, jogo Steam, rank e nível mínimo para LoL/Valorant sobre os dados locais. Na demonstração, sugestões de preenchimento agora são derivadas exclusivamente dos exemplos fictícios e uma busca especializada não inclui itens de outros jogos. O mapa está em [PROVIDER_FIELD_MAP.md](PROVIDER_FIELD_MAP.md); ligar as enums completas da LZT e resolver nomes de jogos Steam para IDs do fornecedor permanece adiado enquanto a sincronização real estiver fechada. Na revisão mais recente, o cliente reduziu a expectativa a filtros de descoberta essenciais e úteis, sem exigir reproduzir todos os filtros do fórum ou da Legas.

Usar documentação e catálogos oficiais do Market API para mapear filtros suportados, nomes de campo, tipos, opções e diferenças entre Fortnite, Steam, Roblox, Valorant e League of Legends (LoL). Não inferir que uma opção existe em todas as categorias.

**Critérios de aceite**

- Cada filtro disponível tem a origem e o campo do fornecedor documentados, incluindo categorias e valores aceitos; lacunas da integração permanecem identificadas como pendentes.
- A interface prioriza personagens/skins de Fortnite, jogos de Steam, rank para LoL e Valorant e nível quando o campo for útil e disponível para aquela categoria.
- No modo demo, sugestões de Fortnite, Steam, LoL e Valorant são rotuladas como fictícias e vêm somente das fixtures; nenhum exemplo é apresentado como opção real do fornecedor.
- As opções são limitadas ao que o fornecedor e os dados locais realmente sustentam; o catálogo não precisa espelhar integralmente o fórum ou a Legas.
- A interface só oferece filtros sustentados pelos dados disponíveis para a categoria selecionada.
- Filtros combinados e paginação preservam os critérios de busca e retornam estados claros quando não há resultados.
- Campos ausentes ou desconhecidos não são preenchidos com valores inventados.

**Dependências:** inspeção do contrato oficial e amostras não sensíveis por categoria. O exemplo entregue pelo cliente cobre apenas Fortnite; não comprova payloads de Steam, LoL, Valorant ou Roblox. Nenhuma chamada autenticada de produção neste item.

**Referências de contrato:** [filtros Epic Games](https://lzt-market.readme.io/reference/categoryepicgames), [filtros Steam](https://lzt-market.readme.io/reference/categorysteam), [filtros Riot](https://lzt-market.readme.io/reference/categoryriot) e [filtros Roblox](https://lzt-market.readme.io/reference/categoryroblox).

### BL-03 — Padronizar títulos de contas de LoL e Valorant por rank

**Estado:** Implementado no normalizador e nos exemplos demonstrativos; o build remoto compila web, API e workers. Ainda falta confrontar a regra com amostras autorizadas de payload por categoria.

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

**Estado:** Parcial. A página agora apresenta miniaturas por item quando o próprio registro fornece uma URL HTTPS de domínio oficial permitido e inclui a seção de gamepasses quando há uma lista retornada. O exemplo fornecido pelo cliente é apenas Fortnite e traz nomes em `featured_skins`, sem imagens/ícones por item ou listas detalhadas dos outros grupos; também não inclui gamepasses individuais Roblox. A cobertura efetiva dos payloads do fornecedor não está comprovada. A nova mensagem pede qualidade consistente nos catálogos e uma boa amostra do conteúdo, sem afirmar que todos os campos ou itens de cada anúncio devam ser reproduzidos.

Mostrar imagens junto aos nomes das skins e ampliar os detalhes visuais do inventário. Para Roblox, investigar gamepasses e os demais itens efetivamente disponibilizados pelo Market API. Fornecer uma amostra organizada e representativa para cada jogo, deixando explícito quando a lista retornada for parcial; o cliente não exige copiar todos os campos do fórum ou da Legas.

**Critérios de aceite**

- Cada item exibe imagem quando o fornecedor ou uma fonte oficial fornece um recurso identificável; indisponibilidade de imagem tem fallback visual acessível.
- Roblox mostra gamepasses e demais campos apenas quando presentes e documentados no anúncio retornado.
- Fortnite, Valorant, LoL e Steam apresentam os itens de inventário que o contrato realmente entrega, com nomes, imagens e agrupamento por tipo quando houver dados.
- A página de detalhes diferencia inventário completo de uma amostra ou lista parcial; não chama de completo quando houver truncamento ou limite de dados.
- Há uma matriz por jogo dos campos e itens presentes em payloads autorizados, com seção visual útil mesmo quando um tipo de inventário não é fornecido.
- Imagens têm texto alternativo útil e a interface continua utilizável em telas móveis e com teclado.

**Dependências:** BL-02, licença/origem dos recursos de imagem, limites de payload e revisão de desempenho.

**Limite de contrato:** a [documentação da categoria Roblox](https://lzt-market.readme.io/reference/categoryroblox) publica filtros `gamepass_min`/`gamepass_max` para o custo agregado de gamepasses, mas não documenta nesses parâmetros uma lista individual de passes. O detalhe individual continua condicionado a campos presentes em payloads autorizados.

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

**Estado:** Implementação existente usa paginação por número de página, checkpoint persistido com hashes dos IDs de cada página confirmada, detecção de repetição após retomada, importação em lotes e intervalo de 3 segundos; a validação de 20–40 mil anúncios permanece pendente. O worker está inativo no modo demonstração.

O cliente relatou que as consultas atuais terminam em conjuntos pequenos (10, 20 ou 30 anúncios; Steam chegou a 120) e solicitou cobertura de 20 mil a 40 mil anúncios. A API documenta o parâmetro `after`, mas o registro operacional existente informa que `page=2` retornou outra página e `after` repetiu a primeira; preserve o comportamento empiricamente observado até uma nova verificação autorizada do contrato. Não trocar para cursor sem evidência.

**Critérios de aceite**

- O sincronizador segue o cursor/indicador de continuação oficial até o fim e detecta páginas repetidas, cursor inválido, totais divergentes e respostas incompletas.
- É possível retomar uma execução interrompida sem perder progresso nem declarar sincronização completa antes da última página válida.
- Upserts são idempotentes; limites de concorrência, timeout, rate limit e backoff respeitam as cotas documentadas.
- A execução registra progresso agregado, duração, páginas e motivos de falha sem gravar tokens, credenciais de contas ou respostas privadas brutas.
- Um benchmark com dataset sintético demonstra comportamento em 20 mil e 40 mil registros, com limites documentados de memória, duração e taxa de erro. Isso não deve ser apresentado como garantia de importação em tempo real sem medição autorizada contra o fornecedor.
- Dados incompletos ou falha no meio da execução não iniciam reconciliação que esconda anúncios válidos.

**Dependências:** BL-02, limites oficiais da API, armazenamento e benchmark isolado. A configuração atual permite até 1.000 páginas por execução e impõe pelo menos 3 segundos entre chamadas LZT; para 30 mil itens a 40 por página, a estimativa documentada já é de cerca de 37,5 minutos, sem contar respostas e outros feeds. Portanto, “em tempo real” não está demonstrado. Execução autenticada contra produção exige autorização e gates próprios.

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

**Estado:** Pendente.

Mateus disse que o resultado atual da integração parece agradável e que o projeto está perto do esperado. Registrar uma nova revisão do catálogo e dos títulos depois que os itens aplicáveis deste backlog forem concluídos, sem tratar a mensagem “Blzzz” como requisito adicional.

**Critérios de aceite**

- A revisão cobre filtros por jogo, títulos de LoL/Valorant, inventários e estado de sincronização.
- Limites ou dados que dependam do fornecedor são apresentados como limitações observadas, não como garantias.
- O gate de demonstração e a decisão comercial continuam explícitos durante a revisão.

**Dependências:** BL-02 a BL-05 conforme a cobertura planejada.

## Prioridade P1 — Experiência visual e marca

### BL-10 — Refazer responsividade e hierarquia das páginas de catálogo e produto

**Estado:** Pendente de auditoria e refinamento visual abrangente. O operador mostrou a página `/produto/:id` e apontou título excessivamente grande, espaçamento ruim e adaptação insuficiente. A solicitação cobre também catálogo e outras páginas da loja.

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

**Estado:** Parcial. Há um visual escuro existente e uma solicitação anterior para criar logo; o backlog não registra ainda a aplicação consistente da identidade em todos os pontos nem a validação completa do alternador claro/escuro.

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

**Estado:** Pendente de inventário de funcionalidades; a tela atual mostra resumo de pedidos e sincronização, mas faltam controles e estados operacionais descritos no escopo original. O painel deve permanecer somente leitura ou operar apenas sobre dados fictícios enquanto o gate de demonstração estiver ativo.

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

**Estado:** Parcial/pendente. O escopo inicial pede histórico de compras e recebimento seguro de credenciais, mas o modo de demonstração impede compras e entrega reais. O cadastro deve usar o Auth Center conforme decisão anterior; não criar autenticação local paralela ou contas de atalho.

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
