import Link from 'next/link';

export default function PurchaseTermsPage() {
  return <section className="shell page-shell narrow-shell">
    <Link className="back-link" href="/#catalogo">Voltar ao catálogo</Link>
    <article className="terms-document">
      <p className="eyebrow">DOCUMENTO PENDENTE DE APROVAÇÃO</p>
      <h1>Termos de Compra</h1>
      <p className="terms-status" role="status">O texto final ainda não foi aprovado. A loja também aguarda a liberação documentada do modelo comercial e dos meios de pagamento. Por isso, o checkout permanece desativado e nenhuma cobrança ou utilização do saldo da carteira será iniciada.</p>
      <h2>Condições que precisam ser publicadas</h2>
      <ul>
        <li>Como o estoque, os atributos e o preço são conferidos novamente antes do pagamento.</li>
        <li>Como as credenciais digitais são entregues ao comprador após a confirmação do pagamento.</li>
        <li>Como registrar a tela do primeiro acesso para facilitar o suporte, conforme solicitado no projeto.</li>
        <li>Como será tratado um item que o fornecedor confirmar como vendido ou indisponível depois do pagamento.</li>
        <li>Como acompanhar solicitações de desistência ou cancelamento e como serão feitas as restituições.</li>
        <li>Identificação do fornecedor, canal de atendimento e informações de privacidade.</li>
        <li>Quando a Pushin Pay for selecionada, informar que ela processa o pagamento e que a loja responde pela entrega, pelo suporte e pelas informações do produto.</li>
      </ul>
      <p>A versão ativa só será exibida e aceita depois que o responsável aprovar o texto completo. Até lá, o site permite consultar o catálogo, mas bloqueia compras.</p>
      <Link className="button-primary" href="/#catalogo">Continuar consultando o catálogo</Link>
    </article>
  </section>;
}
