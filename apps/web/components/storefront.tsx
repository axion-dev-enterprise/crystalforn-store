'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { DEMO_PRODUCTS } from '@/data/demo-products';

export type StoreProduct = { id: string; game: string; generated_title: string; price_brl_cents: number | string; attributes: Record<string, unknown>; synced_at?: string | null; seller_feedback_total?: number | null; seller_feedback_positive_percentage?: number | null };
type Catalog = { items: StoreProduct[]; page: number; pageSize: number; total: number; totalPages?: number; demoOnly?: boolean; catalogMode?: string; message?: string };
type Filters = { minPrice: string; maxPrice: string; minDaysOffline: string; skinName: string; steamGame: string; rank: string; minLevel: string };
type CatalogSort = 'price_asc' | 'price_desc' | 'title_asc';
const EMPTY_FILTERS: Filters = { minPrice: '', maxPrice: '', minDaysOffline: '', skinName: '', steamGame: '', rank: '', minLevel: '' };
const games = [{ id: '', label: 'Todos' }, { id: 'fortnite', label: 'Fortnite' }, { id: 'steam', label: 'Steam' }, { id: 'roblox', label: 'Roblox' }, { id: 'valorant', label: 'Valorant' }, { id: 'lol', label: 'League of Legends' }];
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const DEMO_PAGE_SIZE = 6;

function displayTitle(product: StoreProduct): string {
  const gameName = product.game === 'lol' ? 'league of legends' : product.game;
  const highlight = product.generated_title.split(/\s*\|\s*|\s+·\s+/).map((part) => part.trim()).find((part) => part && part.toLocaleLowerCase('pt-BR') !== gameName && !/[\u0400-\u04FF]/.test(part));
  return highlight || `Conta ${product.game === 'lol' ? 'League of Legends' : product.game[0].toUpperCase() + product.game.slice(1)}`;
}

function queryNumber(value: string, integer = false): string {
  if (!value || !/^(?:\d+|\d+\.\d{1,2})$/.test(value)) return '';
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && (!integer || Number.isInteger(number)) ? value : '';
}

