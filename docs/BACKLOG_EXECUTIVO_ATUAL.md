# Backlog executivo atual — Crystalforn

Este documento organiza a próxima fase de trabalho em entregas verificáveis. Os requisitos do cliente abaixo foram extraídos das mensagens já registradas neste workspace e no contexto da tarefa. A conversa da Workana não pôde ser reaberta nesta sessão porque o site apresentou uma verificação de segurança; este backlog não presume mensagens posteriores.

## Limites de produto

- A release continua em **modo de demonstração**: sem catálogo real publicado, sincronização LZT ativa, vendas, pagamentos, carteira, entrega de credenciais ou reembolsos reais.
- As fixtures são fictícias e precisam permanecer identificadas como demonstração.
- O backlog detalhado e o histórico dos requisitos permanecem em [BACKLOG.md](BACKLOG.md). O mapa técnico de campos está em [PROVIDER_FIELD_MAP.md](PROVIDER_FIELD_MAP.md); os gates estão descritos em [DEMO_MODE.md](DEMO_MODE.md) e [COMPATIBILIDADE_COMERCIAL.md](COMPATIBILIDADE_COMERCIAL.md).
- Os volumes de 15 mil a 40 mil anúncios e a atualização “em tempo real” são metas solicitadas, ainda sem medição no fornecedor.

## Fila executável

| Ordem | Prioridade | Entrega | Estado atual | Critério de conclusão |
| --- | --- | --- | --- | --- |
| 1 | P1 | Fechar filtros de descoberta por jogo | Busca demonstrativa funciona sobre fixtures. Parâmetros da LZT ainda não estão conectados à vitrine. | Fortnite permite localizar skins/personagens; Steam encontra jogos por nome e mapeia IDs apenas quando houver correspondência conhecida; LoL e Valorant filtram rank/divisão e nível quando os campos existem. Fixtures e resultados ficam identificados como fictícios. |
| 2 | P1 | Padronizar títulos em pt-BR | A normalização está implementada, mas cobertura real por categoria não foi demonstrada. | Títulos usam atributos estruturados disponíveis; destaque de rank limita-se a LoL/Valorant e à matriz fornecida; textos russos/vagos não são exibidos quando há dados confiáveis. Dados ausentes ou inválidos usam título neutro. |
| 3 | P1 | Completar a apresentação de inventário | Fortnite tem amostra textual; cobertura integral e imagens por item variam conforme o payload. | Agrupar itens por categoria (skins, picaretas, emotes, asas-delta, jogos Steam e inventários Riot/Roblox); indicar contagem e quando a lista é parcial; mostrar imagens somente com origem e uso revisados. Não afirmar que gamepasses individuais ou inventário completo existem se o contrato não os fornecer. |
| 4 | P1 | Revisar a experiência responsiva e os temas | Alternância claro/escuro e responsividade foram verificadas parcialmente; falta inspeção consolidada das rotas. | Inspecionar catálogo, detalhe, acesso, área do cliente e administração em larguras móvel e desktop, nos dois temas. Confirmar contraste, foco, navegação por teclado, estados de carregamento/erro/vazio e ausência de overflow. A interface continua deixando o modo demo claro. |
| 5 | P1 | Concluir identidade visual Crystalforn | Logo e tokens estão integrados em parte da interface. | Aplicar marca e tipografia de forma consistente em catálogo, detalhe e administração; validar legibilidade, proporção da logo e estados interativos nos dois temas. |
| 6 | P1 | Fechar autenticação e área do cliente via Auth Center | O caminho central está ligado na interface; runtime, callback, tenant e papéis ainda não foram comprovados. | Validar sessão real, tenant `crystalforn`, papel `store_customer`, callback e isolamento de dados. Sem configuração ou identidade válida, retornar erro explícito; nenhum atalho ou login simulado. |
| 7 | P2 | Melhorar painel administrativo em modo demo | Há estrutura de resumo, catálogo e histórico; permissões e origem de cada indicador precisam de verificação. | Mostrar origem e estado dos dados, falhas e histórico de sincronização, pedidos fictícios e controles de catálogo claramente inativos. Validar autorização no servidor e registrar ações sem segredos ou credenciais de conta. |
| 8 | P2 | Validar paginação em massa e retomada | Benchmark sintético de 20 mil/40 mil registros passou; não representa LZT, rede, banco ou tempo real. Worker permanece desligado. | Antes de qualquer sincronização real, comprovar contrato de paginação/cursor, cotas, limite de páginas, memória, duração, checkpoint, retomada, rate limit e falhas em ambiente autorizado. Uma varredura incompleta não pode reconciliar ou ocultar produtos. |
| 9 | P2 | Especificar concorrência e indisponibilidade | Revalidação e idempotência existem em partes do código, mas não foram verificadas em runtime comercial. | Documentar revalidação, reserva concorrente, timeout ambíguo, não entrega de item indisponível e reconciliação. Qualquer crédito futuro deve ser transacional e idempotente. Só prometer remoção imediata se houver mecanismo e latência medidos. |
| 10 | P2 | Preparar revisão de release e implantação | A versão atual não recebeu confirmação de deploy dos commits recentes. | Fazer preflight de acesso ao ambiente autorizado, conferir versão/branch e plano de rollback; implantar apenas após passar pelos gates de build e release e confirmar endpoints e conteúdo esperados. Não registrar host, IP ou segredo em documentação pública. |
| 11 | P3 | Reavaliar eventual produto comercial | Checkout, gateway e entrega real foram citados pelo cliente como etapa posterior, mas seguem bloqueados pela decisão de demo e pela revisão de compatibilidade. | Só planejar ativação após decisão explícita de produto, autorização aplicável dos titulares, aprovação escrita dos gateways, termos/privacidade, identidade, segurança e plano de testes isolados. Até lá, não integrar cobranças, carteira, entrega ou reembolso real. |

## Portões para avançar

1. **Dados:** distinguir contrato público, payload de exemplo, fixtures e resposta real autorizada. Campo ausente não é inferido.
2. **Escala:** apresentar benchmarks sintéticos como sintéticos; não afirmar sincronização em tempo real sem evidência medida.
3. **Identidade:** proteger cada rota por sessão, tenant e papel verificados pelo Auth Center.
4. **Operação:** manter ações administrativas sem efeito comercial enquanto o gate demo estiver ativo.
5. **Comercial:** não liberar contas, pagamentos, entrega nem reembolsos enquanto a revisão de compatibilidade estiver pendente.

## Definição de pronto desta fase

- Os itens P1 estão concluídos na demonstração e verificados em rotas, temas e tamanhos de tela representativos.
- A documentação indica claramente o que foi demonstrado, o que depende do fornecedor e o que continua bloqueado.
- O benchmark sintético não é apresentado como capacidade de produção.
- Os gates de demonstração permanecem fechados para catálogo real, sincronização, pagamentos, entrega e carteira.
- O cliente pode revisar a versão sem que isso seja descrito como aceite formal até haver confirmação explícita.
