# Compatibilidade comercial do catálogo

**Status: bloqueio de lançamento para venda de contas de jogos.** Esta é uma checagem documental de regras públicas, não um parecer jurídico. Catálogo público, importação, checkout e cobranças ficam desativados para o escopo atual até que o modelo seja alterado ou haja autorização escrita aplicável dos titulares dos jogos e aprovação dos provedores de pagamento.

## Regras públicas dos titulares

| Plataforma | Regra pública consultada | Efeito para este projeto |
| --- | --- | --- |
| Epic Games / Fortnite | Os Termos da Epic proíbem vender, dar, trocar ou usar a conta de outra pessoa; o código de conduta do Fortnite também proíbe compra e venda de contas. | A venda de contas Fortnite conflita com as regras publicadas. |
| Riot Games / Valorant e League of Legends | Os Termos da Riot proíbem vender, transferir ou permitir que outra pessoa use a conta ou credenciais. O suporte de LoL alerta que compra de contas pode resultar em banimento permanente. | A venda de contas Riot conflita com as regras publicadas. |
| Roblox | Os Termos atualmente publicados proíbem comprar ou vender contas e credenciais, ressalvada uma exceção estreita para transferência acompanhada da venda dos direitos de ganhos de conteúdo criado pela conta. Essa exceção não descreve o marketplace proposto. | A venda comum de contas Roblox conflita com as regras publicadas. |
| Steam | O Acordo de Assinante define a conta como pessoal e proíbe venda, cobrança pelo uso ou transferência; assinaturas não são transferíveis salvo permissão expressa da Valve. | A venda de contas Steam conflita com as regras publicadas. |

Fontes oficiais revalidadas em 27/10/2026: [orientação da Epic sobre compra, venda ou compartilhamento de contas](https://www.epicgames.com/help/c-45487929/c-38978022/can-i-buy-sell-or-share-an-epic-games-account-bir-epic-games-hesabini-satin-alabilir-satabilir-veya-paylasabilir-miyim-a14738255), [Termos da Riot Games, seção 1.5](https://www.riotgames.com/en/terms-of-service), [Termos do Roblox](https://www.roblox.com/termsofuse) e [Acordo de Assinante Steam, seção C](https://store.steampowered.com/subscriber_agreement/). Os Termos do Roblox exibem vigência a partir de 19/05/2026 e incluem uma exceção limitada para transferência vinculada a direitos de ganhos de conteúdo criado pela conta sob acordo escrito; ela não descreve a venda comum de contas de jogos.

## Gateways

- **Pushin Pay:** os termos descrevem o serviço como tecnologia de pagamento e atribuem ao vendedor responsabilidade pela oferta, entrega e suporte. A documentação também prevê análise e bloqueio preventivo. Para contas novas, o limite inicial divulgado para transações Pix/API é R$ 150, sujeito a revisão. Não foi localizada aprovação pública específica para comércio de contas de jogos; obter confirmação escrita antes de habilitar cobranças. [Termos de Uso Pushin Pay](https://pushinpay.com.br/termos-de-uso).
- **Mercado Pago:** não foi localizada confirmação pública explícita de que esta categoria de produto seja aceita. A integração técnica Pix não equivale à aprovação comercial. Solicitar confirmação escrita do Mercado Pago para a descrição exata da oferta antes de ativar a integração.

## Imagens e propriedade intelectual

- A política oficial da Epic define “Fan Content” como conteúdo pessoal e não comercial e exige atribuição/disclaimer em páginas que o exibam. O suporte da Epic direciona qualquer uso de imagens e conteúdo Fortnite a essa política. Como este produto é uma loja pública com intenção comercial futura, a adequação de imagens Epic requer revisão e autorização aplicável; a etiqueta “demonstração” não comprova licença.
- A demo atual contém capas Steam externas ilustrativas. A origem e os direitos de exibição dessas capas não foram verificados para este contexto. Uma URL pública ou acessível por CDN não comprova licença de uso.
- Não foram adicionadas imagens individuais de Fortnite: o exemplo do cliente fornece nomes, sem URLs ou ícones. Antes de reutilizar imagens de jogos em uma versão comercial, registrar licença/permissão, atribuição exigida e origem por recurso; se isso não puder ser comprovado, remover ou substituir a arte por elementos originais que não aleguem representar itens reais.

Fonte Epic consultada em 28/10/2026: [Epic Games Fan Content Policy](https://legal.epicgames.com/epicgames/fan-art-policy). A necessidade de uma revisão específica para este produto é uma conclusão operacional conservadora, não um parecer jurídico.

## Condição de lançamento

1. Não publicar nem aceitar pagamentos por contas de Fortnite, Valorant, LoL, Roblox ou Steam no escopo atual sem autorização escrita aplicável dos titulares dos direitos e aprovação documentada dos gateways.
2. O aceite do responsável pelos termos do comprador não substitui a autorização dos titulares das plataformas ou dos provedores de pagamento.
3. Até resolver o bloqueio, manter `PURCHASE_TERMS_APPROVED` desativado e catálogo/importação/checkout fechados. A página `/termos` precisa continuar identificando a minuta como não aprovada.
4. A API também exige referências não vazias publicadas no código em `services/api/src/modules/legal/commerce-release-status.ts` e valores iguais no ambiente (`MARKETPLACE_COMPLIANCE_REFERENCE`, `MERCADOPAGO_CATEGORY_APPROVAL_REFERENCE` e/ou `PUSHINPAY_CATEGORY_APPROVAL_REFERENCE`). Variáveis de runtime, por si só, não abrem pedidos, Pix nem recargas de carteira.
5. Registrar aqui as respostas oficiais, escopo autorizado, limites e data de revisão antes de publicar as referências e mudar o estado do checkout.

## Escopo e limite da checagem

As regras públicas foram revalidadas em 27/10/2026. A checagem não decide questões legais locais, direitos de revenda, licenças, políticas privadas de risco dos gateways ou eventual autorização contratual individual. A proposta depende de revisão adicional do responsável e, quando aplicável, de assessoria jurídica.
