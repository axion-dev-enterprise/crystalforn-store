# Crystalforn — backlog do ciclo atual

Revisado em 13/11/2026. Este documento é a fila de trabalho para o próximo ciclo; o [backlog executivo](BACKLOG_EXECUTIVO_ATUAL.md) mantém o histórico detalhado e os critérios anteriores.

## Decisões que governam este ciclo

- **Modo demonstração:** catálogo usa somente dados fictícios. Não ativar estoque LZT, vendas, Pix/gateway, carteira, entrega de credenciais ou reembolsos reais.
- **Autenticação:** sem login simulado ou bypass. A área do cliente depende do Auth Center, sessão válida, tenant e papel conferidos no servidor.
- **Fornecedor:** relatos do cliente sobre paginação, volume e atualização em tempo real são metas, não garantias medidas. Não afirmar escala ou remoção instantânea sem evidência de runtime.
- **Hospedagem:** após o endereço da conta ter sido informado na conversa, o cliente disse que enviou o convite de colaborador. O aceite, as permissões concedidas e o acesso funcional ainda não foram verificados; nenhum diagnóstico ou operação remota ocorreu.

## Prazo comunicado ao cliente — 30/10/2026

Foi informado ao cliente o prazo de **13/11/2026** para entregar uma versão demonstrativa revisável, contemplando filtros essenciais, títulos em português, apresentação do inventário, ajustes responsivos e revisão final da prévia. O prazo considera que o acesso de colaborador à hospedagem estará funcional para a revisão final; se houver pendência, a previsão será ajustada e comunicada.

O cliente também foi informado de que esse marco mantém a loja em demonstração: catálogo LZT ao vivo, vendas, Pix/gateway, carteira, entrega de credenciais e reembolsos automáticos seguem desligados. Esse prazo não representa aceite formal nem autorização para habilitar comércio real.

## Fila priorizada

| Prioridade | ID | Entrega | Estado atual | Critério verificável de conclusão |
| --- | --- | --- | --- | --- |
| P0 | CF-11 | Preparar release do código local | Snapshot saneado em `codex/release-sanitized`, HEAD `9567468`; CI Build `43490644678` passou. O código `ef91de7` está publicado em modo demo; backup restaurado isoladamente e rollback preservado. Revisão manual das rotas públicas e do acesso sem sessão concluída em 13/11. A PR #6 continua em rascunho enquanto as telas autenticadas e os estados completos não forem verificados. | Com sessão legítima, revisar telas internas e estados restantes; conferir CI do HEAD final e preservar rollback. Manter catálogo fictício e comércio desativado; não inferir autorização para ativar comércio. |
| P1 | CF-04 / CF-10 | Revisar identidade visual, responsividade e acessibilidade | Em produção, `/`, detalhe Fortnite/inventário e `/entrar` foram inspecionados em desktop e 390×844, nos temas claro/escuro. Nas páginas móveis, `documentElement.scrollWidth` foi 375 px em viewport de 390 px. A checagem do texto visível selecionado não encontrou contraste abaixo do limite após estabilização dos estilos; Tab mostrou foco visível no link “Pular para o conteúdo”. `/cliente` e `/admin` sem sessão terminam em `/entrar`. | Com sessão legítima, revisar telas internas de cliente/admin e estados de loading/erro/vazio; manter navegação, contraste e avisos de demonstração claros. Integrações reais seguem desligadas. |
| P1 | CF-01 / CF-16 | Fechar filtros por jogo e ranks | Em 13/11, a prévia demo de produção filtrou Fortnite (2 exemplos), Steam por `Cyberpunk 2077` (1), Valorant (3) e LoL (3). A combinação LoL `Diamante II` + nível mínimo `140` retornou 1 exemplo. São fixtures; nenhum filtro consultou a LZT. Paginação e bordas ainda pendentes. | Conferir persistência da paginação, combinações e bordas de nível; manter rótulos fictícios. Consulta LZT exige revisão separada e autorizada. |
| P1 | CF-02 | Padronizar títulos em pt-BR | Revisão renderizada local conferiu títulos demonstrativos em Fortnite (Travis Scott), Steam (Portal 2), Roblox, LoL (Diamante II) e Valorant (Ascendente I); os cinco aparecem em português e sem texto cirílico nas amostras abertas. Cobertura de payload real não foi validada. | Confirmar rank apenas em LoL/Valorant quando reconhecido, fallback neutro e ausência de atributos inventados; validar payload real somente após integração autorizada. |
| P1 | CF-03 / CF-17 | Tornar inventários claros e visuais | O detalhe Fortnite de produção foi visto em 390×844 e desktop. A página separa personagens/skins, picaretas, emotes e asas-delta; distingue 2 nomes identificados do total informado e avisa quando itens individuais não têm nomes ou imagens. A amostra é fictícia/parcial; direitos e origem de imagens por item não foram validados. | Agrupar somente itens realmente fornecidos; identificar amostras parciais; usar miniaturas somente com URL/origem autorizadas; não inferir gamepasses ou inventário completo. |
| P1 | CF-05 | Completar login/cadastro pelo Auth Center | Em produção, `/cliente` e `/admin` sem sessão terminam em `/entrar`. A tela oferece acesso administrativo e envia cadastro/login de cliente ao Auth Center, informando que nenhuma sessão é concedida se o serviço falhar. A autorização dos endpoints e o callback não foram validados. | Validar OAuth/callback, tenant `crystalforn`, papel `store_customer`, sessão e isolamento com identidade legítima. Sem configuração ou identidade válida, falhar fechado; nunca simular sessão. |
| P1 | CF-06 | Confirmar acesso colaborador e diagnosticar instabilidade da hospedagem | Cliente informou que enviou o convite de colaborador. Aceite, permissões e acesso funcional ainda não estão confirmados; diagnóstico SSH não realizado. | Confirmar convite aceito e escopo mínimo no painel; só então diagnosticar a instabilidade e registrar causa/solução sem acessar outros servidores. |
| P2 | CF-07 | Apurar paginação e escala LZT | Worker percorre cursores e tem checkpoint; sincronização está desligada. Benchmarks disponíveis são sintéticos; limite de 20–40 mil itens e tempo real não foram medidos. | Em ambiente autorizado, medir tamanho de página, limites, duração, memória, retomada, deduplicação e comportamento de falha; impedir reconciliação destrutiva após leitura parcial. |
| P2 | CF-09 | Especificar concorrência e indisponibilidade | Há revalidação e exclusão mútua local; não há garantia demonstrada de reserva do fornecedor ou evento instantâneo. Timeout ambíguo requer reconciliação. | Documentar estados de corrida, confirmação de venda, timeout, reconciliação e eventual crédito idempotente. Manter compra/entrega/reembolsos desativados em demo. |
| P2 | CF-08 / CF-13 / CF-14 / CF-15 | Refinar painel admin e navegação do produto | Estrutura admin, filtros móveis e navegação por seções existem. A comparação agora tem controle por cartão; seleção de três exemplos, limite no quarto e tabela foram verificados em viewport 390×844 sem overflow da página. Inspeção de permissões, tabela por teclado e admin autenticado continua pendente. | Inspecionar fluxos e permissões em sessão legítima; identificar dados demo e origem/idade; assegurar que nenhuma ação habilite operação comercial; validar comparação e navegação em telas estreitas. |
| P3 — bloqueado | CF-12 | Reavaliar gateway e entrega real | A solicitação do cliente menciona gateway e testes como próxima fase, mas a decisão vigente é manter demonstração. | Só planejar execução comercial após decisão explícita que substitua o modo demo e revisão de compatibilidade, identidade, segurança, termos, gateway e testes isolados. Este item não autoriza transações. |

