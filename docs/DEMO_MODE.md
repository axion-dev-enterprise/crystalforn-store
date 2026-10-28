# Modo demonstração

## Estado atual

Esta revisão publica somente uma prévia da experiência visual. A página inicial fornece oito itens fictícios para permitir navegação, filtragem por jogo, ordenação visual por faixa de preço e paginação. Os nomes, inventários, vendedores e valores são dados de apresentação e não representam produtos existentes.

O backend devolve `demoOnly: true` e uma lista comercial vazia. O frontend usa os exemplos locais identificados como fictícios. Portanto, os cards não abrem uma página de produto e não têm ação de compra.

## Travas efetivas

- `services/api/src/modules/legal/commerce-release-status.ts` declara o modo publicado como `demo` e recusa operações comerciais.
- `services/api/src/modules/catalog/catalog.controller.ts` não serve anúncios reais enquanto o modo publicado for demo.
- `services/sync-worker/src/main.ts` encerra sem conectar ao banco ou ao fornecedor quando a versão está em demonstração.
- O worker de entrega também não processa pedidos nesta versão.
- Checkout, recarga de carteira, webhooks e imagens de catálogo passam por gates de liberação comercial.
- Variáveis de ambiente e tokens não substituem a revisão de código que controla o modo.

As rotas de cliente e administração ainda requerem sessões válidas. A ausência de credenciais de identidade deve resultar em indisponibilidade ou não autenticado; não existe login de exemplo, usuário padrão ou atalho de autenticação.

## Alterar o estado no futuro

Não remova as travas apenas para popular uma demonstração. Uma eventual versão comercial exigiria revisão do modelo de oferta e das regras das plataformas, autorização dos provedores de pagamento, termos e privacidade aprovados, autenticação real, validação das APIs com credenciais autorizadas, análise de segurança, plano operacional e uma decisão explícita do responsável. Registre a evidência e altere os gates por uma revisão isolada e auditável. Consulte [COMPATIBILIDADE_COMERCIAL.md](COMPATIBILIDADE_COMERCIAL.md).

## Critério de apresentação

Ao apresentar a aplicação, informe que os dados são fictícios e que não há catálogo real ou cobrança. Não divulgue credenciais de administração como credenciais para visitantes.
