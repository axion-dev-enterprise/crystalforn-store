# Referência da API

Prefixo global: `/api/v1`. A lista abaixo descreve as rotas presentes no código e os requisitos gerais; autenticação, gates de demonstração e validação DTO podem alterar a resposta. Consulte os controllers em `services/api/src/modules/` para contratos completos de cada campo.

## Catálogo e status

| Método | Rota | Acesso | Comportamento atual |
| --- | --- | --- | --- |
| `GET` | `/health` | Público | Verifica conectividade PostgreSQL |
| `GET` | `/catalog?game=&page=&pageSize=&minPrice=&maxPrice=&minDaysOffline=&skinName=&steamGame=&rank=&minLevel=` | Público | Na demo retorna `items: []`, `demoOnly: true`; exemplos são renderizados pela web |
| `GET` | `/catalog/:id` | Público | Bloqueado pelo gate comercial na demo |
| `GET` | `/catalog/:id/inventory-image?type=...` | Público | Bloqueado pelo gate comercial na demo |
| `GET` | `/catalog/roblox-avatars?userIds=...` | Público | Bloqueado pelo gate comercial na demo |
| `GET` | `/legal/terms/status` | Público | Informa estado de termos e gates de comércio |

## Identidade e sessão

| Método | Rota | Acesso |
| --- | --- | --- |
| `GET` | `/auth/central/login` | Público; exige integração central disponível |
| `POST` | `/auth/central/callback` | Callback central; valida código e estado |
| `POST` | `/auth/admin/login` | Público, credenciais administrativas verificadas no backend |
| `POST` | `/auth/register` | Descontinuado; responde `410` |
| `POST` | `/auth/login` | Descontinuado; responde `410` |
| `POST` | `/auth/logout` | Sessão/cookie |
| `GET` | `/auth/me` | Sessão válida |

## Cliente e pedidos

As rotas a seguir exigem sessão de cliente válida e usam respostas privadas sem cache:

| Método | Rota | Observação |
| --- | --- | --- |
| `GET` | `/wallet` | Saldo/lançamentos da carteira |
| `GET` | `/orders?page=&pageSize=` | Histórico paginado |
| `POST` | `/checkout` | Exige `Idempotency-Key`; indisponível no modo demo |
| `POST` | `/wallet/topups` | Exige `Idempotency-Key`; indisponível no modo demo |
| `GET` | `/orders/:id/delivery` | Dados de entrega do próprio pedido |
| `GET` | `/orders/:id/cancellation-request` | Solicitação do próprio pedido |
| `POST` | `/orders/:id/cancellation-request` | Registra solicitação do cliente |

## Administração e integrações internas

As rotas `/admin/*` exigem sessão e papel administrativo. A rota `POST /internal/catalog/items` exige credencial worker e não deve ser exposta a usuários finais. Webhooks de pagamento exigem assinatura/segredo do provedor, além do gate comercial.

## Idempotência e erros

Checkout e recargas exigem cabeçalho `Idempotency-Key` entre 16 e 128 caracteres do conjunto aceito pelo DTO. Erros de regra são respostas HTTP do NestJS; integrações desligadas retornam indisponibilidade explícita. Não interprete uma rota presente como autorização para cobrança.

## Filtros de inventário

`skinName` procura texto nas listas de skins Fortnite; `steamGame` procura títulos em `inventory.games`/`inventory.game_names`; `rank` pesquisa o rank de Valorant ou LoL; `minLevel` filtra o nível mínimo dessas contas. Cada campo tem limite validado no DTO e combina com jogo, preço, inatividade e paginação. Na demonstração, os filtros usam apenas os exemplos fictícios no cliente; a consulta de banco correspondente está pronta para catálogo habilitado.
