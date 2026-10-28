# Crystalforn Store

Loja de inventário de contas digitais, construída com Next.js, NestJS e PostgreSQL. O repositório contém a vitrine, API, painel administrativo, área do cliente, migrações, worker e configuração de contêineres.

> **Estado desta versão: demonstração somente.** A vitrine usa dez exemplos fictícios; a API não publica anúncios reais e o worker não consulta nem sincroniza a LZT. Compras, recargas, entrega automática e webhooks de pagamento estão bloqueados.

## O que funciona

- Vitrine responsiva em pt-BR com filtros por jogo, atributos de conta, faixa de preço, dias sem atividade, ordenação e paginação; o modo demo usa dez exemplos fictícios.
- Páginas de entrada, detalhes, área do cliente, painel e termos, com estados de carregamento, erro e listas vazias.
- API NestJS versionada sob `/api/v1`, PostgreSQL com migrações SQL numeradas e worker de sincronização separado.
- API pública em modo `demoOnly`; registros de fornecedor eventualmente presentes no banco não são exibidos pela vitrine.
- Compose para desenvolvimento e operação em contêineres, com serviços privados em rede interna e portas da loja limitadas a loopback.

Consulte [docs/DEMO_MODE.md](docs/DEMO_MODE.md) para os limites exatos desta versão e [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para os componentes e fluxos.

## Requisitos

- Node.js `>=24.15 <25` e npm compatível com `package-lock.json`.
- Docker Engine e Docker Compose v2 para o ambiente completo local.
- PostgreSQL 16 caso prefira executar os processos Node.js fora do Compose.

## Início rápido com Docker Compose

1. Copie `.env.example` para `.env` e substitua todos os valores de exemplo por valores locais fortes. O `.env` é ignorado pelo Git.
2. Inicie a aplicação:

   ```sh
   docker compose up --build -d postgres api web
   ```

3. Abra `http://localhost:3000`. A API fica disponível em `http://localhost:4000/api/v1` dentro da rede Compose; não publique essa porta diretamente na Internet.
4. Confira `http://localhost:4000/api/v1/health`. A resposta `200` com `database: connected` confirma apenas conectividade da API com PostgreSQL.

As variáveis mínimas de infraestrutura estão no exemplo de ambiente. A integração de autenticação central também permanece fechada até que um provedor compatível e suas credenciais sejam configurados. Não há conta ou senha de demonstração embutida.

## Desenvolvimento sem contêiner para Node.js

```sh
npm ci
npm run dev:api
npm run dev:web
```

Execute os processos em terminais separados e configure `DATABASE_URL`, `APP_ORIGIN`, `SESSION_PEPPER`, `DELIVERY_ENCRYPTION_KEY` e `SYNC_WORKER_SECRET` no ambiente local. Antes de iniciar a API, aplique as migrações:

```sh
npm run migrate --workspace @digital-store/api
```

O worker de inventário e o worker de entrega estão desativados no código desta versão. Os comandos `dev:worker` e `dev:fulfillment` não devem ser usados para ativar integração comercial ou consulta à LZT.

## Mapa do repositório

| Caminho | Conteúdo |
| --- | --- |
| `apps/web` | Aplicação Next.js, rotas e componentes da interface |
| `services/api` | API NestJS, módulos, migrações e provisionamento administrativo |
| `services/sync-worker` | Worker de catálogo e entrega; ambos inativos nesta versão |
| `infra/nginx` | Exemplo de proxy reverso para uma instalação própria |
| `docs` | Arquitetura, desenvolvimento, operações, segurança e contratos |
| `docker-compose.yml` | PostgreSQL, API, web e perfis opcionais desativados por padrão |

## Documentação

- [Arquitetura e fluxos](docs/ARCHITECTURE.md)
- [Desenvolvimento local](docs/DEVELOPMENT.md)
- [API HTTP](docs/API.md)
- [Modo de demonstração e limites comerciais](docs/DEMO_MODE.md)
- [Operação e implantação](docs/OPERATIONS.md)
- [Segurança e gestão de segredos](docs/SECURITY.md)
- [Compatibilidade comercial](docs/COMPATIBILIDADE_COMERCIAL.md)
- [Histórico de versões](CHANGELOG.md)
- [Como contribuir](CONTRIBUTING.md)
- [Política de segurança](SECURITY.md)
- [Licenciamento](docs/LICENSING.md)
- [Checklist de release](docs/RELEASE_CHECKLIST.md)
- [Design responsivo e acessibilidade](docs/DESIGN_RESPONSIVE_REFERENCES.md)
- [Backlog de requisitos e pendências](docs/BACKLOG.md)
- [Mapa de filtros e campos do fornecedor](docs/PROVIDER_FIELD_MAP.md)

Cada push para `main` e pull request executa o workflow de build do web, API e workers. O workflow não provisiona segredos ou serviços externos.

## Estado e próximos passos

O catálogo e o comércio têm gates separados, ambos fechados nesta versão. Qualquer ativação de consulta à LZT, checkout, gateway ou entrega exige outra revisão após validar o modelo comercial, identidade, termos e provedores.

Este repositório não inclui dumps de banco, credenciais, chaves, arquivos `.env`, registros de cliente ou detalhes de uma instalação privada. Nunca coloque esses dados em issues, commits ou logs públicos.
