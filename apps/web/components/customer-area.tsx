'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type Order = { id: string; product_title: string; game: string; total_cents: number; status: string; payment_method: string; created_at: string; fulfillment_status?: string | null; delivery_available?: boolean; pix_copy_paste?: string | null; pix_qr_base64?: string | null; pix_expires_at?: string | null; cancellation_request_status?: string | null; cancellation_request_message?: string | null; cancellation_request_response?: string | null; cancellation_request_created_at?: string | null; cancellation_request_updated_at?: string | null };
type OrderHistory = { items: Order[]; page: number; pageSize: number; total: number };
type Wallet = { balanceCents: number; currency: string; entries: Array<{ kind: string; amount_cents: number; created_at: string }> };
type PixPayment = { copyPaste: string; qrCodeBase64: string | null; expiresAt: string };
const orderPageSize = 20;
const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const orderStatus: Record<string, string> = { pending_payment: 'Aguardando pagamento', paid: 'Pagamento confirmado', delivery_required: 'Entrega em preparação', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Valor devolvido ao saldo da carteira', review: 'Em análise' };
const fulfillmentStatus: Record<string, string> = { queued: 'Entrega na fila', processing: 'Fornecedor preparando a entrega', completed: 'Credenciais liberadas', review: 'Entrega em análise pelo suporte', refunded: 'Valor devolvido ao saldo da carteira' };
const requestStatus: Record<string, string> = { open: 'Solicitação recebida', under_review: 'Em análise', resolved: 'Resposta enviada', declined: 'Solicitação não aprovada' };
export function CustomerArea() {
  const [email, setEmail] = useState('');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [revealedDelivery, setRevealedDelivery] = useState<{ orderId: string; credentials: string } | null>(null);
  const deliveryRequest = useRef<AbortController | null>(null);
  const orderPageRef = useRef(orderPage);
  const [topupPix, setTopupPix] = useState<PixPayment | null>(null);
  const [busy, setBusy] = useState(false);
  const [topupEnabled, setTopupEnabled] = useState(false);
  const [topupStatusLoading, setTopupStatusLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyRefreshError, setHistoryRefreshError] = useState('');
  const accountRequest = useRef<AbortController | null>(null);
  const load = useCallback(async (clearMessage = true, silent = false) => {
    accountRequest.current?.abort();
    const controller = new AbortController();
    accountRequest.current = controller;
    if (clearMessage) setMessage('');
    if (!silent) { setHistoryLoading(true); setHistoryError(''); setHistoryRefreshError(''); }
    try {
      const me = await fetch('/api/v1/auth/me', { credentials: 'include', cache: 'no-store', signal: controller.signal });
      if (!me.ok) { location.assign('/entrar'); return; }
      const identity = await me.json(); setEmail(identity.email);
      const [walletResponse, orderResponse] = await Promise.all([
        fetch('/api/v1/wallet', { credentials: 'include', cache: 'no-store', signal: controller.signal }),
        fetch(`/api/v1/orders?page=${orderPage}&pageSize=${orderPageSize}`, { credentials: 'include', cache: 'no-store', signal: controller.signal }),
      ]);
      if (!walletResponse.ok || !orderResponse.ok) throw new Error('Não foi possível carregar sua conta.');
      const [walletBody, orderBody] = await Promise.all([walletResponse.json(), orderResponse.json()]) as [Wallet, OrderHistory];
      if (controller.signal.aborted || accountRequest.current !== controller) return;
      setWallet(walletBody); setOrders(orderBody.items); setOrderTotal(orderBody.total);
      if (silent) setHistoryRefreshError('');
    } catch (reason) {
      if (controller.signal.aborted || accountRequest.current !== controller) return;
      const detail = reason instanceof Error ? reason.message : 'Erro ao carregar os dados.';
      if (silent) setHistoryRefreshError(detail);
      else { setHistoryError(detail); setMessage(detail); }
    } finally {
      if (accountRequest.current === controller) {
        accountRequest.current = null;
        if (!silent) setHistoryLoading(false);
      }
    }
  }, [orderPage]);
  useEffect(() => {
    void load();
    return () => accountRequest.current?.abort();
  }, [load]);
  const hasActiveOrderUpdates = orders.some((order) => order.status === 'pending_payment' || order.fulfillment_status === 'queued' || order.fulfillment_status === 'processing');
  useEffect(() => {
    const topupExpiresAt = topupPix?.expiresAt;
    const needsRefresh = () => hasActiveOrderUpdates || Boolean(topupExpiresAt && Date.parse(topupExpiresAt) > Date.now());
    if (!needsRefresh()) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clearTimer = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
    const schedule = (delay: number) => { clearTimer(); timer = setTimeout(() => { void refresh(); }, delay); };
    const refresh = async () => {
      timer = null;
      if (!active || document.hidden) return;
      await load(false, true);
      if (active && needsRefresh()) schedule(20_000);
    };
    const onVisibilityChange = () => {
      if (document.hidden) clearTimer();
      else if (needsRefresh()) schedule(1_000);
    };
    schedule(15_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => { active = false; clearTimer(); document.removeEventListener('visibilitychange', onVisibilityChange); };
  }, [hasActiveOrderUpdates, topupPix?.expiresAt, load]);
  useEffect(() => {
    orderPageRef.current = orderPage;
    deliveryRequest.current?.abort();
    deliveryRequest.current = null;
    setRevealedDelivery(null);
    const clearWhenHidden = () => {
      if (!document.hidden) return;
      deliveryRequest.current?.abort();
      deliveryRequest.current = null;
      setRevealedDelivery(null);
    };
    document.addEventListener('visibilitychange', clearWhenHidden);
    return () => document.removeEventListener('visibilitychange', clearWhenHidden);
  }, [orderPage]);
  useEffect(() => {
    let active = true;
    fetch('/api/v1/legal/terms/status', { cache: 'no-store' })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<{ enabled?: boolean; paymentProviders?: { mercadopago?: boolean } }>; })
      .then((status) => { if (active) setTopupEnabled(status.enabled === true && status.paymentProviders?.mercadopago === true); })
      .catch(() => { if (active) setTopupEnabled(false); })
      .finally(() => { if (active) setTopupStatusLoading(false); });
    return () => { active = false; };
  }, []);
  async function topup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const amount = Number(new FormData(event.currentTarget).get('amount'));
    try {
      const response = await fetch('/api/v1/wallet/topups', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ amountCents: String(Math.round(amount * 100)) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Não foi possível iniciar o Pix.');
      setTopupPix(body.pix as PixPayment);
      setMessage(`Pix criado para adicionar ${money(Number(body.order.total_cents))} à carteira.`);
      await load(false);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Erro ao adicionar saldo.'); }
    finally { setBusy(false); }
  }
  async function openDelivery(id: string) {
    if (revealedDelivery?.orderId === id) { setRevealedDelivery(null); return; }
    setRevealedDelivery(null);
    setMessage('');
    deliveryRequest.current?.abort();
    const controller = new AbortController();
    const requestedPage = orderPageRef.current;
    deliveryRequest.current = controller;
    try {
      const response = await fetch(`/api/v1/orders/${id}/delivery`, { credentials: 'include', cache: 'no-store', signal: controller.signal }); const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Entrega ainda não está disponível.');
      if (document.hidden || orderPageRef.current !== requestedPage || deliveryRequest.current !== controller) return;
      setRevealedDelivery({ orderId: id, credentials: body.credentials }); await load();
    } catch (reason) { if (!controller.signal.aborted) setMessage(reason instanceof Error ? reason.message : 'Erro ao abrir a entrega.'); }
    finally { if (deliveryRequest.current === controller) deliveryRequest.current = null; }
  }
  async function requestCancellation(event: React.FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault(); setBusy(true); setMessage('');
    const messageText = String(new FormData(event.currentTarget).get('message') ?? '');
    try {
      const response = await fetch(`/api/v1/orders/${orderId}/cancellation-request`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: messageText }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.message || 'Não foi possível registrar a solicitação.');
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, cancellation_request_status: body.status, cancellation_request_message: body.customer_message, cancellation_request_response: body.admin_response, cancellation_request_created_at: body.created_at, cancellation_request_updated_at: body.updated_at } : order));
      setMessage('Solicitação registrada para análise. Ela não cancela o pedido nem inicia uma restituição automática.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Erro ao registrar solicitação.'); }
    finally { setBusy(false); }
  }
  const pageCount = Math.max(1, Math.ceil(orderTotal / orderPageSize));
  return <section className="shell page-shell"><div className="section-heading"><div><p className="eyebrow">CONTA DO CLIENTE</p><h1>Suas compras e saldo.</h1></div><div className="customer-identity">{email}</div></div>{message && !historyError && <p className="inline-message" role="status">{message}</p>}{historyRefreshError && <p className="inline-message" role="status">Não foi possível atualizar automaticamente. Use “Atualizar” para tentar novamente.</p>}<div className="account-grid"><section className="balance-card"><p className="eyebrow">SALDO DA CARTEIRA</p><strong>{wallet ? money(wallet.balanceCents) : '—'}</strong><p>Saldo liberado após confirmação Pix.</p>{topupStatusLoading ? <p className="fine-print" role="status">Conferindo condições da recarga…</p> : !topupEnabled ? <p className="fine-print" role="status">Recargas Pix aguardam a liberação dos Termos, do modelo comercial e do Mercado Pago. <Link href="/termos">Ver condições</Link></p> : null}<form className="topup-form" onSubmit={(event) => void topup(event)}><label htmlFor="amount">Adicionar saldo (R$ 5 a R$ 5.000)</label><input id="amount" name="amount" type="number" min="5" max="5000" step="0.01" required /><button type="submit" className="button-primary" disabled={busy || topupStatusLoading || !topupEnabled}>{busy ? 'Gerando Pix…' : 'Adicionar por Pix'}</button></form>{topupPix && <div className="checkout-result"><h2>Pix da carteira</h2>{topupPix.qrCodeBase64 && <img className="qr-image" alt="QR Code Pix para adicionar saldo" src={`data:image/png;base64,${topupPix.qrCodeBase64}`} />}<label htmlFor="wallet-pix-code">Código Pix copia e cola</label><textarea id="wallet-pix-code" readOnly rows={4} value={topupPix.copyPaste} /><p className="fine-print">Válido até {new Date(topupPix.expiresAt).toLocaleString('pt-BR')}. O saldo entra após a confirmação do pagamento.</p></div>}</section><section className="history-card"><div className="section-heading compact-heading"><div><p className="eyebrow">HISTÓRICO</p><h2>Histórico completo <span className="history-count">{orderTotal.toLocaleString('pt-BR')} pedidos</span></h2></div><button type="button" className="text-link-button" disabled={historyLoading} onClick={() => void load()}>Atualizar</button></div>{historyLoading ? <div className="history-skeleton" role="status" aria-label="Carregando histórico de pedidos" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div className="history-skeleton-row" key={index}><div><span /><span /></div><span /></div>)}</div> : historyError ? <div className="state-panel error-state" role="alert"><div><h3>Histórico indisponível</h3><p>{historyError}</p></div><button className="button-outline" type="button" onClick={() => void load(false)}>Tentar novamente</button></div> : orders.length ? <><ul className="order-list">{orders.map((order) => <li key={order.id}><div><strong>{order.product_title}</strong><span>{new Date(order.created_at).toLocaleString('pt-BR')} · {order.delivery_available ? 'Credenciais liberadas' : order.fulfillment_status ? fulfillmentStatus[order.fulfillment_status] ?? orderStatus[order.status] ?? 'Status atualizado' : orderStatus[order.status] ?? 'Status atualizado'}</span></div><div className="order-total">{money(Number(order.total_cents))}{order.delivery_available ? <button type="button" className="text-link-button" onClick={() => void openDelivery(order.id)}>{revealedDelivery?.orderId === order.id ? 'Ocultar credenciais' : 'Ver credenciais'}</button> : null}</div>{order.status === 'pending_payment' && order.pix_copy_paste && <div className="checkout-result">{order.pix_qr_base64 && <img className="qr-image" alt="QR Code Pix deste pedido" src={`data:image/png;base64,${order.pix_qr_base64}`} />}<label htmlFor={`pix-${order.id}`}>Código Pix copia e cola</label><textarea id={`pix-${order.id}`} readOnly rows={4} value={order.pix_copy_paste} /><span>Válido até {order.pix_expires_at ? new Date(order.pix_expires_at).toLocaleString('pt-BR') : 'confirmação do pagamento'}</span></div>}{revealedDelivery?.orderId === order.id && <pre className="delivery-box">{revealedDelivery.credentials}</pre>}{order.cancellation_request_status ? <section className="cancellation-request" aria-label={`Solicitação do pedido ${order.id}`}><strong>{requestStatus[order.cancellation_request_status] ?? 'Em análise'}</strong>{order.cancellation_request_message && <p>Sua mensagem: {order.cancellation_request_message}</p>}{order.cancellation_request_response && <p>Resposta da loja: {order.cancellation_request_response}</p>}<span>Atualizado em {order.cancellation_request_updated_at ? new Date(order.cancellation_request_updated_at).toLocaleString('pt-BR') : '—'}</span></section> : order.status !== 'cancelled' && order.status !== 'refunded' && <details className="cancellation-request"><summary>Solicitar cancelamento ou desistência</summary><p>O pedido será enviado para análise. Esta solicitação não cancela a compra nem inicia estorno ou crédito automático.</p><form className="cancellation-request-form" onSubmit={(event) => void requestCancellation(event, order.id)}><label htmlFor={`cancellation-message-${order.id}`}>Mensagem (opcional)</label><textarea id={`cancellation-message-${order.id}`} name="message" rows={3} maxLength={1000} /><button className="button-outline" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar solicitação'}</button></form></details>}</li>)}</ul>{orderTotal > orderPageSize && <nav className="pagination" aria-label="Paginação do histórico de compras"><button className="button-outline" type="button" disabled={historyLoading || orderPage <= 1} onClick={() => setOrderPage((current) => Math.max(1, current - 1))}>Anterior</button><span>Página {orderPage} de {pageCount}</span><button className="button-outline" type="button" disabled={historyLoading || orderPage >= pageCount} onClick={() => setOrderPage((current) => Math.min(pageCount, current + 1))}>Próxima</button></nav>}</> : <div className="empty-inline"><p>Você ainda não tem compras.</p><Link className="text-link" href="/#catalogo">Explorar catálogo →</Link></div>}</section></div></section>;
}
