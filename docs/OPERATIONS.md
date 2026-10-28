# Operação e implantação

## Escopo desta documentação

Este runbook descreve a instalação genérica do projeto. Inventários de host, endereços IP, contas, negociação, status de cliente, chaves SSH e configuração de qualquer implantação privada não pertencem ao repositório público.

## Compose

O Compose define PostgreSQL 16, API, web, worker de estoque e worker de entrega. A API não publica porta no host; a web escuta em loopback. Os workers exigem profiles explícitos e estão efetivamente inativos no modo demo.

```sh
docker compose up --build -d postgres api web
docker compose ps
docker compose logs --tail=100 api web
```

Para parar sem remover dados persistentes:

```sh
docker compose stop
```

Não use `docker compose down -v` em instalações com dados que devam ser preservados.

## Variáveis

O `.env.example` contém placeholders. Gere valores únicos para credenciais de banco, segredo entre serviços, segredo de sessão e chave de cifragem. As variáveis de integração de fornecedor e gateway permanecem sem uso comercial na versão demo. Guarde segredos no mecanismo privado do ambiente e injete em runtime; nunca os grave no repositório.

## Migrações e backup

O serviço API aplica migrações no início. Antes de atualizar uma instalação persistente, crie e verifique backup do banco com ferramenta compatível, registre hash/tamanho, e confirme a estratégia de restauração. Teste restauração em ambiente isolado. Este repositório não fornece backup de dados privados.

## Saúde

`GET /api/v1/health` verifica uma consulta simples ao banco. Combine essa verificação com logs, disponibilidade HTTP da página e inspeção das rotas específicas necessárias; health `200` não valida autenticação, catálogo, pagamentos ou workers.

## Proxy reverso

`infra/nginx/digital-store.conf` é um exemplo de proxy. Antes de usá-lo, configure domínio, TLS, limites de corpo, cabeçalhos encaminhados, logs com minimização de dados e firewall. Mantenha banco e API em rede privada e publique somente o proxy necessário. Não copie um arquivo de proxy para produção sem revisar hostnames e certificados.

## Recuperação

1. Identifique versão, imagens e estado dos serviços.
2. Faça backup antes de alterar dados ou migrações.
3. Em erro de migração ou build, pare e diagnostique; não apague volumes ou diretórios para tentar corrigir.
4. Restaure o backup verificado e a versão anterior apenas conforme um plano revisado para a instalação.

Esta edição não habilita venda, sincronização ou cobrança em produção. Para isso seria necessária uma revisão explícita de produto e conformidade além deste runbook.
