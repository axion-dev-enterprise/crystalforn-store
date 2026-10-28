# Modo de demonstração e gates comerciais

## Estado atual

Esta revisão apresenta dez exemplos fictícios no frontend, com páginas de detalhe demonstrativas disponíveis em `/produto/demo-*`. Os detalhes usam os mesmos dados locais do catálogo, não consultam o fornecedor e não oferecem compra ou entrega. A API responde `demoOnly: true`, não serve anúncios de fornecedor e o worker não faz chamadas à LZT nem importa inventário. Registros antigos de fornecedor podem permanecer no banco para retenção operacional, mas não são publicados pela API ou pela vitrine.

Os exemplos Steam mostram nomes e tempo de jogo em cartões tipográficos; a demonstração não deriva capas externas de IDs de jogos. Nomes, valores e bibliotecas são fictícios.

O primeiro exemplo Fortnite usa somente a forma dos campos do JSON de referência: duas skins em destaque, contagens de inventário, vinculações e passe de batalha. O detalhe separa os nomes destacados da contagem total e informa quando a amostra não contém nomes individuais. Esses valores são fictícios; não representam uma conta ou anúncio do fornecedor.

Na promoção de 28/10/2026, a web está em `c2185da` e a API em `f8b271b`. Os endpoints públicos de saúde e de estado de liberação confirmaram que catálogo, sincronização e pagamentos continuam desligados.

O backend informa `catalogMode: demo`. A página de detalhes e a vitrine deixam claro que os itens são fictícios. Compra, cobrança Pix, saldo da carteira e entrega automática permanecem desativados.

As consultas principais da vitrine e do detalhe de produto têm limite de 15 segundos. Se a API não responder a tempo, ambos mostram um erro com opção de nova tentativa, sem manter o skeleton indefinidamente. Cancelar uma consulta por navegação ou mudança de filtro não apresenta erro ao usuário.

## Travas efetivas

- `services/api/src/modules/legal/commerce-release-status.ts` mantém `PUBLISHED_CATALOG_MODE` e `PUBLISHED_COMMERCE_MODE` em `demo`.
- `services/api/src/modules/catalog/catalog.controller.ts` retorna o estado demo sem ler anúncios do banco para a resposta pública.
- `services/sync-worker/src/main.ts` sai sem conectar ao banco do fornecedor ou iniciar sincronização nesta versão.
- `services/sync-worker/src/fulfillment.ts` continua inativo; não há checkout nem compra automática no fornecedor.
- O worker de entrega também não processa pedidos nesta versão.
- Checkout, recarga de carteira, webhooks e imagens do catálogo passam por gates de liberação comercial.
- As rotas que salvam ou recuperam credenciais de pedidos também passam pelo gate comercial: `POST /api/v1/admin/orders/:id/delivery` e `GET /api/v1/orders/:id/delivery` retornam indisponibilidade no modo demo, inclusive para registros antigos no banco.
- Variáveis de ambiente e tokens não substituem a revisão de código que controla o modo.

As rotas de cliente e administração ainda requerem sessões válidas. A ausência de credenciais de identidade deve resultar em indisponibilidade ou não autenticado; não existe login de exemplo, usuário padrão ou atalho de autenticação.

## Alterar o estado no futuro

O modo de catálogo somente leitura não habilita cobrança ou entrega. Uma versão comercial exige revisão própria do modelo de oferta, das regras das plataformas, dos provedores de pagamento, termos, privacidade e autenticação. Consulte [COMPATIBILIDADE_COMERCIAL.md](COMPATIBILIDADE_COMERCIAL.md).

## Critério de apresentação

Ao apresentar a aplicação, informe que os dados são fictícios e que não há catálogo real, sincronização, venda ou cobrança. Não divulgue credenciais de administração como credenciais para visitantes.
