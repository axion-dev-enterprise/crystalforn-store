# Referências de design e responsividade

Pesquisa consultada em 27/10/2026. As recomendações abaixo foram usadas na revisão da vitrine e em seus estados de interação.

## Princípios adotados

1. **Começar por um fluxo estreito e legível.** A orientação da MDN descreve o método mobile-first como partir de uma coluna simples e adicionar colunas quando o espaço permitir. O catálogo preserva uma ordem única no DOM e reduz o grid a uma coluna em telas pequenas; em larguras maiores mostra colunas adicionais. [MDN: Media query fundamentals](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Media_queries)
2. **A estrutura HTML determina a ordem de leitura.** Grid organiza a apresentação, mas controles e conteúdo permanecem em sequência lógica para teclado e leitor de tela. [MDN: Grid layout and accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Accessibility)
3. **Controles próprios devem funcionar com toque, teclado e mouse.** Filtros de jogo usam botões semânticos e `aria-pressed`; filtros numéricos têm rótulos associados; ações continuam sendo botões e navegação continua sendo link. A MDN recomenda controles nativos para herdar foco e operação por teclado. [MDN: Forms and buttons](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/HTML_forms)
4. **Alvos são grandes o bastante para toque.** WCAG 2.2 AA define 24×24 CSS px como tamanho mínimo com exceções; o critério AAA eleva o alvo a 44×44 px. A interface usa no mínimo 44 px nas principais ações e filtros, seguindo a meta maior onde o layout permite. [W3C: Target Size Minimum (2.5.8)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [W3C: Target Size Enhanced (2.5.5)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)
5. **Estados são parte do desenho.** Catálogo, histórico e painel têm loading, erro, vazio e recuperação; mensagens deixam claro quando exemplos são fictícios e quando uma ação comercial está bloqueada.

## Tokens visuais Crystalforn

| Token | Escuro | Claro | Uso |
| --- | --- | --- | --- |
| `--paper` | `#0C0A09` | `#FAFAF9` | Fundo geral |
| `--surface` | `#18181B` | `#FFFFFF` | Cards e painéis |
| `--ink` | `#F4F1EC` | `#17211D` | Texto principal |
| `--muted` | `#C0BBB4` | `#53615B` | Metadados e ajuda |
| `--line` | `#45413F` | `#D8DED9` | Divisórias e bordas |
| `--green` | `#8BD0D9` | `#145D46` | Ação e assinatura da marca |
| `--soft` | `#252528` | `#EDF3EF` | Superfície secundária |

O CSS centraliza as cores nesses tokens e nos seletores `data-theme`. A tipografia combina serifa editorial para títulos, sans-serif para leitura contínua e monoespaçada para rótulos operacionais. A largura geral é limitada a 1160 px; título de produto e descrição usam limites próprios; o espaçamento é fluido com `clamp()` e os grids mudam de composição em 900, 700 e 520 px. Cards sem imagem usam a sigla do jogo como fallback estável.

## Ajustes desta revisão

- O cabeçalho e o rodapé usam o símbolo original facetado da Crystalforn, com wordmark textual para manter nitidez em qualquer escala.
- Os detalhes do produto usam título conciso, destaques em chips, preço em coluna própria no desktop e ordem natural no celular; data de sincronização evita sugerir atualização em tempo real.
- A vitrine oferece ordenação por menor preço, maior preço e nome, remove filtros individualmente e mantém consulta e página na URL e no retorno dos detalhes.
- Cards e painéis usam escala tipográfica fluida e largura de leitura controlada para acomodar títulos longos sem dominar a tela.
- Corrigido o contraste do texto em botões primários e filtros selecionados sobre a superfície azul-clara da marca.
- Corrigida a cor do texto do rodapé sobre o fundo claro.
- O grupo de filtros agora tem papel acessível explícito, com botões de estado `aria-pressed`.
- Mantidos viewport dinâmico `100dvh`, breakpoints de conteúdo, navegação móvel com alvos de 44 px, foco visível e respeito a movimento reduzido.
- Os detalhes identificam os itens como dados públicos fornecidos pelo catálogo e avisam que a cobertura pode ser parcial.
- O inventário e a auditoria administrativas oferecem busca/filtro e navegação paginada em vez de limitar o histórico aos primeiros registros.
- A prévia administrativa renderiza o mesmo cartão de produto usado na vitrine, com atributos, reputação agregada, atualização e preço em uma única fonte de interface.
- Catálogo e detalhes sinalizam anúncios com sincronização acima de 24 horas ou sem data conhecida como dados cuja disponibilidade pode ter mudado.

## Escopo da verificação

O código dos filtros, ordenação, paginação, aplicação/limpeza e retry foi rastreado até os handlers do frontend e a ordenação foi validada no allowlist do DTO e na cláusula SQL de ordenação. O painel liga atualização, busca, paginação, cupons, configurações, entrega e análise de solicitações às rotas de API correspondentes. A compilação e a validação final de produção serão reportadas após o fluxo de release. O modo demo mantém compras, recargas e pagamentos bloqueados.
