# Referência da API

Prefixo global: `/api/v1`. A lista abaixo descreve as rotas presentes no código e os requisitos gerais; autenticação, gates de comércio e validação DTO podem alterar a resposta. Consulte os controllers em `services/api/src/modules/` para contratos completos de cada campo.

## Catálogo e status

| Método | Rota | Acesso | Comportamento atual |
| --- | --- | --- | --- |
| `GET` | `/health` | Público | Verifica conectividade PostgreSQL |
| `GET` | `/catalog?game=&page=&pageSize=&sort=price_asc&minPrice=&maxPrice=&minDaysOffline=&skinName=&steamGame=&rank=&minLevel=` | Público | Nesta versão responde `demoOnly: true` sem anúncios reais; a prévia usa exemplos fictícios no frontend e filtros locais |
| `GET` | `/catalog/:id` | Público | Responde `503` no modo demo; registros de fornecedor não são publicados |
| `GET` | `/catalog/:id/inventory-image?type=...` | Público | Responde `503` no modo demo; não consulta imagens do fornecedor |
| `GET` | `/catalog/roblox-avatars?userIds=...` | Público | Responde `503` no modo demo; não consulta perfis do fornecedor |
| `GET` | `/legal/terms/status` | Público | Informa modo do catálogo, estado de termos e gates comerciais |

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

As rotas `/admin/*` exigem sessão e papel administrativo. As rotas `/internal/catalog/*` são exclusivas de serviço: exigem `SYNC_WORKER_SECRET` via Bearer, e a importação exige o modo de sincronização publicado. O middleware de origem do navegador as exclui usando o caminho original com prefixo `/api/v1`; mantenha-as em rede privada entre Compose services e não as exponha a usuários finais. Webhooks de pagamento exigem assinatura/segredo do provedor, além do gate comercial.

### Operação do catálogo no painel

| Método | Rota | Observação |
| --- | --- | --- |
| `GET` | `/admin/dashboard` | Resumo de pedidos, estado da última sincronização, idade da atualização mais recente de anúncio e contagens do inventário |
| `GET` | `/admin/catalog?page=&pageSize=&search=&game=&sellerId=&status=&visibility=&quality=&freshness=&minPrice=&maxPrice=` | Consulta administrativa paginada; permite filtrar itens com mais de 24 h sem sincronização e não altera anúncios |
| `GET` | `/admin/catalog/sync-runs?page=&pageSize=&search=&status=` | Histórico paginado de sincronizações, com busca por código de erro e filtro `all`, `complete`, `running` ou `failed` |
| `GET` | `/admin/catalog/price-preview?markupPercent=&couponPercent=&sampleSize=` | Simulação somente leitura, com margem de 50–59% e cupom de 1–4% |
| `GET` | `/admin/audit?page=&pageSize=&search=&action=` | Auditoria paginada, com busca por e-mail/ação/alvo e filtro por ação |
| `PATCH` | `/admin/catalog/items/:id/visibility` | Define `{ "hidden": true|false }` para um anúncio |
| `PATCH` | `/admin/catalog/sellers/:sellerId/visibility` | Define `{ "hidden": true|false }` para todos os anúncios daquele vendedor |

O histórico de sincronização informa duração, páginas, itens vistos, importados e descartados por motivo, além do estado e da mensagem de erro quando houver. A importação interna retorna `imported`, `discarded` e `discardedReasons`; os motivos agregados cobrem formato/identificador inválido, origem não elegível, dados incompletos, jogo fora do catálogo e ID repetido no lote.

Os controles de visibilidade também são aplicados nas consultas públicas e na última leitura de produto antes do checkout. A simulação de preço não salva alterações. A migração `011_admin_backlog_controls.sql` adiciona a tabela de exceções por anúncio e os detalhes de auditoria; o serviço da API aplica migrações versionadas no startup.

Os parâmetros de busca dos históricos são limitados a 120 caracteres; `status` aceita apenas os estados documentados e `action` é comparado como valor literal. Os dois recursos mantêm ordenação mais recente primeiro e usam `pageSize` limitado pelo DTO administrativo.

## Idempotência e erros

Checkout e recargas exigem cabeçalho `Idempotency-Key` entre 16 e 128 caracteres do conjunto aceito pelo DTO. O catálogo pode estar ativo em modo somente leitura enquanto compras, recargas e entrega permanecem desligadas. Erros de regra são respostas HTTP do NestJS; integrações desligadas retornam indisponibilidade explícita. Não interprete uma rota presente como autorização para cobrança.

## Filtros de inventário

Na demonstração, os filtros usam apenas os exemplos fictícios no cliente. Os parâmetros de filtro e paginação são mantidos para a interface, mas não consultam registros reais. A ativação de catálogo da LZT exige uma revisão separada.

Quando o catálogo real for autorizado em outra versão, a listagem deverá limitar `attributes` aos metadados usados pelos cards e manter inventários completos somente na rota de detalhes. Nesta versão demo nenhum atributo real do fornecedor é transferido.
