# Backlog executivo — Crystalforn

Revisado em 28/10/2026. Este documento consolida as solicitações mais recentes de Mateus Alves Fernandes, o estado verificável do repositório e os bloqueios de produto. Mensagens do cliente são requisitos relatados; não equivalem a comprovação técnica nem aceite formal.

## Contexto e decisões vigentes

- **Produto:** demonstração com dados fictícios. A decisão registrada continua proibindo catálogo comercial, sincronização ativa da LZT, cobranças, carteira, entrega de credenciais e reembolsos reais.
- **Publicação:** a release conhecida em produção é `361a117`; Build `40796672808` passou. Health da API/web/PostgreSQL e páginas públicas de demonstração foram verificadas. O worker está desligado. Alterações posteriores no worker (`f5b7b93`) e no Auth Center/backlog ainda não foram validadas em produção.
- **LZT:** a implementação do worker agora percorre cursores retornados (`nextCursor` enviado como `after`) e mantém checkpoint versionado. O OpenAPI público descreve cursores e um limite de 20 buscas por categoria por minuto; volume, tamanho máximo de página e throughput reais não foram medidos. Benchmark de 20k/40k é sintético.
- **Identidade:** o código do Auth Center e o callback Crystalforn existem, mas falta o segredo compartilhado no Vault deste workspace. Não há validação recente do fluxo completo em runtime. Login simulado ou bypass seguem proibidos.
- **Hostinger:** o cliente perguntou qual e-mail convidar como colaborador e relatou instabilidade SSH. O e-mail correto da conta não está confirmado; nenhum convite foi enviado. Não registrar ou compartilhar credenciais root.

## Backlog priorizado

