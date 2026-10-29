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
| CF-01 | P1 | Completar filtros essenciais por jogo | Há busca/filtros demonstrativos e mapeamento de campos. Os parâmetros LZT não estão conectados à vitrine demo. Cliente relata somente 10–30 resultados na maioria dos jogos e até 120 na Steam. | Fortnite filtra personagens/skins disponíveis; Steam, jogos da biblioteca; LoL e Valorant, rank/divisão e nível quando esses campos existem. Cada filtro corresponde a campos documentados e não mistura jogos. |
| CF-02 | P1 | Padronizar títulos em pt-BR | Normalização implementada; cobertura de respostas reais por categoria não demonstrada. | Títulos usam apenas atributos estruturados e confiáveis; remover cirílico e nomes vagos quando há dados suficientes. Destacar rank somente em LoL/Valorant. Campo ausente/desconhecido gera título neutro. |
| CF-03 | P1 | Exibir inventários úteis e honestos | Cliente relata nomes de skins Fortnite corretos, mas ausência de imagens individuais; elogia imagens Roblox e pede gamepasses/detalhes. Cobertura completa e origem/licença de imagens não comprovadas. | Agrupar itens retornados por jogo (skins, picaretas, emotes, asas-delta, jogos Steam, itens Riot/Roblox e gamepasses quando disponíveis); associar imagens somente a fontes permitidas; informar contagem e cobertura parcial; fallback acessível para campo/imagem ausente. |
| CF-04 | P1 | Auditar responsividade, temas e acessibilidade | Há tema claro/escuro e regras responsivas; inspeção visual consolidada de todas as rotas pendente. | Conferir catálogo, detalhe, acesso, área do cliente e admin em mobile/desktop e nos dois temas. Validar overflow, contraste, foco/teclado, estados de loading/erro/vazio e aviso de demonstração. |
| CF-05 | P1 | Fechar autenticação e área do cliente | Código central e validação tenant/papel estão implementados; segredo compartilhado do Auth Center ausente do Vault local e runtime ainda não verificado. | Provisionar configuração pelos canais operacionais autorizados; validar callback HTTPS, tenant `crystalforn`, papel `store_customer`, sessão e isolamento. Sem configuração/identidade válida, manter erro fechado `503`/`401`. |
| CF-06 | P1 | Resolver acesso colaborador e estabilidade Hostinger | Cliente pediu o identificador de e-mail para convite e relatou SSH instável. Identidade de conta ainda não confirmada; não há convite. | Confirmar o identificador correto da conta e estabilizar/verificar o canal. Usar colaborador de menor privilégio, MFA e trilha de auditoria. Não encaminhar senha root. |
| CF-07 | P2 | Confirmar paginação e escala com evidência | Worker atualizado para cursor; CI/build passou. Sincronização continua desligada. Meta de 20–40 mil ou mais é solicitação, não capacidade provada. | Em validação autorizada futura, medir tamanho de página, páginas, volume, rate limit, duração, memória, retomada e falhas. Comparar relatos de 10–30/120 com respostas observadas. Benchmarks sintéticos permanecem identificados como sintéticos; varredura incompleta não reconcilia catálogo. |
| CF-08 | P2 | Melhorar painel admin em modo demo | Painel tem resumo, catálogo e histórico; proveniência dos indicadores e permissões autenticadas ainda precisam de revisão. | Identificar origem/idade dos dados, erros e status; marcar ciclos históricos quando worker desligado; deixar ações comerciais desabilitadas; confirmar autorização no servidor e auditoria sem segredos. |
| CF-09 | P2 | Definir comportamento para anúncio vendido/concorrência | Cliente espera remoção imediata e reembolso se LZT vender antes da atualização. Worker e comportamento comercial não validados em runtime. | Documentar capacidades oficiais de evento/reserva, revalidação, concorrência, timeout ambíguo, idempotência e reconciliação. Só afirmar remoção imediata se latência medida comprovar. Qualquer crédito futuro exige fluxo transacional e idempotente. |
| CF-10 | P2 | Atualizar identidade Crystalforn com consistência | Logo e tokens já aparecem em partes da interface. Consistência visual global precisa de revisão. | Validar aplicação da marca, tipografia, proporções, legibilidade e estados em catálogo, detalhe e admin nos dois temas. |
| CF-11 | P2 | Preparar release e rollback | Release `361a117` está publicada; commits posteriores são alterações de documentação/worker e não foram implantados. | Antes de uma nova publicação, revisar branch/diff e CI, preservar backup/rollback, publicar serviços necessários e validar health, status legal, catálogo demo, página inicial e auth aplicável. |
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
