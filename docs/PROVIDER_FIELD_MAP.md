# Mapa de filtros e campos do fornecedor

Atualizado em 28/10/2026 após nova conferência da documentação pública. Este mapa diferencia filtros implementados na loja, normalização de dados no código e parâmetros descritos pela LZT. A presença de um parâmetro de busca não significa que a resposta contenha os mesmos detalhes como campos de inventário.

## Mapeamentos implementados

| Categoria | Pedido na loja | Campo normalizado | Origem reconhecida pelo normalizador | Estado / limite |
| --- | --- | --- | --- | --- |
| Fortnite | Personagem ou skin | `inventory.skins`, `inventory.featured_skins` | `skin`, `skins`, `inventory.skin`, `inventory.skins`, `fortniteSkins` | A loja pesquisa itens locais; a LZT também publica `skin[]` com milhares de opções, ainda não conectado à busca da vitrine. |
| Steam | Jogo da biblioteca | `inventory.games`, `inventory.game_names` | `steam_games`, `steam_game`, `games`, `game`, `steam_full_games` | A busca e o inventário textual usam os nomes retornados. Capas externas ficam ocultas até a origem e os direitos de exibição serem revisados; a busca ainda não resolve nomes digitados para IDs do fornecedor. |
| Valorant | Rank e nível mínimo | `inventory.rank`, `inventory.level` | `rmin`, `valorantRankTitle`, `riot_valorant_rank`, `inventory.rmin`, `valorant_level_min`, `riot_valorant_level` | O normalizador seleciona o primeiro candidato reconhecido e converte o rank para pt-BR; valor numérico Valorant segue a enumeração 3–27 publicada pela LZT. Candidatos desconhecidos não são inventados nem impedem aproveitar outro campo válido no mesmo payload. |
| League of Legends | Rank e nível mínimo | `inventory.rank`, `inventory.lol_rank`, `inventory.level` | `riot_lol_rank`, `riot_lol_level`, `inventory.lol_rank`, `inventory.lol_level` | Ranks textuais reconhecidos são normalizados; números sem enumeração confirmada não viram um rank inventado. |
| Roblox | Saldo e inventário disponível | `inventory.robux_balance`, `inventory.items_count`, `inventory.fruits_count`, `inventory.items`, `inventory.fruits`, `inventory.gamepasses` | `roblox_robux`, `roblox_items_count`, `roblox_fruits_count`, `items`, `item`, `fruits`, `fruit`, `gamepasses`, `gamepass`, `game_passes` | Contagens de itens e frutas são preservadas em grupos distintos. A seção individual de gamepasses só aparece se um desses arrays vier no payload. O schema público consultado documenta filtros agregados, não uma lista individual de passes. |

## Filtros publicados pela LZT e lacunas da integração

| Categoria | Campo na busca da loja | Campo consultado no catálogo local | Parâmetro público LZT relacionado | Situação desta versão |
| --- | --- | --- | --- | --- |
| Fortnite | `skinName` | `inventory.skins`, `inventory.featured_skins` | `skin[]` (enum de skins) | A busca local funciona sobre itens importados; o modo demo usa fixtures. O enum LZT não é enviado pela vitrine. |
| Steam | `steamGame` | `inventory.games`, `inventory.game_names` | `game[]` (IDs) | A busca aceita nome do jogo presente no payload. Não há resolução texto→ID para consulta LZT. |
| Valorant | `rank`, `minLevel` | `inventory.rank`, `inventory.level` | `rmin`, `rmax`, `valorant_level_min`, `valorant_level_max` | A API local filtra rank/nível dos registros importados; busca por tier inclui suas divisões e busca com divisão é exata. A vitrine não traduz o rótulo textual para enums de busca do fornecedor. |
| League of Legends | `rank`, `minLevel` | `inventory.rank`, `inventory.lol_rank`, `inventory.level`, `inventory.lol_level` | `lol_rank[]`, `lol_level_min`, `lol_level_max` | A API local filtra rank/nível conhecidos; busca por tier inclui suas divisões e busca com divisão é exata. Os parâmetros LZT não são enviados pela vitrine. |
| Roblox | Sem filtro de item individual | `inventory.items`, `inventory.fruits`, `inventory.gamepasses` | `robux_min`/`robux_max`, `gamepass_min`/`gamepass_max` | Filtros documentados são agregados; lista de gamepasses depende de campo presente no payload. |

