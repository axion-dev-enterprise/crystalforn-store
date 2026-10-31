# Crystalforn — backlog do ciclo atual

Revisado em 30/10/2026. Este documento é a fila de trabalho para o próximo ciclo; o [backlog executivo](BACKLOG_EXECUTIVO_ATUAL.md) mantém o histórico detalhado e os critérios anteriores.

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
| P0 | CF-11 | Preparar release do código local | Snapshot saneado em `codex/release-sanitized`; CI Build `41154366339` passou no commit `f0b9a11` (build web/API/workers e benchmark sintético). A PR #6 segue em rascunho. Revisão visual completa, merge e deploy ainda não ocorreram. | Revisar visualmente as rotas e estados restantes; confirmar a branch e os checks finais; preservar rollback. Só então decidir merge/deploy, mantendo catálogo fictício e comércio desativado. |
| P1 | CF-04 / CF-10 | Revisar identidade visual, responsividade e acessibilidade | Revisão renderizada parcial no HEAD local `64a9bea`: catálogo e detalhe Fortnite sem overflow em viewport de 441×452; a simulação de 1440×900 mediu 1425 px de documento. Temas claro/escuro alternaram sem overflow. Nesta rodada, `/entrar` em 390×844 mediu 390 px, os campos têm labels associados e Tab mostra foco visível de 3 px no link de pular conteúdo. `/admin` e `/cliente` redirecionam sem sessão, mas a API local desligada impede validar autorização. Revisão visual completa, teclado/contraste além desse foco e desktop renderizado continuam pendentes. | Conferir catálogo, detalhe, acesso, área do cliente e admin em celular/desktop e nos dois temas; registrar overflow, contraste, foco/teclado, estados de carregamento, vazio e erro. Confirmar a amostra em modo offline com rótulo fictício visível. |
| P1 | CF-01 / CF-16 | Fechar filtros por jogo e ranks | Na prévia renderizada local, Travis Scott (Fortnite), Hades (Steam), Ouro II (LoL) e Ascendente I (Valorant) retornaram exemplos correspondentes. Nível mínimo `100` retornou dois exemplos de LoL (Diamante II, Esmeralda III) e dois de Valorant (Platina II, Diamante I). A API local estava desligada; são fixtures. Filtros da LZT seguem desligados e não foram validados. | Conferir persistência da paginação, combinações de filtros e bordas de nível; garantir que opções e resultados pertençam ao jogo certo e permaneçam marcados como fictícios. Consulta LZT exige revisão separada e autorizada do modo de operação. |
| P1 | CF-02 | Padronizar títulos em pt-BR | Revisão renderizada local conferiu títulos demonstrativos em Fortnite (Travis Scott), Steam (Portal 2), Roblox, LoL (Diamante II) e Valorant (Ascendente I); os cinco aparecem em português e sem texto cirílico nas amostras abertas. Cobertura de payload real não foi validada. | Confirmar rank apenas em LoL/Valorant quando reconhecido, fallback neutro e ausência de atributos inventados; validar payload real somente após integração autorizada. |
| P1 | CF-03 / CF-17 | Tornar inventários claros e visuais | Detalhes demonstrativos de Fortnite, Steam, Roblox, LoL e Valorant renderizaram grupos e contagens explícitas; em Steam/Roblox/LoL/Valorant, cada página mediu 390 px em viewport de 390 px, sem overflow. Fortnite já foi conferido em 441 px. Amostras parciais identificam quando nomes/URLs individuais faltam. Direitos e origem de imagens por item não foram validados. | Agrupar skins, picaretas, emotes, asas-delta e demais itens que o payload realmente fornece; identificar amostra parcial; usar miniaturas somente com URL e origem autorizadas; não inferir gamepasses ou inventário completo. |
| P1 | CF-05 | Completar login/cadastro pelo Auth Center | A inspeção local sem sessão mostrou `/admin` e `/cliente` levando a `/entrar`; a tela oferece login administrativo e encaminha cadastro de cliente ao Auth Center. Como a API local estava desligada, isso comprova apenas a navegação de frontend, não a proteção dos endpoints. O segredo compartilhado continua ausente do Vault local e o fluxo completo não foi validado. | Validar OAuth/callback, tenant `crystalforn`, papel `store_customer`, sessão e isolamento. Sem configuração ou identidade válida, retornar erro fechado; nunca simular sessão. |
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

1. Completar a inspeção visual de acesso, área do cliente, admin, estados de carregamento/vazio, comparação e teclado/contraste em CF-04/CF-10 e CF-13–15.
2. Conferir nível mínimo, títulos e inventários por jogo em CF-01–03/CF-16–18; filtros demonstrativos de Fortnite, Steam, LoL e Valorant já foram exercitados no HEAD atual.
3. Resolver configuração do Auth Center e documentar o escopo de acesso à Hostinger em CF-05/CF-06.
4. Manter o worker desligado; preparar plano de medição de paginação e concorrência sem chamar operações reais.
5. Atualizar o CI para o HEAD final e cumprir o gate de release antes de qualquer publicação.

## Referências

- [Backlog executivo e histórico](BACKLOG_EXECUTIVO_ATUAL.md)
- [Modo demonstração](DEMO_MODE.md)
- [Compatibilidade comercial](COMPATIBILIDADE_COMERCIAL.md)
- [Mapa de campos do fornecedor](PROVIDER_FIELD_MAP.md)
