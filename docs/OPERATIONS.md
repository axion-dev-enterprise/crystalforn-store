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

O worker divide cada página do fornecedor em requisições internas com no máximo 500 anúncios e limite padrão de `1.500.000` bytes (`API_IMPORT_BATCH_MAX_BYTES`). O limite máximo configurável é `1.900.000` bytes para permanecer abaixo do parser JSON de 2 MiB da API; anúncios individuais maiores falham com código explícito em vez de gerar um `413` ambíguo.

### Paginação e atualização do catálogo LZT

O worker LZT percorre feeds paginados por `page`, persiste o próximo número da página e aplica ao menos três segundos entre buscas de categoria. A resposta observada contém `items`, `totalItems`, `hasNextPage`, `perPage` e `page`; `page=2` foi validado ao retornar uma página distinta, enquanto `after` com o ID do último item repetiu a primeira página. A documentação do fornecedor descreve `after` como cursor, mas não fornece o valor do próximo cursor no schema da resposta. O código valida o número de página devolvido antes de avançar e mantém o cursor persistido entre execuções. A API limita buscas de categoria a 20 chamadas por minuto e deve-se respeitar respostas `429` e seus cabeçalhos de limite. Não se deve anunciar prazo fixo para importar 15–30 mil anúncios sem medir a paginação real do fornecedor. Consulte [limites e autorização da API](https://lzt-market.readme.io/reference/information) e [parâmetros de busca da categoria](https://lzt-market.readme.io/reference/categoryall).

Os feeds cobrem Fortnite, Valorant, League of Legends, Roblox e Steam. Para LZT, a busca mantém `origin[]=personal`; o normalizador rejeita anúncios com outra origem. Os campos persistidos são selecionados pelo normalizador, sem credenciais, logins, cookies, tokens ou dados privados de entrega.

O ciclo contínuo é um poller, não um webhook de venda: anúncios recebidos são atualizados a cada página e os que deixam de aparecer só são ocultados depois que o feed inteiro termina sem erro. Varreduras incompletas preservam os anúncios existentes. A remoção de um anúncio do fornecedor pode, portanto, levar o tempo de uma varredura completa para refletir-se no site; a latência depende do número de páginas e do limite de busca do fornecedor. A confirmação de compra precisa manter sua própria revalidação imediatamente antes do processamento, sem tratar a sincronização periódica como garantia de disponibilidade.

As métricas `pages_read`, `items_seen` e `items_upserted` são persistidas depois de cada página processada e podem ser acompanhadas no painel durante uma execução longa. Se um processo for interrompido, a última execução permanece marcada como em andamento e suas contagens registram o último ponto observado; o cursor salvo define a retomada.

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
