'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { DEMO_PRODUCTS } from '@/data/demo-products';

export type StoreProduct = { id: string; game: string; generated_title: string; price_brl_cents: number | string; attributes: Record<string, unknown>; synced_at?: string | null; seller_feedback_total?: number | null; seller_feedback_positive_percentage?: number | null };
type Catalog = { items: StoreProduct[]; page: number; pageSize: number; total: number; totalPages?: number; demoOnly?: boolean; catalogMode?: string; message?: string };
type Filters = { minPrice: string; maxPrice: string; minDaysOffline: string; skinName: string; steamGame: string; rank: string; minLevel: string };
type CatalogSort = 'price_asc' | 'price_desc' | 'title_asc';
const EMPTY_FILTERS: Filters = { minPrice: '', maxPrice: '', minDaysOffline: '', skinName: '', steamGame: '', rank: '', minLevel: '' };
const STOREFRONT_CATALOG_MODE = process.env.NEXT_PUBLIC_STORE_CATALOG_MODE === 'live_read_only' ? 'live_read_only' : 'demo';
const games = [{ id: '', label: 'Todos' }, { id: 'fortnite', label: 'Fortnite' }, { id: 'steam', label: 'Steam' }, { id: 'roblox', label: 'Roblox' }, { id: 'valorant', label: 'Valorant' }, { id: 'lol', label: 'League of Legends' }];
const DEMO_LOL_RANKS = ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Esmeralda'].flatMap((tier) => ['IV', 'III', 'II', 'I'].map((division) => `${tier} ${division}`));
const DEMO_VALORANT_RANKS = [
  ...['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Ascendente', 'Imortal'].flatMap((tier) => ['III', 'II', 'I'].map((division) => `${tier} ${division}`)),
  'Radiante',
];
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const DEMO_PAGE_SIZE = 6;

function demoCatalog(page: number, message: string): Catalog {
  return {
    items: DEMO_PRODUCTS,
    page,
    pageSize: DEMO_PAGE_SIZE,
    total: DEMO_PRODUCTS.length,
    totalPages: Math.ceil(DEMO_PRODUCTS.length / DEMO_PAGE_SIZE),
    demoOnly: true,
    catalogMode: 'demo',
    message,
  };
}

