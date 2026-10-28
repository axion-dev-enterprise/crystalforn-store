import { Storefront } from '@/components/storefront';

export default function HomePage() {
  return <>
    <section className="hero shell"><div className="hero-copy"><p className="eyebrow">CRYSTALFORN · PRÉVIA DA VITRINE</p><h1>Explore o catálogo Crystalforn.</h1><p className="hero-intro">Veja a navegação por jogo, inventário e filtros. Os itens exibidos são exemplos fictícios, sem oferta ou compra.</p><a className="button-primary" href="#catalogo">Ver catálogo demonstrativo</a></div><aside className="hero-note"><span className="note-index">01 / DEMONSTRAÇÃO</span><p>Dados de exemplo para apresentar a experiência da loja.</p><span className="note-rule" /></aside></section>
    <Storefront />
  </>;
}
