# Desenvolvimento local

## Ferramentas

- Node.js `>=24.15 <25`.
- npm com suporte a workspaces.
- PostgreSQL 16 ou Docker Compose v2.
- PowerShell, bash ou shell compatível para os comandos mostrados.

## Instalação

```sh
npm ci
```

Para o ambiente completo, copie `.env.example` para `.env`, gere valores aleatórios para senhas/chaves e inicie apenas os serviços base:

```sh
docker compose up --build -d postgres api web
```

Abra `http://localhost:3000` e consulte `http://localhost:4000/api/v1/health`. O health endpoint valida conectividade ao banco; não comprova os demais fluxos.

## Aparência

O cabeçalho permite alternar entre os temas claro e escuro. A preferência fica salva no `localStorage` do navegador sob `crystalforn-theme`; o padrão é o tema claro. Essa preferência é local ao navegador e não requer conta ou serviço remoto.

## Processos separados

Com PostgreSQL acessível em `DATABASE_URL` e as variáveis necessárias definidas no processo:

```sh
npm run migrate --workspace @digital-store/api
npm run dev:api
npm run dev:web
```

Execute API e web em terminais separados. `APP_ORIGIN` deve apontar para a origem local do navegador. Chaves de sessão e criptografia devem ser hexadecimais de 64 caracteres em ambientes locais.

## Comandos do projeto

| Comando | Descrição |
| --- | --- |
| `npm run build` | Compila API, worker e web |
| `npm run test:unit --workspace @digital-store/api` | Verifica a validação fail-closed da URL do Auth Center no CI |
| `npm run test:unit --workspace @digital-store/sync-worker` | Verifica paginação, checkpoint, deduplicação, lotes e backoff com fixtures offline |
| `npm run dev:api` | Inicia API NestJS em modo desenvolvimento |
| `npm run dev:web` | Inicia Next.js |
| `npm run dev:worker` | Comando de inicialização do worker de catálogo live-read-only; exige URL, credencial e segredo interno |
| `npm run dev:fulfillment` | Comando de inicialização do worker de entrega; não habilita processamento comercial |
| `npm run start:admin-provision` | Provisiona admin em execução explícita com credenciais temporárias |

Não execute provisionamento de administrador contra uma base compartilhada ou produção sem plano operacional autorizado. O comando não fornece credenciais padrão.

## Alterações de banco

Adicione uma nova migração SQL numerada em `services/api/sql/`. Migrações devem ser compatíveis com dados existentes e evitar operações destrutivas. Revise o SQL e o mecanismo de aplicação antes de executar em qualquer banco persistente.

## Configuração

`.env.example` contém nomes e placeholders, nunca valores funcionais. `.env` deve ficar local e não deve ser incluído em commits. Para estrutura de cada variável, consulte [OPERATIONS.md](OPERATIONS.md) e comentários do exemplo.

## Verificação

O workflow `.github/workflows/build.yml` executa `npm ci`, build da API/worker/web, as suítes unitárias offline da API e do worker e benchmarks sintéticos de 20 mil e 40 mil itens. Para validar uma alteração, confira a conclusão do workflow no commit ou PR exatos; um CI verde de outro HEAD não valida o código atual. A revisão estática e `git diff --check` não substituem compilação ou testes de runtime.