function inventoryLabels(inventory: Record<string, unknown> | undefined, keys: string[]): string[] {
  const aliases = keys.map((key) => {
    const value = inventory?.[key];
    const entries = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    return entries.flatMap((entry) => {
      if (typeof entry === 'string') return entry.trim() ? [entry.trim()] : [];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
      const record = entry as Record<string, unknown>;
      const label = record.title ?? record.name ?? record.label;
      return typeof label === 'string' && label.trim() ? [label.trim()] : [];
    });
  });
  const labelsFromEarlierAliases = new Set<string>();
  return aliases.flatMap((labels) => {
    const uniqueToAlias = labels.filter((label) => !labelsFromEarlierAliases.has(label.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR')));
    for (const label of labels) labelsFromEarlierAliases.add(label.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR'));
    return uniqueToAlias;
  });
}

function rankMatches(value: string, query: string): boolean {
  const normalize = (rank: string) => rank.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  const actual = normalize(value);
  const requested = normalize(query);
  return actual === requested || actual.startsWith(`${requested} `);
}

function demoInventoryOptions(game: string, keys: string[]): string[] {
  const values = DEMO_PRODUCTS.filter((product) => product.game === game).flatMap((product) => {
    const inventory = product.attributes.inventory as Record<string, unknown> | undefined;
    return inventoryLabels(inventory, keys);
  });
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

function displayTitle(product: StoreProduct): string {
  const inventory = product.attributes.inventory as Record<string, unknown> | undefined;
  const inventoryHighlights: Record<string, string[]> = {
    fortnite: inventoryLabels(inventory, ['featured_skins', 'skin_names', 'skins']),
    steam: inventoryLabels(inventory, ['game_names', 'games']),
    roblox: inventoryLabels(inventory, ['featured_items', 'items', 'featured_fruits', 'fruits']),
    valorant: typeof inventory?.rank === 'string' ? [inventory.rank] : [],
    lol: typeof inventory?.lol_rank === 'string' ? [inventory.lol_rank] : typeof inventory?.rank === 'string' ? [inventory.rank] : [],
  };
  const titleParts = product.generated_title.split(/\s*\|\s*|\s+·\s+/).map((part) => part.trim()).filter((part) => part && !/[\u0400-\u04FF]/.test(part));
  const gameName = product.game === 'lol' ? 'league of legends' : product.game;
  const nonCountHighlight = titleParts.find((part) => part.toLocaleLowerCase('pt-BR') !== gameName && !/^[\d.,]+\s+(?:skins?|itens?|jogos?|picaretas?|emotes?|asas-delta)\b/i.test(part));
  const fallbackHighlight = titleParts.find((part) => part.toLocaleLowerCase('pt-BR') !== gameName);
  return inventoryHighlights[product.game]?.[0] || nonCountHighlight || fallbackHighlight || `Conta ${product.game === 'lol' ? 'League of Legends' : product.game[0].toUpperCase() + product.game.slice(1)}`;
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
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
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);
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
      const demoOnly = STOREFRONT_CATALOG_MODE === 'demo' || catalog.demoOnly;
      setResult(demoOnly ? demoCatalog(page, 'Itens e preços fictícios para demonstrar a navegação. Não são anúncios reais e não podem ser comprados.') : catalog);
    } catch (reason) {
      if (!controller.signal.aborted || timedOut) {
        const detail = timedOut ? 'A consulta do catálogo excedeu 15 segundos.' : reason instanceof Error ? reason.message : 'Erro ao carregar o catálogo.';
        if (STOREFRONT_CATALOG_MODE === 'demo') {
          setResult(demoCatalog(page, 'A API não respondeu. A vitrine continua usando apenas exemplos locais fictícios.'));
          setError(`${detail} Os exemplos abaixo não representam anúncios reais.`);
        } else {
          setError(`${detail} Tente novamente.`);
          setResult(null);
        }
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (catalogRequest.current === controller) {
        catalogRequest.current = null;
        if (!controller.signal.aborted || timedOut) setLoading(false);
      }
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
    const skinNames = inventoryLabels(inventory, ['skin_names', 'skins', 'featured_skins']);
    const steamGames = inventoryLabels(inventory, ['game_names', 'games']);
    const rank = typeof inventory?.lol_rank === 'string' ? inventory.lol_rank : typeof inventory?.rank === 'string' ? inventory.rank : '';
    const level = Number(inventory?.level ?? 0);
    return (!game || product.game === game)
      && (!appliedFilters.minPrice || Number(product.price_brl_cents) >= Number(appliedFilters.minPrice) * 100)
      && (!appliedFilters.maxPrice || Number(product.price_brl_cents) <= Number(appliedFilters.maxPrice) * 100)
      && (!appliedFilters.minDaysOffline || offlineDays >= Number(appliedFilters.minDaysOffline))
      && (!appliedFilters.skinName || (product.game === 'fortnite' && skinNames.some((name) => name.toLocaleLowerCase('pt-BR').includes(appliedFilters.skinName.toLocaleLowerCase('pt-BR')))))
      && (!appliedFilters.steamGame || (product.game === 'steam' && steamGames.some((name) => name.toLocaleLowerCase('pt-BR').includes(appliedFilters.steamGame.toLocaleLowerCase('pt-BR')))))
      && (!appliedFilters.rank || (['valorant', 'lol'].includes(product.game) && rankMatches(rank, appliedFilters.rank)))
      && (!appliedFilters.minLevel || (['valorant', 'lol'].includes(product.game) && level >= Number(appliedFilters.minLevel)));
  });
  const sortedDemoProducts = [...filteredDemoProducts].sort((left, right) => {
    if (sort === 'title_asc') return displayTitle(left).localeCompare(displayTitle(right), 'pt-BR');
    const difference = Number(left.price_brl_cents) - Number(right.price_brl_cents);
    return sort === 'price_desc' ? -difference : difference;
  });
  const visibleProducts = result?.demoOnly ? sortedDemoProducts.slice((page - 1) * DEMO_PAGE_SIZE, page * DEMO_PAGE_SIZE) : result?.items ?? [];
  const selectedDemoProducts = comparisonIds.flatMap((id) => {
    const product = DEMO_PRODUCTS.find((item) => item.id === id);
    return product ? [product] : [];
  });
  const comparisonRows: Array<{ label: string; value: (product: StoreProduct) => string }> = [
    { label: 'Jogo', value: (product) => gameLabel(product.game) },
    { label: 'Rank', value: (product) => { const inventory = product.attributes.inventory as Record<string, unknown> | undefined; return ['lol', 'valorant'].includes(product.game) ? (typeof inventory?.lol_rank === 'string' ? inventory.lol_rank : typeof inventory?.rank === 'string' ? inventory.rank : 'Não informado') : 'Não se aplica'; } },
    { label: 'Nível', value: (product) => { const inventory = product.attributes.inventory as Record<string, unknown> | undefined; return typeof inventory?.level === 'number' ? String(inventory.level) : 'Não informado'; } },
    { label: 'Inatividade', value: (product) => typeof product.attributes.days_offline === 'number' ? `${product.attributes.days_offline} dias` : 'Não informado' },
    { label: 'Campos disponíveis', value: demoComparisonFields },
  ];
  const pages = result?.demoOnly ? Math.max(1, Math.ceil(filteredDemoProducts.length / DEMO_PAGE_SIZE)) : Math.max(1, Math.ceil((result?.total ?? 0) / (result?.pageSize ?? 24)));
  const resultsLabel = result?.demoOnly ? `${filteredDemoProducts.length} exemplos fictícios` : result ? `${result.total} anúncios` : loading ? 'Carregando resultados' : 'Resultados indisponíveis';
  const demoSkinOptions = useMemo(() => demoInventoryOptions('fortnite', ['skin_names', 'skins', 'featured_skins']), []);
  const demoSteamOptions = useMemo(() => demoInventoryOptions('steam', ['game_names', 'games']), []);
  const demoValorantRanks = useMemo(() => [...new Set([...DEMO_VALORANT_RANKS, ...demoInventoryOptions('valorant', ['rank'])])], []);
  const demoLolRanks = useMemo(() => [...new Set([...DEMO_LOL_RANKS, ...demoInventoryOptions('lol', ['rank', 'lol_rank'])])], []);
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
  function toggleDemoComparison(productId: string) {
    if (comparisonIds.includes(productId)) {
      setComparisonIds((current) => current.filter((id) => id !== productId));
      if (comparisonIds.length <= 2) setComparisonOpen(false);
      return;
    }
    setComparisonIds((current) => current.includes(productId) || current.length >= 3 ? current : [...current, productId]);
  }
  function clearComparison() {
    setComparisonIds([]);
    setComparisonOpen(false);
  }
  return <section className="catalog-section shell" id="catalogo" aria-labelledby="catalog-title"><div className="section-heading"><div><p className="eyebrow">{result?.demoOnly ? 'PRÉVIA VISUAL · ITENS FICTÍCIOS' : 'INVENTÁRIO DISPONÍVEL'}</p><h2 id="catalog-title">{result?.demoOnly ? 'Veja como a vitrine funciona.' : 'Escolha pelo que importa.'}</h2></div><p className="section-aside" role="status" aria-live="polite" aria-atomic="true">{result?.demoOnly ? `${filteredDemoProducts.length} exemplos · sem venda` : result ? `${result.total} contas listadas` : 'Preços em reais'}</p></div>
    {result?.catalogMode === 'live_read_only' && <p className="catalog-readonly-note" role="status">Catálogo real sincronizado com o fornecedor. A visualização está ativa; compras e entregas automáticas continuam desativadas.</p>}
    {result?.demoOnly && <div className="demo-catalog-notice" role="note"><strong>Catálogo de demonstração</strong><span>Todos os itens, atributos e valores são fictícios. Não há anúncios reais nem opção de compra nesta prévia.</span></div>}
    <div className="catalog-mobile-toolbar"><button className="catalog-mobile-toggle" type="button" aria-expanded={mobileFiltersOpen} aria-controls="catalog-filter-controls" onClick={() => setMobileFiltersOpen((open) => !open)}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16M7 12h10m-7 6h4" /></svg><span>{mobileFiltersOpen ? 'Ocultar filtros' : 'Filtrar catálogo'}</span>{activeFilterTokens.length > 0 && <span className="catalog-mobile-active-count">{activeFilterTokens.length} ativos</span>}<span className="catalog-mobile-results">{resultsLabel}</span></button></div>
    <div id="catalog-filter-controls" className={`catalog-filter-controls${mobileFiltersOpen ? ' is-open' : ''}`}>
    <div className="filter-row" role="group" aria-label="Filtrar catálogo por jogo">{games.map((item) => <button type="button" key={item.id || 'all'} className={`filter-chip ${game === item.id ? 'is-selected' : ''}`} aria-pressed={game === item.id} onClick={() => { setGame(item.id); setPage(1); setFilters((value) => ({ ...value, skinName: '', steamGame: '', rank: '', minLevel: '' })); setAppliedFilters((value) => ({ ...value, skinName: '', steamGame: '', rank: '', minLevel: '' })); }}>{item.label}</button>)}</div>
    <form className="catalog-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedFilters(filters); setMobileFiltersOpen(false); }}>
      <div className="filter-field"><label htmlFor="min-price">Preço mínimo</label><input id="min-price" type="number" min="0" step="0.01" inputMode="decimal" placeholder="R$ 0,00" value={filters.minPrice} onChange={(event) => setFilters((value) => ({ ...value, minPrice: event.target.value }))} /></div>
      <div className="filter-field"><label htmlFor="max-price">Preço máximo</label><input id="max-price" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Sem limite" value={filters.maxPrice} onChange={(event) => setFilters((value) => ({ ...value, maxPrice: event.target.value }))} /></div>
      <div className="filter-field"><label htmlFor="offline-days">Inatividade</label><select id="offline-days" value={filters.minDaysOffline} onChange={(event) => setFilters((value) => ({ ...value, minDaysOffline: event.target.value }))}><option value="">Qualquer período</option><option value="30">30 dias ou mais</option><option value="60">60 dias ou mais</option><option value="90">90 dias ou mais</option></select></div>
      {game && <div className="demo-specific-filters" role="group" aria-label="Filtros específicos do jogo">
        {game === 'fortnite' && <div className="filter-field"><label htmlFor="skin-name">Personagem ou skin {result?.demoOnly ? 'fictícia' : ''}</label><input id="skin-name" type="search" list={result?.demoOnly ? 'demo-fortnite-skins' : undefined} placeholder="Ex.: Travis Scott" value={filters.skinName} onChange={(event) => setFilters((value) => ({ ...value, skinName: event.target.value }))} /><datalist id="demo-fortnite-skins">{result?.demoOnly && demoSkinOptions.map((name) => <option key={name} value={name} />)}</datalist></div>}
        {game === 'steam' && <div className="filter-field"><label htmlFor="steam-game">Jogo na biblioteca {result?.demoOnly ? 'fictício' : ''}</label><input id="steam-game" type="search" list={result?.demoOnly ? 'demo-steam-games' : undefined} placeholder="Ex.: Portal 2" value={filters.steamGame} onChange={(event) => setFilters((value) => ({ ...value, steamGame: event.target.value }))} /><datalist id="demo-steam-games">{result?.demoOnly && demoSteamOptions.map((name) => <option key={name} value={name} />)}</datalist></div>}
        {(game === 'valorant' || game === 'lol') && <>
          <div className="filter-field"><label htmlFor="account-rank">Rank {result?.demoOnly ? 'fictício' : ''}</label><input id="account-rank" type="search" list={result?.demoOnly ? (game === 'lol' ? 'demo-lol-ranks' : 'demo-valorant-ranks') : undefined} placeholder={game === 'lol' ? 'Ex.: Ouro II' : 'Ex.: Diamante'} value={filters.rank} onChange={(event) => setFilters((value) => ({ ...value, rank: event.target.value }))} /><datalist id="demo-lol-ranks">{result?.demoOnly && demoLolRanks.map((rank) => <option key={rank} value={rank} />)}</datalist><datalist id="demo-valorant-ranks">{result?.demoOnly && demoValorantRanks.map((rank) => <option key={rank} value={rank} />)}</datalist></div>
          <div className="filter-field"><label htmlFor="account-level">Nível mínimo {result?.demoOnly ? 'fictício' : ''}</label><input id="account-level" type="number" min="1" inputMode="numeric" placeholder="Qualquer nível" value={filters.minLevel} onChange={(event) => setFilters((value) => ({ ...value, minLevel: event.target.value }))} /></div>
        </>}
      </div>}
      <div className="filter-field catalog-sort-field"><label htmlFor="catalog-sort">Ordenar por</label><select id="catalog-sort" value={sort} onChange={(event) => { setPage(1); setSort(event.target.value as CatalogSort); }}><option value="price_asc">Menor preço</option><option value="price_desc">Maior preço</option><option value="title_asc">Nome do anúncio (A–Z)</option></select></div>
      <button className="button-outline" type="submit">Aplicar filtros</button>
    </form>
    {activeFilterTokens.length > 0 && <div className="active-filters" role="group" aria-label="Filtros aplicados"><span className="active-filters-label">Filtros ativos</span>{activeFilterTokens.map((token) => <button className="active-filter" key={token.key} type="button" onClick={() => removeFilter(token.key)}><span>{token.label}</span><span>Remover</span></button>)}<button className="active-filters-clear" type="button" onClick={() => { setGame(''); setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setPage(1); }}>Limpar filtros</button></div>}
    </div>
    {result?.demoOnly && selectedDemoProducts.length > 0 && <section className="catalog-comparison-controls" aria-labelledby="comparison-controls-title"><div className="catalog-comparison-heading"><div><p className="eyebrow">COMPARAÇÃO · DADOS FICTÍCIOS</p><h3 id="comparison-controls-title">{selectedDemoProducts.length} de 3 exemplos selecionados</h3></div><div className="catalog-comparison-actions"><button className="button-outline" type="button" disabled={selectedDemoProducts.length < 2} aria-expanded={comparisonOpen} aria-controls="catalog-comparison-table" onClick={() => setComparisonOpen((open) => !open)}>{comparisonOpen ? 'Ocultar comparação' : 'Comparar exemplos'}</button><button className="text-link-button" type="button" onClick={clearComparison}>Limpar seleção</button></div></div><ul className="catalog-comparison-selection">{selectedDemoProducts.map((product, index) => <li key={product.id}><span>Exemplo {index + 1}: {gameLabel(product.game)} · {displayTitle(product)}</span><button className="text-link-button" type="button" onClick={() => toggleDemoComparison(product.id)} aria-label={`Remover exemplo ${index + 1} da comparação`}>Remover</button></li>)}</ul><p className="catalog-comparison-help" role="status" aria-live="polite">{selectedDemoProducts.length < 2 ? 'Selecione pelo menos mais um exemplo para comparar.' : 'A comparação usa somente campos presentes nos exemplos e não representa ofertas disponíveis.'}</p><div id="catalog-comparison-table" className="catalog-comparison-table-wrap" role="region" aria-label="Tabela de comparação dos exemplos" tabIndex={0} hidden={!comparisonOpen || selectedDemoProducts.length < 2}><table className="catalog-comparison-table"><caption>Comparação ilustrativa de exemplos fictícios</caption><thead><tr><th scope="col">Atributo</th>{selectedDemoProducts.map((product, index) => <th scope="col" key={product.id}>Exemplo {index + 1}: {gameLabel(product.game)} · {displayTitle(product)}</th>)}</tr></thead><tbody>{comparisonRows.map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{selectedDemoProducts.map((product) => <td key={product.id}>{row.value(product)}</td>)}</tr>)}</tbody></table></div></section>}
    {error && <div className="state-panel error-state" role="alert"><div><h3>{result?.demoOnly ? 'A prévia segue disponível' : 'Catálogo temporariamente indisponível'}</h3><p>{error}</p></div><button className="button-outline" type="button" onClick={() => void load()}>Tentar novamente</button></div>}
    {loading && !result?.demoOnly && <div className="product-grid" aria-label="Carregando catálogo" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div className="product-skeleton" key={i}><span /><span /><span /></div>)}</div>}
    {!loading && !visibleProducts.length && <div className="state-panel empty-state"><div><h3>Nenhum item corresponde aos filtros</h3><p>Amplie a faixa de preço, reduza a inatividade ou escolha outra categoria.</p></div><button className="button-outline" type="button" onClick={() => { setGame(''); setFilters(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); setPage(1); setSort('price_asc'); }}>Limpar filtros</button></div>}
    {(!loading || result?.demoOnly) && !!visibleProducts.length && <><div className="product-grid">{visibleProducts.map((product, index) => <CatalogProductCard key={product.id} product={product} demo={Boolean(result?.demoOnly)} sequence={(page - 1) * (result?.pageSize ?? 24) + index + 1} returnTo={catalogReturnUrl} compareSelected={comparisonIds.includes(product.id)} compareDisabled={comparisonIds.length >= 3} onToggleCompare={() => toggleDemoComparison(product.id)} />)}</div><nav className="pagination" aria-label="Paginação do catálogo"><button className="button-outline" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span>Página {page} de {pages}</span><button className="button-outline" type="button" disabled={page >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Próxima</button></nav></>}
  </section>;
}

