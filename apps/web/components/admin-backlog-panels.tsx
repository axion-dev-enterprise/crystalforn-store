'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type InventoryAvailability = { total: number; visible: number; hidden: number; unavailable: number; needsReview: number; waitingSync: number; lastProductSyncedAt: string | null };
type CatalogItem = {
  id: string;
  provider_item_id: string;
  seller_id: string | null;
  game: string;
  source_title: string | null;
  generated_title: string;
  source_currency: string;
  source_price: string;
  price_brl_cents: string | null;
  status: string;
  synced_at: string;
  hidden: boolean;
  seller_hidden: boolean;
  item_hidden: boolean;
  qualityFlags: string[];
};
type CatalogPage = { items: CatalogItem[]; page: number; pageSize: number; total: number; totalPages: number };
type SyncRun = {
  id: string; started_at: string; finished_at: string | null; pages_read: number; items_seen: number;
  items_upserted: number; status: 'complete' | 'failed' | 'running'; duration_ms: string | null; errorMessage: string | null;
};
type SyncRunPage = { items: SyncRun[]; total: number; totalPages: number };
type AuditEntry = { id: string; actor_email: string; action: string; target_id: string; details: Record<string, unknown>; created_at: string };
type AuditPage = { items: AuditEntry[]; total: number; totalPages: number };
type PricePreview = {
  markupPercent: number; couponPercent: number | null; sampleSize: number;
  items: Array<{ id: string; game: string; title: string; sourceCurrency: string; currentPriceCents: number; costCents: number | null; simulatedPriceCents: number | null; afterCouponCents: number | null }>;
};
type Props = { inventoryAvailability: InventoryAvailability | null; defaultMarkupPercent: number; onRefreshAvailability: () => void };

const gameName: Record<string, string> = { fortnite: 'Fortnite', valorant: 'Valorant', lol: 'League of Legends', roblox: 'Roblox', steam: 'Steam', other: 'Outro' };
const qualityName: Record<string, string> = {
  source_title_cyrillic: 'Título original em cirílico', generic_title: 'Título genérico',
  missing_inventory: 'Inventário ausente', price_unavailable: 'Preço indisponível', stale: 'Sem atualização há mais de 24 h',
};
const actionName: Record<string, string> = {
  store_settings_updated: 'Configurações atualizadas', coupon_saved: 'Cupom salvo', coupon_active_changed: 'Estado do cupom alterado',
  seller_visibility_changed: 'Visibilidade do vendedor alterada', catalog_item_visibility_changed: 'Visibilidade do anúncio alterada',
  cancellation_request_reviewed: 'Solicitação analisada',
};
const formatMoney = (cents: number | null) => cents === null ? 'Sem cotação' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : 'Em andamento';
function relativeAge(value: string | null): string {
  if (!value) return 'Nenhum anúncio sincronizado';
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (!Number.isFinite(elapsed)) return 'Data indisponível';
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Atualizado agora';
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  return `Há ${Math.floor(hours / 24)} dias`;
}

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || fallback);
  return body as T;
}

