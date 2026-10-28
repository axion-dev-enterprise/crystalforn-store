import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { CatalogService } from '../catalog/catalog.service';
import type { AuthenticatedUser } from '../../common/auth.types';
import type { CreateOrderDto } from './commerce.dto';
import { requirePurchaseTermsVersion } from '../legal/terms-status';
import { requireMarketplaceCompliance, requirePaymentCategoryApproval } from '../legal/commerce-release-status';
import { STORE_CATALOG_GAMES } from '../catalog/catalog.mapper';

type OrderRow = { id: string; user_id: string; provider_item_id: string; game: string; product_title: string; base_price_cents: string; discount_cents: string; total_cents: string; payment_method: 'pix' | 'wallet'; status: string };
type ExistingOrderRow = OrderRow & { email: string; product_id: string | null; coupon_code: string | null; payment_provider: string | null };

function deliveryKey(): Buffer {
  const raw = process.env.DELIVERY_ENCRYPTION_KEY;
  if (!raw || !/^[a-f\d]{64}$/i.test(raw)) throw new ServiceUnavailableException('Entrega segura indisponível: configure a chave de criptografia.');
  return Buffer.from(raw, 'hex');
}

@Injectable()
export class CommerceService {
  constructor(private readonly db: DatabaseService, private readonly catalog: CatalogService) {}

  private reuseCheckoutOrder(existing: ExistingOrderRow, input: CreateOrderDto): { order: OrderRow; email: string } {
    const expectedCoupon = input.couponCode?.toUpperCase() ?? null;
    if (existing.product_id !== input.productId.toLowerCase() || existing.payment_method !== input.paymentMethod || existing.coupon_code !== expectedCoupon) {
      throw new ConflictException('Esta chave de idempotência já foi usada com outro pedido. Gere uma nova chave.');
    }
    if (input.paymentMethod === 'pix' && existing.payment_provider && existing.payment_provider !== (input.gateway ?? 'mercadopago')) {
      throw new ConflictException('Esta chave de idempotência já foi usada com outro provedor Pix. Gere uma nova chave.');
    }
    const { email, product_id: _productId, coupon_code: _couponCode, payment_provider: _paymentProvider, ...order } = existing;
    return { order, email };
  }

  private reuseTopupOrder(existing: ExistingOrderRow, amountCents: number): { order: OrderRow; email: string } {
    if (existing.product_id !== null || !existing.provider_item_id.startsWith('wallet:') || existing.payment_method !== 'pix'
      || Number(existing.total_cents) !== amountCents || (existing.payment_provider && existing.payment_provider !== 'mercadopago')) {
      throw new ConflictException('Esta chave de idempotência já foi usada com outra operação. Gere uma nova chave.');
    }
    const { email, product_id: _productId, coupon_code: _couponCode, payment_provider: _paymentProvider, ...order } = existing;
    return { order, email };
  }

