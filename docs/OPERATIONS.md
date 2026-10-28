# Operação e implantação

## Escopo desta documentação

Este runbook descreve a instalação genérica do projeto. Inventários de host, endereços IP, contas, negociação, status de cliente, chaves SSH e configuração de qualquer implantação privada não pertencem ao repositório público.

## Compose

O Compose define PostgreSQL 16, API, web, worker de estoque e worker de entrega. A API não publica porta no host; a web escuta em loopback. O worker de estoque exige o profile `inventory`; o worker de entrega exige `fulfillment` e permanece desligado no modo atual.

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

O `.env.example` contém placeholders. Gere valores únicos para credenciais de banco, segredo entre serviços, segredo de sessão e chave de cifragem. O catálogo desta versão é somente demonstrativo; embora exista código de integração para uma revisão futura, a API não publica anúncios reais e o worker de estoque está fechado pelo gate de demonstração. Gateway e entrega também permanecem desligados. Guarde segredos no mecanismo privado do ambiente e injete em runtime; nunca os grave no repositório.

O worker divide cada página do fornecedor em requisições internas com no máximo 500 anúncios e limite padrão de `1.500.000` bytes (`API_IMPORT_BATCH_MAX_BYTES`). O limite máximo configurável é `1.900.000` bytes para permanecer abaixo do parser JSON de 2 MiB da API; anúncios individuais maiores falham com código explícito em vez de gerar um `413` ambíguo. `API_MAX_SYNC_PAGES` aceita até 1.000 páginas por execução, com próximo número de página salvo após cada página; 30 mil itens exigem ao menos 750 páginas se o fornecedor devolver 40 por página, cerca de 37,5 minutos no limite de três segundos, além do tempo das respostas e dos outros feeds. Em caso de `429`, o checkpoint é preservado e o worker aguarda `Retry-After` ou 60 segundos antes da próxima varredura.

O CI executa `node --expose-gc scripts/benchmark_catalog_batches.cjs --count=20000` e `--count=40000` em processos separados após compilar o worker. O harness cria registros sintéticos, chama o mesmo particionador usado pelo worker e valida contagem, máximo de 500 itens e limite de bytes por corpo. Os logs registram duração de geração/serialização/validação, taxa agregada de registros por segundo, volume serializado e leituras RSS/heap em marcos observados. É um benchmark local de CPU/memória para preparação de lotes; não acessa rede, banco, LZT, não mede o pico contínuo de RSS e não prova a latência, cota ou capacidade de importação do fornecedor.

### Paginação e atualização do catálogo LZT

