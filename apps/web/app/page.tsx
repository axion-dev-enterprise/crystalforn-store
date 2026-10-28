import { Storefront } from '@/components/storefront';

export default function HomePage() {
  return <>
    <section className="hero shell"><div className="hero-copy"><p className="eyebrow">CRYSTALFORN · CATÁLOGO</p><h1>Encontre sua próxima conta.</h1><p className="hero-intro">Explore anúncios por jogo, filtre atributos e confira os dados públicos do inventário. Nesta versão, a loja funciona somente para consulta.</p><a className="button-primary" href="#catalogo">Explorar catálogo</a></div><aside className="hero-note"><span className="note-index">01 / SOMENTE LEITURA</span><p>Compras, pagamentos e entrega automática estão desativados.</p><span className="note-rule" /></aside></section>
    <Storefront />
  </>;
}
