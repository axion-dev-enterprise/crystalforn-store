# Referências de design e responsividade

Pesquisa consultada em 27/10/2026. As recomendações abaixo foram usadas na revisão da vitrine e em seus estados de interação.

## Princípios adotados

1. **Começar por um fluxo estreito e legível.** A orientação da MDN descreve o método mobile-first como partir de uma coluna simples e adicionar colunas quando o espaço permitir. O catálogo preserva uma ordem única no DOM e reduz o grid a uma coluna em telas pequenas; em larguras maiores mostra colunas adicionais. [MDN: Media query fundamentals](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Media_queries)
2. **A estrutura HTML determina a ordem de leitura.** Grid organiza a apresentação, mas controles e conteúdo permanecem em sequência lógica para teclado e leitor de tela. [MDN: Grid layout and accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Accessibility)
3. **Controles próprios devem funcionar com toque, teclado e mouse.** Filtros de jogo usam botões semânticos e `aria-pressed`; filtros numéricos têm rótulos associados; ações continuam sendo botões e navegação continua sendo link. A MDN recomenda controles nativos para herdar foco e operação por teclado. [MDN: Forms and buttons](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/HTML_forms)
4. **Alvos são grandes o bastante para toque.** WCAG 2.2 AA define 24×24 CSS px como tamanho mínimo com exceções; o critério AAA eleva o alvo a 44×44 px. A interface usa no mínimo 44 px nas principais ações e filtros, seguindo a meta maior onde o layout permite. [W3C: Target Size Minimum (2.5.8)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [W3C: Target Size Enhanced (2.5.5)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)
5. **Estados são parte do desenho.** Catálogo, histórico e painel têm loading, erro, vazio e recuperação; mensagens deixam claro quando exemplos são fictícios e quando uma ação comercial está bloqueada.

## Ajustes desta revisão

- Corrigido o contraste do texto em botões primários e filtros selecionados sobre a superfície azul-clara da marca.
- Corrigida a cor do texto do rodapé sobre o fundo claro.
- O grupo de filtros agora tem papel acessível explícito, com botões de estado `aria-pressed`.
- Mantidos viewport dinâmico `100dvh`, breakpoints de conteúdo, navegação móvel com alvos de 44 px, foco visível e respeito a movimento reduzido.

## Escopo da verificação

O código dos filtros, paginação, aplicação/limpeza de filtros e retry foi rastreado até os respectivos handlers. O painel liga atualização, busca, paginação, cupons, configurações, entrega e análise de solicitações às rotas de API correspondentes. A verificação de compilação não executa mutações administrativas nem comprova integrações externas. O modo demo mantém compras, recargas, sincronização e pagamentos bloqueados.