| ID | Prioridade | Entrega | Situação factual | Critério de conclusão |
| --- | --- | --- | --- | --- |
| CF-01 | P1 | Completar filtros essenciais por jogo | Filtros locais para skins/personagens Fortnite, biblioteca Steam, rank/divisão LoL/Valorant e nível estão implementados para fixtures. A API de produção confirmou `demoOnly: true` e zero anúncios reais. Filtros do fornecedor não estão conectados, por decisão de manter demo. O relato do cliente de 10–30 resultados (até 120 Steam) não foi confirmado em runtime. | Demonstração oferece esses filtros sem misturar categorias, preserva filtros/paginação no endereço e identifica os dados como fictícios. Consulta LZT e comparação com os volumes relatados só entram em revisão autorizada do modo de operação. |
| CF-02 | P1 | Padronizar títulos em pt-BR | O normalizador gera títulos com atributos estruturados por jogo e remove segmentos em cirílico; destaque de rank ocorre em LoL/Valorant. Respostas reais não foram validadas porque a sincronização está desligada. | Demonstrar títulos da fixture em português; cobrir fallback neutro e campos ausentes. Validar a cobertura real somente com payload autorizado, sem inventar atributos. |
| CF-03 | P1 | Exibir inventários úteis e honestos | Detalhes agrupam itens por jogo, distinguem quantidade total de nomes exibidos, avisam sobre listas parciais e sobre imagens ausentes. Gamepasses são exibidos quando existe array no payload; a fixture inclui exemplos. Imagens reais individuais não foram validadas quanto a disponibilidade e direito de exibição. | Manter agrupamento por categoria, contagem/parcialidade e fallback. Adicionar imagens apenas com URL/origem permitida; não afirmar cobertura integral. Confirmar campos e conteúdo somente em payload autorizado. |
| CF-04 | P1 | Auditar responsividade, temas e acessibilidade | Auditoria estática anti-slop percorreu 15 arquivos e encontrou zero problemas. CSS define `100dvh`, foco visível, alvos de toque mínimos e breakpoints; tema escuro/claro está presente. Não houve captura visual/renderizada consolidada nesta revisão. | Conferir catálogo, detalhe, acesso, área do cliente e admin em mobile/desktop e nos dois temas. Validar overflow, contraste, foco/teclado, estados de loading/erro/vazio e aviso demo por inspeção renderizada. |
| CF-05 | P1 | Fechar autenticação e área do cliente | Código central e validação tenant/papel estão implementados; segredo compartilhado do Auth Center ausente do Vault local e runtime ainda não verificado. | Provisionar configuração pelos canais operacionais autorizados; validar callback HTTPS, tenant `crystalforn`, papel `store_customer`, sessão e isolamento. Sem configuração/identidade válida, manter erro fechado `503`/`401`. |
| CF-06 | P1 | Resolver acesso colaborador e estabilidade Hostinger | Cliente pediu o identificador de e-mail para convite e relatou SSH instável. Identidade de conta ainda não confirmada; não há convite. | Confirmar o identificador correto da conta e estabilizar/verificar o canal. Usar colaborador de menor privilégio, MFA e trilha de auditoria. Não encaminhar senha root. |
| CF-07 | P2 | Confirmar paginação e escala com evidência | Worker atualizado para cursor; CI/build passou. Sincronização continua desligada. Meta de 20–40 mil ou mais é solicitação, não capacidade provada. | Em validação autorizada futura, medir tamanho de página, páginas, volume, rate limit, duração, memória, retomada e falhas. Comparar relatos de 10–30/120 com respostas observadas. Benchmarks sintéticos permanecem identificados como sintéticos; varredura incompleta não reconcilia catálogo. |
| CF-08 | P2 | Melhorar painel admin em modo demo | O código já oferece filtros do catálogo administrativo, status da release, atualização, histórico paginado, auditoria, estados de erro/vazio e indicação de ciclos históricos quando o worker não está ativo. Não houve sessão autenticada nesta revisão; permissões e origem dos indicadores permanecem sem validação de ponta a ponta. | Manter ações comerciais desabilitadas, identificar origem/idade e status, confirmar autorização do servidor em sessão legítima e validar auditoria sem segredos. |
| CF-09 | P2 | Definir comportamento para anúncio vendido/concorrência | Cliente espera remoção imediata e reembolso se LZT vender antes da atualização. Worker e comportamento comercial não validados em runtime. | Documentar capacidades oficiais de evento/reserva, revalidação, concorrência, timeout ambíguo, idempotência e reconciliação. Só afirmar remoção imediata se latência medida comprovar. Qualquer crédito futuro exige fluxo transacional e idempotente. |
| CF-10 | P2 | Atualizar identidade Crystalforn com consistência | Wordmark e símbolo aparecem no cabeçalho/rodapé; o wordmark alterna por tema no CSS. A inspeção visual de todas as rotas continua pendente. | Validar aplicação da marca, tipografia, proporções, legibilidade e estados em catálogo, detalhe e admin nos dois temas. |
| CF-11 | P2 | Preparar release e rollback | Release publicada conhecida `361a117`. Na revisão atual, `https://187.41.96.44/api/v1/health` retornou `200` e banco conectado; `/api/v1/catalog` retornou `demoOnly: true`, zero itens e mensagem de prévia. Build CI `40799471824` do commit `e1e9156` passou; alterações posteriores de worker/Auth Center não foram implantadas. | Antes de nova publicação, revisar branch/diff e CI, preservar backup/rollback, publicar apenas serviços necessários e validar health, status legal, catálogo demo, página inicial e auth aplicável. |
| CF-12 | P3 / bloqueado | Reavaliar comércio real em revisão separada | Cliente cita gateway e testes de entrega como etapa seguinte; decisão de demonstração continua ativa. | Não iniciar até haver decisão explícita de produto, autorização comercial compatível, aprovação dos gateways, revisão legal/segurança, identidade funcional e plano isolado de teste. Pagamento, carteira, entrega de credenciais e reembolso permanecem fora do escopo atual. |

## Próxima sequência

1. Fechar CF-01 a CF-03 com documentação e fixtures demonstrativas, distinguindo campos do contrato, exemplo entregue, fixture e resposta runtime.
2. Realizar a auditoria visual CF-04 e consolidar defeitos responsivos/acessíveis em correções pequenas.
3. Resolver os pré-requisitos de identidade (CF-05) e acesso operacional (CF-06) antes de qualquer validação autenticada.
4. Manter CF-07 como medição pendente enquanto a sincronização está desligada; preservar a distinção entre CI sintético e capacidade da LZT.
5. Melhorar painel e documentar concorrência (CF-08/CF-09), sempre sem habilitar operações comerciais.
6. Revisar identidade e preparar eventual release (CF-10/CF-11). CF-12 permanece bloqueado pela decisão vigente.

## Portões

- Nenhum dado de fixture pode ser apresentado como estoque real.
- Nenhuma credencial, cookie, senha ou segredo entra no backlog, changelog, log ou repositório público.
- A sincronização permanece desligada; uma leitura completa e autorizada e uma medida real são pré-requisitos para afirmar escala.
- Não criar bypass de autenticação nem sessão simulada.
- Checkout, gateway, carteira, entrega e reembolso reais permanecem desativados enquanto a decisão de demonstração estiver vigente.
- Solicitação do cliente não significa aceite concluído; registrar aceite formal somente quando houver confirmação explícita.