  async createOrder(user: AuthenticatedUser, input: CreateOrderDto, idempotencyKey: string): Promise<{ order: OrderRow; email: string; pix?: unknown }> {
    requireMarketplaceCompliance();
    if (input.paymentMethod === 'pix') requirePaymentCategoryApproval(input.gateway ?? 'mercadopago');
    const purchaseTermsVersion = requirePurchaseTermsVersion();
    const prior = await this.db.query<ExistingOrderRow>(
      `SELECT o.*,u.email,p.provider AS payment_provider FROM orders o JOIN users u ON u.id=o.user_id
       LEFT JOIN payments p ON p.order_id=o.id WHERE o.user_id=$1 AND o.idempotency_key=$2`,
      [user.id, idempotencyKey]);
    if (prior.rows[0]) return this.reuseCheckoutOrder(prior.rows[0], input);
    const product = await this.catalog.detail(input.productId);
    if (!product) throw new NotFoundException('Produto indisponível.');
    const providerItemId = String(product.provider_item_id);
    const initialCost = await this.db.query<{ source_price: string; source_currency: string }>(
      'SELECT source_price,source_currency FROM products WHERE id=$1 AND status=\'available\'', [input.productId]);
    if (!initialCost.rows[0]) throw new ConflictException('O preço do fornecedor mudou. Atualize o catálogo antes de continuar.');
    const sourcePriceSnapshot = initialCost.rows[0].source_price;
    const sourceCurrencySnapshot = initialCost.rows[0].source_currency.trim();
    let freshItem: Record<string, unknown> | null;
    try { freshItem = await this.catalog.revalidateProviderItem(providerItemId, String(product.game)); }
    catch { throw new ServiceUnavailableException('Não foi possível confirmar o estoque. Nenhuma cobrança foi criada.'); }
    if (!freshItem) {
      await this.db.query("UPDATE products SET status='hidden',synced_at=now() WHERE provider_item_id=$1 AND status='available'", [providerItemId]);
      throw new ConflictException('Esta conta não está mais disponível e foi removida do catálogo. Nenhuma cobrança ou débito de carteira foi feito.');
    }
    await this.catalog.importProviderItems([{ ...freshItem, catalog_game_hint: String(product.game) }]);
    const refreshedProduct = await this.catalog.detail(input.productId);
    if (!refreshedProduct) throw new ConflictException('Esta conta ficou indisponível durante a conferência.');
    const refreshedCost = await this.db.query<{ source_price: string; source_currency: string }>(
      'SELECT source_price,source_currency FROM products WHERE id=$1 AND status=\'available\'', [input.productId]);
    if (!refreshedCost.rows[0] || refreshedCost.rows[0].source_price !== sourcePriceSnapshot || refreshedCost.rows[0].source_currency.trim() !== sourceCurrencySnapshot) {
      throw new ConflictException('O preço do fornecedor mudou durante a conferência. Revise o catálogo antes de pagar.');
    }
    if (Number(refreshedProduct.price_brl_cents) !== Number(product.price_brl_cents) || JSON.stringify(refreshedProduct.attributes) !== JSON.stringify(product.attributes)) {
      throw new ConflictException('O inventário ou o preço foi atualizado. Revise os dados antes de confirmar novamente.');
    }

    try {
      return await this.db.transaction(async (client) => {
        const existing = await client.query<ExistingOrderRow>(
          `SELECT o.*,u.email,p.provider AS payment_provider FROM orders o JOIN users u ON u.id=o.user_id
           LEFT JOIN payments p ON p.order_id=o.id WHERE o.user_id=$1 AND o.idempotency_key=$2 FOR UPDATE OF o`, [user.id, idempotencyKey]);
        if (existing.rows[0]) return this.reuseCheckoutOrder(existing.rows[0], input);

        const productRow = await client.query<{ id: string; provider_item_id: string; game: string; generated_title: string; price_brl_cents: string | null; status: string; seller_id: string | null; source_price: string; source_currency: string }>(
          `SELECT p.id,p.provider_item_id,p.game,p.generated_title,p.price_brl_cents,p.status,p.seller_id,p.source_price,p.source_currency
           FROM products p LEFT JOIN seller_blocklist b ON b.seller_id=p.seller_id
           LEFT JOIN catalog_item_overrides o ON o.product_id=p.id
            WHERE p.id=$1 AND p.status='available' AND p.price_brl_cents > 0 AND b.seller_id IS NULL AND COALESCE(o.hidden,false)=false
              AND p.game=ANY($2::text[]) FOR UPDATE OF p`, [input.productId, [...STORE_CATALOG_GAMES]]);
        const current = productRow.rows[0];
        if (!current || current.provider_item_id !== providerItemId) throw new ConflictException('O produto mudou de disponibilidade. Atualize o catálogo.');
        if (current.source_price !== sourcePriceSnapshot || current.source_currency.trim() !== sourceCurrencySnapshot) throw new ConflictException('O custo do fornecedor mudou. Atualize o catálogo antes de pagar.');
        const baseCents = Number(current.price_brl_cents);
        let discountCents = 0;
        let couponCode: string | null = null;
        if (input.couponCode) {
          const normalizedCode = input.couponCode.toUpperCase();
          const coupon = await client.query<{ discount_percent: number; max_redemptions: number | null; redemption_count: number }>(
            `SELECT discount_percent,max_redemptions,redemption_count FROM coupons
             WHERE code=$1 AND active=true AND (starts_at IS NULL OR starts_at <= now()) AND (expires_at IS NULL OR expires_at > now())
               AND (max_redemptions IS NULL OR redemption_count < max_redemptions) FOR UPDATE`, [normalizedCode]);
          if (!coupon.rows[0]) throw new ConflictException('Cupom inválido, expirado ou sem utilizações disponíveis.');
          discountCents = Math.floor(baseCents * coupon.rows[0].discount_percent / 100);
          couponCode = normalizedCode;
          await client.query('UPDATE coupons SET redemption_count=redemption_count+1 WHERE code=$1', [normalizedCode]);
        }
        const totalCents = Math.max(0, baseCents - discountCents);
        const inserted = await client.query<OrderRow>(
          `INSERT INTO orders(user_id,product_id,provider_item_id,game,product_title,base_price_cents,discount_cents,total_cents,status,coupon_code,payment_method,idempotency_key,expires_at,terms_accepted_at,terms_version)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CASE WHEN $11='pix' THEN now()+interval '30 minutes' ELSE NULL END,now(),$13)
           RETURNING *`,
          [user.id, current.id, current.provider_item_id, current.game, current.generated_title, baseCents, discountCents, totalCents,
            input.paymentMethod === 'wallet' ? 'delivery_required' : 'pending_payment', couponCode, input.paymentMethod, idempotencyKey, purchaseTermsVersion]);
        const order = inserted.rows[0];
        if (input.paymentMethod === 'wallet') {
          const debited = await client.query<{ balance_cents: string }>(
            `UPDATE wallet_accounts SET balance_cents=balance_cents-$2,updated_at=now()
             WHERE user_id=$1 AND balance_cents >= $2 RETURNING balance_cents`, [user.id, totalCents]);
          if (!debited.rows[0]) throw new ConflictException('Saldo insuficiente na carteira.');
          await client.query(`INSERT INTO wallet_ledger(user_id,order_id,kind,amount_cents,idempotency_key)
            VALUES($1,$2,'purchase_debit',$3,$4)`, [user.id, order.id, -totalCents, `purchase:${order.id}`]);
          await client.query(`UPDATE products SET status='sold' WHERE id=$1`, [current.id]);
          if ((process.env.API_PROVIDER ?? 'lzt-market') === 'lzt-market') {
            await client.query(
              `INSERT INTO supplier_fulfillments(order_id,provider,provider_item_id,source_price,source_currency)
               VALUES($1,'lzt-market',$2,$3,$4) ON CONFLICT(order_id) DO NOTHING`,
              [order.id, current.provider_item_id, current.source_price, current.source_currency]);
          }
        }
        const person = await client.query<{ email: string }>('SELECT email FROM users WHERE id=$1', [user.id]);
        return { order, email: person.rows[0].email };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const concurrent = await this.db.query<ExistingOrderRow>(
          `SELECT o.*,u.email,p.provider AS payment_provider FROM orders o JOIN users u ON u.id=o.user_id
           LEFT JOIN payments p ON p.order_id=o.id WHERE o.user_id=$1 AND o.idempotency_key=$2`, [user.id, idempotencyKey]);
        if (concurrent.rows[0]) return this.reuseCheckoutOrder(concurrent.rows[0], input);
        throw new ConflictException('Este item já está reservado ou foi comprado.');
      }
      throw error;
    }
  }

  async createWalletTopup(user: AuthenticatedUser, amountCents: number, idempotencyKey: string): Promise<{ order: OrderRow; email: string }> {
    requirePaymentCategoryApproval('mercadopago');
    requirePurchaseTermsVersion();
    if (!Number.isSafeInteger(amountCents) || amountCents < 500 || amountCents > 500_000) throw new ConflictException('O valor deve ficar entre R$ 5,00 e R$ 5.000,00.');
    try {
      return await this.db.transaction(async (client) => {
        const existing = await client.query<ExistingOrderRow>(
          `SELECT o.*,u.email,p.provider AS payment_provider FROM orders o JOIN users u ON u.id=o.user_id
           LEFT JOIN payments p ON p.order_id=o.id WHERE o.user_id=$1 AND o.idempotency_key=$2 FOR UPDATE OF o`, [user.id, idempotencyKey]);
        if (existing.rows[0]) return this.reuseTopupOrder(existing.rows[0], amountCents);
        const order = await client.query<OrderRow>(
          `INSERT INTO orders(user_id,provider_item_id,game,product_title,base_price_cents,total_cents,status,payment_method,idempotency_key,expires_at)
           VALUES($1,$2,'other','Crédito para carteira', $3,$3,'pending_payment','pix',$4,now()+interval '30 minutes') RETURNING *`,
          [user.id, `wallet:${randomBytes(8).toString('hex')}`, amountCents, idempotencyKey]);
        const userRow = await client.query<{ email: string }>('SELECT email FROM users WHERE id=$1', [user.id]);
        return { order: order.rows[0], email: userRow.rows[0].email };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const concurrent = await this.db.query<ExistingOrderRow>(
          `SELECT o.*,u.email,p.provider AS payment_provider FROM orders o JOIN users u ON u.id=o.user_id
           LEFT JOIN payments p ON p.order_id=o.id WHERE o.user_id=$1 AND o.idempotency_key=$2`, [user.id, idempotencyKey]);
        if (concurrent.rows[0]) return this.reuseTopupOrder(concurrent.rows[0], amountCents);
      }
      throw error;
    }
  }

  async wallet(userId: string) {
    const [account, ledger] = await Promise.all([
      this.db.query<{ balance_cents: string }>('SELECT balance_cents FROM wallet_accounts WHERE user_id=$1', [userId]),
      this.db.query('SELECT kind,amount_cents,order_id,created_at FROM wallet_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [userId]),
    ]);
    return { balanceCents: Number(account.rows[0]?.balance_cents ?? 0), currency: 'BRL', entries: ledger.rows };
  }

  async orders(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const [result, count] = await Promise.all([this.db.query(
      `SELECT o.id,o.product_title,o.game,o.base_price_cents,o.discount_cents,o.total_cents,o.status,o.payment_method,o.created_at,o.updated_at,
              p.pix_copy_paste,p.pix_qr_base64,p.expires_at AS pix_expires_at,
              sf.status AS fulfillment_status,(d.order_id IS NOT NULL) AS delivery_available,
              cr.status AS cancellation_request_status,cr.customer_message AS cancellation_request_message,
              cr.admin_response AS cancellation_request_response,cr.created_at AS cancellation_request_created_at,
              cr.updated_at AS cancellation_request_updated_at
       FROM orders o LEFT JOIN payments p ON p.order_id=o.id
       LEFT JOIN supplier_fulfillments sf ON sf.order_id=o.id
       LEFT JOIN account_deliveries d ON d.order_id=o.id
       LEFT JOIN customer_cancellation_requests cr ON cr.order_id=o.id AND cr.user_id=o.user_id
       WHERE o.user_id=$1 ORDER BY o.created_at DESC,o.id DESC LIMIT $2 OFFSET $3`, [userId, pageSize, offset]),
      this.db.query<{ total: string }>('SELECT count(*)::text AS total FROM orders WHERE user_id=$1', [userId])]);
    return { items: result.rows, page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  }

  async cancellationRequestForCustomer(orderId: string, userId: string) {
    const order = await this.db.query<{ id: string }>('SELECT id FROM orders WHERE id=$1 AND user_id=$2 AND product_id IS NOT NULL', [orderId, userId]);
    if (!order.rows[0]) throw new NotFoundException('Pedido de produto não encontrado.');
    const request = await this.db.query(
      `SELECT order_id,status,customer_message,admin_response,created_at,updated_at
       FROM customer_cancellation_requests WHERE order_id=$1 AND user_id=$2`, [orderId, userId]);
    return request.rows[0] ?? null;
  }

  async createCancellationRequest(orderId: string, userId: string, message: string) {
    return this.db.transaction(async (client) => {
      const order = await client.query<{ id: string; status: string }>(
        'SELECT id,status FROM orders WHERE id=$1 AND user_id=$2 AND product_id IS NOT NULL FOR UPDATE', [orderId, userId]);
      if (!order.rows[0]) throw new NotFoundException('Pedido de produto não encontrado.');
      if (['cancelled', 'refunded'].includes(order.rows[0].status)) throw new ConflictException('Este pedido já foi cancelado ou devolvido.');
      const inserted = await client.query(
        `INSERT INTO customer_cancellation_requests(order_id,user_id,customer_message)
         VALUES($1,$2,$3) ON CONFLICT(order_id) DO NOTHING
         RETURNING order_id,status,customer_message,admin_response,created_at,updated_at`,
        [orderId, userId, message.trim()]);
      if (!inserted.rows[0]) {
        const existing = await client.query(
          `SELECT order_id,status,customer_message,admin_response,created_at,updated_at
           FROM customer_cancellation_requests WHERE order_id=$1 AND user_id=$2`, [orderId, userId]);
        if (!existing.rows[0]) throw new ConflictException('Já existe uma solicitação para este pedido. Consulte o suporte da loja.');
        return existing.rows[0];
      }
      return inserted.rows[0];
    });
  }

  async saveDelivery(orderId: string, credentials: string, adminId: string) {
    if (!credentials.trim()) throw new ConflictException('Informe as credenciais de entrega.');
    const key = deliveryKey();
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    const ciphertext = Buffer.concat([cipher.update(credentials, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    await this.db.transaction(async (client) => {
      const order = await client.query<{ status: string }>('SELECT status FROM orders WHERE id=$1 FOR UPDATE', [orderId]);
      if (!order.rows[0] || !['paid','delivery_required'].includes(order.rows[0].status)) throw new NotFoundException('Pedido pago não encontrado.');
      const fulfillment = await client.query<{ status: string }>('SELECT status FROM supplier_fulfillments WHERE order_id=$1 FOR UPDATE', [orderId]);
      if (fulfillment.rows[0]?.status === 'processing') throw new ConflictException('A compra automática está sendo processada. Aguarde o resultado antes de registrar outra entrega.');
      await client.query(`INSERT INTO account_deliveries(order_id,ciphertext,nonce,auth_tag)
        VALUES($1,$2,$3,$4) ON CONFLICT(order_id) DO UPDATE SET ciphertext=EXCLUDED.ciphertext,nonce=EXCLUDED.nonce,auth_tag=EXCLUDED.auth_tag,delivered_at=NULL`,
        [orderId, ciphertext, nonce, authTag]);
      if (fulfillment.rows[0]) await client.query(
        "UPDATE supplier_fulfillments SET status='completed',error_code=NULL,completed_at=now(),updated_at=now() WHERE order_id=$1",
        [orderId]);
      await client.query(`UPDATE orders SET status='delivery_required',updated_at=now() WHERE id=$1`, [orderId]);
      await client.query(`INSERT INTO admin_audit(actor_id,action,target_id) VALUES($1,'delivery_saved',$2)`, [adminId, orderId]);
    });
    return { ok: true };
  }

  async deliveryForCustomer(orderId: string, userId: string) {
    return this.db.transaction(async (client: PoolClient) => {
      const result = await client.query<{ status: string; ciphertext: Buffer; nonce: Buffer; auth_tag: Buffer }>(
        `SELECT o.status,d.ciphertext,d.nonce,d.auth_tag FROM orders o JOIN account_deliveries d ON d.order_id=o.id
         WHERE o.id=$1 AND o.user_id=$2 FOR UPDATE OF o,d`, [orderId, userId]);
      const row = result.rows[0];
      if (!row) throw new NotFoundException('Entrega ainda não está disponível.');
      if (!['paid','delivery_required','delivered'].includes(row.status)) throw new UnauthorizedException('O pagamento precisa ser confirmado antes da entrega.');
      const decipher = createDecipheriv('aes-256-gcm', deliveryKey(), row.nonce);
      decipher.setAuthTag(row.auth_tag);
      const credentials = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]).toString('utf8');
      await client.query(`UPDATE account_deliveries SET delivered_at=COALESCE(delivered_at,now()) WHERE order_id=$1`, [orderId]);
      await client.query(`UPDATE orders SET status='delivered',updated_at=now() WHERE id=$1 AND status IN ('paid','delivery_required')`, [orderId]);
      return { credentials };
    });
  }
}
