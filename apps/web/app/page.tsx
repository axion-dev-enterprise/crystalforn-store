import { Storefront } from '@/components/storefront';

export default function HomePage() {
  return <>
    <section className="hero shell"><div className="hero-copy"><p className="eyebrow">CRYSTALFORN · PRÉVIA DEMONSTRATIVA</p><h1>Conheça a vitrine Crystalforn.</h1><p className="hero-intro">Explore exemplos fictícios por jogo, filtre atributos e veja como o inventário pode ser apresentado. Nenhum anúncio é real nem pode ser comprado nesta versão.</p><a className="button-primary" href="#catalogo">Ver exemplos</a></div><aside className="hero-note"><span className="note-index">01 / SOMENTE LEITURA</span><p>Compras, pagamentos e entrega automática estão desativados.</p><span className="note-rule" /></aside></section>
    <Storefront />
  </>;
}
