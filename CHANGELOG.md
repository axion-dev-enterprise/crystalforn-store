# Histórico de alterações

O projeto usa versões SemVer. Esta lista registra alterações notáveis e limites conhecidos; commits contêm as mudanças completas.

## Não lançado

- Adiciona tema claro/escuro com preferência persistida no navegador.
- Amplia a prévia fictícia com League of Legends, filtros demonstrativos por personagem/skin, biblioteca Steam, rank e nível, e inventários textuais de exemplo.
- Mantém os filtros específicos limitados a dados de demonstração; catálogo real, sincronização e pagamentos continuam bloqueados.

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
