# Mapa de filtros e campos do fornecedor

Atualizado em 28/10/2026. Este mapa diferencia filtros implementados na loja, normalização de dados no código e parâmetros descritos pela LZT. A presença de um parâmetro de busca não significa que a resposta contenha os mesmos detalhes como campos de inventário.

## Mapeamentos implementados

| Categoria | Pedido na loja | Campo normalizado | Origem reconhecida pelo normalizador | Estado / limite |
| --- | --- | --- | --- | --- |
| Fortnite | Personagem ou skin | `inventory.skins`, `inventory.featured_skins` | `skin`, `skins`, `inventory.skin`, `inventory.skins`, `fortniteSkins` | A loja pesquisa itens locais; a LZT também publica `skin[]` com milhares de opções, ainda não conectado à busca da vitrine. |
| Steam | Jogo da biblioteca | `inventory.games`, `inventory.game_names` | `steam_games`, `steam_game`, `games`, `game`, `steam_full_games` | A loja pesquisa nomes locais. A LZT documenta `game[]` como IDs e `hours_played` por jogo; o projeto ainda não resolve nomes digitados para IDs do fornecedor. |
| Valorant | Rank e nível mínimo | `inventory.rank`, `inventory.level` | `rmin`, `valorantRankTitle`, `riot_valorant_rank`, `inventory.rmin`, `valorant_level_min`, `riot_valorant_level` | Rank conhecido é normalizado para pt-BR; valor numérico Valorant segue a enumeração 3–27 publicada pela LZT. |
| League of Legends | Rank e nível mínimo | `inventory.rank`, `inventory.lol_rank`, `inventory.level` | `riot_lol_rank`, `riot_lol_level`, `inventory.lol_rank`, `inventory.lol_level` | Ranks textuais reconhecidos são normalizados; números sem enumeração confirmada não viram um rank inventado. |
| Roblox | Saldo e inventário disponível | `inventory.robux_balance`, `inventory.items`, `inventory.fruits`, `inventory.gamepasses` | `roblox_robux`, `items`, `item`, `fruits`, `fruit`, `gamepasses`, `gamepass`, `game_passes` | A seção individual de gamepasses só aparece se um desses arrays vier no payload. O schema público consultado documenta filtros agregados, não uma lista individual de passes. |

## Filtros publicados pela LZT e lacunas da integração

- **Epic Games/Fortnite:** a LZT publica `skin[]`, `pickaxe[]`, `dance[]` e `glider[]` com enums de milhares de itens. A vitrine hoje pesquisa nomes nos arrays já importados; o sincronizador não expõe seleção desses enums e não repassa o filtro individual à consulta do fornecedor.
- **Riot:** `rmin`/`rmax` são limites numéricos de rank Valorant; `lol_rank[]` é um filtro de rank LoL. A API da loja recebe pesquisa textual normalizada e aplica o filtro sobre os anúncios já importados.
- **Steam:** `game[]` aceita IDs de jogos e `hours_played` recebe horas por jogo. A loja atualmente filtra pelos nomes de jogos presentes no inventário normalizado; não converte uma busca textual em ID LZT.
- **Roblox:** `robux_min`/`robux_max` e `gamepass_min`/`gamepass_max` são filtros numéricos. A documentação define o filtro de gamepass como o custo agregado em Robux de passes em jogos populares; não especifica um array de nomes/ícones individuais.

Referências oficiais: [Epic Games](https://lzt-market.readme.io/reference/categoryepicgames), [Steam](https://lzt-market.readme.io/reference/categorysteam), [Riot](https://lzt-market.readme.io/reference/categoryriot) e [Roblox](https://lzt-market.readme.io/reference/categoryroblox).

## Paginação: divergência que exige nova verificação autorizada

As referências de categoria publicam `after` como cursor de próxima página. O registro operacional existente relata que uma leitura com `page=2` retornou página distinta e que o valor testado em `after` repetiu a primeira página; a implementação mantém `page` e checkpoint numérico. Como o schema publicado não explica como obter o valor correto de `after`, não se deve trocar o mecanismo sem uma nova validação factual autorizada. A integração está desligada no modo de demonstração.

## Verificação

Este é um mapeamento estático de documentação pública e código-fonte. Não comprova o formato de cada resposta real, cobertura completa de inventário, listas individuais de gamepasses, resolução de IDs Steam, uso dos filtros do fornecedor pela vitrine nem importação em massa. Essas comprovações permanecem dependentes de payloads autorizados e de uma revisão posterior do gate de demonstração.