export function AdminBacklogPanels({ inventoryAvailability, defaultMarkupPercent, onRefreshAvailability }: Props) {
  const [catalog, setCatalog] = useState<CatalogPage | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogPage, setCatalogPage] = useState(1);
  const [search, setSearch] = useState('');
  const [game, setGame] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [status, setStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [visibility, setVisibilityFilter] = useState('all');
  const [quality, setQuality] = useState('all');
  const [freshness, setFreshness] = useState('all');
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [previewItemId, setPreviewItemId] = useState('');
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [syncPage, setSyncPage] = useState(1);
  const [syncStatus, setSyncStatus] = useState('all');
  const [syncSearch, setSyncSearch] = useState('');
  const [syncRunsPage, setSyncRunsPage] = useState<SyncRunPage | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditResultPage, setAuditResultPage] = useState<AuditPage | null>(null);
  const [markupPercent, setMarkupPercent] = useState(defaultMarkupPercent);
  const [couponPercent, setCouponPercent] = useState(0);
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busyTarget, setBusyTarget] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const catalogParams = useMemo(() => {
    const params = new URLSearchParams({ page: String(catalogPage), pageSize: '12', visibility, quality });
    if (search.trim()) params.set('search', search.trim());
    if (game) params.set('game', game);
    if (sellerId.trim()) params.set('sellerId', sellerId.trim());
    if (status) params.set('status', status);
    if (freshness) params.set('freshness', freshness);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    return params;
  }, [catalogPage, freshness, game, maxPrice, minPrice, quality, search, sellerId, status, visibility]);

  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const response = await fetch(`/api/v1/admin/catalog?${catalogParams}`, { credentials: 'include', cache: 'no-store', signal });
      setCatalog(await readResponse<CatalogPage>(response, 'Não foi possível carregar os anúncios.'));
    } catch (reason) {
      if (signal?.aborted) return;
      setCatalogError(reason instanceof Error ? reason.message : 'Falha ao carregar anúncios.');
    } finally { if (!signal?.aborted) setCatalogLoading(false); }
  }, [catalogParams]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadCatalog(controller.signal), 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [catalogRefresh, loadCatalog]);

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    setHistoryError('');
    try {
      const syncParams = new URLSearchParams({ page: String(syncPage), pageSize: '8', status: syncStatus });
      if (syncSearch.trim()) syncParams.set('search', syncSearch.trim());
      const auditParams = new URLSearchParams({ page: String(auditPage), pageSize: '8' });
      if (auditSearch.trim()) auditParams.set('search', auditSearch.trim());
      if (auditAction) auditParams.set('action', auditAction);
      const [syncResponse, auditResponse] = await Promise.all([
        fetch(`/api/v1/admin/catalog/sync-runs?${syncParams}`, { credentials: 'include', cache: 'no-store', signal }),
        fetch(`/api/v1/admin/audit?${auditParams}`, { credentials: 'include', cache: 'no-store', signal }),
      ]);
      const [syncBody, auditBody] = await Promise.all([
        readResponse<SyncRunPage>(syncResponse, 'Não foi possível carregar o histórico de sincronização.'),
        readResponse<AuditPage>(auditResponse, 'Não foi possível carregar a auditoria.'),
      ]);
      if (signal?.aborted) return;
      setSyncRunsPage(syncBody);
      setSyncRuns(syncBody.items);
      setAuditResultPage(auditBody);
      setAudit(auditBody.items);
    } catch (reason) { if (!signal?.aborted) setHistoryError(reason instanceof Error ? reason.message : 'Falha ao carregar os históricos.'); }
  }, [auditAction, auditPage, auditSearch, syncPage, syncSearch, syncStatus]);

  useEffect(() => {
    const controller = new AbortController();
    void loadHistory(controller.signal);
    return () => controller.abort();
  }, [historyRefresh, loadHistory]);

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const params = new URLSearchParams({ markupPercent: String(markupPercent), sampleSize: '10' });
      if (couponPercent) params.set('couponPercent', String(couponPercent));
      const response = await fetch(`/api/v1/admin/catalog/price-preview?${params}`, { credentials: 'include', cache: 'no-store' });
      setPreview(await readResponse<PricePreview>(response, 'Não foi possível gerar a simulação.'));
    } catch (reason) { setPreviewError(reason instanceof Error ? reason.message : 'Falha ao simular os preços.'); }
    finally { setPreviewLoading(false); }
  }, [couponPercent, markupPercent]);

  useEffect(() => { void loadPreview(); }, [loadPreview]);

  async function setVisibility(kind: 'items' | 'sellers', id: string, hidden: boolean) {
    const target = `${kind}:${id}`;
    setBusyTarget(target);
    setActionMessage('');
    try {
      const route = kind === 'items' ? `/api/v1/admin/catalog/items/${encodeURIComponent(id)}/visibility` : `/api/v1/admin/catalog/sellers/${encodeURIComponent(id)}/visibility`;
      const response = await fetch(route, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden }),
      });
      await readResponse<unknown>(response, 'Não foi possível atualizar a visibilidade.');
      setActionMessage(hidden ? 'Item ocultado do catálogo público.' : 'Visibilidade atualizada.');
      setCatalogRefresh((value) => value + 1);
      setHistoryRefresh((value) => value + 1);
    } catch (reason) { setActionMessage(reason instanceof Error ? reason.message : 'Falha ao atualizar a visibilidade.'); }
    finally { setBusyTarget(''); }
  }

  return <>
    <section className="admin-card admin-availability" id="disponibilidade-admin" aria-labelledby="availability-heading">
      <div className="admin-subheading"><div><p className="eyebrow">ESTOQUE LOCAL</p><h2 id="availability-heading">Disponibilidade do catálogo</h2></div><button className="button-outline" type="button" onClick={onRefreshAvailability}>Atualizar dados</button></div>
      {inventoryAvailability ? <dl className="availability-grid">
        <div><dt>Total importado</dt><dd>{inventoryAvailability.total.toLocaleString('pt-BR')}</dd></div>
        <div><dt>Visível na vitrine</dt><dd>{inventoryAvailability.visible.toLocaleString('pt-BR')}</dd></div>
        <div><dt>Oculto por regra</dt><dd>{inventoryAvailability.hidden.toLocaleString('pt-BR')}</dd></div>
        <div><dt>Indisponível ou sem preço</dt><dd>{inventoryAvailability.unavailable.toLocaleString('pt-BR')}</dd></div>
        <div><dt>Precisa de revisão</dt><dd>{inventoryAvailability.needsReview.toLocaleString('pt-BR')}</dd></div>
        <div><dt>Aguardando sincronização</dt><dd>{inventoryAvailability.waitingSync.toLocaleString('pt-BR')}</dd></div>
        <div><dt>Último anúncio atualizado</dt><dd title={dateTime(inventoryAvailability.lastProductSyncedAt)}>{relativeAge(inventoryAvailability.lastProductSyncedAt)}</dd></div>
      </dl> : <p className="empty-inline" role="status">As contagens do estoque ainda estão carregando.</p>}
    </section>

    <section className="admin-card admin-sync-history" id="historico-sincronizacao-admin" aria-labelledby="sync-history-heading">
      <div className="admin-subheading"><div><p className="eyebrow">OPERAÇÃO</p><h2 id="sync-history-heading">Histórico de sincronização</h2></div><button className="button-outline" type="button" onClick={() => setHistoryRefresh((value) => value + 1)}>Atualizar histórico</button></div>
      <div className="admin-history-controls">
        <label htmlFor="sync-history-search">Buscar código de erro<input id="sync-history-search" type="search" value={syncSearch} onChange={(event) => { setSyncSearch(event.target.value); setSyncPage(1); }} placeholder="Ex.: provider_rate_limited" /></label>
        <label htmlFor="sync-history-status">Estado<select id="sync-history-status" value={syncStatus} onChange={(event) => { setSyncStatus(event.target.value); setSyncPage(1); }}><option value="all">Todos</option><option value="complete">Concluídos</option><option value="running">Em andamento</option><option value="failed">Com falha</option></select></label>
      </div>
      {historyError ? <div className="empty-inline" role="alert"><p>{historyError}</p><button className="text-link-button" type="button" onClick={() => setHistoryRefresh((value) => value + 1)}>Tentar novamente</button></div> : syncRuns.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Início</th><th scope="col">Estado</th><th scope="col">Páginas</th><th scope="col">Analisados</th><th scope="col">Importados</th><th scope="col">Duração</th></tr></thead><tbody>{syncRuns.map((run) => <tr key={run.id}><td>{dateTime(run.started_at)}</td><td><span className={`sync-state sync-state-${run.status}`}>{run.status === 'complete' ? 'Concluído' : run.status === 'running' ? 'Em andamento' : 'Incompleto'}</span>{run.errorMessage && <small className="admin-table-note">{run.errorMessage}</small>}</td><td>{run.pages_read}</td><td>{run.items_seen.toLocaleString('pt-BR')}</td><td>{run.items_upserted.toLocaleString('pt-BR')}</td><td>{run.duration_ms ? `${(Number(run.duration_ms) / 1000).toLocaleString('pt-BR')} s` : '—'}</td></tr>)}</tbody></table></div> : <div className="empty-inline"><p>{syncRunsPage?.total ? 'Nenhum ciclo corresponde à busca e ao estado selecionados.' : 'Ainda não há ciclos registrados.'}</p>{(syncSearch || syncStatus !== 'all') && <button className="text-link-button" type="button" onClick={() => { setSyncSearch(''); setSyncStatus('all'); setSyncPage(1); }}>Limpar filtros</button>}</div>}
      {syncRunsPage && syncRunsPage.totalPages > 1 && <div className="pagination" aria-label="Paginação do histórico de sincronização"><button className="button-outline" type="button" onClick={() => setSyncPage((value) => Math.max(1, value - 1))} disabled={syncPage <= 1}>Anterior</button><span>Página {syncPage} de {syncRunsPage.totalPages} · {syncRunsPage.total} ciclos</span><button className="button-outline" type="button" onClick={() => setSyncPage((value) => Math.min(syncRunsPage.totalPages, value + 1))} disabled={syncPage >= syncRunsPage.totalPages}>Próxima</button></div>}
    </section>

    <section className="admin-card admin-catalog-manager" id="catalogo-itens-admin" aria-labelledby="admin-catalog-heading">
      <div className="admin-subheading"><div><p className="eyebrow">BUSCA E REVISÃO</p><h2 id="admin-catalog-heading">Anúncios do catálogo</h2></div><button className="button-outline" type="button" onClick={() => setCatalogRefresh((value) => value + 1)} disabled={catalogLoading}>Atualizar lista</button></div>
      <div className="catalog-admin-filters">
        <label htmlFor="admin-catalog-search">Buscar título ou ID<input id="admin-catalog-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setCatalogPage(1); }} placeholder="Título, ID local ou ID do fornecedor" /></label>
        <label htmlFor="admin-catalog-game">Jogo<select id="admin-catalog-game" value={game} onChange={(event) => { setGame(event.target.value); setCatalogPage(1); }}><option value="">Todos os jogos</option>{Object.entries(gameName).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label htmlFor="admin-catalog-seller">Seller ID<input id="admin-catalog-seller" inputMode="numeric" value={sellerId} onChange={(event) => { setSellerId(event.target.value.replace(/\D/g, '').slice(0, 40)); setCatalogPage(1); }} placeholder="ID exato" /></label>
        <label htmlFor="admin-catalog-status">Estado<select id="admin-catalog-status" value={status} onChange={(event) => { setStatus(event.target.value); setCatalogPage(1); }}><option value="">Todos</option><option value="available">Disponível</option><option value="invalid">Inválido</option><option value="banned">Banido</option><option value="sold">Vendido</option><option value="hidden">Oculto</option></select></label>
        <label htmlFor="admin-catalog-visibility">Visibilidade<select id="admin-catalog-visibility" value={visibility} onChange={(event) => { setVisibilityFilter(event.target.value); setCatalogPage(1); }}><option value="all">Todas</option><option value="visible">Visíveis</option><option value="hidden">Ocultos</option></select></label>
        <label htmlFor="admin-catalog-quality">Qualidade dos dados<select id="admin-catalog-quality" value={quality} onChange={(event) => { setQuality(event.target.value); setCatalogPage(1); }}><option value="all">Todos</option><option value="needs_review">Precisa de revisão</option></select></label>
        <label htmlFor="admin-catalog-freshness">Atualização<select id="admin-catalog-freshness" value={freshness} onChange={(event) => { setFreshness(event.target.value); setCatalogPage(1); }}><option value="all">Qualquer idade</option><option value="stale">Desatualizados (mais de 24 h)</option><option value="fresh">Atualizados nas últimas 24 h</option></select></label>
        <label htmlFor="admin-catalog-min-price">Preço mínimo (R$)<input id="admin-catalog-min-price" type="number" min="0" step="0.01" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setCatalogPage(1); }} /></label>
        <label htmlFor="admin-catalog-max-price">Preço máximo (R$)<input id="admin-catalog-max-price" type="number" min="0" step="0.01" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setCatalogPage(1); }} /></label>
      </div>
      {actionMessage && <p className="inline-message" role="status">{actionMessage}</p>}
      {catalogError ? <div className="empty-inline" role="alert"><p>{catalogError}</p><button className="text-link-button" type="button" onClick={() => setCatalogRefresh((value) => value + 1)}>Tentar novamente</button></div> : catalogLoading && !catalog ? <div className="admin-skeleton" role="status" aria-label="Carregando anúncios" aria-busy="true"><span /><span /></div> : catalog?.items.length ? <>
        <p className="fine-print">{catalog.total.toLocaleString('pt-BR')} anúncio(s) correspondem aos filtros. Os controles de visibilidade afetam imediatamente o catálogo público.</p>
        <ul className="admin-catalog-list">{catalog.items.map((item) => <li key={item.id}>
          <div className="admin-catalog-summary"><p className="eyebrow">{gameName[item.game] ?? item.game} · {item.provider_item_id}</p><h3>{item.generated_title}</h3><p className="admin-source-title">Título original: {item.source_title || 'Não informado'}</p><dl><div><dt>Seller ID</dt><dd>{item.seller_id || 'Não informado'}</dd></div><div><dt>Estado</dt><dd>{item.status}</dd></div><div><dt>Preço atual</dt><dd>{formatMoney(item.price_brl_cents ? Number(item.price_brl_cents) : null)}</dd></div><div><dt>Última sincronização</dt><dd>{dateTime(item.synced_at)}</dd></div></dl>
            <div className="quality-flags" aria-label="Qualidade do anúncio">{item.qualityFlags.length ? item.qualityFlags.map((flag) => <span key={flag}>{qualityName[flag] ?? flag}</span>) : <span className="quality-good">Dados básicos presentes</span>}</div>
            <div className="visibility-flags">{item.seller_hidden && <span>Vendedor oculto</span>}{item.item_hidden && <span>Anúncio oculto</span>}{!item.hidden && <span className="quality-good">Visível ao público</span>}</div>
          </div>
          <div className="admin-catalog-actions">
            <button className="button-outline" type="button" aria-expanded={previewItemId === item.id} aria-controls={`listing-preview-${item.id}`} onClick={() => setPreviewItemId((current) => current === item.id ? '' : item.id)}>{previewItemId === item.id ? 'Fechar prévia' : 'Prévia na loja'}</button>
            {item.seller_id && <button className="button-outline" type="button" disabled={busyTarget === `sellers:${item.seller_id}`} onClick={() => void setVisibility('sellers', item.seller_id!, !item.seller_hidden)}>{item.seller_hidden ? 'Reexibir vendedor' : 'Ocultar vendedor'}</button>}
            <button className="button-outline" type="button" disabled={busyTarget === `items:${item.id}`} onClick={() => void setVisibility('items', item.id, !item.item_hidden)}>{item.item_hidden ? 'Reexibir anúncio' : 'Ocultar anúncio'}</button>
          </div>
          {previewItemId === item.id && <article className="admin-listing-preview" id={`listing-preview-${item.id}`} aria-label={`Prévia pública de ${item.generated_title}`}><p className="eyebrow">PRÉVIA DA VITRINE PÚBLICA</p><p>{gameName[item.game] ?? item.game}</p><h4>{item.generated_title}</h4><strong>{formatMoney(item.price_brl_cents ? Number(item.price_brl_cents) : null)}</strong><p className="fine-print">O anúncio público exibe os atributos disponíveis no catálogo. Credenciais de acesso não são incluídas nesta prévia.</p></article>}
        </li>)}</ul>
        <div className="pagination" aria-label="Paginação do catálogo administrativo"><button className="button-outline" type="button" onClick={() => setCatalogPage((page) => Math.max(1, page - 1))} disabled={catalogPage <= 1 || catalogLoading}>Anterior</button><span>Página {catalog.page} de {catalog.totalPages}</span><button className="button-outline" type="button" onClick={() => setCatalogPage((page) => Math.min(catalog.totalPages, page + 1))} disabled={catalogLoading || catalogPage >= catalog.totalPages}>Próxima</button></div>
      </> : <div className="empty-inline"><p>{catalog?.total ? 'Nenhum anúncio nesta página.' : 'Nenhum anúncio corresponde aos filtros.'}</p>{(search || game || sellerId || status || minPrice || maxPrice || visibility !== 'all' || quality !== 'all' || freshness !== 'all') && <button className="text-link-button" type="button" onClick={() => { setSearch(''); setGame(''); setSellerId(''); setStatus(''); setMinPrice(''); setMaxPrice(''); setVisibilityFilter('all'); setQuality('all'); setFreshness('all'); setCatalogPage(1); }}>Limpar filtros</button>}</div>}
    </section>

    <section className="admin-card admin-price-preview" id="simulador-precos-admin" aria-labelledby="price-preview-heading">
      <div><p className="eyebrow">SIMULAÇÃO · SEM ALTERAR O CATÁLOGO</p><h2 id="price-preview-heading">Simulador de preços e cupons</h2><p className="fine-print">Compara o custo convertido, a margem escolhida e o preço após desconto em até dez anúncios visíveis.</p></div>
      <div className="price-preview-controls">
        <label htmlFor="preview-markup">Margem<select id="preview-markup" value={markupPercent} onChange={(event) => setMarkupPercent(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => 50 + index).map((value) => <option key={value} value={value}>{value}%</option>)}</select></label>
        <label htmlFor="preview-coupon">Cupom<select id="preview-coupon" value={couponPercent} onChange={(event) => setCouponPercent(Number(event.target.value))}><option value="0">Sem cupom</option>{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}%</option>)}</select></label>
        <button className="button-outline" type="button" onClick={() => void loadPreview()} disabled={previewLoading}>Simular</button>
      </div>
      {previewError ? <div className="empty-inline" role="alert"><p>{previewError}</p><button className="text-link-button" type="button" onClick={() => void loadPreview()}>Tentar novamente</button></div> : previewLoading && !preview ? <p className="empty-inline" role="status">Calculando a amostra de preços.</p> : preview?.items.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th scope="col">Anúncio</th><th scope="col">Custo convertido</th><th scope="col">Preço atual</th><th scope="col">Preço simulado</th><th scope="col">Após cupom</th></tr></thead><tbody>{preview.items.map((item) => <tr key={item.id}><td><strong>{gameName[item.game] ?? item.game}</strong><small className="admin-table-note">{item.title}</small></td><td>{formatMoney(item.costCents)}</td><td>{formatMoney(item.currentPriceCents)}</td><td>{formatMoney(item.simulatedPriceCents)}</td><td>{formatMoney(item.afterCouponCents)}</td></tr>)}</tbody></table></div> : <p className="empty-inline">Não há anúncios disponíveis para simular. Configure as cotações necessárias e tente novamente.</p>}
    </section>

    <section className="admin-card admin-audit" id="auditoria-admin" aria-labelledby="audit-heading">
      <div className="admin-subheading"><div><p className="eyebrow">RASTREABILIDADE</p><h2 id="audit-heading">Auditoria administrativa</h2></div><button className="button-outline" type="button" onClick={() => setHistoryRefresh((value) => value + 1)}>Atualizar auditoria</button></div>
      <div className="admin-history-controls">
        <label htmlFor="audit-search">Buscar pessoa, ação ou alvo<input id="audit-search" type="search" value={auditSearch} onChange={(event) => { setAuditSearch(event.target.value); setAuditPage(1); }} placeholder="E-mail, anúncio, vendedor…" /></label>
        <label htmlFor="audit-action">Tipo de alteração<select id="audit-action" value={auditAction} onChange={(event) => { setAuditAction(event.target.value); setAuditPage(1); }}><option value="">Todas as ações</option>{Object.entries(actionName).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      {historyError ? <div className="empty-inline" role="alert"><p>{historyError}</p><button className="text-link-button" type="button" onClick={() => setHistoryRefresh((value) => value + 1)}>Tentar novamente</button></div> : audit.length ? <ul className="admin-audit-list">{audit.map((entry) => <li key={entry.id}><div><strong>{actionName[entry.action] ?? entry.action}</strong><span>{entry.actor_email} · {dateTime(entry.created_at)}</span><span>Alvo: {entry.target_id}</span></div><pre>{JSON.stringify(entry.details ?? {}, null, 2)}</pre></li>)}</ul> : <div className="empty-inline"><p>{auditResultPage?.total ? 'Nenhuma alteração corresponde à busca e ao tipo selecionados.' : 'Ainda não há alterações administrativas registradas.'}</p>{(auditSearch || auditAction) && <button className="text-link-button" type="button" onClick={() => { setAuditSearch(''); setAuditAction(''); setAuditPage(1); }}>Limpar filtros</button>}</div>}
      {auditResultPage && auditResultPage.totalPages > 1 && <div className="pagination" aria-label="Paginação da auditoria"><button className="button-outline" type="button" onClick={() => setAuditPage((value) => Math.max(1, value - 1))} disabled={auditPage <= 1}>Anterior</button><span>Página {auditPage} de {auditResultPage.totalPages} · {auditResultPage.total} registros</span><button className="button-outline" type="button" onClick={() => setAuditPage((value) => Math.min(auditResultPage.totalPages, value + 1))} disabled={auditPage >= auditResultPage.totalPages}>Próxima</button></div>}
    </section>
  </>;
}
