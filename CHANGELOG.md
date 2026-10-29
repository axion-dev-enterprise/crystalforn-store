# Histórico de alterações

O projeto usa versões SemVer. Esta lista registra alterações notáveis e limites conhecidos; commits contêm as mudanças completas.

## Não lançado

- Fecha sem merge a PR #1 de catálogo LZT ao vivo, preservando seus commits/branch e mantendo a decisão vigente de demonstração; PR #3 continua em rascunho.
- Registra a auditoria estática da interface e a verificação atual da produção: health `200`, catálogo em demo com zero anúncios reais e CI aprovado para o backlog consolidado; esclarece quais filtros/inventários já existem nas fixtures e quais dependem de payload real ou inspeção visual.
- Consolida o backlog executivo em itens priorizados com estado factual, critérios de conclusão, dependências e gates atuais; mantém a loja em modo demonstração e a sincronização LZT desligada.
- Registra no backlog que os fluxos de cadastro e troca de código do Auth Center existem no código, mas dependem de segredo compartilhado ausente do Vault e de validação de runtime; mantém autenticação fechada sem bypass.
- Atualiza o worker LZT para paginar com `nextCursor`/`after`, detectar cursores ausentes ou repetidos, preservar fallback legado e versionar o checkpoint; sincronização permanece desligada no modo demo.
- Atualiza o backlog com a paginação pública da LZT: cursor `after`, resposta `nextCursor` e limite de 20 buscas de categoria por minuto; runtime continua sem validação e a sincronização desligada.
- Atualiza o backlog após a última leitura da Workana: Mateus aguarda o e-mail correto da conta Hostinger para convite de colaborador; convite e resposta continuam pendentes, sem inferir identidade por e-mails de outras plataformas.
- Atualiza o backlog após releitura integral da conversa: inclui limites de paginação relatados, imagens Fortnite ausentes, pedido de gamepasses/inventários Roblox, filtros essenciais, preferência por amostras úteis sem copiar o fórum inteiro e dependência de convite Hostinger.
- Registra a publicação verificada da release `361a117` na Hostinger: health e catálogo demo HTTP 200, zero anúncios reais, pagamentos/sincronização desativados, worker parado e PostgreSQL saudável.
- Identifica a página inicial como prévia demonstrativa já no título e no texto de abertura, antes de apresentar os exemplos fictícios.
- Atualiza o título e a descrição da página para identificar a prévia como fictícia também na aba do navegador e em metadados.
- Ajusta o título longo do detalhe com tipografia fluida em telas estreitas e quebra balanceada para reduzir altura e prevenir overflow.
- Reduz a escala mínima do título da home e do catálogo em celulares, mantendo limites fluidos até 600 px.
- Explicita a ausência de imagens individuais por grupo no detalhe do produto e substitui iniciais que podiam parecer arte real por um ícone neutro; imagens com origem confiável continuam visíveis, e falhas de carregamento mostram a ausência.
- Preserva uma explicação segura de configuração ausente na resposta 503 do login central da Crystalforn; respostas internas não relacionadas continuam genéricas.
- Registra a publicação do commit `eb9371b` no Hostinger com API/web saudáveis, modo demo e worker desligado.
- Mostra destaques do inventário nos cartões demonstrativos para Fortnite, Valorant, LoL, Roblox e Steam; limita a prévia a três nomes por grupo e identifica a amostra sem sugerir inventário completo.
- Torna a busca por tier/divisão de rank precisa: filtrar só o tier inclui suas divisões; filtrar com divisão exige correspondência exata em fixtures e consulta local.
- Registra no backlog executivo os estados atuais dos destaques de inventário e da correspondência de rank.
- Corrige a proporção dos wordmarks no cabeçalho usando as dimensões reais dos PNGs; inspeção local confirmou alternância persistente de tema e ausência de overflow horizontal nas larguras 390 e 1280 px.
- Remove capas Steam externas dos exemplos e interrompe a geração automática de URLs de imagem por `appid` até a revisão de direitos; mantém nomes e tempo de jogo no inventário.
- Acrescenta ao backlog os pedidos mais recentes do cliente sobre identidade e temas, filtros/títulos localizados, inventário por jogo, paginação em massa, concorrência e fluxo comercial futuro, com critérios de conclusão e limites da demonstração.
- Informa no detalhe Roblox quando o payload não contém nomes individuais de gamepasses, sem inferir que a conta não tenha passes.
- Expõe no detalhe Fortnite as contagens documentadas e os nomes em destaque separadamente; quando o exemplo não traz listas individuais, a interface informa essa ausência sem completar inventário por suposição.
- Registra a revisão pendente de origem/licença das capas Steam existentes e adiciona gate P0 para imagens de jogos; não presume que URL pública de CDN autorize exibição.
- Atualiza o backlog com a leitura mais recente da Workana: critérios de conclusão da API, filtros, inventário, escala e dependências comerciais, preservando o modo de demonstração.
- Gera capas Steam para jogos normalizados com `appid` inteiro quando o payload não fornece imagem; promove a API `f8b271b` após CI Build 40784582327 aprovado. A rota de catálogo continua bloqueada pelo modo demo e não permite validar payload LZT em runtime.
- Adiciona fallback acessível quando uma URL de imagem individual do inventário falha ao carregar; promove a web `c2185da` após CI Build 40783977644 aprovado.
- Acrescenta capas oficiais da biblioteca Steam aos exemplos demonstrativos, verifica as cinco URLs (`200 image/jpeg`) e promove a web `e4ccc91` à VPS; a inspeção da página Steam encontrou imagens para Portal 2, Hades e Stardew Valley. As capas ilustram a interface e não comprovam que uma conta real possua esses jogos.
- Expande as sugestões de rank no catálogo demonstrativo para incluir as divisões de LoL e Valorant informadas pelo cliente; opções sem fixture continuam retornando estado vazio e não representam estoque.
- Confirma no Build 40781639640 a compilação atual de web/API/workers e o benchmark sintético após a ampliação do filtro; não valida visualização do filtro no navegador nem consulta real à LZT.
- Extrai o particionador de lotes do worker para um módulo reutilizável e adiciona ao CI um benchmark sintético de 20 mil/40 mil registros, validando contagem, limite de 500 itens e bytes por lote sem acessar LZT ou banco.
- Corrige o título do exemplo LoL de Esmeralda III para preservar a divisão fictícia exibida no inventário.
- Registra no mapa do fornecedor a diferença entre filtros locais da loja e parâmetros LZT relacionados; acrescenta evidência pública dos filtros de demonstração e do inventário textual por categoria.
- Registra os resultados do Build 40780762919: particionamento sintético de 20 mil e 40 mil itens em 40/80 lotes, sem erros e dentro dos limites; documenta RSS/heap observado e a limitação de que não mede banco ou LZT.
- Atualiza a matriz com os parâmetros públicos de nível LoL/Valorant, enumerações Fortnite e o rate limit compartilhado atual; registra que as rotas administrativas e de cliente exigem sessão e permanecem sem verificação autenticada.
- Gera backlog detalhado a partir da leitura atual da Workana: filtros por jogo, ranks e divisões solicitados, cards e inventários por categoria, ordenação/reputação, RUB→BRL, escala e fluxo futuro de checkout, mantendo dados de entrega e comércio bloqueados na demo.
- Exibe no painel administrativo o estado de release do catálogo e marca ciclos LZT como históricos quando a sincronização está desativada ou o status não pode ser confirmado.
- Consolida no backlog os requisitos acumulados de responsividade, marca/logo e temas, painel administrativo e área do cliente, com prioridades, estados, critérios de aceite e dependências mantendo o gate de demonstração.
- Atualiza o backlog com a revisão mais recente do cliente: filtros essenciais por jogo, ranks em títulos apenas para LoL/Valorant, inventários visuais representativos e paginação de 20–40 mil ainda não validada; registra a intenção de avançar ao gateway sem remover o gate demo.
- Gera um recorte priorizado para o próximo ciclo do backlog: validação responsiva, matriz de filtros/títulos, amostras de inventário, benchmark sintético, painel autenticado e revisão com o cliente; mantém API real, comércio e infraestrutura em trilhas bloqueadas.
- Alinha a busca demonstrativa de skins Fortnite e jogos Steam às mesmas variantes de inventário usadas nas sugestões, incluindo listas de objetos com nomes.
- Amplia as prévias de inventário do catálogo de leitura para tipos oficiais de imagem Fortnite, Valorant e LoL, com validação de categoria e tipo; Steam e gamepasses Roblox permanecem condicionados às imagens/dados presentes no payload.
- Torna a paginação do worker compatível com respostas LZT que omitem `hasNextPage` e `perPage`, derivando a continuação do total e salvando o progresso acumulado no checkpoint; resposta inválida ou totais inconsistentes limpam o checkpoint e interrompem a reconciliação.
- Reduz a quebra excessiva de títulos longos na página de produto, ampliando a medida tipográfica no desktop e ajustando escala/largura para celular.
- Reverte a publicação de anúncios reais para o modo demo aprovado: API sem catálogo real e worker LZT inativo; pagamentos e entrega continuam bloqueados.
- Adiciona o símbolo facetado Crystalforn ao cabeçalho e ao rodapé.
- Atualiza o símbolo para o cristal geométrico gerado nesta revisão; o wordmark permanece como texto HTML nítido no cabeçalho e rodapé.
- Reduz os atributos da listagem pública aos metadados necessários nos cards; arrays completos permanecem disponíveis somente no endpoint de detalhes.
- Anuncia a contagem de resultados da vitrine a leitores de tela e reserva dimensões para miniaturas dos cards e do perfil Roblox.
- Adia a busca de avatares Roblox até o card se aproximar da viewport, em vez de consultar todos os anúncios paginados ao abrir o catálogo.
- Adia as prévias de inventário Fortnite e o avatar Roblox do detalhe até a seção de inventário se aproximar da viewport.
- Declara dimensões intrínsecas nos QR Codes Pix para que o navegador reserve os 180×180 px antes do carregamento.
- Registra tokens de largura, espaçamento, densidade, raios, foco e movimento e aplica os valores compartilhados ao layout, botões e filtros.
- Mostra horas ou minutos de jogo no inventário Steam quando esse metadado existe, sem preencher dados ausentes com exemplos em anúncios reais.
- Registra itens descartados por motivo agregado na sincronização e os exibe junto com páginas, importados, duração e erros no histórico administrativo.
- Reorganiza os detalhes do produto com título curto, atributos em destaques, painel de preço equilibrado e data real de sincronização.
- Ajusta navegação móvel, tipografia fluida, espaçamento, cards, filtros ativos e estados de consulta em tema claro/escuro.
- Preserva filtros, ordenação e página no endereço compartilhável e ao voltar dos detalhes; adiciona ordenação por preço ou nome estável no catálogo.
- Retira trechos em cirílico dos títulos gerados para manter os resumos da loja em português.
- Acrescenta busca, filtro de estado/ação e paginação na auditoria e no histórico do sincronizador do painel.
- Explicita que o inventário detalhado depende dos campos públicos disponíveis e pode ter cobertura parcial.
- Sinaliza anúncios sincronizados há mais de 24 horas como potencialmente alterados.
- Reutiliza o mesmo cartão público na prévia administrativa e inclui reputação agregada na consulta administrativa.
- Adiciona tema claro/escuro com preferência persistida no navegador.
- Amplia a prévia fictícia com League of Legends, filtros demonstrativos por personagem/skin, biblioteca Steam, rank e nível, e inventários textuais de exemplo.
- Reduz gravações sequenciais do importador a um upsert PostgreSQL por lote interno de até 500 itens.
- Divide páginas grandes da sincronização em requisições internas limitadas por quantidade e bytes, abaixo do limite do parser JSON da API.
- Documenta os limites oficiais da busca LZT, a paginação por `page` observada no runtime e a latência não determinística da reconciliação após uma varredura completa.
- Normaliza ranks textuais de LoL e Valorant para pt-BR e inclui a divisão nos títulos quando há um valor conhecido; mapeamentos desconhecidos não inventam elo.
- Mostra miniaturas individuais de inventário apenas para URLs HTTPS de domínios oficiais permitidos e inclui gamepasses Roblox quando uma lista vier no payload.
- Registra o backlog de novos requisitos, os gates comerciais e a validação ainda pendente de inventários e importação em massa.
- Mapeia campos normalizados e filtros LZT por categoria, registrando enumerações documentadas e lacunas que dependem de payloads autorizados.
- Alinha filtros da prévia aos filtros do backend e sugere personagens, jogos e ranks apenas a partir dos exemplos fictícios existentes.
- Usa a primeira lista de inventário não vazia entre os aliases do payload e corrige o runbook para refletir que a API e o sincronizador estão desligados no modo demo.
- Persiste fingerprints das páginas já confirmadas para detectar repetição de resultados após retomada do sincronizador; o worker segue inativo no modo demo.
- Registra quais campos e categorias estão presentes no exemplo da API entregue pelo cliente e separa o que o manual pede do que o payload comprova.
- Atualiza contadores da sincronização após cada página para mostrar progresso no painel durante varreduras longas.
- Mantém compras, pagamentos, entrega e sincronização com fornecedor desativados; esta versão demo usa somente exemplos fictícios.