Os testes de navegação desta revisão usaram apenas parâmetros da loja em modo demo e fixtures sintéticas; a tabela acima descreve o mapeamento estático do código e documentação. Ela não afirma que o fornecedor foi consultado.

Na documentação oficial consultada em 28/10/2026, a categoria Epic lista 3.122 valores em `skin[]`, 2.307 em `pickaxe[]`, 2.209 em `dance[]` e 759 em `glider[]`; esses enums permitem selecionar nomes individuais na busca do fornecedor, mas não garantem que o inventário retornado traga a lista completa dos itens. Steam documenta `game[]` como IDs inteiros. Riot documenta `rmin`/`rmax` para ranks Valorant, `valorant_level_min/max`, `lol_rank[]` e `lol_level_min/max`. Roblox documenta `gamepass_min/max` como custo total de passes em jogos populares, não nomes de passes individuais.

- **Epic Games/Fortnite:** a LZT publica `skin[]`, `pickaxe[]`, `dance[]` e `glider[]` com enums de milhares de itens. A vitrine hoje pesquisa nomes nos arrays já importados; o sincronizador não expõe seleção desses enums e não repassa o filtro individual à consulta do fornecedor.
- **Riot:** `rmin`/`rmax` são limites numéricos de rank Valorant; `lol_rank[]` é um filtro de rank LoL. A API da loja recebe pesquisa textual normalizada e aplica o filtro sobre os anúncios já importados.
- **Steam:** `game[]` aceita IDs de jogos e `hours_played` recebe horas por jogo. A loja atualmente filtra pelos nomes presentes no inventário; não converte uma busca textual em ID LZT. Capas externas não são derivadas de `appid` nem renderizadas enquanto a origem e os direitos não forem aprovados; os nomes e horas de jogo continuam visíveis em cartões tipográficos locais.
- **Roblox:** `robux_min`/`robux_max` e `gamepass_min`/`gamepass_max` são filtros numéricos. A documentação define o filtro de gamepass como o custo agregado em Robux de passes em jogos populares; não especifica um array de nomes/ícones individuais.

