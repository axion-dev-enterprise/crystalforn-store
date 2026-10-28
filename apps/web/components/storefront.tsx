'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Product = { id: string; game: string; generated_title: string; price_brl_cents: number; attributes: Record<string, unknown>; seller_feedback_total?: number | null; seller_feedback_positive_percentage?: number | null };
type Catalog = { items: Product[]; page: number; pageSize: number; total: number; totalPages?: number; demoOnly?: boolean; message?: string };
type RobloxAvatars = Record<string, string>;
type Filters = { minPrice: string; maxPrice: string; minDaysOffline: string };
const games = [{ id: '', label: 'Todos' }, { id: 'fortnite', label: 'Fortnite' }, { id: 'steam', label: 'Steam' }, { id: 'roblox', label: 'Roblox' }, { id: 'valorant', label: 'Valorant' }];
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const DEMO_PRODUCTS: Product[] = [
  { id: 'demo-fortnite-01', game: 'fortnite', generated_title: 'Fortnite · inventário com 42 skins', price_brl_cents: 8990, attributes: { days_offline: 45, inventory: { skins_count: 42, pickaxes_count: 18, vbucks_balance: 1200 } } },
  { id: 'demo-fortnite-02', game: 'fortnite', generated_title: 'Fortnite · coleção de 86 skins', price_brl_cents: 14990, attributes: { days_offline: 120, inventory: { skins_count: 86, pickaxes_count: 31, vbucks_balance: 2500 } } },
  { id: 'demo-valorant-01', game: 'valorant', generated_title: 'Valorant · Platina · 24 skins', price_brl_cents: 11990, attributes: { days_offline: 60, inventory: { rank: 'Platina', level: 137, skins_count: 24 } } },
  { id: 'demo-valorant-02', game: 'valorant', generated_title: 'Valorant · Diamante · 41 skins', price_brl_cents: 21990, attributes: { days_offline: 90, inventory: { rank: 'Diamante', level: 208, skins_count: 41 } } },
  { id: 'demo-roblox-01', game: 'roblox', generated_title: 'Roblox · nível 82 · 16 itens', price_brl_cents: 6990, attributes: { days_offline: 35, inventory: { level: 82, items_count: 16, robux_balance: 800 } } },
  { id: 'demo-roblox-02', game: 'roblox', generated_title: 'Roblox · nível 146 · 32 itens', price_brl_cents: 12990, attributes: { days_offline: 75, inventory: { level: 146, items_count: 32, robux_balance: 2100 } } },
  { id: 'demo-steam-01', game: 'steam', generated_title: 'Steam · biblioteca com 38 jogos', price_brl_cents: 7990, attributes: { days_offline: 40, inventory: { level: 21, games_count: 38, vac_banned: false } } },
  { id: 'demo-steam-02', game: 'steam', generated_title: 'Steam · biblioteca com 112 jogos', price_brl_cents: 18990, attributes: { days_offline: 100, inventory: { level: 54, games_count: 112, vac_banned: false } } },
];
const DEMO_PAGE_SIZE = 6;