O código de paginação do worker LZT está inativo nesta versão demo e não deve ser iniciado em produção. Se um catálogo real vier a ser autorizado em outra revisão, a implementação existente percorre feeds paginados por `page`, persiste o próximo número da página e aplica ao menos três segundos entre buscas de categoria. O runtime observado retornou `items`, `totalItems`, `hasNextPage`, `perPage` e `page`; o exemplo JSON entregue pelo cliente contém apenas `items`, `total_items` e `page`. O worker aceita ambos: prefere `hasNextPage` quando booleano; quando ausente, deriva continuação de `total_items` e persiste a quantidade acumulada no checkpoint. Se o fornecedor disser que terminou antes de atingir o total, a execução falha como incompleta e não reconcilia itens. JSON inválido, contrato malformado, página rejeitada/repetida ou divergência de totais limpa o checkpoint da varredura para que uma execução futura recomece do início; erros HTTP transitórios e `429` preservam o último checkpoint válido. `page=2` foi validado ao retornar página distinta, enquanto `after` com o ID do último item repetiu a primeira página. A documentação do fornecedor descreve `after` como cursor, mas não fornece o valor do próximo cursor no schema da resposta. O código valida o número de página devolvido antes de avançar, mantém o cursor persistido entre execuções e guarda fingerprints SHA-256 dos IDs das páginas confirmadas para detectar repetição exata após retomada. A API limita buscas de categoria a 20 chamadas por minuto; uma futura sincronização deve respeitar o intervalo de três segundos, respostas `429` e os cabeçalhos de limite. Não se deve anunciar prazo fixo para importar 15–30 mil anúncios sem medir a paginação real do fornecedor. Consulte [limites e autorização da API](https://lzt-market.readme.io/reference/information) e [parâmetros de busca da categoria](https://lzt-market.readme.io/reference/categoryall).

Os feeds cobrem Fortnite, Valorant, League of Legends, Roblox e Steam. Para LZT, a busca mantém `origin[]=personal` e usa `i18n=pt-BR`; o normalizador rejeita anúncios com outra origem. Os campos persistidos são selecionados pelo normalizador, sem credenciais, logins, cookies, tokens ou dados privados de entrega. A busca do catálogo suporta personagem/skin Fortnite, jogo da biblioteca Steam, rank e nível mínimo para Valorant/LoL; a interface envia esses critérios ao endpoint e a API aplica-os na consulta paginada. A ordenação `sort` é restrita a `price_asc`, `price_desc` e `title_asc`, com valores whitelisted e ordem secundária estável por ID.

O ciclo contínuo é um poller, não um webhook de venda: anúncios recebidos são atualizados a cada página e os que deixam de aparecer só são ocultados depois que o feed inteiro termina sem erro. Varreduras incompletas preservam os anúncios existentes. A remoção de um anúncio do fornecedor pode, portanto, levar o tempo de uma varredura completa para refletir-se no site; a latência depende do número de páginas e do limite de busca do fornecedor. A confirmação de compra precisa manter sua própria revalidação imediatamente antes do processamento, sem tratar a sincronização periódica como garantia de disponibilidade.

As métricas `pages_read`, `items_seen`, `items_upserted` e `items_discarded` são persistidas depois de cada página processada e podem ser acompanhadas no painel durante uma execução longa. `items_discarded` tem contagens por motivo em `items_discarded_reasons`: formato/identificador inválido, origem não elegível, dados incompletos, jogo fora do catálogo ou ID repetido dentro do lote. Esses motivos explicam a rejeição da importação, sem salvar conteúdo bruto do anúncio. Duração e código de erro também ficam no histórico. Se um processo for interrompido, a última execução permanece marcada como em andamento e suas contagens registram o último ponto observado; o cursor salvo define a retomada.

## Migrações e backup

O serviço API aplica migrações no início. Antes de atualizar uma instalação persistente, crie e verifique backup do banco com ferramenta compatível, registre hash/tamanho, e confirme a estratégia de restauração. Teste restauração em ambiente isolado. Este repositório não fornece backup de dados privados.

## Saúde

`GET /api/v1/health` verifica uma consulta simples ao banco. Combine essa verificação com logs, disponibilidade HTTP da página e inspeção das rotas específicas necessárias; health `200` não valida autenticação, catálogo, pagamentos ou workers.

## Painel administrativo

O painel exibe contagens do inventário local, idade da sincronização mais recente de anúncio, histórico paginado e filtrável das execuções do sincronizador com duração, páginas, vistos/importados/descartados por motivo e erro, busca paginada de anúncios, revisão de dados, simulador de preços e auditoria administrativa com pesquisa por pessoa/ação/alvo. O filtro de desatualizados considera anúncios sem sincronização há mais de 24 horas. O simulador é somente leitura. Ocultar um vendedor altera `seller_blocklist`; ocultar um anúncio individual grava uma exceção em `catalog_item_overrides`. Ambos os controles retiram anúncios das consultas públicas e da verificação final do produto antes de uma compra. A tabela de auditoria guarda o ator, a ação, o alvo e os valores anteriores/novos quando disponíveis, sem armazenar credenciais de entrega. As migrações `011_admin_backlog_controls.sql`, `012_sync_discard_counts.sql` e `013_sync_discard_reasons.sql` são aditivas e aplicadas pelo inicializador de migrações.

Essas ações não habilitam checkout, pagamento ou entrega. Revise cada alteração pela seção Auditoria do painel; restaurar a visibilidade exige usar o controle correspondente com uma sessão administrativa válida.

## Proxy reverso

`infra/nginx/digital-store.conf` é um exemplo de proxy. Antes de usá-lo, configure domínio, TLS, limites de corpo, cabeçalhos encaminhados, logs com minimização de dados e firewall. Mantenha banco e API em rede privada e publique somente o proxy necessário. Não copie um arquivo de proxy para produção sem revisar hostnames e certificados.

## Recuperação

1. Identifique versão, imagens e estado dos serviços.
2. Faça backup antes de alterar dados ou migrações.
3. Em erro de migração ou build, pare e diagnostique; não apague volumes ou diretórios para tentar corrigir.
4. Restaure o backup verificado e a versão anterior apenas conforme um plano revisado para a instalação.

Esta edição mantém o catálogo e a sincronização desativados. O worker sai sem conectar à LZT; venda, checkout, cobrança e entrega automática também permanecem desativados. Registros previamente importados podem existir no banco, mas não são servidos publicamente.
