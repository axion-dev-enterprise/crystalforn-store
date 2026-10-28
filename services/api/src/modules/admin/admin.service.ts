import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { AdminCatalogQueryDto, AdminOrdersQueryDto, AdminPageQueryDto, CouponDto, PricingPreviewQueryDto, StoreSettingsDto } from './admin.dto';
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

type CatalogAdminRow = {
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
  attributes: Record<string, unknown>;
  synced_at: Date;
  seller_hidden: boolean;
  item_hidden: boolean;
};

function catalogQualityFlags(product: Pick<CatalogAdminRow, 'game' | 'source_title' | 'generated_title' | 'attributes' | 'price_brl_cents'>): string[] {
  const flags: string[] = [];
  if (product.source_title && /\p{Script=Cyrillic}/u.test(product.source_title)) flags.push('source_title_cyrillic');
  const title = product.generated_title.trim().toLocaleLowerCase('pt-BR');
  if (title.length < 14 || title === product.game) flags.push('generic_title');
  const inventory = product.attributes?.inventory;
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory) || Object.keys(inventory).length === 0) {
    flags.push('missing_inventory');
  }
  if (!product.price_brl_cents || Number(product.price_brl_cents) <= 0) flags.push('price_unavailable');
  return flags;
}

function syncErrorText(errorCode: string | null): string | null {
  if (!errorCode) return null;
  return syncErrorMessage[errorCode] ?? 'A sincronização encontrou um erro. Consulte os logs operacionais protegidos.';
}

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

  async setSettings(input: StoreSettingsDto, adminId: string) {
    await this.db.transaction(async (client) => {
      const previousSettings = await client.query<{ setting_key: string; setting_value: unknown }>(
        "SELECT setting_key,setting_value FROM store_settings WHERE setting_key IN ('markup_percent','usd_brl_rate','rub_brl_rate')",
      );
      const previousSellers = await client.query<{ seller_id: string }>('SELECT seller_id FROM seller_blocklist ORDER BY seller_id');
      const before = Object.fromEntries(previousSettings.rows.map((row) => [row.setting_key, row.setting_value]));
      const beforeSellerIds = previousSellers.rows.map((row) => row.seller_id);
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
      await client.query(
        "INSERT INTO admin_audit(actor_id,action,target_id,details) VALUES($1,'store_settings_updated','store_settings',$2::jsonb)",
        [adminId, JSON.stringify({
          before: { markupPercent: before.markup_percent ?? 55, usdBrlRate: before.usd_brl_rate ?? null, rubBrlRate: before.rub_brl_rate ?? null, blockedSellerIds: beforeSellerIds },
          after: { markupPercent: input.markupPercent, usdBrlRate: input.usdBrlRate ?? null, rubBrlRate: input.rubBrlRate ?? null, blockedSellerIds: [...new Set(input.blockedSellerIds)] },
        })],
      );
    });
    return this.getSettings();
  }

  async listCatalog(query: AdminCatalogQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const search = query.search?.trim() || null;
    const minPrice = query.minPrice === undefined ? null : Math.round(query.minPrice * 100);
    const maxPrice = query.maxPrice === undefined ? null : Math.round(query.maxPrice * 100);
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      throw new BadRequestException('O preço mínimo não pode superar o preço máximo.');
    }
    const fromWhere = `
      FROM products p
      LEFT JOIN seller_blocklist b ON b.seller_id=p.seller_id
      LEFT JOIN catalog_item_overrides o ON o.product_id=p.id
      WHERE ($1::text IS NULL OR p.id::text ILIKE '%'||$1||'%' OR p.provider_item_id ILIKE '%'||$1||'%'
        OR COALESCE(p.source_title,'') ILIKE '%'||$1||'%' OR p.generated_title ILIKE '%'||$1||'%')
        AND ($2::text IS NULL OR p.game=$2)
        AND ($3::text IS NULL OR p.seller_id=$3)
        AND ($4::text IS NULL OR p.status=$4 OR ($4='hidden' AND (b.seller_id IS NOT NULL OR o.hidden=true)))
        AND ($5::text='all' OR ($5='visible' AND b.seller_id IS NULL AND COALESCE(o.hidden,false)=false)
          OR ($5='hidden' AND (b.seller_id IS NOT NULL OR o.hidden=true OR p.status='hidden')))
        AND ($6::text='all' OR (
          (COALESCE(p.source_title,'') ~ '[А-Яа-яЁё]')
          OR length(trim(p.generated_title)) < 14
          OR lower(trim(p.generated_title))=p.game
          OR p.attributes->'inventory' IS NULL
          OR jsonb_typeof(p.attributes->'inventory') <> 'object'
          OR p.attributes->'inventory'='{}'::jsonb
          OR p.price_brl_cents IS NULL OR p.price_brl_cents <= 0
        ))
        AND ($7::bigint IS NULL OR p.price_brl_cents >= $7)
        AND ($8::bigint IS NULL OR p.price_brl_cents <= $8)`;
    const values = [search, query.game ?? null, query.sellerId ?? null, query.status ?? null,
      query.visibility ?? 'all', query.quality ?? 'all', minPrice, maxPrice];
    const [rows, count] = await Promise.all([
      this.db.query<CatalogAdminRow>(
        `SELECT p.id,p.provider_item_id,p.seller_id,p.game,p.source_title,p.generated_title,p.source_currency,
          p.source_price::text,p.price_brl_cents::text,p.status,p.attributes,p.synced_at,
          (b.seller_id IS NOT NULL) AS seller_hidden,COALESCE(o.hidden,false) AS item_hidden
         ${fromWhere}
         ORDER BY p.synced_at DESC,p.id DESC LIMIT $9 OFFSET $10`,
        [...values, pageSize, (page - 1) * pageSize],
      ),
      this.db.query<{ total: string }>(`SELECT count(*)::text AS total ${fromWhere}`, values),
    ]);
    return {
      items: rows.rows.map((row) => ({ ...row, hidden: row.seller_hidden || row.item_hidden || row.status === 'hidden', qualityFlags: catalogQualityFlags(row) })),
      page,
      pageSize,
      total: Number(count.rows[0]?.total ?? 0),
      totalPages: Math.ceil(Number(count.rows[0]?.total ?? 0) / pageSize),
    };
  }

  async listCatalogSyncRuns(query: AdminPageQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, count] = await Promise.all([
      this.db.query<{
        id: string; started_at: Date; finished_at: Date | null; pages_read: number; items_seen: number;
        items_upserted: number; complete: boolean; error_code: string | null; duration_ms: string | null;
      }>(
        `SELECT id,started_at,finished_at,pages_read,items_seen,items_upserted,complete,error_code,
          CASE WHEN finished_at IS NULL THEN NULL ELSE GREATEST(0,(extract(epoch FROM finished_at-started_at)*1000)::bigint)::text END AS duration_ms
         FROM catalog_sync_runs ORDER BY started_at DESC LIMIT $1 OFFSET $2`,
        [pageSize, (page - 1) * pageSize],
      ),
      this.db.query<{ total: string }>('SELECT count(*)::text AS total FROM catalog_sync_runs'),
    ]);
    const total = Number(count.rows[0]?.total ?? 0);
    return {
      items: rows.rows.map((row) => ({
        ...row,
        status: row.finished_at ? (row.complete ? 'complete' : 'failed') : 'running',
        errorMessage: syncErrorText(row.error_code),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async listAudit(query: AdminPageQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [rows, count] = await Promise.all([
      this.db.query(
        `SELECT a.id,a.actor_id,u.email AS actor_email,a.action,a.target_id,a.details,a.created_at
         FROM admin_audit a JOIN users u ON u.id=a.actor_id
         ORDER BY a.created_at DESC,a.id DESC LIMIT $1 OFFSET $2`,
        [pageSize, (page - 1) * pageSize],
      ),
      this.db.query<{ total: string }>('SELECT count(*)::text AS total FROM admin_audit'),
    ]);
    const total = Number(count.rows[0]?.total ?? 0);
    return { items: rows.rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async pricePreview(query: PricingPreviewQueryDto) {
    const settings = await this.getSettings();
    const products = await this.db.query<{
      id: string; game: string; generated_title: string; source_price: string; source_currency: string; price_brl_cents: string;
    }>(
      `SELECT p.id,p.game,p.generated_title,p.source_price::text,p.source_currency,p.price_brl_cents::text
       FROM products p LEFT JOIN seller_blocklist b ON b.seller_id=p.seller_id
       LEFT JOIN catalog_item_overrides o ON o.product_id=p.id
       WHERE p.status='available' AND p.price_brl_cents > 0 AND b.seller_id IS NULL AND COALESCE(o.hidden,false)=false
       ORDER BY p.synced_at DESC,p.id DESC LIMIT $1`,
      [query.sampleSize ?? 10],
    );
    const rates: Record<string, number | null> = { BRL: 1, USD: settings.usdBrlRate, RUB: settings.rubBrlRate };
    const items = products.rows.map((product) => {
      const rate = rates[product.source_currency] ?? null;
      const rawCostCents = rate === null ? Number.NaN : Number(product.source_price) * rate * 100;
      const costCents = Number.isSafeInteger(Math.round(rawCostCents)) && rawCostCents >= 0 ? Math.round(rawCostCents) : null;
      const rawSimulatedPrice = costCents === null ? Number.NaN : costCents * (1 + (query.markupPercent ?? 55) / 100);
      const simulatedPriceCents = Number.isSafeInteger(Math.round(rawSimulatedPrice)) ? Math.round(rawSimulatedPrice) : null;
      const afterCouponCents = simulatedPriceCents === null || query.couponPercent === undefined
        ? simulatedPriceCents : Math.round(simulatedPriceCents * (1 - query.couponPercent / 100));
      return {
        id: product.id,
        game: product.game,
        title: product.generated_title,
        sourceCurrency: product.source_currency,
        currentPriceCents: Number(product.price_brl_cents),
        costCents,
        simulatedPriceCents,
        afterCouponCents,
      };
    });
    return { markupPercent: query.markupPercent ?? 55, couponPercent: query.couponPercent ?? null, sampleSize: items.length, items };
  }

  async setCatalogItemVisibility(id: string, hidden: boolean, adminId: string) {
    return this.db.transaction(async (client) => {
      const product = await client.query<{ id: string; provider_item_id: string; hidden: boolean }>(
        `SELECT p.id,p.provider_item_id,COALESCE(o.hidden,false) AS hidden
         FROM products p LEFT JOIN catalog_item_overrides o ON o.product_id=p.id WHERE p.id=$1 FOR UPDATE OF p`, [id]);
      const current = product.rows[0];
      if (!current) throw new NotFoundException('Anúncio não encontrado.');
      await client.query(
        `INSERT INTO catalog_item_overrides(product_id,hidden,updated_by,updated_at) VALUES($1,$2,$3,now())
         ON CONFLICT(product_id) DO UPDATE SET hidden=EXCLUDED.hidden,updated_by=EXCLUDED.updated_by,updated_at=now()`,
        [id, hidden, adminId]);
      await client.query(
        "INSERT INTO admin_audit(actor_id,action,target_id,details) VALUES($1,'catalog_item_visibility_changed',$2,$3::jsonb)",
        [adminId, current.provider_item_id, JSON.stringify({ before: { hidden: current.hidden }, after: { hidden } })]);
      return { id, hidden };
    });
  }

  async setSellerVisibility(sellerId: string, hidden: boolean, adminId: string) {
    if (!/^[0-9]{1,40}$/.test(sellerId)) throw new BadRequestException('ID de vendedor inválido.');
    return this.db.transaction(async (client) => {
      const existing = await client.query<{ seller_id: string }>('SELECT seller_id FROM seller_blocklist WHERE seller_id=$1 FOR UPDATE', [sellerId]);
      const wasHidden = Boolean(existing.rows[0]);
      if (hidden) await client.query('INSERT INTO seller_blocklist(seller_id) VALUES($1) ON CONFLICT(seller_id) DO NOTHING', [sellerId]);
      else await client.query('DELETE FROM seller_blocklist WHERE seller_id=$1', [sellerId]);
      await client.query(
        "INSERT INTO admin_audit(actor_id,action,target_id,details) VALUES($1,'seller_visibility_changed',$2,$3::jsonb)",
        [adminId, sellerId, JSON.stringify({ before: { hidden: wasHidden }, after: { hidden } })]);
      return { sellerId, hidden };
    });
  }

  async listCoupons() {
    const result = await this.db.query('SELECT code,discount_percent,active,max_redemptions,redemption_count,starts_at,expires_at FROM coupons ORDER BY created_at DESC');
    return result.rows;
  }

  async createCoupon(input: CouponDto, adminId: string) {
    const code = input.code.trim().toUpperCase();
    return this.db.transaction(async (client) => {
      const previous = await client.query<{ code: string; discount_percent: number; active: boolean; max_redemptions: number | null }>(
        'SELECT code,discount_percent,active,max_redemptions FROM coupons WHERE code=$1 FOR UPDATE', [code]);
      const result = await client.query(
        `INSERT INTO coupons(code,discount_percent,max_redemptions) VALUES($1,$2,$3)
         ON CONFLICT(code) DO UPDATE SET discount_percent=EXCLUDED.discount_percent,active=true,max_redemptions=EXCLUDED.max_redemptions
         RETURNING code,discount_percent,active,max_redemptions,redemption_count`, [code, input.discountPercent, input.maxRedemptions ?? null]);
      await client.query(
        "INSERT INTO admin_audit(actor_id,action,target_id,details) VALUES($1,'coupon_saved',$2,$3::jsonb)",
        [adminId, code, JSON.stringify({ before: previous.rows[0] ?? null, after: result.rows[0] })]);
      return result.rows[0];
    });
  }

  async dashboard() {
    const [result, sync, inventory, latestSuccess] = await Promise.all([
      this.db.query<{ status: string; count: string; revenue_cents: string }>(
      `SELECT status,count(*)::text AS count,COALESCE(sum(total_cents) FILTER (WHERE status IN ('paid','delivery_required','delivered')),0)::text AS revenue_cents
       FROM orders GROUP BY status`),
      this.db.query<{ started_at: Date; finished_at: Date | null; pages_read: number; items_seen: number; items_upserted: number; complete: boolean; error_code: string | null }>(
        `SELECT started_at,finished_at,pages_read,items_seen,items_upserted,complete,error_code
         FROM catalog_sync_runs ORDER BY started_at DESC LIMIT 1`),
      this.db.query<{ total: string; visible: string; hidden: string; unavailable: string; needs_review: string }>(
        `SELECT count(*)::text AS total,
          count(*) FILTER (WHERE p.status='available' AND p.price_brl_cents > 0 AND b.seller_id IS NULL
            AND COALESCE(o.hidden,false)=false)::text AS visible,
          count(*) FILTER (WHERE b.seller_id IS NOT NULL OR o.hidden=true OR p.status='hidden')::text AS hidden,
          count(*) FILTER (WHERE p.status<>'available' OR p.price_brl_cents IS NULL OR p.price_brl_cents<=0)::text AS unavailable,
          count(*) FILTER (WHERE COALESCE(p.source_title,'') ~ '[А-Яа-яЁё]' OR length(trim(p.generated_title))<14
            OR lower(trim(p.generated_title))=p.game OR p.attributes->'inventory' IS NULL
            OR jsonb_typeof(p.attributes->'inventory')<>'object' OR p.attributes->'inventory'='{}'::jsonb)::text AS needs_review
         FROM products p LEFT JOIN seller_blocklist b ON b.seller_id=p.seller_id
         LEFT JOIN catalog_item_overrides o ON o.product_id=p.id`),
      this.db.query<{ finished_at: Date }>(
        "SELECT finished_at FROM catalog_sync_runs WHERE complete=true AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1",
      ),
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
        durationMs: latestSync.finished_at ? Math.max(0, latestSync.finished_at.getTime() - latestSync.started_at.getTime()) : null,
        lastSuccessAt: latestSuccess.rows[0]?.finished_at ?? null,
        errorMessage: syncErrorText(latestSync.error_code),
      } : null,
      inventoryAvailability: {
        total: Number(inventory.rows[0]?.total ?? 0),
        visible: Number(inventory.rows[0]?.visible ?? 0),
        hidden: Number(inventory.rows[0]?.hidden ?? 0),
        unavailable: Number(inventory.rows[0]?.unavailable ?? 0),
        needsReview: Number(inventory.rows[0]?.needs_review ?? 0),
      },
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
      const previous = await client.query<{ order_id: string; status: string; admin_response: string | null }>(
        'SELECT order_id,status,admin_response FROM customer_cancellation_requests WHERE order_id=$1 FOR UPDATE', [orderId]);
      if (!previous.rows[0]) throw new NotFoundException('Solicitação de cancelamento não encontrada.');
      const updated = await client.query(
        `UPDATE customer_cancellation_requests
         SET status=$2,admin_response=COALESCE($3,admin_response),reviewed_by=$4,updated_at=now()
         WHERE order_id=$1
         RETURNING order_id,status,customer_message,admin_response,created_at,updated_at`,
        [orderId, input.status, input.adminResponse?.trim() || null, adminId]);
      if (!updated.rows[0]) throw new NotFoundException('Solicitação de cancelamento não encontrada.');
      await client.query(
        `INSERT INTO admin_audit(actor_id,action,target_id,details) VALUES($1,'cancellation_request_reviewed',$2,$3::jsonb)`,
        [adminId, orderId, JSON.stringify({
          before: { status: previous.rows[0].status, adminResponse: previous.rows[0].admin_response },
          after: { status: updated.rows[0].status, adminResponse: updated.rows[0].admin_response },
        })],
      );
      return updated.rows[0];
    });
  }

  async setCouponActive(code: string, active: boolean, adminId: string) {
    return this.db.transaction(async (client) => {
      const previous = await client.query<{ code: string; discount_percent: number; active: boolean; max_redemptions: number | null }>(
        'SELECT code,discount_percent,active,max_redemptions FROM coupons WHERE code=$1 FOR UPDATE', [code.toUpperCase()]);
      if (!previous.rows[0]) throw new NotFoundException('Cupom não encontrado.');
      const result = await client.query(
        'UPDATE coupons SET active=$2 WHERE code=$1 RETURNING code,discount_percent,active,max_redemptions,redemption_count', [code.toUpperCase(), active]);
      await client.query(
        "INSERT INTO admin_audit(actor_id,action,target_id,details) VALUES($1,'coupon_active_changed',$2,$3::jsonb)",
        [adminId, code.toUpperCase(), JSON.stringify({ before: { active: previous.rows[0].active }, after: { active } })]);
      return result.rows[0];
    });
  }

  async orderForDelivery(id: string) {
    const result = await this.db.query<{ id: string; status: string }>('SELECT id,status FROM orders WHERE id=$1', [id]);
    if (!result.rows[0]) throw new NotFoundException('Pedido não encontrado.');
    if (!['paid','delivery_required'].includes(result.rows[0].status)) throw new NotFoundException('Pedido ainda não pode receber credenciais.');
    return result.rows[0];
  }
}
