# Histórico de alterações

O projeto usa versões SemVer. Esta lista registra alterações notáveis e limites conhecidos; commits contêm as mudanças completas.

## Não lançado

- Adiciona o símbolo facetado Crystalforn ao cabeçalho e ao rodapé.
- Reorganiza os detalhes do produto com título curto, atributos em destaques, painel de preço equilibrado e data real de sincronização.
- Ajusta navegação móvel, tipografia fluida, espaçamento, cards, filtros ativos e estados de consulta em tema claro/escuro.
- Preserva filtros, ordenação e página no endereço compartilhável e ao voltar dos detalhes; adiciona ordenação por preço ou nome estável no catálogo.
- Retira trechos em cirílico dos títulos gerados para manter os resumos da loja em português.
- Acrescenta busca, filtro de estado/ação e paginação na auditoria e no histórico do sincronizador do painel.
- Explicita que o inventário detalhado depende dos campos públicos disponíveis e pode ter cobertura parcial.
- Sinaliza anúncios sincronizados há mais de 24 horas como potencialmente alterados.
- Adiciona tema claro/escuro com preferência persistida no navegador.
- Amplia a prévia fictícia com League of Legends, filtros demonstrativos por personagem/skin, biblioteca Steam, rank e nível, e inventários textuais de exemplo.
- Reduz gravações sequenciais do importador a um upsert PostgreSQL por lote interno de até 500 itens.
- Divide páginas grandes da sincronização em requisições internas limitadas por quantidade e bytes, abaixo do limite do parser JSON da API.
- Documenta o limite oficial de busca LZT, a paginação por cursor e a latência não determinística da reconciliação após uma varredura completa.
- Atualiza contadores da sincronização após cada página para mostrar progresso no painel durante varreduras longas.
- Mantém compras, pagamentos e entrega bloqueados; o catálogo real e a sincronização permanecem em modo de consulta, sujeitos à disponibilidade do fornecedor.

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
