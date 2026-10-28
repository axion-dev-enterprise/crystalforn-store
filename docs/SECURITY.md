# Segurança

## Princípios

- Fail closed para autenticação, importação de catálogo, pedido, recarga, entrega e pagamento.
- Nenhum bypass, login de demonstração ou emissão arbitrária de sessão.
- Segredos apenas em armazenamento local protegido ou secret manager e injetados em runtime.
- Dados de sessão e pedidos não devem ser armazenados em cache público.
- Serviços de administração, banco e API devem permanecer privados atrás de um proxy necessário.

## Segredos e dados privados

Não comite `.env`, senhas, cookies, tokens, chaves privadas, dados de clientes, backups, logs de produção ou dumps. Se um segredo for exposto, revogue-o no provedor, verifique o uso e substitua-o; remover do último commit não elimina cópias do histórico.

O `.gitignore` exclui arquivos de ambiente e documentação operacional interna. Antes de publicar uma alteração, confira `git status`, arquivos staged e o diff completo.

## Autenticação

Sessões opacas são guardadas no servidor; cookies devem manter flags apropriadas ao ambiente. Administradores exigem verificação de senha forte, estado ativo, tenant e papel. Autenticação central exige callback validado e segredo de serviço. Falhas de configuração não devem resultar em fallback permissivo.

## Proteção de pagamentos e entrega

Os fluxos financeiros dependem de idempotência, confirmação autenticada do gateway e estado persistente de pedido. Dados de entrega usam chave de cifragem dedicada. Não armazene tokens de gateway no frontend ou em logs. A implementação permanece indisponível na versão demo.

## Relato de vulnerabilidade

Não publique segredos ou detalhes exploráveis em issues. Para uma distribuição comunitária, reporte vulnerabilidades em privado ao mantenedor do repositório e inclua passos mínimos de reprodução, impacto e versão. Remova dados pessoais dos relatos.

## Verificações antes de publicação

- Revise todos os arquivos que entrarão no commit e suas extensões.
- Procure por tokens, endereços privados, dados de cliente, URLs de painéis internos e caminhos da máquina.
- Confirme que `.env.example` contém somente placeholders e domínios de exemplo.
- Rode o build e inspecione o diff antes do push.
