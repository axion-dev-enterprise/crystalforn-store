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
| `--focus-color` | `#8BD0D9` | `#145D46` | Anel de foco por tema |
| `--content-width` | `1160px` | `1160px` | Largura máxima do conteúdo |
| `--shell-gutter` | `64px` desktop / `40px` tablet / `32px` celular | igual | Margens externas do shell |
| `--space-1` a `--space-7` | `4, 8, 12, 16, 24, 32, 48px` | igual | Escala de espaçamento |
| `--density-gap` | `15px` | `15px` | Intervalo entre cards do catálogo |
| `--radius-control` / `--radius-panel` | `2px` / `8px` | igual | Controles / painéis |
| `--control-min` | `44px` | `44px` | Alvo mínimo dos controles táteis |
| `--motion-fast` | `160ms` | `160ms` | Transições curtas |

O CSS centraliza as cores e estados de foco nesses tokens e nos seletores `data-theme`. A tipografia combina serifa editorial para títulos, sans-serif para leitura contínua e monoespaçada para rótulos operacionais. A largura geral é limitada a 1160 px; título de produto e descrição usam limites próprios; a escala de espaçamento usa os valores acima e títulos/áreas principais usam `clamp()`; os grids mudam de composição em 900, 850, 700, 600 e 520 px conforme o componente. Cards sem imagem usam a sigla do jogo como fallback estável.

## Ajustes desta revisão

- O rodapé e o favicon usam o símbolo geométrico Crystalforn com fundo transparente.
- O cabeçalho usa variantes raster transparentes do wordmark em cores próprias para tema escuro e claro; o nome acessível segue no link e o símbolo compacto continua no favicon e rodapé.
- Os detalhes do produto usam título conciso, destaques em chips, preço em coluna própria no desktop e ordem natural no celular; data de sincronização evita sugerir atualização em tempo real.
- Exemplos fictícios abrem uma página de detalhe própria, com valor e inventário identificados como demonstrativos; essa rota usa dados locais e não solicita imagens ou dados ao fornecedor.
- A vitrine oferece ordenação por menor preço, maior preço e nome, remove filtros individualmente e mantém consulta e página na URL e no retorno dos detalhes.
- Cards e painéis usam escala tipográfica fluida e largura de leitura controlada para acomodar títulos longos sem dominar a tela.
- Corrigido o contraste do texto em botões primários e filtros selecionados sobre a superfície azul-clara da marca.
- Corrigida a cor do texto do rodapé sobre o fundo claro.
- O grupo de filtros agora tem papel acessível explícito, com botões de estado `aria-pressed`.
- Mantidos viewport dinâmico `100dvh`, breakpoints de conteúdo, navegação móvel com alvos de 44 px, foco visível e respeito a movimento reduzido.
- Os detalhes identificam os itens como dados públicos fornecidos pelo catálogo e avisam que a cobertura pode ser parcial.
- A biblioteca Steam apresenta o tempo jogado quando a API fornece `playtime_forever`; a ausência do campo não cria um valor fictício.
- A listagem pública transfere somente atributos resumidos usados nos cards; inventários completos são consultados no detalhe do anúncio.
- A quantidade de resultados é anunciada como estado polido; miniaturas assíncronas mantêm dimensões de exibição reservadas e decodificação assíncrona.
- A busca de avatar Roblox na vitrine começa apenas quando o card se aproxima da viewport; a prévia textual continua disponível como fallback.
- As consultas de imagem do detalhe Fortnite/Roblox esperam a aproximação da seção do inventário, e miniaturas e avatar declaram dimensões intrínsecas para reservar espaço.
- Miniaturas Roblox usam `next/image`, `sizes` e origem HTTPS limitada a `*.rbxcdn.com`; prévias Fortnite recebem variantes WebP em 320, 640 e 960 px, com cache limitado, controle de pixels e `srcset` dimensionado para cada layout.
- Os wordmarks usam dimensões intrínsecas alinhadas ao cabeçalho de 220 px para o Next.js entregar variantes 1×/2× compactas, sem pedir uma imagem de quase 2.000 px para esse espaço.
- O controle de tema mantém área de toque mínima de 44×44 px em celulares; links do rodapé também reservam altura de 44 px para toque.
- QR Codes Pix também declaram dimensões HTML de 180×180 px; o linter Web Vitals do workspace agora reporta zero avisos de dimensões nas imagens da aplicação.
- O inventário e a auditoria administrativas oferecem busca/filtro e navegação paginada em vez de limitar o histórico aos primeiros registros.
- A prévia administrativa renderiza o mesmo cartão de produto usado na vitrine, com atributos, reputação agregada, atualização e preço em uma única fonte de interface.
- A seção operacional de sincronização exibe os anúncios descartados e traduz os motivos retornados pelo backend, junto com duração, páginas, volume e última execução bem-sucedida.
- Catálogo e detalhes sinalizam anúncios com sincronização acima de 24 horas ou sem data conhecida como dados cuja disponibilidade pode ter mudado.

## Escopo da verificação

O código dos filtros, ordenação, paginação, aplicação/limpeza e retry foi rastreado até os handlers do frontend e a ordenação foi validada no allowlist do DTO e na cláusula SQL de ordenação. O painel liga atualização, busca, paginação, cupons, configurações, entrega e análise de solicitações às rotas de API correspondentes. A compilação e a validação final de produção serão reportadas após o fluxo de release. O modo demo mantém compras, recargas e pagamentos bloqueados.