## 0.1.3 — 2026-10-27

- Restaura o endereço de bind `0.0.0.0` exigido para iniciar web e API dentro dos contêineres.
- Corrige a sanitização pública para preservar endereços wildcard de runtime.

## 0.1.2 — 2026-10-27

- Melhora contraste dos botões primários, filtros selecionados e rodapé.
- Nomeia semanticamente o grupo de filtros de jogo para tecnologias assistivas.
- Registra referências de design responsivo e revisão das ações da vitrine e do painel.

## 0.1.1 — 2026-10-27

- Atualiza GitHub Actions para releases compatíveis com Node.js 24 e fixa o runner em Ubuntu 24.04.

## 0.1.0 — 2026-10-27

- Primeira versão pública do código da loja Crystalforn.
- Inclui aplicação Next.js, API NestJS, esquema PostgreSQL, workers, Compose e documentação de arquitetura e operação.
- Vitrine demonstrativa com dados fictícios, filtros por jogo e paginação.
- Gates de código mantêm catálogo real, sincronização, pedidos, carteira e pagamentos desativados.
- Inclui orientações de segurança e compatibilidade comercial para evitar confundir integração técnica com autorização de oferta.
- Inclui checklist de release, canal responsável de relato de vulnerabilidades e aviso de licenciamento; ainda não há licença de reutilização concedida.