export function CatalogProductCard({ product, demo, sequence, returnTo = '/#catalogo', compareSelected = false, compareDisabled = false, onToggleCompare }: { product: StoreProduct; demo: boolean; sequence?: number; returnTo?: string; compareSelected?: boolean; compareDisabled?: boolean; onToggleCompare?: () => void }) {
  return <article className="product-card">
    <div className="product-badge">{demo ? 'Exemplo fictício' : 'No catálogo'}</div>
    <div className="card-topline"><span>{gameLabel(product.game)}</span>{sequence && <span className="card-sequence">{String(sequence).padStart(2, '0')}</span>}</div>
    <ProductArt product={product} demo={demo} />
    <h3 aria-label={product.generated_title}>{displayTitle(product)}</h3>
    <ProductHighlights attributes={product.attributes} feedbackTotal={product.seller_feedback_total} positivePercentage={product.seller_feedback_positive_percentage} />
    {demo ? <ProductInventoryPreview game={product.game} attributes={product.attributes} /> : <p className={`product-updated${isStaleSync(product.synced_at) ? ' is-stale' : ''}`}>
      {updatedLabel(product.synced_at) ? <><span>{isStaleSync(product.synced_at) ? 'Pode ter mudado' : 'Sincronizado'}</span><time dateTime={product.synced_at ?? undefined}>{updatedLabel(product.synced_at)}</time></> : <span>Data indisponível</span>}
    </p>}
    {demo && <button
      className="button-outline card-compare-button"
      type="button"
      aria-pressed={compareSelected}
      aria-label={`${compareSelected ? 'Remover' : 'Adicionar'} exemplo ${gameLabel(product.game)} · ${displayTitle(product)} ${compareSelected ? 'da' : 'à'} comparação`}
      disabled={!compareSelected && compareDisabled}
      onClick={onToggleCompare}
    >{compareSelected ? 'Remover da comparação' : compareDisabled ? 'Limite de 3 exemplos atingido' : 'Comparar exemplo'}</button>}
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

function demoComparisonFields(product: StoreProduct): string {
  const inventory = product.attributes.inventory as Record<string, unknown> | undefined;
  const definitions: Record<string, Array<{ label: string; keys: string[]; counts?: string[] }>> = {
    fortnite: [
      { label: 'Skins', keys: ['skin_names', 'skins', 'featured_skins'], counts: ['skins_count'] },
      { label: 'Picaretas', keys: ['pickaxe_names', 'pickaxes', 'featured_pickaxes'], counts: ['pickaxes_count'] },
      { label: 'Emotes', keys: ['emote_names', 'dances', 'featured_dances'], counts: ['dances_count'] },
      { label: 'Asas-delta', keys: ['glider_names', 'gliders', 'featured_gliders'], counts: ['gliders_count'] },
    ],
    steam: [{ label: 'Jogos', keys: ['game_names', 'games'], counts: ['games_count'] }],
    roblox: [
      { label: 'Itens', keys: ['featured_items', 'items'], counts: ['items_count'] },
      { label: 'Frutas', keys: ['featured_fruits', 'fruits'], counts: ['fruits_count'] },
      { label: 'Gamepasses', keys: ['gamepasses', 'game_passes', 'gamepass'] },
    ],
    valorant: [
      { label: 'Skins de armas', keys: ['weapon_skins', 'featured_skins'], counts: ['skins_count'] },
      { label: 'Agentes', keys: ['agents', 'featured_agents'] },
      { label: 'Chaveiros', keys: ['buddies', 'featured_buddies'] },
    ],
    lol: [
      { label: 'Skins', keys: ['skins', 'featured_skins'], counts: ['skins_count'] },
      { label: 'Campeões', keys: ['champions', 'featured_champions'] },
    ],
  };
  const available = (definitions[product.game] ?? []).filter(({ keys, counts = [] }) => {
    const hasNamedItems = inventoryLabels(inventory, keys).length > 0;
    const hasCount = counts.some((key) => typeof inventory?.[key] === 'number');
    return hasNamedItems || hasCount;
  }).map(({ label }) => label);
  if (inventory?.rank !== undefined || inventory?.lol_rank !== undefined) available.unshift('Rank');
  if (inventory?.level !== undefined) available.push('Nível');
  if (typeof product.attributes.days_offline === 'number') available.push('Dias offline');
  return [...new Set(available)].join(' · ') || 'Nenhum campo de inventário informado';
}

function ProductInventoryPreview({ game, attributes }: { game: string; attributes: Record<string, unknown> }) {
  const inventory = attributes.inventory as Record<string, unknown> | undefined;
  if (!inventory) return null;
  const definitions: Array<{ title: string; keys: string[] }> = game === 'fortnite' ? [
    { title: 'Personagens e skins', keys: ['skin_names', 'skins', 'featured_skins'] },
    { title: 'Picaretas', keys: ['pickaxe_names', 'pickaxes', 'featured_pickaxes'] },
    { title: 'Emotes', keys: ['emote_names', 'dances', 'featured_dances'] },
    { title: 'Asas-delta', keys: ['glider_names', 'gliders', 'featured_gliders'] },
  ] : game === 'valorant' ? [
    { title: 'Skins de armas', keys: ['weapon_skins', 'featured_skins'] },
    { title: 'Agentes', keys: ['agents', 'featured_agents'] },
    { title: 'Chaveiros', keys: ['buddies', 'featured_buddies'] },
  ] : game === 'lol' ? [
    { title: 'Skins', keys: ['skins', 'featured_skins'] },
    { title: 'Campeões', keys: ['champions', 'featured_champions'] },
  ] : game === 'roblox' ? [
    { title: 'Itens', keys: ['featured_items', 'items'] },
    { title: 'Frutas', keys: ['featured_fruits', 'fruits'] },
    { title: 'Gamepasses', keys: ['gamepasses', 'game_passes', 'gamepass'] },
  ] : game === 'steam' ? [
    { title: 'Jogos na biblioteca', keys: ['game_names', 'games'] },
  ] : [];
  const groups = definitions.map(({ title, keys }) => ({ title, values: inventoryLabels(inventory, keys) })).filter(({ values }) => values.length > 0);
  if (!groups.length) return null;
  return <details className="demo-inventory">
    <summary>Ver destaques do inventário</summary>
    <div className="demo-inventory-groups">{groups.map(({ title, values }) => <section className="demo-inventory-group" key={title}>
      <h4>{title}</h4>
      <ul>{values.slice(0, 3).map((value, index) => <li key={`${title}-${value}-${index}`}>{value}</li>)}{values.length > 3 && <li>+ {values.length - 3} nomes</li>}</ul>
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
