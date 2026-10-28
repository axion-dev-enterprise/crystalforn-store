# Catálogo em leitura e gates comerciais

## Estado atual

Esta revisão publica anúncios pessoais reais recebidos da API LZT em modo somente leitura. A vitrine permite navegar, filtrar, paginar e consultar atributos normalizados e prévias de inventário. Os dados privados de acesso do fornecedor não são armazenados nos registros públicos.

O backend informa `catalogMode: live_read_only`. As páginas de detalhe exibem os campos públicos normalizados, mas informam que compra, cobrança Pix, saldo da carteira e entrega automática estão desativados.

## Travas efetivas

- `services/api/src/modules/legal/commerce-release-status.ts` separa `PUBLISHED_CATALOG_MODE` de `PUBLISHED_COMMERCE_MODE`.
- `services/api/src/modules/catalog/catalog.controller.ts` serve somente anúncios disponíveis e atributos normalizados.
- `services/sync-worker/src/main.ts` sincroniza páginas LZT, respeitando o limite de busca e persistindo o cursor.
- `services/sync-worker/src/fulfillment.ts` continua inativo; não há checkout nem compra automática no fornecedor.
- O worker de entrega também não processa pedidos nesta versão.
- Checkout, recarga de carteira, webhooks e imagens de catálogo passam por gates de liberação comercial.
- Variáveis de ambiente e tokens não substituem a revisão de código que controla o modo.

As rotas de cliente e administração ainda requerem sessões válidas. A ausência de credenciais de identidade deve resultar em indisponibilidade ou não autenticado; não existe login de exemplo, usuário padrão ou atalho de autenticação.

## Alterar o estado no futuro

O modo de catálogo somente leitura não habilita cobrança ou entrega. Uma versão comercial exige revisão própria do modelo de oferta, das regras das plataformas, dos provedores de pagamento, termos, privacidade e autenticação. Consulte [COMPATIBILIDADE_COMERCIAL.md](COMPATIBILIDADE_COMERCIAL.md).

## Critério de apresentação

Ao apresentar a aplicação, informe que os dados são fictícios e que não há catálogo real ou cobrança. Não divulgue credenciais de administração como credenciais para visitantes.