Referências oficiais: [Epic Games](https://lzt-market.readme.io/reference/categoryepicgames), [Steam](https://lzt-market.readme.io/reference/categorysteam), [Riot](https://lzt-market.readme.io/reference/categoryriot) e [Roblox](https://lzt-market.readme.io/reference/categoryroblox).

## Prévias de imagem documentadas

A operação oficial [Get Account Image](https://lzt-market.readme.io/reference/managingimage) lista os tipos `skins`, `pickaxes`, `dances`, `gliders`, `weapons`, `agents` e `buddies`. A aplicação agora permite as prévias Fortnite (`skins`, `pickaxes`, `dances`, `gliders`), Valorant (`weapons`, `agents`, `buddies`) e LoL (`skins`) quando o catálogo autorizado estiver em leitura. Cada pedido valida a categoria e o tipo antes de consultar o fornecedor, e a resposta passa por validação PNG, limite de bytes, transformação WebP e cache.

A documentação consultada não define tipo de imagem para inventário de jogos Steam nem gamepasses Roblox. Steam continua dependendo de URL individual confiável no payload; Roblox mostra avatar público quando disponível e gamepasses como lista textual se houver dados. O modo demo não realiza essas consultas.

## Cobertura do exemplo fornecido pelo cliente

O arquivo `exemplo_apijson (1).txt` representa uma resposta paginada com `status`, `endpoint`, `page`, `total_items` e `items`. O exemplo contém somente anúncio Fortnite e inclui `item_id`, `seller_id`, preços RUB/USD, título original, tipo de e-mail, dias sem atividade, atividade recente, dados do passe de batalha, contagens de skins/picaretas/emotes/asas-delta, `featured_skins` como lista de nomes e vínculo de plataformas.

O exemplo não fornece imagens/ícones por item, inventário detalhado de picaretas/emotes/asas-delta, ranks LoL/Valorant, jogos Steam nem gamepasses Roblox. Também não contém um status de disponibilidade por anúncio. O manual pede filtrar itens inválidos, banidos ou vendidos, mas esses estados não podem ser inferidos deste payload; exigem campo ou endpoint documentado. Esta amostra, portanto, não valida cobertura de todas as categorias nem permite prometer inventário completo ou imagem individual.

## Paginação e limites: contrato ainda não validado em runtime

As referências oficiais descrevem `after` como parâmetro de requisição para buscar a próxima página. O OpenAPI oficial confirma `hasNextPage`, `nextCursor`, `perPage` e `page` na resposta de listagem. A página de limites informa ainda duas cotas aplicáveis: 20 requisições/minuto para métodos de busca de categoria (intervalo de 3 s) e bucket compartilhado de 120/minuto entre buscas e consultas de anúncios/itens do usuário. [OpenAPI oficial](https://raw.githubusercontent.com/AS7RIDENIED/LOLZTEAM/main/Official%20Documentation/market.json) · [Get Last Accounts](https://lzt-market.readme.io/reference/categoryall) · [Information / rate limits](https://lzt-market.readme.io/reference/information)

O cliente enviou um esquema de resposta com `items`, `totalItems`, `hasNextPage`, `perPage` e `page`, mas sem o valor de continuação preenchido. O OpenAPI oficial define `nextCursor`; ainda falta um payload real e anonimizado mostrando o valor retornado e a segunda página. As capturas mais recentes do frontend (`POST lzt.market/...`) mostram `nextPageHref` e `templateHtml`; elas não substituem a validação de runtime das chamadas `GET api.lzt.market/...`.

O worker permanece desligado no modo demo. No código, a primeira consulta agora omite `page`; as próximas só enviam `after` quando o fornecedor devolver `nextCursor`. Se houver mais resultados sem um cursor utilizável, a varredura falha fechada e não reconcilia o catálogo. O nome do campo está documentado no OpenAPI, mas o valor e a sequência real ainda aguardam um payload oficial anonimizado. Checkpoints legados sem cursor são descartados no início da varredura.

O worker aplica intervalo local mínimo de três segundos entre buscas de categoria, em linha com o limite específico publicado de 20/minuto por busca. Também deve respeitar o bucket compartilhado de 120/minuto quando combinado com `GET /{item_id}` e outras buscas. Em `429`, preserva o checkpoint e interpreta `Retry-After`; sem valor válido, usa backoff mínimo de 60 segundos. Isso descreve o código, não uma medição de respostas reais do fornecedor.

Na sondagem somente de leitura de 14/11/2026, a API retornou 40 itens por página e 249.768 itens no total informado para a busca Fortnite sem filtro de origem. Com esse tamanho observado, 30 mil registros equivaleriam a 750 buscas e, no limite de 20 buscas/minuto, pelo menos 37,5 minutos; a varredura desse total informado equivaleria a cerca de 6.245 páginas ou 5h13min no limite teórico. São extrapolações aritméticas, não medição do worker, SLA ou garantia de atualização. A sondagem cobriu apenas duas páginas, não importou os anúncios e não mediu concorrência, throughput contínuo ou retomada. O benchmark sintético de lotes locais não mede rede nem capacidade de importação da LZT.

## Verificação

Este mapeamento combina a documentação pública com uma sondagem autorizada de duas páginas reais da API oficial. `after`/`nextCursor`, tamanho de 40 itens, total informado e ausência de IDs repetidos entre as duas páginas foram observados; o campo numérico `page` permaneceu em `1`. A sondagem não validou cobertura de inventário, listas individuais de gamepasses, resolução de IDs Steam, varredura completa, persistência/retomada do worker ou importação em massa. O gate de demonstração permanece fechado.