## Trabalho recente já incorporado

- `5281555`: consultas de resultados e contagem de LoL priorizam o campo `lol_rank` validado.
- `ddc72de`: detalhes exibem separadamente itens identificados, registros recebidos e total informado.
- `618192f`: backlog registra que HTTP 200 local não substituiu inspeção visual; o navegador local não anexou.
- `66e4cd2`: documentação corrige comentário que descrevia incorretamente o modo de publicação.
- Build local em `66e4cd2`: `npm run build` completou para API, worker e Next.js. Nenhum teste foi executado nesta etapa. CI e deploy desse HEAD não foram confirmados.
- Vitrine demo: exemplos locais permanecem visíveis se a API falhar, com aviso de indisponibilidade e retry; modo `live_read_only` continua sem fallback fictício. Typecheck web passou. Revisão renderizada parcial confirmou erro recuperável com fixtures, filtros de jogo/personagem/jogo da biblioteca/rank/nível e largura sem overflow em viewports móvel e desktop; telas de acesso/cliente/admin e estados completos continuam pendentes. A fixture de catálogo contém doze exemplos.
- Comparação demo: revisão encontrou que o estado/tabela existiam, mas faltava o controle para selecionar cartões. Foi incluído botão acessível com `aria-pressed`, limite de três e estado desabilitado para o quarto; a tabela apareceu com Jogo, Rank, Nível, Inatividade e Campos disponíveis, sem preço. Em viewport 390 px, a tabela rolou dentro do painel e a página permaneceu com 390 px de largura. Typecheck web passou após a mudança.

## Ordem recomendada

1. Inspecionar as telas autenticadas de cliente/admin e os estados de loading/erro/vazio com sessão legítima; home, detalhe, entrada e comportamento sem sessão já foram conferidos em desktop/mobile e nos dois temas.
2. Conferir nível mínimo, títulos e inventários por jogo em CF-01–03/CF-16–18; filtros demonstrativos de Fortnite, Steam, LoL e Valorant já foram exercitados no HEAD atual.
3. Resolver configuração do Auth Center e documentar o escopo de acesso à Hostinger em CF-05/CF-06.
4. Manter o worker desligado; preparar plano de medição de paginação e concorrência sem chamar operações reais.
5. Conferir CI do HEAD final e manter a PR em rascunho até fechar a revisão das telas autenticadas e estados restantes.

## Referências

- [Backlog executivo e histórico](BACKLOG_EXECUTIVO_ATUAL.md)
- [Modo demonstração](DEMO_MODE.md)
- [Compatibilidade comercial](COMPATIBILIDADE_COMERCIAL.md)
- [Mapa de campos do fornecedor](PROVIDER_FIELD_MAP.md)
