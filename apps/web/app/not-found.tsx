import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="shell page-shell" aria-labelledby="not-found-title">
      <div className="state-panel empty-state">
        <div>
          <p className="eyebrow">ERRO 404 · PÁGINA NÃO ENCONTRADA</p>
          <h1 id="not-found-title">Este endereço não existe.</h1>
          <p>O link pode estar desatualizado. Volte ao catálogo para consultar as contas disponíveis.</p>
        </div>
        <Link className="button-primary" href="/">Voltar ao catálogo</Link>
      </div>
    </section>
  );
}
