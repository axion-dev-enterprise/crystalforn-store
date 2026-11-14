'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminBacklogPanels } from './admin-backlog-panels';

type Settings = { markupPercent: number; usdBrlRate: number | null; rubBrlRate: number | null; blockedSellerIds: string[] };
type AdminOrder = { id: string; product_title: string; status: string; total_cents: string; created_at: string; fulfillment_status?: string | null; fulfillment_error?: string | null; payment_status?: string | null };
type AdminOrderPage = { items: AdminOrder[]; page: number; pageSize: number; total: number; totalPages: number };
type CancellationRequest = { order_id: string; customer_message: string; status: 'open' | 'under_review' | 'resolved' | 'declined'; admin_response: string | null; created_at: string; updated_at: string; product_title: string; total_cents: string; payment_method: string; order_status: string };
type Coupon = { code: string; discount_percent: number; active: boolean; redemption_count: number; max_redemptions: number | null };
type Dashboard = {
  orders: Array<{ status: string; count: string; revenue_cents: string }>;
  currency: string;
  catalogSync: null | { status: 'complete' | 'failed' | 'running'; startedAt: string; finishedAt: string | null; pagesRead: number; itemsSeen: number; itemsUpserted: number; itemsDiscarded: number; itemsDiscardedReasons: Record<string, number>; durationMs: number | null; lastSuccessAt: string | null; errorMessage: string | null };
  inventoryAvailability: { total: number; visible: number; hidden: number; unavailable: number; needsReview: number; waitingSync: number; lastProductSyncedAt: string | null };
};
type ReleaseStatus = { catalogMode: 'demo' | 'live_read_only'; catalogSyncEnabled: boolean; demoOnly: boolean; marketplaceEnabled: boolean };
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const orderStatus: Record<string, string> = { pending_payment: 'Aguardando pagamento', paid: 'Pago', delivery_required: 'Entrega pendente', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Valor devolvido à carteira', review: 'Em revisão' };
const fulfillmentStatus: Record<string, string> = { queued: 'Na fila do fornecedor', processing: 'Compra em andamento', completed: 'Credenciais disponíveis', review: 'Revisão manual necessária', refunded: 'Saldo devolvido ao cliente' };
const fulfillmentError: Record<string, string> = { provider_unreachable: 'Fornecedor sem resposta', invalid_provider_response: 'Resposta inválida do fornecedor', retry_request_exhausted: 'Tentativas do fornecedor esgotadas', provider_credentials_missing: 'Credenciais não retornadas', delivery_persistence_failed: 'Falha ao guardar credenciais', worker_interrupted: 'Processamento interrompido', supplier_price_invalid: 'Preço ou moeda do fornecedor inválidos', item_unavailable_wallet_refund: 'Item vendido; valor devolvido à carteira', wallet_refund_failed: 'Falha ao devolver saldo; exige revisão manual' };
const paymentStatus: Record<string, string> = { creating: 'Criando cobrança', pending: 'Pagamento pendente', approved: 'Pagamento confirmado', rejected: 'Pagamento recusado', cancelled: 'Pagamento cancelado', refunded: 'Pagamento estornado', review: 'Pagamento em revisão' };
const syncDiscardReason: Record<string, string> = { invalid_shape: 'Formato inválido', invalid_identifier: 'Identificador inválido', ineligible_origin: 'Origem não elegível', invalid_or_incomplete_data: 'Dados incompletos', unsupported_game: 'Jogo não suportado', duplicate_item_id: 'Anúncio duplicado' };

export function AdminPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [orderPageInfo, setOrderPageInfo] = useState<AdminOrderPage | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [releaseStatus, setReleaseStatus] = useState<ReleaseStatus | null>(null);
  const [couponFilter, setCouponFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [requestFilter, setRequestFilter] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncRefreshError, setSyncRefreshError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const identity = await fetch('/api/v1/auth/me', { credentials: 'include' });
      if (!identity.ok) { location.assign('/entrar'); return; }
      const me = await identity.json(); if (me.role !== 'admin') { setIsAdmin(false); return; } setIsAdmin(true);
      const releaseRequest = fetch('/api/v1/legal/terms/status', { cache: 'no-store' }).then(async (response) => response.ok ? await response.json() as ReleaseStatus : null).catch(() => null);
      const [s, c, d, r, release] = await Promise.all([fetch('/api/v1/admin/settings', { credentials: 'include' }), fetch('/api/v1/admin/coupons', { credentials: 'include' }), fetch('/api/v1/admin/dashboard', { credentials: 'include' }), fetch('/api/v1/admin/cancellation-requests', { credentials: 'include' }), releaseRequest]);
      if (!s.ok || !c.ok || !d.ok || !r.ok) throw new Error('Não foi possível carregar os dados administrativos.');
      setSettings(await s.json() as Settings); setCoupons(await c.json() as Coupon[]); setDashboard(await d.json() as Dashboard); setCancellationRequests(await r.json() as CancellationRequest[]);
      setReleaseStatus(release);
    } catch (reason) { setIsAdmin(false); setMessage(reason instanceof Error ? reason.message : 'Erro ao carregar painel.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const refreshDashboard = useCallback(async (signal?: AbortSignal) => {
    try {
      const releaseRequest = fetch('/api/v1/legal/terms/status', { cache: 'no-store', signal }).then(async (response) => response.ok ? await response.json() as ReleaseStatus : null).catch(() => null);
      const [response, release] = await Promise.all([fetch('/api/v1/admin/dashboard', { credentials: 'include', cache: 'no-store', signal }), releaseRequest]);
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Não foi possível atualizar a sincronização.');
      setDashboard(body as Dashboard);
      setReleaseStatus(release);
      setSyncRefreshError('');
    } catch (reason) {
      if (signal?.aborted) return;
      setSyncRefreshError(reason instanceof Error ? reason.message : 'Falha ao atualizar a sincronização.');
    }
  }, []);
  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshDashboard(controller.signal);
    };
    const timer = window.setInterval(refreshWhenVisible, 30_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      controller.abort();
    };
  }, [isAdmin, refreshDashboard]);
  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setOrdersLoading(true); setOrdersError('');
      const params = new URLSearchParams({ page: String(orderPage), pageSize: '20' });
      if (orderFilter.trim()) params.set('search', orderFilter.trim());
      try {
        const response = await fetch(`/api/v1/admin/orders?${params}`, { credentials: 'include', signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Não foi possível carregar o histórico de pedidos.');
        const result = body as AdminOrderPage;
        setOrders(result.items); setOrderPageInfo(result);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setOrdersError(reason instanceof Error ? reason.message : 'Falha ao carregar pedidos.');
      } finally { if (!controller.signal.aborted) setOrdersLoading(false); }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [isAdmin, orderPage, orderFilter, ordersRefresh]);
  const filteredCoupons = coupons.filter((coupon) => `${coupon.code} ${coupon.discount_percent}% ${coupon.active ? 'ativo' : 'inativo'}`.toLocaleLowerCase('pt-BR').includes(couponFilter.toLocaleLowerCase('pt-BR')));
  const filteredRequests = cancellationRequests.filter((request) => `${request.product_title} ${request.order_id} ${request.customer_message} ${request.admin_response ?? ''} ${request.status}`.toLocaleLowerCase('pt-BR').includes(requestFilter.toLocaleLowerCase('pt-BR')));
  const totalOrders = dashboard?.orders.reduce((total, row) => total + Number(row.count || 0), 0) ?? 0;
  const attentionOrders = orders.filter((order) => ['pending_payment', 'paid', 'delivery_required', 'review'].includes(order.status)).length;
  const openRequests = cancellationRequests.filter((request) => ['open', 'under_review'].includes(request.status)).length;
  const activeCoupons = coupons.filter((coupon) => coupon.active).length;
  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); const data = new FormData(event.currentTarget);
    const payload = { markupPercent: Number(data.get('markupPercent')), usdBrlRate: data.get('usdBrlRate') ? Number(data.get('usdBrlRate')) : undefined, rubBrlRate: data.get('rubBrlRate') ? Number(data.get('rubBrlRate')) : undefined, blockedSellerIds: String(data.get('blockedSellerIds') ?? '').split(/[\s,;]+/).filter(Boolean) };
    try { const r = await fetch('/api/v1/admin/settings', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const body = await r.json(); if (!r.ok) throw new Error(body.message || 'Falha ao salvar.'); setSettings(body); setMessage('Configurações salvas.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Falha ao salvar.'); } finally { setBusy(false); }
  }
  async function createCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setBusy(true); setMessage(''); const data = new FormData(form);
    try { const r = await fetch('/api/v1/admin/coupons', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: data.get('code'), discountPercent: Number(data.get('discountPercent')), maxRedemptions: data.get('maxRedemptions') ? Number(data.get('maxRedemptions')) : undefined }) }); const body = await r.json(); if (!r.ok) throw new Error(body.message || 'Falha ao salvar cupom.'); form.reset(); setMessage('Cupom salvo.'); await load(); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Falha ao salvar cupom.'); } finally { setBusy(false); }
  }
  async function saveDelivery(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!releaseStatus?.marketplaceEnabled) { setMessage('A entrega de credenciais está desativada enquanto o comércio não estiver liberado.'); return; }
    const form = event.currentTarget; setBusy(true); const data = new FormData(form);
    try { const r = await fetch(`/api/v1/admin/orders/${id}/delivery`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credentials: data.get('credentials') }) }); const body = await r.json(); if (!r.ok) throw new Error(body.message || 'Falha ao guardar entrega.'); setMessage('Credenciais cifradas e associadas ao pedido.'); form.reset(); setOrdersRefresh((value) => value + 1); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Falha ao guardar entrega.'); } finally { setBusy(false); }
  }
  async function reviewCancellationRequest(event: React.FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault(); setBusy(true); setMessage(''); const data = new FormData(event.currentTarget);
    try {
      const r = await fetch(`/api/v1/admin/cancellation-requests/${orderId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: data.get('status'), adminResponse: data.get('adminResponse') }) });
      const body = await r.json(); if (!r.ok) throw new Error(body.message || 'Falha ao atualizar a solicitação.');
      setCancellationRequests((current) => current.map((request) => request.order_id === orderId ? { ...request, status: body.status, admin_response: body.admin_response, updated_at: body.updated_at } : request));
      setMessage('Análise da solicitação atualizada. Confirme qualquer restituição pelo fluxo financeiro apropriado.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Falha ao atualizar a solicitação.'); }
    finally { setBusy(false); }
  }
  async function setCouponActive(code: string, active: boolean) {
    setBusy(true); setMessage('');
    try { const r = await fetch(`/api/v1/admin/coupons/${encodeURIComponent(code)}/active`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) }); const body = await r.json(); if (!r.ok) throw new Error(body.message || 'Falha ao atualizar cupom.'); setMessage(`Cupom ${code} ${active ? 'ativado' : 'desativado'}.`); await load(); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Falha ao atualizar cupom.'); } finally { setBusy(false); }
  }
  if (loading) return <section className="shell page-shell"><div className="admin-skeleton" role="status" aria-label={isAdmin ? 'Carregando dados administrativos' : 'Verificando acesso administrativo'} aria-busy="true"><span /><span /><span /></div></section>;
  if (!isAdmin) return <section className="shell page-shell"><div className="state-panel error-state" role={message ? 'alert' : 'status'}><div><p className="eyebrow">PAINEL ADMINISTRATIVO</p><h1>{message ? 'Não foi possível abrir o painel.' : 'Acesso restrito.'}</h1><p>{message || 'Entre com um usuário provisionado como administrador.'}</p></div><button className="button-outline" type="button" onClick={() => void load()}>Tentar novamente</button></div></section>;
  return <section className="shell page-shell admin-page"><div className="section-heading"><div><p className="eyebrow">CRYSTALFORN · OPERAÇÃO</p><h1>Central da loja.</h1></div><button className="button-outline" type="button" onClick={() => void load()} disabled={busy}>Atualizar painel</button></div>{message && <p className="inline-message" role="status">{message}</p>}
    <nav className="admin-nav" aria-label="Seções da administração"><a href="#resumo">Visão geral</a><a href="#sincronizacao-admin">Sincronização</a><a href="#historico-sincronizacao-admin">Ciclos</a><a href="#catalogo-itens-admin">Anúncios</a><a href="#simulador-precos-admin">Preços</a><a href="#auditoria-admin">Auditoria</a><a href="#catalogo-admin">Regras</a><a href="#cupons-admin">Cupons</a><a href="#pedidos-admin">Pedidos</a><a href="#atendimento-admin">Atendimento</a></nav>
    <div className="admin-metrics" aria-label="Resumo operacional"><article><span>Pedidos registrados</span><strong>{totalOrders}</strong></article><article><span>Em acompanhamento nesta página</span><strong>{attentionOrders}</strong></article><article><span>Solicitações pendentes na lista</span><strong>{openRequests}</strong></article><article><span>Cupons ativos</span><strong>{activeCoupons}</strong></article></div>
    <section className="admin-card admin-sync" id="sincronizacao-admin"><div className="sync-heading"><div><p className="eyebrow">INTEGRAÇÃO LOLZ MARKET</p><h2>Sincronização do catálogo</h2></div><button className="button-outline" type="button" onClick={() => void refreshDashboard()} disabled={busy}>Atualizar status</button></div>{releaseStatus && !releaseStatus.catalogSyncEnabled && <div className="demo-catalog-notice" role="note"><strong>Modo de demonstração · sincronização desligada</strong><span>A integração com a LZT e a atualização de estoque estão desativadas nesta versão. Ciclos exibidos abaixo são registros históricos, não uma sincronização ativa.</span></div>}{!releaseStatus && <div className="demo-catalog-notice" role="status"><strong>Estado da integração não confirmado</strong><span>Não foi possível consultar o estado de release. Considere eventuais ciclos abaixo apenas como registros históricos.</span></div>}{releaseStatus?.catalogSyncEnabled && !releaseStatus.marketplaceEnabled && <div className="demo-catalog-notice" role="note"><strong>Catálogo somente para consulta</strong><span>Compras, cobranças, carteira e entregas continuam desativadas até a aprovação comercial.</span></div>}{syncRefreshError && <p className="sync-error" role="alert">{syncRefreshError} O último estado carregado continua visível.</p>}{!dashboard ? <p className="empty-inline" role="status">Carregando estado da sincronização.</p> : !dashboard.catalogSync ? <p className="empty-inline" role="status">{!releaseStatus ? 'O estado do release não foi confirmado; não é possível afirmar se há uma sincronização ativa.' : releaseStatus.catalogSyncEnabled ? 'Ainda não há execuções registradas. O status aparecerá após o primeiro ciclo do worker.' : 'Nenhum ciclo ativo: a sincronização do fornecedor está desligada nesta versão.'}</p> : <><p className={`sync-state sync-state-${dashboard.catalogSync.status}`} role="status">{!releaseStatus ? 'Registro de ciclo · estado atual não verificado' : releaseStatus.catalogSyncEnabled ? dashboard.catalogSync.status === 'complete' ? 'Último ciclo concluído' : dashboard.catalogSync.status === 'running' ? 'Ciclo em andamento' : 'Último ciclo incompleto' : 'Registro de ciclo histórico'}</p><dl className="sync-details"><div><dt>Início</dt><dd>{new Date(dashboard.catalogSync.startedAt).toLocaleString('pt-BR')}</dd></div><div><dt>Conclusão</dt><dd>{dashboard.catalogSync.finishedAt ? new Date(dashboard.catalogSync.finishedAt).toLocaleString('pt-BR') : releaseStatus?.catalogSyncEnabled ? 'Em andamento' : 'Não concluído'}</dd></div><div><dt>Duração</dt><dd>{dashboard.catalogSync.durationMs === null ? releaseStatus?.catalogSyncEnabled ? 'Em andamento' : 'Não concluída' : `${(dashboard.catalogSync.durationMs / 1000).toLocaleString('pt-BR')} s`}</dd></div><div><dt>Último ciclo bem-sucedido</dt><dd>{dashboard.catalogSync.lastSuccessAt ? new Date(dashboard.catalogSync.lastSuccessAt).toLocaleString('pt-BR') : 'Ainda não registrado'}</dd></div><div><dt>Anúncios importados</dt><dd>{dashboard.catalogSync.itemsUpserted.toLocaleString('pt-BR')}</dd></div><div><dt>Anúncios analisados</dt><dd>{dashboard.catalogSync.itemsSeen.toLocaleString('pt-BR')}</dd></div><div><dt>Anúncios descartados</dt><dd>{dashboard.catalogSync.itemsDiscarded.toLocaleString('pt-BR')}</dd></div><div><dt>Páginas lidas</dt><dd>{dashboard.catalogSync.pagesRead.toLocaleString('pt-BR')}</dd></div></dl>{dashboard.catalogSync.itemsDiscarded > 0 && <div className="sync-discard-reasons"><h3>Motivos dos descartes</h3>{Object.keys(dashboard.catalogSync.itemsDiscardedReasons).length ? <ul>{Object.entries(dashboard.catalogSync.itemsDiscardedReasons).map(([reason, count]) => <li key={reason}>{syncDiscardReason[reason] ?? 'Outro motivo'}<strong>{count.toLocaleString('pt-BR')}</strong></li>)}</ul> : <p>O backend não informou os motivos para este ciclo.</p>}</div>}{dashboard.catalogSync.status === 'failed' && dashboard.catalogSync.errorMessage && <p className="sync-error" role="status">{dashboard.catalogSync.errorMessage}</p>}</>}</section>
    {dashboard && <AdminBacklogPanels inventoryAvailability={dashboard.inventoryAvailability} defaultMarkupPercent={settings?.markupPercent ?? 55} onRefreshAvailability={() => void refreshDashboard()} />}
    {dashboard && <section className="admin-card admin-orders" id="resumo"><p className="eyebrow">VENDAS</p><h2>Resumo dos pedidos</h2>{dashboard.orders.length ? <ul className="order-list">{dashboard.orders.map((row) => <li key={row.status}><div><strong>{orderStatus[row.status] ?? 'Outro estado'}</strong><span>{row.count} pedidos</span></div><strong>{money(Number(row.revenue_cents))}</strong></li>)}</ul> : <p className="empty-inline">Ainda não há vendas.</p>}</section>}
    {settings && <div className="admin-grid"><section className="admin-card" id="catalogo-admin"><p className="eyebrow">PRECIFICAÇÃO E CATÁLOGO</p><h2>Regras da vitrine</h2><form className="checkout-form" onSubmit={(event) => void saveSettings(event)}><label htmlFor="markupPercent">Acréscimo sobre custo (50% a 59%)</label><input id="markupPercent" name="markupPercent" type="number" min="50" max="59" defaultValue={settings.markupPercent} required /><label htmlFor="usdBrlRate">Cotação USD para BRL</label><input id="usdBrlRate" name="usdBrlRate" type="number" min="0.000001" step="0.000001" defaultValue={settings.usdBrlRate ?? ''} /><label htmlFor="rubBrlRate">Cotação RUB para BRL</label><input id="rubBrlRate" name="rubBrlRate" type="number" min="0.000001" step="0.000001" defaultValue={settings.rubBrlRate ?? ''} /><label htmlFor="blockedSellerIds">IDs de vendedores ocultos</label><textarea id="blockedSellerIds" name="blockedSellerIds" rows={4} defaultValue={settings.blockedSellerIds.join('\n')} /><button className="button-primary" type="submit" disabled={busy}>Salvar configurações</button></form><p className="fine-print">As cotações são informadas pelo administrador; produtos sem taxa definida não entram na vitrine.</p></section>
    <section className="admin-card" id="cupons-admin"><p className="eyebrow">PROMOÇÕES</p><h2>Cupons de desconto</h2><form className="checkout-form" onSubmit={(event) => void createCoupon(event)}><label htmlFor="code">Código do cupom</label><input id="code" name="code" minLength={3} maxLength={32} required /><label htmlFor="discountPercent">Desconto (1% a 4%)</label><select id="discountPercent" name="discountPercent"><option value="1">1%</option><option value="2">2%</option><option value="3">3%</option><option value="4">4%</option></select><label htmlFor="maxRedemptions">Limite de usos <span>(opcional)</span></label><input id="maxRedemptions" name="maxRedemptions" type="number" min="1" /><button className="button-primary" type="submit" disabled={busy}>Criar ou atualizar cupom</button></form><label className="admin-search" htmlFor="coupon-filter"><span>Filtrar cupons</span><input id="coupon-filter" type="search" value={couponFilter} onChange={(event) => setCouponFilter(event.target.value)} placeholder="Código ou estado" /></label>{filteredCoupons.length ? <ul className="coupon-list">{filteredCoupons.map((coupon) => <li key={coupon.code}><div><strong>{coupon.code}</strong><span>{coupon.discount_percent}% · {coupon.redemption_count}{coupon.max_redemptions ? `/${coupon.max_redemptions}` : ''} usos · {coupon.active ? 'ativo' : 'inativo'}</span></div><button type="button" className="text-link-button" disabled={busy} onClick={() => void setCouponActive(coupon.code, !coupon.active)}>{coupon.active ? 'Desativar' : 'Ativar'}</button></li>)}</ul> : <div className="empty-inline"><p>Nenhum cupom corresponde à busca.</p><button className="text-link-button" type="button" onClick={() => setCouponFilter('')}>Limpar filtro</button></div>}</section></div>}
    {isAdmin && <section className="admin-card admin-orders" id="pedidos-admin"><p className="eyebrow">PEDIDOS</p><h2>Histórico de pedidos</h2><label className="admin-search" htmlFor="order-filter"><span>Buscar por produto, pedido ou estado</span><input id="order-filter" type="search" value={orderFilter} onChange={(event) => { setOrderFilter(event.target.value); setOrderPage(1); }} placeholder="Nome, identificador ou estado" /></label>{ordersError ? <div className="empty-inline" role="alert"><p>{ordersError}</p><button className="text-link-button" type="button" onClick={() => setOrdersRefresh((value) => value + 1)}>Tentar novamente</button></div> : ordersLoading && !orderPageInfo ? <div className="admin-skeleton" role="status" aria-label="Carregando histórico de pedidos" aria-busy="true"><span /><span /><span /></div> : orders.length ? <><ul className="order-list">{orders.map((order) => <li key={order.id}><div><strong>{order.product_title}</strong><span>{order.id} · {orderStatus[order.status] ?? 'Outro estado'} · {new Date(order.created_at).toLocaleString('pt-BR')}</span>{order.payment_status && <span>Pagamento: {paymentStatus[order.payment_status] ?? 'Estado do pagamento atualizado'}</span>}{order.fulfillment_status && <span>Fornecedor: {fulfillmentStatus[order.fulfillment_status] ?? 'Estado da entrega atualizado'}{order.fulfillment_error ? ` · ${fulfillmentError[order.fulfillment_error] ?? 'Verifique a integração do fornecedor'}` : ''}</span>}</div><strong>{money(Number(order.total_cents))}</strong>{['delivery_required','paid'].includes(order.status) && (releaseStatus?.marketplaceEnabled ? <form className="delivery-admin-form" onSubmit={(event) => void saveDelivery(event, order.id)}><label htmlFor={`credentials-${order.id}`}>Credenciais da conta (criptografadas ao salvar)</label><textarea id={`credentials-${order.id}`} name="credentials" rows={3} maxLength={10000} required /><button className="button-outline" type="submit" disabled={busy}>Guardar entrega</button></form> : <p className="fine-print" role="status">Entrega de credenciais indisponível enquanto o comércio estiver desativado.</p>)}</li>)}</ul><div className="pagination" aria-label="Paginação do histórico"><button className="button-outline" type="button" onClick={() => setOrderPage((page) => Math.max(1, page - 1))} disabled={orderPage <= 1 || ordersLoading}>Anterior</button><span>Página {orderPageInfo?.page ?? orderPage} de {orderPageInfo?.totalPages ?? 1} · {orderPageInfo?.total ?? orders.length} pedidos</span><button className="button-outline" type="button" onClick={() => setOrderPage((page) => Math.min(orderPageInfo?.totalPages ?? page, page + 1))} disabled={ordersLoading || orderPage >= (orderPageInfo?.totalPages ?? 1)}>Próxima</button></div></> : <div className="empty-inline"><p>{orderFilter ? 'Nenhum pedido corresponde à busca.' : 'Ainda não há pedidos registrados.'}</p>{orderFilter && <button className="text-link-button" type="button" onClick={() => setOrderFilter('')}>Limpar filtro</button>}</div>}</section>}
    {isAdmin && <section className="admin-card admin-orders" id="atendimento-admin"><p className="eyebrow">ATENDIMENTO</p><h2>Cancelamentos e desistências</h2><p className="fine-print">Atualizar a análise não altera o pedido, não estorna pagamentos e não movimenta o saldo da carteira.</p><label className="admin-search" htmlFor="request-filter"><span>Buscar por pedido, produto ou mensagem</span><input id="request-filter" type="search" value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)} placeholder="Nome, identificador ou texto" /></label>{filteredRequests.length ? <ul className="order-list">{filteredRequests.map((request) => <li key={request.order_id}><div><strong>{request.product_title}</strong><span>Pedido {request.order_id}</span><span>Pedido: {orderStatus[request.order_status] ?? 'Outro estado'} · {money(Number(request.total_cents))} · {new Date(request.created_at).toLocaleString('pt-BR')}</span><span>Mensagem do cliente: {request.customer_message || 'Sem mensagem adicional.'}</span>{request.admin_response && <span>Resposta atual: {request.admin_response}</span>}</div><form className="cancellation-request-form" onSubmit={(event) => void reviewCancellationRequest(event, request.order_id)}><label htmlFor={`request-status-${request.order_id}`}>Status da solicitação</label><select id={`request-status-${request.order_id}`} name="status" defaultValue={request.status}><option value="open">Recebida</option><option value="under_review">Em análise</option><option value="resolved">Resposta enviada</option><option value="declined">Não aprovada</option></select><label htmlFor={`request-response-${request.order_id}`}>Resposta ao cliente</label><textarea id={`request-response-${request.order_id}`} name="adminResponse" rows={3} maxLength={1000} defaultValue={request.admin_response ?? ''} /><button className="button-outline" type="submit" disabled={busy}>Salvar análise</button></form></li>)}</ul> : <div className="empty-inline"><p>{cancellationRequests.length ? 'Nenhuma solicitação corresponde à busca.' : 'Não há solicitações de cancelamento.'}</p>{requestFilter && <button className="text-link-button" type="button" onClick={() => setRequestFilter('')}>Limpar filtro</button>}</div>}</section>}
  </section>;
}
