# Arquitetura

## Visão geral

```text
Navegador
   │ HTTP
   ▼
Next.js (apps/web) ── chamadas /api/v1 ──► NestJS (services/api)
                                               │
                                               ▼
                                         PostgreSQL 16

Worker de catálogo e worker de entrega (services/sync-worker)
   └── Compose profiles opcionais; ambos não executam tarefas na versão demo
```

O Next.js renderiza as páginas e implementa interações da vitrine, área de cliente e painel. A API NestJS concentra autenticação, validação de domínio, catálogo, pedidos, pagamentos e operações administrativas. PostgreSQL guarda catálogo, usuários/sessões, pedidos, carteira, configurações e histórico de sincronização. As alterações de esquema são migrações SQL aditivas numeradas em `services/api/sql`.

## Componentes

### Web

- `apps/web/app`: rotas `/`, `/entrar`, `/cliente`, `/admin`, `/termos` e `/produto/[id]`.
- `apps/web/components`: vitrine, autenticação, área de cliente, detalhe e painel.
- A API de servidor é resolvida via `INTERNAL_API_ORIGIN`; o navegador chama as rotas same-origin `/api/v1`.

### API

- `modules/catalog`: catálogo público, normalização de atributos e rota interna de importação.
- `modules/auth`: sessões opacas, login administrativo e callbacks de identidade central.
- `modules/commerce`: pedidos, carteira, entrega e solicitações de cancelamento.
- `modules/payments`: criação Pix e processamento de webhooks.
- `modules/admin`: configurações, cupons, pedidos e atendimento.
- `modules/legal`: estado de termos e gates de lançamento comercial.
- `modules/health`: sonda de conectividade com banco.

O prefixo HTTP global é `/api/v1`. Erros são tratados como respostas HTTP pelo NestJS; dados privados do cliente e entrega devem usar cabeçalhos sem cache.

### Workers

O worker de sincronização consulta um fornecedor paginado e envia lotes à rota interna autenticada do catálogo. O worker de entrega processa pagamentos confirmados e interage com o fornecedor. São processos independentes e profiles explícitos do Compose, para que não sejam necessários ao frontend/API. Na versão publicada atual ambos encerram sem realizar operações.

## Fluxos principais

### Navegação de demonstração

1. O navegador carrega a vitrine Next.js.
2. A API informa que o catálogo real está desativado.
3. O componente de vitrine mostra dados locais fictícios e informa que não existe compra.

### Autenticação

1. A autenticação do cliente usa um fluxo central com callback e sessão local opaca.
2. O administrador possui validação própria no backend, com hash forte, escopo de tenant/papel e sessão protegida.
3. Sem configuração e identidade válidas, o fluxo falha fechado. A UI não contém rota mock de autenticação.

### Fluxo comercial futuro

O código contém estruturas para revalidar anúncio, registrar pedido idempotente, processar confirmação do gateway e armazenar dados de entrega cifrados. O gate de versão impede que esse fluxo seja usado na demonstração; a presença da implementação não significa disponibilidade ou aprovação comercial.

## Dados e consistência

- IDs externos e chaves idempotentes são persistidos para deduplicar operações.
- Operações de pedido/carteira usam transações e restrições de banco para proteger estados financeiros.
- Migrações são aplicadas pela operação `services/api/src/operations/migrate.ts`.
- A credencial de integração interna entre worker e API não deve ser exposta ao navegador.

## Decisões estruturais

- Separação entre web, API e workers limita responsabilidades e permite manter workers desligados.
- PostgreSQL mantém estado transacional do catálogo e comércio.
- Gates de liberação comercial vivem no código para que uma variável de ambiente isolada não transforme demo em loja ativa.
- Os exemplos visuais ficam no frontend e são claramente rotulados como fictícios.