export function Storefront() {
  const [game, setGame] = useState('');
  const [filters, setFilters] = useState<Filters>({ minPrice: '', maxPrice: '', minDaysOffline: '' });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ minPrice: '', maxPrice: '', minDaysOffline: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Catalog | null>({ items: DEMO_PRODUCTS, page: 1, pageSize: DEMO_PAGE_SIZE, total: DEMO_PRODUCTS.length, demoOnly: true, message: 'Itens e preços fictícios para demonstrar a navegação. Não são anúncios reais e não podem ser comprados.' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [robloxAvatars, setRobloxAvatars] = useState<RobloxAvatars>({});
  const catalogRequest = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    catalogRequest.current?.abort();
    const controller = new AbortController();
    catalogRequest.current = controller;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '24' }); if (game) params.set('game', game);
      if (appliedFilters.minPrice) params.set('minPrice', appliedFilters.minPrice);
      if (appliedFilters.maxPrice) params.set('maxPrice', appliedFilters.maxPrice);
      if (appliedFilters.minDaysOffline) params.set('minDaysOffline', appliedFilters.minDaysOffline);
      const response = await fetch(`/api/v1/catalog?${params}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Não foi possível carregar o catálogo agora.');
      const catalog = await response.json() as Catalog;
      setResult(catalog.demoOnly ? { ...catalog, items: DEMO_PRODUCTS, total: DEMO_PRODUCTS.length, pageSize: DEMO_PAGE_SIZE, totalPages: Math.ceil(DEMO_PRODUCTS.length / DEMO_PAGE_SIZE), message: 'Itens e preços fictícios para demonstrar a navegação. Não são anúncios reais e não podem ser comprados.' } : catalog);
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : 'Erro ao carregar o catálogo.');
        setResult({ items: DEMO_PRODUCTS, page: 1, pageSize: DEMO_PAGE_SIZE, total: DEMO_PRODUCTS.length, demoOnly: true, message: 'Itens e preços fictícios para demonstrar a navegação. Não são anúncios reais e não podem ser comprados.' });
      }
    } finally {
      if (catalogRequest.current === controller) catalogRequest.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [game, page, appliedFilters]);
  useEffect(() => {
    void load();
    return () => { catalogRequest.current?.abort(); };
  }, [load]);
  useEffect(() => {
    const userIds = [...new Set((result?.items ?? []).filter((product) => product.game === 'roblox').map((product) => {
      const inventory = product.attributes.inventory as Record<string, unknown> | undefined;
      return typeof inventory?.roblox_id === 'string' || typeof inventory?.roblox_id === 'number' ? String(inventory.roblox_id) : '';
    }).filter((id) => /^\d{1,20}$/.test(id)))].slice(0, 24);
    if (!userIds.length) { setRobloxAvatars({}); return; }
    let active = true;
    fetch(`/api/v1/catalog/roblox-avatars?userIds=${userIds.join(',')}`, { cache: 'force-cache' })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ avatars?: RobloxAvatars }>; })
      .then((body) => { if (active) setRobloxAvatars(body.avatars ?? {}); })
      .catch(() => { if (active) setRobloxAvatars({}); });
    return () => { active = false; };
  }, [result]);
  const filteredDemoProducts = DEMO_PRODUCTS.filter((product) => {
    if (!result?.demoOnly) return false;
    const offlineDays = Number(product.attributes.days_offline ?? 0);
    return (!game || product.game === game)
      && (!appliedFilters.minPrice || product.price_brl_cents >= Number(appliedFilters.minPrice) * 100)
      && (!appliedFilters.maxPrice || product.price_brl_cents <= Number(appliedFilters.maxPrice) * 100)
      && (!appliedFilters.minDaysOffline || offlineDays >= Number(appliedFilters.minDaysOffline));
  });
  const visibleProducts = result?.demoOnly ? filteredDemoProducts.slice((page - 1) * DEMO_PAGE_SIZE, page * DEMO_PAGE_SIZE) : result?.items ?? [];
  const pages = result?.demoOnly ? Math.max(1, Math.ceil(filteredDemoProducts.length / DEMO_PAGE_SIZE)) : Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 24)));
  return <section className="catalog-section shell" id="catalogo" aria-labelledby="catalog-title"><div className="section-heading"><div><p className="eyebrow">{result?.demoOnly ? 'PRÉVIA VISUAL · ITENS FICTÍCIOS' : 'INVENTÁRIO DISPONÍVEL'}</p><h2 id="catalog-title">{result?.demoOnly ? 'Veja como a vitrine funciona.' : 'Escolha pelo que importa.'}</h2></div><p className="section-aside">{result?.demoOnly ? `${filteredDemoProducts.length} exemplos · sem venda` : result ? `${result.total} contas listadas` : 'Preços em reais'}</p></div>
    {result?.demoOnly && <div className="demo-catalog-notice" role="note"><strong>Catálogo de demonstração</strong><span>Todos os itens, atributos e valores são fictícios. Não há anúncios reais nem opção de compra nesta prévia.</span></div>}
    <div className="filter-row" aria-label="Filtrar catálogo por jogo">{games.map((item) => <button type="button" key={item.id || 'all'} className={`filter-chip ${game === item.id ? 'is-selected' : ''}`} aria-pressed={game === item.id} onClick={() => { setGame(item.id); setPage(1); }}>{item.label}</button>)}</div>
    <form className="catalog-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedFilters(filters); }}>
      <div className="filter-field"><label htmlFor="min-price">Preço mínimo</label><input id="min-price" type="number" min="0" step="0.01" inputMode="decimal" placeholder="R$ 0,00" value={filters.minPrice} onChange={(event) => setFilters((value) => ({ ...value, minPrice: event.target.value }))} /></div>
      <div className="filter-field"><label htmlFor="max-price">Preço máximo</label><input id="max-price" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Sem limite" value={filters.maxPrice} onChange={(event) => setFilters((value) => ({ ...value, maxPrice: event.target.value }))} /></div>
      <div className="filter-field"><label htmlFor="offline-days">Inatividade</label><select id="offline-days" value={filters.minDaysOffline} onChange={(event) => setFilters((value) => ({ ...value, minDaysOffline: event.target.value }))}><option value="">Qualquer período</option><option value="30">30 dias ou mais</option><option value="60">60 dias ou mais</option><option value="90">90 dias ou mais</option></select></div>
      <button className="button-outline" type="submit">Aplicar filtros</button>
    </form>
    {error && <div className="state-panel error-state" role="alert"><div><h3>{result?.demoOnly ? 'A prévia segue disponível' : 'Catálogo temporariamente indisponível'}</h3><p>{error}</p></div><button className="button-outline" type="button" onClick={() => void load()}>Tentar novamente</button></div>}
    {loading && !result?.demoOnly && <div className="product-grid" aria-label="Carregando catálogo" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div className="product-skeleton" key={i}><span /><span /><span /></div>)}</div>}
    {!loading && !visibleProducts.length && <div className="state-panel empty-state"><div><h3>Nenhum item corresponde aos filtros</h3><p>Amplie a faixa de preço, reduza a inatividade ou escolha outra categoria.</p></div><button className="button-outline" type="button" onClick={() => { setGame(''); setFilters({ minPrice: '', maxPrice: '', minDaysOffline: '' }); setAppliedFilters({ minPrice: '', maxPrice: '', minDaysOffline: '' }); setPage(1); }}>Limpar filtros</button></div>}
    {(!loading || result?.demoOnly) && !!visibleProducts.length && <><div className="product-grid">{visibleProducts.map((product, index) => <article className="product-card" key={product.id}><div className="product-badge">{result?.demoOnly ? 'Exemplo fictício' : 'Full Acesso'}</div><div className="card-topline"><span>{product.game === 'valorant' ? 'Valorant' : product.game[0].toUpperCase() + product.game.slice(1)}</span><span className="card-sequence">{String((page - 1) * (result?.pageSize ?? 24) + index + 1).padStart(2, '0')}</span></div><ProductArt product={product} robloxAvatars={robloxAvatars} demo={Boolean(result?.demoOnly)} /><h3>{product.generated_title}</h3><ProductHighlights attributes={product.attributes} feedbackTotal={product.seller_feedback_total} positivePercentage={product.seller_feedback_positive_percentage} /><div className="product-bottom"><span className="demo-price"><strong>{money(Number(product.price_brl_cents))}</strong>{result?.demoOnly && <small>valor ilustrativo</small>}</span>{result?.demoOnly ? <span className="demo-no-sale">Sem compra</span> : <a className="text-link" href={`/produto/${product.id}`}>Ver detalhes <span aria-hidden="true">→</span></a>}</div></article>)}</div><nav className="pagination" aria-label="Paginação do catálogo"><button className="button-outline" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span>Página {page} de {pages}</span><button className="button-outline" type="button" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Próxima</button></nav></>}
  </section>;
}

function ProductArt({ product, robloxAvatars, demo }: { product: Product; robloxAvatars: RobloxAvatars; demo: boolean }) {
  const inventory = product.attributes.inventory as Record<string, unknown> | undefined;
  const id = inventory?.roblox_id === undefined ? '' : String(inventory.roblox_id);
  const avatar = product.game === 'roblox' && /^\d{1,20}$/.test(id) ? robloxAvatars[id] : undefined;
  const mark = product.game === 'fortnite' ? 'F' : product.game === 'valorant' ? 'V' : product.game === 'roblox' ? 'R' : product.game === 'steam' ? 'S' : 'A';
  return <div className={`product-art art-${product.game}`} aria-label={product.game === 'roblox' ? 'Avatar Roblox' : `Categoria ${product.game}`}>
    {avatar ? <img className="roblox-card-avatar" src={avatar} alt={`Avatar Roblox de ${String(inventory?.username ?? 'usuário')}`} loading="lazy" /> : product.game === 'fortnite' && !demo ? <FortniteCardPreview productId={product.id} title={product.generated_title} fallback={mark} /> : <span className="game-art-mark" aria-hidden="true">{mark}</span>}
    <span className="game-art-caption">{demo ? 'Item fictício · prévia' : product.game === 'roblox' && typeof inventory?.username === 'string' ? inventory.username : 'Conta verificada no checkout'}</span>
  </div>;
}

function FortniteCardPreview({ productId, title, fallback }: { productId: string; title: string; fallback: string }) {
  const frame = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [image, setImage] = useState('');
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '120px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    fetch(`/api/v1/catalog/${encodeURIComponent(productId)}/inventory-image?type=skins`, { cache: 'force-cache', signal: AbortSignal.timeout(15_000) })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const body = await response.json() as { imageDataUrl?: string };
        if (!body.imageDataUrl?.startsWith('data:image/png;base64,')) throw new Error();
        if (active) setImage(body.imageDataUrl);
      }).catch(() => undefined);
    return () => { active = false; };
  }, [visible, productId]);
  return <span className="fortnite-card-frame" ref={frame}>{image ? <img className="fortnite-card-preview" src={image} alt={`Prévia do inventário Fortnite: ${title}`} loading="lazy" decoding="async" /> : <span className="game-art-mark" aria-hidden="true">{fallback}</span>}</span>;
}

function ProductHighlights({ attributes, feedbackTotal, positivePercentage }: { attributes: Record<string, unknown>; feedbackTotal?: number | null; positivePercentage?: number | null }) {
  const inventory = attributes.inventory as Record<string, unknown> | undefined;
  const seller = attributes.seller_reputation as Record<string, unknown> | undefined;
  const feedbackHighlight = typeof feedbackTotal === 'number' && feedbackTotal > 0 && typeof positivePercentage === 'number'
    ? `${positivePercentage}% positivas · ${feedbackTotal} avaliações` : null;
  const values = [
    feedbackHighlight,
    typeof inventory?.games_count === 'number' ? `${inventory.games_count} jogos` : null,
    typeof inventory?.skins_count === 'number' ? `${inventory.skins_count} skins` : null,
    typeof inventory?.lol_rank === 'string' ? inventory.lol_rank : typeof inventory?.rank === 'string' ? inventory.rank : typeof inventory?.rank === 'number' ? `Rank ${inventory.rank}` : null,
    typeof inventory?.vbucks_balance === 'number' ? `${inventory.vbucks_balance} V-Bucks` : typeof inventory?.vp_min === 'number' ? `${inventory.vp_min} VP` : typeof inventory?.blue_min === 'number' ? `${inventory.blue_min} Essência azul` : null,
    typeof inventory?.robux_balance === 'number' ? `${inventory.robux_balance.toLocaleString('pt-BR')} Robux` : null,
    typeof inventory?.level === 'number' ? `Nível ${inventory.level}` : null,
    typeof inventory?.items_count === 'number' ? `${inventory.items_count} itens/frutas` : typeof inventory?.fruits_count === 'number' ? `${inventory.fruits_count} frutas` : null,
    typeof attributes.days_offline === 'number' ? `${attributes.days_offline} dias offline` : null,
    typeof inventory?.pickaxes_count === 'number' ? `${inventory.pickaxes_count} picaretas` : null,
    inventory?.vac_banned === false || inventory?.vac_banned === 'no' ? 'Sem banimento VAC' : inventory?.vac_banned === true || inventory?.vac_banned === 'yes' ? 'Banimento VAC ativo' : null,
    typeof inventory?.followers_count === 'number' ? `${inventory.followers_count} seguidores` : null,
    typeof seller?.restore_percent === 'number' ? `${seller.restore_percent}% de restauração` : typeof seller?.sold_items_count === 'number' ? `${seller.sold_items_count} vendas do vendedor` : null,
  ].filter((value): value is string => Boolean(value)).slice(0, 3);
  return <ul className="highlight-list">{values.map((value) => <li key={value}>{value}</li>)}</ul>;
}
