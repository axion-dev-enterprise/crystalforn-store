import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { AdminOrdersQueryDto, CouponDto, StoreSettingsDto } from './admin.dto';
import type { CancellationRequestReviewDto } from '../commerce/commerce.dto';

const syncErrorMessage: Record<string, string> = {
  feedback_contract_error: 'Formato de dados do fornecedor inválido.',
  feedback_http_error: 'O fornecedor respondeu com erro.',
  feedback_json_error: 'A resposta do fornecedor não pôde ser interpretada.',
  generic_sync_state: 'O estado da sincronização está inválido.',
  invalid_contract: 'O formato dos dados do catálogo é inválido.',
  invalid_feedback_contract: 'Formato de dados do fornecedor inválido.',
  invalid_feedback_json: 'A resposta do fornecedor não pôde ser interpretada.',
  invalid_json: 'A resposta do fornecedor não pôde ser interpretada.',
  marketplace_not_approved: 'A conta do fornecedor ainda não foi aprovada.',
  max_pages_reached: 'O limite de páginas foi atingido; o worker retomará a varredura.',
  pagination_cursor_missing: 'O cursor de paginação não foi retornado.',
  pagination_cursor_rejected: 'O cursor de paginação foi rejeitado.',
  pagination_incomplete: 'A varredura ficou incompleta e será retomada.',
  pagination_stalled: 'A paginação não avançou e será retomada.',
  provider_rate_limited: 'O limite de consultas do fornecedor foi atingido.',
  provider_status_not_success: 'O fornecedor retornou um status de erro.',
  provider_unreachable: 'O fornecedor não respondeu.',
  unknown_incomplete: 'A execução terminou sem confirmação de conclusão.',
  worker_error: 'O processo de sincronização encontrou uma falha interna.',
};

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  async getSettings() {
    const [settings, sellers] = await Promise.all([
      this.db.query<{ setting_key: string; setting_value: unknown }>('SELECT setting_key,setting_value FROM store_settings'),
      this.db.query<{ seller_id: string }>('SELECT seller_id FROM seller_blocklist ORDER BY seller_id'),
    ]);
    const values = Object.fromEntries(settings.rows.map((row) => [row.setting_key, row.setting_value])) as Record<string, unknown>;
    return {
      markupPercent: Number(values.markup_percent ?? 55),
      usdBrlRate: values.usd_brl_rate ?? null,
      rubBrlRate: values.rub_brl_rate ?? null,
      blockedSellerIds: sellers.rows.map((row) => row.seller_id),
    };
  }

  async setSettings(input: StoreSettingsDto) {
    await this.db.transaction(async (client) => {
      for (const [key, value] of [['markup_percent', input.markupPercent], ['usd_brl_rate', input.usdBrlRate ?? null], ['rub_brl_rate', input.rubBrlRate ?? null]] as const) {
        await client.query(`INSERT INTO store_settings(setting_key,setting_value) VALUES($1,$2::jsonb)
          ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()`, [key, JSON.stringify(value)]);
      }
      await client.query(`
        WITH recalculated AS (
          SELECT id, CASE source_currency
            WHEN 'BRL' THEN round(source_price * 100 * (1 + $1::numeric / 100))
            WHEN 'USD' THEN CASE WHEN $2::numeric IS NOT NULL THEN round(source_price * $2::numeric * 100 * (1 + $1::numeric / 100)) END
            WHEN 'RUB' THEN CASE WHEN $3::numeric IS NOT NULL THEN round(source_price * $3::numeric * 100 * (1 + $1::numeric / 100)) END
            ELSE NULL
          END AS price_cents
          FROM products WHERE status <> 'sold'
        )
        UPDATE products p SET markup_percent=$1,
          price_brl_cents=CASE WHEN recalculated.price_cents BETWEEN 1 AND 9007199254740991
            THEN recalculated.price_cents::bigint ELSE NULL END
        FROM recalculated WHERE p.id=recalculated.id
      `, [input.markupPercent, input.usdBrlRate ?? null, input.rubBrlRate ?? null]);
      await client.query('DELETE FROM seller_blocklist');
      for (const sellerId of [...new Set(input.blockedSellerIds)]) await client.query('INSERT INTO seller_blocklist(seller_id) VALUES($1)', [sellerId]);
    });
    return this.getSettings();
  }

  async listCoupons() {
    const result = await this.db.query('SELECT code,discount_percent,active,max_redemptions,redemption_count,starts_at,expires_at FROM coupons ORDER BY created_at DESC');
    return result.rows;
  }

  async createCoupon(input: CouponDto) {
    const code = input.code.trim().toUpperCase();
    const result = await this.db.query(
      `INSERT INTO coupons(code,discount_percent,max_redemptions) VALUES($1,$2,$3)
       ON CONFLICT(code) DO UPDATE SET discount_percent=EXCLUDED.discount_percent,active=true,max_redemptions=EXCLUDED.max_redemptions
       RETURNING code,discount_percent,active,max_redemptions,redemption_count`, [code, input.discountPercent, input.maxRedemptions ?? null]);
    return result.rows[0];
  }

  async dashboard() {
    const [result, sync] = await Promise.all([
      this.db.query<{ status: string; count: string; revenue_cents: string }>(
      `SELECT status,count(*)::text AS count,COALESCE(sum(total_cents) FILTER (WHERE status IN ('paid','delivery_required','delivered')),0)::text AS revenue_cents
       FROM orders GROUP BY status`),
      this.db.query<{ started_at: Date; finished_at: Date | null; pages_read: number; items_seen: number; items_upserted: number; complete: boolean; error_code: string | null }>(
        `SELECT started_at,finished_at,pages_read,items_seen,items_upserted,complete,error_code
         FROM catalog_sync_runs ORDER BY started_at DESC LIMIT 1`),
    ]);
    const latestSync = sync.rows[0];
    return {
      orders: result.rows,
      currency: 'BRL',
      catalogSync: latestSync ? {
        status: latestSync.finished_at ? (latestSync.complete ? 'complete' : 'failed') : 'running',
        startedAt: latestSync.started_at,
        finishedAt: latestSync.finished_at,
        pagesRead: latestSync.pages_read,
        itemsSeen: latestSync.items_seen,
        itemsUpserted: latestSync.items_upserted,
        errorMessage: latestSync.error_code ? syncErrorMessage[latestSync.error_code] ?? 'A sincronização encontrou um erro. Consulte os logs operacionais protegidos.' : null,
      } : null,
    };
  }

  async listOrders(query: AdminOrdersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim() || null;
    const result = await this.db.query(
      `WITH filtered AS (
         SELECT o.id,o.product_title,o.status,o.total_cents,o.created_at,
                f.status AS fulfillment_status,f.error_code AS fulfillment_error,p.status AS payment_status
         FROM orders o LEFT JOIN supplier_fulfillments f ON f.order_id=o.id
         LEFT JOIN payments p ON p.order_id=o.id
         WHERE $1::text IS NULL OR o.id::text ILIKE '%' || $1 || '%'
           OR o.product_title ILIKE '%' || $1 || '%' OR o.status ILIKE '%' || $1 || '%'
           OR (CASE o.status
             WHEN 'pending_payment' THEN 'aguardando pagamento'
             WHEN 'paid' THEN 'pago'
             WHEN 'delivery_required' THEN 'entrega pendente'
             WHEN 'delivered' THEN 'entregue'
             WHEN 'cancelled' THEN 'cancelado'
             WHEN 'refunded' THEN 'valor devolvido à carteira'
             WHEN 'review' THEN 'em revisão'
             ELSE 'outro estado' END) ILIKE '%' || $1 || '%'
           OR COALESCE(p.status,'') ILIKE '%' || $1 || '%'
       ), counted AS (SELECT count(*)::int AS total FROM filtered)
       SELECT filtered.*,counted.total FROM filtered CROSS JOIN counted
       ORDER BY filtered.created_at DESC,filtered.id DESC LIMIT $2 OFFSET $3`,
      [search, pageSize, (page - 1) * pageSize]);
    const total = result.rows.length ? Number(result.rows[0].total) : await this.countOrders(search);
    return { items: result.rows.map(({ total: _total, ...row }) => row), page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  private async countOrders(search: string | null) {
    const result = await this.db.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM orders o LEFT JOIN payments p ON p.order_id=o.id
       WHERE $1::text IS NULL OR o.id::text ILIKE '%' || $1 || '%'
         OR o.product_title ILIKE '%' || $1 || '%' OR o.status ILIKE '%' || $1 || '%'
         OR (CASE o.status
           WHEN 'pending_payment' THEN 'aguardando pagamento'
           WHEN 'paid' THEN 'pago'
           WHEN 'delivery_required' THEN 'entrega pendente'
           WHEN 'delivered' THEN 'entregue'
           WHEN 'cancelled' THEN 'cancelado'
           WHEN 'refunded' THEN 'valor devolvido à carteira'
           WHEN 'review' THEN 'em revisão'
           ELSE 'outro estado' END) ILIKE '%' || $1 || '%'
         OR COALESCE(p.status,'') ILIKE '%' || $1 || '%'`, [search]);
    return Number(result.rows[0]?.total ?? 0);
  }

  async listCancellationRequests() {
    const result = await this.db.query(
      `SELECT cr.order_id,cr.customer_message,cr.status,cr.admin_response,
              cr.created_at,cr.updated_at,o.product_title,o.total_cents,o.payment_method,o.status AS order_status
       FROM customer_cancellation_requests cr
       JOIN orders o ON o.id=cr.order_id AND o.user_id=cr.user_id
       ORDER BY CASE cr.status WHEN 'open' THEN 0 WHEN 'under_review' THEN 1 ELSE 2 END,cr.created_at ASC
       LIMIT 200`);
    return result.rows;
  }

  async reviewCancellationRequest(orderId: string, input: CancellationRequestReviewDto, adminId: string) {
    if (['resolved', 'declined'].includes(input.status) && !input.adminResponse?.trim()) {
      throw new BadRequestException('Informe uma resposta antes de concluir a solicitação.');
    }
    return this.db.transaction(async (client) => {
      const updated = await client.query(
        `UPDATE customer_cancellation_requests
         SET status=$2,admin_response=COALESCE($3,admin_response),reviewed_by=$4,updated_at=now()
         WHERE order_id=$1
         RETURNING order_id,status,customer_message,admin_response,created_at,updated_at`,
        [orderId, input.status, input.adminResponse?.trim() || null, adminId]);
      if (!updated.rows[0]) throw new NotFoundException('Solicitação de cancelamento não encontrada.');
      await client.query(`INSERT INTO admin_audit(actor_id,action,target_id) VALUES($1,'cancellation_request_reviewed',$2)`, [adminId, orderId]);
      return updated.rows[0];
    });
  }

  async setCouponActive(code: string, active: boolean) {
    const result = await this.db.query('UPDATE coupons SET active=$2 WHERE code=$1 RETURNING code,discount_percent,active,max_redemptions,redemption_count', [code.toUpperCase(), active]);
    if (!result.rows[0]) throw new NotFoundException('Cupom não encontrado.');
    return result.rows[0];
  }

  async orderForDelivery(id: string) {
    const result = await this.db.query<{ id: string; status: string }>('SELECT id,status FROM orders WHERE id=$1', [id]);
    if (!result.rows[0]) throw new NotFoundException('Pedido não encontrado.');
    if (!['paid','delivery_required'].includes(result.rows[0].status)) throw new NotFoundException('Pedido ainda não pode receber credenciais.');
    return result.rows[0];
  }
}
