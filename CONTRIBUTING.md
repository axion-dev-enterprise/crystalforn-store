# Como contribuir

## Antes da alteração

Leia o README, [modo demonstração](docs/DEMO_MODE.md), [segurança](docs/SECURITY.md) e a documentação do módulo afetado. Abra uma issue sem dados privados se precisar registrar uma proposta.

## Regras

- Preserve o modo demo; não habilite estoque, compras, pagamentos ou entrega como parte de uma alteração incidental.
- Não introduza bypass de autenticação, credenciais padrão ou segredos em fixtures.
- Mantenha a interface acessível e responsiva, com rótulos, foco visível e estados de carregamento/erro/vazio.
- Use migrações aditivas e atualize documentação quando comportamento ou configuração mudar.
- Não inclua dumps, `.env`, logs, dados pessoais ou documentos de implantação privada.

## Preparar um commit

```sh
npm ci
npm run build
git status --short
git diff --check
git diff
```

Use commits pequenos, com mensagem factual e escopo claro. Não afirme que um fluxo foi testado se apenas o build foi executado.

## Pull requests

Descreva motivo, comportamento, caminhos afetados, comandos de verificação e limitações. Inclua capturas de tela para alterações visuais sem mostrar dados reais. Informe migrações e variáveis novas sem publicar valores secretos.