function updatedLabel(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function isStaleSync(value?: string | null): boolean {
  if (!value) return true;
  const timestamp = new Date(value).getTime();
  return !Number.isFinite(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000;
}

export function Storefront() {
  const [game, setGame] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<CatalogSort>('price_asc');
  const [restoredFromUrl, setRestoredFromUrl] = useState(false);
  const [result, setResult] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const catalogRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialGame = games.some((item) => item.id && item.id === params.get('game')) ? params.get('game')! : '';
    const initialFilters: Filters = {
      minPrice: queryNumber(params.get('minPrice') ?? ''),
      maxPrice: queryNumber(params.get('maxPrice') ?? ''),
      minDaysOffline: queryNumber(params.get('minDaysOffline') ?? '', true),
      skinName: (params.get('skinName') ?? '').slice(0, 100),
      steamGame: (params.get('steamGame') ?? '').slice(0, 100),
      rank: (params.get('rank') ?? '').slice(0, 40),
      minLevel: queryNumber(params.get('minLevel') ?? '', true),
    };
    const initialPage = Number(params.get('page'));
    setGame(initialGame);
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(Number.isInteger(initialPage) && initialPage >= 1 && initialPage <= 500 ? initialPage : 1);
    const initialSort = params.get('sort');
    setSort(initialSort === 'price_desc' || initialSort === 'title_asc' ? initialSort : 'price_asc');
    setRestoredFromUrl(true);
  }, []);

  const catalogParams = new URLSearchParams();
  if (game) catalogParams.set('game', game);
  if (page > 1) catalogParams.set('page', String(page));
  if (sort !== 'price_asc') catalogParams.set('sort', sort);
  for (const [key, value] of Object.entries(appliedFilters)) if (value) catalogParams.set(key, value);
  const catalogQuery = catalogParams.toString();
  const catalogReturnUrl = catalogQuery ? `/?${catalogQuery}#catalogo` : '/#catalogo';

  useEffect(() => {
    if (!restoredFromUrl) return;
    const query = catalogParams.toString();
    window.history.replaceState(null, '', query ? `/?${query}` : '/');
  }, [restoredFromUrl, catalogQuery]);

  const load = useCallback(async () => {
    catalogRequest.current?.abort();
    const controller = new AbortController();
    catalogRequest.current = controller;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '24', sort }); if (game) params.set('game', game);
      if (appliedFilters.minPrice) params.set('minPrice', appliedFilters.minPrice);
      if (appliedFilters.maxPrice) params.set('maxPrice', appliedFilters.maxPrice);
      if (appliedFilters.minDaysOffline) params.set('minDaysOffline', appliedFilters.minDaysOffline);
      if (appliedFilters.skinName) params.set('skinName', appliedFilters.skinName);
      if (appliedFilters.steamGame) params.set('steamGame', appliedFilters.steamGame);
      if (appliedFilters.rank) params.set('rank', appliedFilters.rank);
      if (appliedFilters.minLevel) params.set('minLevel', appliedFilters.minLevel);
      const response = await fetch(`/api/v1/catalog?${params}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Não foi possível carregar o catálogo agora.');
      const catalog = await response.json() as Catalog;
      setResult(catalog.demoOnly ? { ...catalog, items: DEMO_PRODUCTS, total: DEMO_PRODUCTS.length, pageSize: DEMO_PAGE_SIZE, totalPages: Math.ceil(DEMO_PRODUCTS.length / DEMO_PAGE_SIZE), message: 'Itens e preços fictícios para demonstrar a navegação. Não são anúncios reais e não podem ser comprados.' } : catalog);
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : 'Erro ao carregar o catálogo.');
        setResult(null);
      }
    } finally {
      if (catalogRequest.current === controller) catalogRequest.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [game, page, appliedFilters, sort]);
  useEffect(() => {
    if (!restoredFromUrl) return;
    void load();
    return () => { catalogRequest.current?.abort(); };
  }, [load, restoredFromUrl]);
  const filteredDemoProducts = DEMO_PRODUCTS.filter((product) => {
    if (!result?.demoOnly) return false;
    const offlineDays = Number(product.attributes.days_offline ?? 0);
    const inventory = product.attributes.inventory as Record<string, unknown> | undefined;
    const skinNames = Array.isArray(inventory?.skin_names) ? inventory.skin_names.map(String) : [];
    const steamGames = Array.isArray(inventory?.game_names) ? inventory.game_names.map(String) : [];
    const rank = typeof inventory?.lol_rank === 'string' ? inventory.lol_rank : typeof inventory?.rank === 'string' ? inventory.rank : '';
    const level = Number(inventory?.level ?? 0);
    return (!game || product.game === game)
      && (!appliedFilters.minPrice || Number(product.price_brl_cents) >= Number(appliedFilters.minPrice) * 100)
      && (!appliedFilters.maxPrice || Number(product.price_brl_cents) <= Number(appliedFilters.maxPrice) * 100)
      && (!appliedFilters.minDaysOffline || offlineDays >= Number(appliedFilters.minDaysOffline))
      && (!appliedFilters.skinName || game !== 'fortnite' || skinNames.some((name) => name.toLocaleLowerCase('pt-BR').includes(appliedFilters.skinName.toLocaleLowerCase('pt-BR'))))
      && (!appliedFilters.steamGame || game !== 'steam' || steamGames.some((name) => name.toLocaleLowerCase('pt-BR').includes(appliedFilters.steamGame.toLocaleLowerCase('pt-BR'))))
      && (!appliedFilters.rank || !['valorant', 'lol'].includes(game) || rank.toLocaleLowerCase('pt-BR').includes(appliedFilters.rank.toLocaleLowerCase('pt-BR')))
      && (!appliedFilters.minLevel || !['valorant', 'lol'].includes(game) || level >= Number(appliedFilters.minLevel));
  });
  const sortedDemoProducts = [...filteredDemoProducts].sort((left, right) => {
    if (sort === 'title_asc') return displayTitle(left).localeCompare(displayTitle(right), 'pt-BR');
    const difference = Number(left.price_brl_cents) - Number(right.price_brl_cents);
    return sort === 'price_desc' ? -difference : difference;
  });
  const visibleProducts = result?.demoOnly ? sortedDemoProducts.slice((page - 1) * DEMO_PAGE_SIZE, page * DEMO_PAGE_SIZE) : result?.items ?? [];
  const pages = result?.demoOnly ? Math.max(1, Math.ceil(filteredDemoProducts.length / DEMO_PAGE_SIZE)) : Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 24)));
  const activeFilterTokens = [
    ...(game ? [{ key: 'game', label: `Jogo: ${gameLabel(game)}` }] : []),
    ...(appliedFilters.minPrice ? [{ key: 'minPrice', label: `Preço mínimo: R$ ${appliedFilters.minPrice}` }] : []),
    ...(appliedFilters.maxPrice ? [{ key: 'maxPrice', label: `Preço máximo: R$ ${appliedFilters.maxPrice}` }] : []),
    ...(appliedFilters.minDaysOffline ? [{ key: 'minDaysOffline', label: `Inatividade: ${appliedFilters.minDaysOffline}+ dias` }] : []),
    ...(appliedFilters.skinName ? [{ key: 'skinName', label: `Personagem: ${appliedFilters.skinName}` }] : []),
    ...(appliedFilters.steamGame ? [{ key: 'steamGame', label: `Jogo Steam: ${appliedFilters.steamGame}` }] : []),
    ...(appliedFilters.rank ? [{ key: 'rank', label: `Rank: ${appliedFilters.rank}` }] : []),
    ...(appliedFilters.minLevel ? [{ key: 'minLevel', label: `Nível mínimo: ${appliedFilters.minLevel}` }] : []),
  ];
  function removeFilter(key: string) {
    if (key === 'game') {
      setGame('');
      setFilters((current) => ({ ...current, skinName: '', steamGame: '', rank: '', minLevel: '' }));
      setAppliedFilters((current) => ({ ...current, skinName: '', steamGame: '', rank: '', minLevel: '' }));
    } else {
      const next = { ...appliedFilters, [key]: '' } as Filters;
      setFilters(next);
      setAppliedFilters(next);
    }
    setPage(1);
  }
  return <section className="catalog-section shell" id="catalogo" aria-labelledby="catalog-title"><div className="section-heading"><div><p className="eyebrow">{result?.demoOnly ? 'PRÉVIA VISUAL · ITENS FICTÍCIOS' : 'INVENTÁRIO DISPONÍVEL'}</p><h2 id="catalog-title">{result?.demoOnly ? 'Veja como a vitrine funciona.' : 'Escolha pelo que importa.'}</h2></div><p className="section-aside" role="status" aria-live="polite" aria-atomic="true">{result?.demoOnly ? `${filteredDemoProducts.length} exemplos · sem venda` : result ? `${result.total} contas listadas` : 'Preços em reais'}</p></div>
    {result?.catalogMode === 'live_read_only' && <p className="catalog-readonly-note" role="status">Catálogo real sincronizado com o fornecedor. A visualização está ativa; compras e entregas automáticas continuam desativadas.</p>}
    {result?.demoOnly && <div className="demo-catalog-notice" role="note"><strong>Catálogo de demonstração</strong><span>Todos os itens, atributos e valores são fictícios. Não há anúncios reais nem opção de compra nesta prévia.</span></div>}
    <div className="filter-row" role="group" aria-label="Filtrar catálogo por jogo">{games.map((item) => <button type="button" key={item.id || 'all'} className={`filter-chip ${game === item.id ? 'is-selected' : ''}`} aria-pressed={game === item.id} onClick={() => { setGame(item.id); setPage(1); setFilters((value) => ({ ...value, skinName: '', steamGame: '', rank: '', minLevel: '' })); setAppliedFilters((value) => ({ ...value, skinName: '', steamGame: '', rank: '', minLevel: '' })); }}>{item.label}</button>)}</div>
    <form className="catalog-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedFilters(filters); }}>
      <div className="filter-field"><label htmlFor="min-price">Preço mínimo</label><input id="min-price" type="number" min="0" step="0.01" inputMode="decimal" placeholder="R$ 0,00" value={filters.minPrice} onChange={(event) => setFilters((value) => ({ ...value, minPrice: event.target.value }))} /></div>
      <div className="filter-field"><label htmlFor="max-price">Preço máximo</label><input id="max-price" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Sem limite" value={filters.maxPrice} onChange={(event) => setFilters((value) => ({ ...value, maxPrice: event.target.value }))} /></div>
      <div className="filter-field"><label htmlFor="offline-days">Inatividade</label><select id="offline-days" value={filters.minDaysOffline} onChange={(event) => setFilters((value) => ({ ...value, minDaysOffline: event.target.value }))}><option value="">Qualquer período</option><option value="30">30 dias ou mais</option><option value="60">60 dias ou mais</option><option value="90">90 dias ou mais</option></select></div>
      {game && <div className="demo-specific-filters" role="group" aria-label="Filtros específicos do jogo">
        {game === 'fortnite' && <div className="filter-field"><label htmlFor="skin-name">Personagem ou skin {result?.demoOnly ? 'fictícia' : ''}</label><input id="skin-name" type="search" placeholder="Ex.: Travis Scott" value={filters.skinName} onChange={(event) => setFilters((value) => ({ ...value, skinName: event.target.value }))} /></div>}
        {game === 'steam' && <div className="filter-field"><label htmlFor="steam-game">Jogo na biblioteca {result?.demoOnly ? 'fictício' : ''}</label><input id="steam-game" type="search" placeholder="Ex.: Portal 2" value={filters.steamGame} onChange={(event) => setFilters((value) => ({ ...value, steamGame: event.target.value }))} /></div>}
        {(game === 'valorant' || game === 'lol') && <>
          <div className="filter-field"><label htmlFor="account-rank">Rank {result?.demoOnly ? 'fictício' : ''}</label><input id="account-rank" type="search" placeholder={game === 'lol' ? 'Ex.: Ouro II' : 'Ex.: Diamante'} value={filters.rank} onChange={(event) => setFilters((value) => ({ ...value, rank: event.target.value }))} /></div>
          <div className="filter-field"><label htmlFor="account-level">Nível mínimo {result?.demoOnly ? 'fictício' : ''}</label><input id="account-level" type="number" min="1" inputMode="numeric" placeholder="Qualquer nível" value={filters.minLevel} onChange={(event) => setFilters((value) => ({ ...value, minLevel: event.target.value }))} /></div>
        </>}
      </div>}
      <div className="filter-field catalog-sort-field"><label htmlFor="catalog-sort">Ordenar por</label><select id="catalog-sort" value={sort} onChange={(event) => { setPage(1); setSort(event.target.value as CatalogSort); }}><option value="price_asc">Menor preço</option><option value="price_desc">Maior preço</option><option value="title_asc">Nome do anúncio (A–Z)</option></select></div>
      <button className="button-outline" type="submit">Aplicar filtros</button>
    </form>
    {activeFilterTokens.length > 0 && <div className="active-filters" role="group" aria-label="Filtros aplicados"><span className="active-filters-label">Filtros ativos</span>{activeFilterTokens.map((token) => <button className="active-filter" key={token.key} type="button" onClick={() => removeFilter(token.key)}><span>{token.label}</span><span>Remover</span></button>)}<button className="active-filters-clear" type="button" onClick={() => { setGame(''); setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setPage(1); }}>Limpar filtros</button></div>}
    {error && <div className="state-panel error-state" role="alert"><div><h3>{result?.demoOnly ? 'A prévia segue disponível' : 'Catálogo temporariamente indisponível'}</h3><p>{error}</p></div><button className="button-outline" type="button" onClick={() => void load()}>Tentar novamente</button></div>}
    {loading && !result?.demoOnly && <div className="product-grid" aria-label="Carregando catálogo" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div className="product-skeleton" key={i}><span /><span /><span /></div>)}</div>}
    {!loading && !visibleProducts.length && <div className="state-panel empty-state"><div><h3>Nenhum item corresponde aos filtros</h3><p>Amplie a faixa de preço, reduza a inatividade ou escolha outra categoria.</p></div><button className="button-outline" type="button" onClick={() => { setGame(''); setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setPage(1); setSort('price_asc'); }}>Limpar filtros</button></div>}
    {(!loading || result?.demoOnly) && !!visibleProducts.length && <><div className="product-grid">{visibleProducts.map((product, index) => <CatalogProductCard key={product.id} product={product} demo={Boolean(result?.demoOnly)} sequence={(page - 1) * (result?.pageSize ?? 24) + index + 1} returnTo={catalogReturnUrl} />)}</div><nav className="pagination" aria-label="Paginação do catálogo"><button className="button-outline" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span>Página {page} de {pages}</span><button className="button-outline" type="button" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Próxima</button></nav></>}
  </section>;
}

export function CatalogProductCard({ product, demo, sequence, returnTo = '/#catalogo' }: { product: StoreProduct; demo: boolean; sequence?: number; returnTo?: string }) {
  return <article className="product-card">
    <div className="product-badge">{demo ? 'Exemplo fictício' : 'No catálogo'}</div>
    <div className="card-topline"><span>{gameLabel(product.game)}</span>{sequence && <span className="card-sequence">{String(sequence).padStart(2, '0')}</span>}</div>
    <ProductArt product={product} demo={demo} />
    <h3 aria-label={product.generated_title}>{displayTitle(product)}</h3>
    <ProductHighlights attributes={product.attributes} feedbackTotal={product.seller_feedback_total} positivePercentage={product.seller_feedback_positive_percentage} />
    {demo ? <ProductInventoryPreview game={product.game} attributes={product.attributes} /> : <p className={`product-updated${isStaleSync(product.synced_at) ? ' is-stale' : ''}`}>
      {updatedLabel(product.synced_at) ? <><span>{isStaleSync(product.synced_at) ? 'Pode ter mudado' : 'Sincronizado'}</span><time dateTime={product.synced_at ?? undefined}>{updatedLabel(product.synced_at)}</time></> : <span>Data indisponível</span>}
    </p>}
    <div className="product-bottom">
      <span className="demo-price"><strong>{money(Number(product.price_brl_cents))}</strong>{demo && <small>valor ilustrativo</small>}</span>
      {demo ? <a className="text-link" aria-label={`Ver detalhes do exemplo fictício de ${gameLabel(product.game)}`} href={`/produto/${product.id}?returnTo=${encodeURIComponent(returnTo)}`}>Ver detalhes <span aria-hidden="true">→</span></a> : <a className="text-link" href={`/produto/${product.id}?returnTo=${encodeURIComponent(returnTo)}`}>Ver detalhes <span aria-hidden="true">→</span></a>}
    </div>
  </article>;
}

function gameLabel(game: string): string {
  if (game === 'lol') return 'League of Legends';
  return game === 'valorant' ? 'Valorant' : game[0].toUpperCase() + game.slice(1);
}

function ProductInventoryPreview({ game, attributes }: { game: string; attributes: Record<string, unknown> }) {
  const inventory = attributes.inventory as Record<string, unknown> | undefined;
  if (!inventory) return null;
  const groups = game === 'fortnite'
    ? [
        ['Personagens e skins', inventory.skin_names],
        ['Picaretas', inventory.pickaxe_names],
        ['Emotes', inventory.emote_names],
        ['Asas-delta', inventory.glider_names],
      ] as const
    : game === 'steam' ? [['Jogos na biblioteca', inventory.game_names]] as const : [];
  if (!groups.length) return null;
  return <details className="demo-inventory">
    <summary>Ver inventário fictício</summary>
    <div className="demo-inventory-groups">{groups.map(([label, values]) => Array.isArray(values) && values.length > 0 && <section className="demo-inventory-group" key={label}>
      <h4>{label}</h4>
      <ul>{values.map((value) => <li key={String(value)}>{String(value)}</li>)}</ul>
    </section>)}</div>
  </details>;
}

function ProductArt({ product, demo }: { product: StoreProduct; demo: boolean }) {
  const inventory = product.attributes.inventory as Record<string, unknown> | undefined;
  const id = inventory?.roblox_id === undefined ? '' : String(inventory.roblox_id);
  const mark = product.game === 'fortnite' ? 'F' : product.game === 'valorant' ? 'V' : product.game === 'roblox' ? 'R' : product.game === 'steam' ? 'S' : product.game === 'lol' ? 'L' : 'A';
  return <div className={`product-art art-${product.game}`}>
    {product.game === 'roblox' && /^\d{1,20}$/.test(id) && !demo ? <RobloxCardPreview userId={id} username={String(inventory?.username ?? 'usuário')} /> : product.game === 'fortnite' && !demo ? <FortniteCardPreview productId={product.id} title={product.generated_title} fallback={mark} /> : <span className="game-art-mark" aria-hidden="true">{mark}</span>}
    <span className="game-art-caption">{demo ? 'Item fictício · prévia' : product.game === 'roblox' && typeof inventory?.username === 'string' ? inventory.username : 'Disponível para consulta'}</span>
  </div>;
}

function RobloxCardPreview({ userId, username }: { userId: string; username: string }) {
  const frame = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [avatar, setAvatar] = useState('');
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
    fetch(`/api/v1/catalog/roblox-avatars?userIds=${encodeURIComponent(userId)}`, { cache: 'force-cache', signal: AbortSignal.timeout(15_000) })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ avatars?: Record<string, string> }>; })
      .then((body) => { const image = body.avatars?.[userId]; if (active && image) setAvatar(image); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [userId, visible]);
  return <span className="roblox-card-frame" ref={frame}>{avatar ? <Image className="roblox-card-avatar" src={avatar} alt={`Avatar Roblox de ${username}`} width={400} height={150} sizes="(max-width: 520px) calc(100vw - 32px), (max-width: 700px) calc((100vw - 44px) / 2), 400px" loading="lazy" /> : <span className="game-art-mark" aria-hidden="true">R</span>}</span>;
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
  return <span className="fortnite-card-frame" ref={frame}>{image ? <img className="fortnite-card-preview" src={image} srcSet={imageSrcSet(productId, 'skins')} sizes="(max-width: 520px) calc(100vw - 32px), (max-width: 700px) calc((100vw - 44px) / 2), 400px" alt={`Prévia do inventário Fortnite: ${title}`} width={400} height={150} loading="lazy" decoding="async" /> : <span className="game-art-mark" aria-hidden="true">{fallback}</span>}</span>;
}

function imageSrcSet(productId: string, type: string): string {
  return [320, 640, 960].map((width) => `/api/v1/catalog/${encodeURIComponent(productId)}/inventory-image/${type}/${width} ${width}w`).join(', ');
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
