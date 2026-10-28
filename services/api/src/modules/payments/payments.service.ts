import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { requireMarketplaceCompliance } from '../legal/commerce-release-status';

type OrderForPayment = { id: string; total_cents: string | number; product_title: string; user_id: string; status: string; provider_item_id?: string; expires_at?: Date | null };
type MercadoPayment = {
  id?: number | string; status?: string; external_reference?: string; transaction_amount?: number | string;
  currency_id?: string; payment_method_id?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
  date_of_expiration?: string;
};
type PushinPayment = { id?: string | number; status?: string; value?: number | string; qr_code?: string; qr_code_base64?: string; pix_details?: { expiration_date?: string } };

function constantTimeHexEqual(left: string, right: string): boolean {
  if (!/^[a-f\d]{64}$/i.test(left) || !/^[a-f\d]{64}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function exactCents(value: unknown): number | null {
  const amount = Number(value);
  const scaled = amount * 100;
  const cents = Math.round(scaled);
  return Number.isFinite(amount) && Number.isSafeInteger(cents) && Math.abs(scaled - cents) < 1e-6 ? cents : null;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly db: DatabaseService) {}

  assertProviderAvailable(provider: 'mercadopago' | 'pushinpay'): void {
    if (provider === 'pushinpay') {
      const token = process.env.PUSHINPAY_ACCESS_TOKEN;
      const secret = process.env.PUSHINPAY_WEBHOOK_SECRET;
      const callback = process.env.PUSHINPAY_NOTIFICATION_URL;
      if (!token || !secret || !callback) throw new ServiceUnavailableException('Pix Pushin Pay indisponível: configure token, header secreto do webhook e URL HTTPS.');
      if (/[\r\n]/.test(token) || /[\r\n]/.test(secret)) throw new ServiceUnavailableException('Configuração de autenticação Pushin Pay inválida.');
      try {
        const callbackUrl = new URL(callback);
        if (callbackUrl.protocol !== 'https:' || callbackUrl.username || callbackUrl.password || callbackUrl.hash) throw new Error();
      } catch { throw new ServiceUnavailableException('A URL de notificação da Pushin Pay precisa usar HTTPS.'); }
      try {
        const baseUrl = new URL(process.env.PUSHINPAY_API_BASE_URL ?? 'https://api.pushinpay.com.br');
        if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password || !['api.pushinpay.com.br', 'api-sandbox.pushinpay.com.br'].includes(baseUrl.hostname) || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash) throw new Error();
      }
      catch { throw new ServiceUnavailableException('PUSHINPAY_API_BASE_URL deve apontar para a base HTTPS oficial.'); }
      return;
    }
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    const callback = process.env.MERCADOPAGO_NOTIFICATION_URL;
    if (!token || !secret || !callback) throw new ServiceUnavailableException('Checkout Pix indisponível: configure token, segredo de webhook e URL HTTPS do Mercado Pago.');
    if (/[\r\n]/.test(token) || /[\r\n]/.test(secret)) throw new ServiceUnavailableException('Configuração de autenticação do Mercado Pago inválida.');
    try {
      const callbackUrl = new URL(callback);
      if (callbackUrl.protocol !== 'https:' || callbackUrl.username || callbackUrl.password || callbackUrl.hash) throw new Error();
    }
    catch { throw new ServiceUnavailableException('A URL de notificação do Mercado Pago precisa usar HTTPS.'); }
  }

  async createPix(provider: 'mercadopago' | 'pushinpay', order: OrderForPayment, payerEmail: string) {
    requireMarketplaceCompliance();
    this.assertProviderAvailable(provider);
    if (order.status !== 'pending_payment') throw new ConflictException('Este pedido não está aguardando pagamento. Atualize o histórico antes de tentar novamente.');
    if (order.expires_at && order.expires_at.getTime() <= Date.now()) {
      await this.cancelUnpaidOrder(order.id);
      throw new ConflictException('Este pedido Pix expirou. Inicie um novo pedido pelo catálogo.');
    }
    const amountCents = Number(order.total_cents);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new ServiceUnavailableException('Valor do pedido inválido.');
    if (provider === 'pushinpay' && amountCents < 50) {
      await this.cancelUnpaidOrder(order.id);
      throw new BadRequestException('A Pushin Pay aceita cobranças a partir de R$ 0,50. Escolha outro meio de pagamento ou ajuste o valor do pedido.');
    }
    const inserted = await this.db.query<{ provider_payment_id: string | null; pix_copy_paste: string | null; pix_qr_base64: string | null; status: string; expires_at: Date | null }>(
      `INSERT INTO payments(order_id,provider,provider_reference,amount_cents,status)
       VALUES($1,$2,$1,$3,'creating') ON CONFLICT(order_id) DO NOTHING
       RETURNING provider_payment_id,pix_copy_paste,pix_qr_base64,status,expires_at`, [order.id, provider, amountCents]);
    let saved = inserted.rows[0];
    if (!saved) {
      const existing = await this.db.query<{ provider: string; provider_payment_id: string | null; pix_copy_paste: string | null; pix_qr_base64: string | null; status: string; expires_at: Date | null }>(
        'SELECT provider,provider_payment_id,pix_copy_paste,pix_qr_base64,status,expires_at FROM payments WHERE order_id=$1', [order.id]);
      if (!existing.rows[0] || existing.rows[0].provider !== provider) throw new ConflictException('Este pedido já iniciou pagamento por outro provedor.');
      saved = existing.rows[0];
      if (saved.status === 'pending' && saved.pix_copy_paste) {
        if (!saved.expires_at || saved.expires_at.getTime() <= Date.now()) {
          await this.db.transaction(async (client) => {
            await client.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1 AND status='pending'", [order.id]);
            await client.query("UPDATE orders SET status='review',updated_at=now() WHERE id=$1 AND status='pending_payment'", [order.id]);
          });
          throw new ServiceUnavailableException('O Pix existente expirou ou não tem validade registrada. O pedido ficou em revisão.');
        }
        return { provider, paymentId: saved.provider_payment_id, copyPaste: saved.pix_copy_paste, qrCodeBase64: saved.pix_qr_base64, expiresAt: saved.expires_at };
      }
      if (saved.status !== 'creating' || provider === 'pushinpay') {
        throw new ServiceUnavailableException('A tentativa Pix anterior requer revisão. Não foi criada uma nova cobrança.');
      }
    }
    if (provider === 'pushinpay') return this.createPushinPayPix(order, amountCents);
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN!;
    const notificationUrl = process.env.MERCADOPAGO_NOTIFICATION_URL!;
    let response: Response;
    try {
      response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json',
          'X-Idempotency-Key': order.id,
        },
        body: JSON.stringify({
          transaction_amount: amountCents / 100,
          description: String(order.product_title).slice(0, 250),
          payment_method_id: 'pix',
          external_reference: order.id,
          notification_url: notificationUrl,
          payer: { email: payerEmail },
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      await this.db.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1", [order.id]);
      throw new ServiceUnavailableException('Não foi possível confirmar a resposta do gateway. O pedido ficou em revisão; não repita o pagamento por outro canal.');
    }
    if (!response.ok) {
      await this.db.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1", [order.id]);
      throw new ServiceUnavailableException('O gateway não confirmou a criação do Pix. O pedido ficou em revisão.');
    }
    let payment: MercadoPayment;
    try { payment = await response.json() as MercadoPayment; }
    catch {
      await this.db.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1", [order.id]);
      throw new ServiceUnavailableException('O Mercado Pago retornou uma resposta inválida. O pedido ficou em revisão.');
    }
    const paymentId = payment.id == null ? null : String(payment.id);
    const qr = payment.point_of_interaction?.transaction_data?.qr_code;
    const qrImage = payment.point_of_interaction?.transaction_data?.qr_code_base64;
    const responseAmountCents = exactCents(payment.transaction_amount);
    if (!paymentId || !qr || payment.status !== 'pending' || payment.external_reference !== order.id
      || payment.payment_method_id !== 'pix' || payment.currency_id !== 'BRL'
      || responseAmountCents === null || responseAmountCents !== amountCents) {
      await this.db.query("UPDATE payments SET provider_payment_id=$2,status='review',updated_at=now() WHERE order_id=$1", [order.id, paymentId]);
      throw new ServiceUnavailableException('O gateway retornou dados de pagamento inconsistentes. O pedido ficou em revisão.');
    }
    const expiration = payment.date_of_expiration ? new Date(payment.date_of_expiration) : new Date(Date.now() + 30 * 60_000);
    if (!Number.isFinite(expiration.getTime()) || expiration.getTime() <= Date.now()) {
      await this.db.query("UPDATE payments SET provider_payment_id=$2,status='review',updated_at=now() WHERE order_id=$1", [order.id, paymentId]);
      throw new ServiceUnavailableException('A data de vencimento do Pix retornada pelo Mercado Pago é inválida. O pedido ficou em revisão.');
    }
    await this.db.query(
      `UPDATE payments SET provider_payment_id=$2,status='pending',pix_copy_paste=$3,pix_qr_base64=$4,expires_at=$5,updated_at=now()
       WHERE order_id=$1 AND provider='mercadopago' AND status IN ('creating','pending')`,
      [order.id, paymentId, qr, typeof qrImage === 'string' ? qrImage : null, expiration]);
    return { provider, paymentId, copyPaste: qr, qrCodeBase64: typeof qrImage === 'string' ? qrImage : null, expiresAt: expiration };
  }

  private async createPushinPayPix(order: OrderForPayment, amountCents: number) {
    const token = process.env.PUSHINPAY_ACCESS_TOKEN!;
    const callback = process.env.PUSHINPAY_NOTIFICATION_URL!;
    const configuredBase = process.env.PUSHINPAY_API_BASE_URL ?? 'https://api.pushinpay.com.br';
    let root: URL;
    try {
      root = new URL(configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`);
      if (root.protocol !== 'https:' || root.username || root.password || !['api.pushinpay.com.br', 'api-sandbox.pushinpay.com.br'].includes(root.hostname) || root.pathname !== '/' || root.search || root.hash) throw new Error();
    } catch { throw new ServiceUnavailableException('PUSHINPAY_API_BASE_URL inválida.'); }
    let response: Response;
    try {
      response = await fetch(new URL('api/pix/cashIn', root), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: amountCents, description: String(order.product_title).slice(0, 255), webhook_url: callback, split_rules: [] }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      await this.db.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1 AND provider='pushinpay'", [order.id]);
      throw new ServiceUnavailableException('Não foi possível confirmar a resposta Pushin Pay. O pedido ficou em revisão; nenhuma nova cobrança será tentada automaticamente.');
    }
    if (!response.ok) {
      await this.db.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1 AND provider='pushinpay'", [order.id]);
      throw new ServiceUnavailableException('A Pushin Pay não confirmou a criação da cobrança. O pedido ficou em revisão.');
    }
    let payment: PushinPayment;
    try { payment = await response.json() as PushinPayment; }
    catch {
      await this.db.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1 AND provider='pushinpay'", [order.id]);
      throw new ServiceUnavailableException('A resposta da Pushin Pay ficou incompleta. O pedido ficou em revisão.');
    }
    const paymentId = payment.id == null ? null : String(payment.id);
    const qr = payment.qr_code;
    if (paymentId === null || paymentId.length === 0 || payment.status !== 'created' || Number(payment.value) !== amountCents || typeof qr !== 'string' || !qr) {
      await this.db.query("UPDATE payments SET provider_payment_id=$2,status='review',updated_at=now() WHERE order_id=$1 AND provider='pushinpay'", [order.id, paymentId]);
      throw new ServiceUnavailableException('A Pushin Pay retornou dados inconsistentes. O pedido ficou em revisão.');
    }
    const expiration = payment.pix_details?.expiration_date ? new Date(payment.pix_details.expiration_date) : (order.expires_at ? new Date(order.expires_at) : new Date(Date.now() + 30 * 60_000));
    if (!Number.isFinite(expiration.getTime()) || expiration.getTime() <= Date.now()) {
      await this.db.query("UPDATE payments SET provider_payment_id=$2,status='review',updated_at=now() WHERE order_id=$1 AND provider='pushinpay'", [order.id, paymentId]);
      throw new ServiceUnavailableException('A data de vencimento retornada pela Pushin Pay é inválida. O pedido ficou em revisão.');
    }
    await this.db.query(
      `UPDATE payments SET provider_payment_id=$2,status='pending',pix_copy_paste=$3,pix_qr_base64=$4,expires_at=$5,updated_at=now()
       WHERE order_id=$1 AND provider='pushinpay' AND status IN ('creating','pending')`,
      [order.id, paymentId, qr, typeof payment.qr_code_base64 === 'string' ? payment.qr_code_base64 : null, expiration]);
    return { provider: 'pushinpay', paymentId, copyPaste: qr, qrCodeBase64: typeof payment.qr_code_base64 === 'string' ? payment.qr_code_base64 : null, expiresAt: expiration };
  }

  async handleMercadoPagoWebhook(input: { signature?: string; requestId?: string; dataId?: string; eventId?: string; type?: string }) {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret || !input.signature || !input.requestId || !input.dataId || input.type !== 'payment') throw new UnauthorizedException('Notificação inválida.');
    const parts = new Map(input.signature.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=');
      return [key, value.join('=')];
    }));
    const timestamp = parts.get('ts') ?? '';
    const signatureHash = parts.get('v1') ?? '';
    if (!/^\d{10,13}$/.test(timestamp)) throw new UnauthorizedException('Assinatura inválida.');
    const timestampMs = timestamp.length === 10 ? Number(timestamp) * 1000 : Number(timestamp);
    if (Math.abs(Date.now() - timestampMs) > 300_000) throw new UnauthorizedException('Assinatura expirada.');
    const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${timestamp};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    if (!constantTimeHexEqual(expected, signatureHash)) throw new UnauthorizedException('Assinatura inválida.');

    const eventId = input.eventId?.slice(0, 200) || input.dataId;
    const reserved = await this.db.query<{ event_id: string }>(
      `INSERT INTO webhook_events(provider,event_id,status) VALUES('mercadopago',$1,'received')
       ON CONFLICT(provider,event_id) DO UPDATE SET status='received' WHERE webhook_events.status <> 'processed'
       RETURNING event_id`, [eventId]);
    if (!reserved.rows[0]) return { received: true, duplicate: true };

    try {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!token) throw new ServiceUnavailableException('Consulta do pagamento indisponível.');
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(input.dataId)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new ServiceUnavailableException('Não foi possível consultar o pagamento no Mercado Pago.');
      const payment = await response.json() as MercadoPayment;
      if (String(payment.id) !== input.dataId || !payment.external_reference || exactCents(payment.transaction_amount) === null
        || payment.payment_method_id !== 'pix' || payment.currency_id !== 'BRL') {
        throw new UnauthorizedException('Dados do pagamento não correspondem à notificação Pix.');
      }
      const amountCents = exactCents(payment.transaction_amount)!;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payment.external_reference)) {
        throw new UnauthorizedException('Referência do pedido Pix inválida.');
      }
      await this.linkMercadoPagoPayment(payment.external_reference, input.dataId, amountCents);
      await this.applyAuthoritativePayment('mercadopago', String(payment.id), payment.external_reference, amountCents, payment.currency_id, payment.status, eventId);
      await this.db.query("UPDATE webhook_events SET status='processed',processed_at=now() WHERE provider='mercadopago' AND event_id=$1", [eventId]);
      return { received: true };
    } catch (error) {
      await this.db.query("UPDATE webhook_events SET status='failed' WHERE provider='mercadopago' AND event_id=$1 AND status <> 'processed'", [eventId]);
      throw error;
    }
  }

  async handlePushinPayWebhook(input: { secret?: string; id?: string; status?: string; value?: number | string }) {
    const secret = process.env.PUSHINPAY_WEBHOOK_SECRET;
    if (!secret || !input.secret || !input.id || !/^[A-Za-z0-9-]{1,100}$/.test(input.id) || !input.status || !constantTimeTextEqual(secret, input.secret)) {
      throw new UnauthorizedException('Notificação Pushin Pay inválida.');
    }
    if (!['created', 'paid', 'canceled'].includes(input.status)) throw new UnauthorizedException('Estado Pushin Pay inválido.');
    const amountCents = Number(input.value);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new UnauthorizedException('Valor Pushin Pay inválido.');
    const eventId = `${input.id}:${input.status}`;
    const reserved = await this.db.query<{ event_id: string }>(
      `INSERT INTO webhook_events(provider,event_id,status) VALUES('pushinpay',$1,'received')
       ON CONFLICT(provider,event_id) DO UPDATE SET status='received' WHERE webhook_events.status <> 'processed'
       RETURNING event_id`, [eventId]);
    if (!reserved.rows[0]) return { received: true, duplicate: true };
    try {
      const paymentStatus = input.status === 'paid' ? 'approved' : input.status === 'canceled' ? 'cancelled' : 'pending';
      await this.applyAuthoritativePayment('pushinpay', input.id, null, amountCents, 'BRL', paymentStatus, eventId);
      await this.db.query("UPDATE webhook_events SET status='processed',processed_at=now() WHERE provider='pushinpay' AND event_id=$1", [eventId]);
      return { received: true };
    } catch (error) {
      await this.db.query("UPDATE webhook_events SET status='failed' WHERE provider='pushinpay' AND event_id=$1 AND status <> 'processed'", [eventId]);
      throw error;
    }
  }

  private async applyAuthoritativePayment(
    provider: 'mercadopago' | 'pushinpay', providerPaymentId: string, externalOrderId: string | null,
    amountCents: number, currency: string | undefined, rawStatus: string | undefined, eventId: string,
  ): Promise<void> {
    const orderId = externalOrderId;
    const paymentStatus = rawStatus === 'approved' || rawStatus === 'paid' ? 'approved'
      : ['rejected', 'cancelled', 'canceled', 'refunded'].includes(rawStatus ?? '') ? rawStatus === 'rejected' ? 'rejected' : rawStatus === 'refunded' ? 'refunded' : 'cancelled'
        : 'pending';
    await this.db.transaction(async (client) => {
      const result = await client.query<{ id: string; user_id: string; total_cents: string; status: string; provider_item_id: string; product_id: string | null; coupon_code: string | null; source_price: string | null; source_currency: string | null }>(
        `SELECT o.id,o.user_id,o.total_cents,o.status,o.provider_item_id,o.product_id,o.coupon_code,pr.source_price,pr.source_currency
         FROM orders o JOIN payments p ON p.order_id=o.id LEFT JOIN products pr ON pr.id=o.product_id
         WHERE ($1::uuid IS NULL OR o.id=$1) AND p.provider=$2 AND p.provider_payment_id=$3 AND p.amount_cents=$4 FOR UPDATE OF o,p`,
        [orderId, provider, providerPaymentId, amountCents]);
      const order = result.rows[0];
      if (order === undefined || Number(order.total_cents) !== amountCents || currency !== 'BRL') throw new UnauthorizedException('Pagamento não corresponde ao pedido.');
      const walletTopup = order.product_id === null && order.provider_item_id.startsWith('wallet:');
      if (paymentStatus === 'approved') {
        if (order.status === 'refunded') {
          await client.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1", [order.id]);
          await client.query("UPDATE webhook_events SET status='processed',processed_at=now() WHERE provider=$1 AND event_id=$2", [provider, eventId]);
          return;
        }
        if (['cancelled', 'refunded', 'review'].includes(order.status)) {
          await client.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1", [order.id]);
          await client.query("UPDATE orders SET status='review',updated_at=now() WHERE id=$1", [order.id]);
          await client.query("UPDATE webhook_events SET status='processed',processed_at=now() WHERE provider=$1 AND event_id=$2", [provider, eventId]);
          return;
        }
        if (walletTopup) {
          const credited = await client.query(
            `INSERT INTO wallet_ledger(user_id,order_id,kind,amount_cents,idempotency_key)
             VALUES($1,$2,'pix_credit',$3,$4) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,
            [order.user_id, order.id, amountCents, `pix-credit:${order.id}`]);
          if (credited.rowCount) await client.query('UPDATE wallet_accounts SET balance_cents=balance_cents+$2,updated_at=now() WHERE user_id=$1', [order.user_id, amountCents]);
          await client.query("UPDATE orders SET status='paid',updated_at=now() WHERE id=$1 AND status IN ('pending_payment','review')", [order.id]);
        } else {
          if (order.product_id && (process.env.API_PROVIDER ?? 'lzt-market') === 'lzt-market' && order.source_price && order.source_currency) {
            await client.query(
              `INSERT INTO supplier_fulfillments(order_id,provider,provider_item_id,source_price,source_currency)
               VALUES($1,'lzt-market',$2,$3,$4) ON CONFLICT(order_id) DO NOTHING`,
              [order.id, order.provider_item_id, order.source_price, order.source_currency]);
          }
          await client.query("UPDATE orders SET status='delivery_required',updated_at=now() WHERE id=$1 AND status IN ('pending_payment','review')", [order.id]);
          if (order.product_id) await client.query("UPDATE products SET status='sold' WHERE id=$1", [order.product_id]);
        }
        await client.query("UPDATE payments SET status='approved',updated_at=now() WHERE order_id=$1", [order.id]);
      } else if (['rejected','cancelled','refunded'].includes(paymentStatus)) {
        if (order.status === 'pending_payment') {
          await client.query("UPDATE payments SET status=$2,updated_at=now() WHERE order_id=$1", [order.id, paymentStatus]);
          await client.query("UPDATE orders SET status='cancelled',updated_at=now() WHERE id=$1", [order.id]);
          if (order.coupon_code) await client.query('UPDATE coupons SET redemption_count=GREATEST(0,redemption_count-1) WHERE code=$1', [order.coupon_code]);
        } else if (['paid','delivery_required','delivered'].includes(order.status)) {
          await client.query("UPDATE payments SET status='review',updated_at=now() WHERE order_id=$1", [order.id]);
          await client.query("UPDATE orders SET status='review',updated_at=now() WHERE id=$1", [order.id]);
        } else {
          await client.query("UPDATE payments SET status=$2,updated_at=now() WHERE order_id=$1", [order.id, paymentStatus]);
        }
      } else {
        await client.query("UPDATE payments SET status='pending',updated_at=now() WHERE order_id=$1 AND status IN ('creating','pending','review')", [order.id]);
      }
      await client.query("UPDATE webhook_events SET status='processed',processed_at=now() WHERE provider=$1 AND event_id=$2", [provider, eventId]);
    });
  }

  private async linkMercadoPagoPayment(orderId: string, paymentId: string, amountCents: number): Promise<void> {
    await this.db.transaction(async (client) => {
      const result = await client.query<{ order_id: string; provider_payment_id: string | null }>(
        `SELECT order_id,provider_payment_id FROM payments
         WHERE order_id=$1::uuid AND provider='mercadopago' AND provider_reference=$1 AND amount_cents=$2 FOR UPDATE`,
        [orderId, amountCents]);
      const row = result.rows[0];
      if (!row) return;
      if (row.provider_payment_id === paymentId) return;
      if (row.provider_payment_id !== null) throw new UnauthorizedException('A cobrança já está vinculada a outro pagamento.');
      await client.query(
        `UPDATE payments SET provider_payment_id=$2,updated_at=now()
         WHERE order_id=$1 AND provider='mercadopago' AND provider_payment_id IS NULL`,
        [row.order_id, paymentId]);
    });
  }

  async cancelUnpaidOrder(orderId: string): Promise<void> {
    await this.db.transaction(async (client) => {
      const cancelled = await client.query<{ coupon_code: string | null }>(
        "UPDATE orders SET status='cancelled',updated_at=now() WHERE id=$1 AND status='pending_payment' RETURNING coupon_code", [orderId]);
      if (!cancelled.rows[0]) return;
      await client.query("UPDATE payments SET status='cancelled',updated_at=now() WHERE order_id=$1 AND status IN ('creating','pending')", [orderId]);
      const couponCode = cancelled.rows[0]?.coupon_code;
      if (couponCode) await client.query('UPDATE coupons SET redemption_count=GREATEST(0,redemption_count-1) WHERE code=$1', [couponCode]);
    });
  }
}
