import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { integerEnv } from '../../common/config';
import { normalizeProduct, STORE_CATALOG_GAMES } from './catalog.mapper';

type CachedValue = { value: string; expiresAt: number };
const imageCache = new Map<string, CachedValue>();
const imagePending = new Map<string, Promise<string>>();
const avatarCache = new Map<string, CachedValue>();
const storeGameSet: ReadonlySet<string> = new Set(STORE_CATALOG_GAMES);
let providerImageWindowStartedAt = 0;
let providerImageRequestsInWindow = 0;
const LZT_ITEM_READ_INTERVAL_MS = 750;
const LZT_ITEM_READ_QUEUE_LIMIT = 30;
let lztItemReadQueue: Promise<void> = Promise.resolve();
let pendingLztItemReads = 0;
let lastLztItemReadStartedAt = 0;
const GENERIC_ITEM_READ_QUEUE_LIMIT = 30;
let genericItemReadQueue: Promise<void> = Promise.resolve();
let pendingGenericItemReads = 0;
let lastGenericItemReadStartedAt = 0;

async function reserveLztItemReadSlot(): Promise<void> {
  if (pendingLztItemReads >= LZT_ITEM_READ_QUEUE_LIMIT) {
    throw new ServiceUnavailableException('A conferência de estoque está ocupada. Tente novamente em instantes.');
  }
  pendingLztItemReads += 1;
  const slot = lztItemReadQueue.then(async () => {
    const waitMs = Math.max(0, lastLztItemReadStartedAt + LZT_ITEM_READ_INTERVAL_MS - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastLztItemReadStartedAt = Date.now();
  });
  lztItemReadQueue = slot.catch(() => {});
  try {
    await slot;
  } catch (error) {
    pendingLztItemReads -= 1;
    throw error;
  }
}

function releaseLztItemRead(): void {
  pendingLztItemReads = Math.max(0, pendingLztItemReads - 1);
}

async function reserveGenericItemReadSlot(intervalMs: number): Promise<void> {
  if (pendingGenericItemReads >= GENERIC_ITEM_READ_QUEUE_LIMIT) {
    throw new ServiceUnavailableException('A conferência de estoque está ocupada. Tente novamente em instantes.');
  }
  pendingGenericItemReads += 1;
  const slot = genericItemReadQueue.then(async () => {
    const waitMs = Math.max(0, lastGenericItemReadStartedAt + intervalMs - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastGenericItemReadStartedAt = Date.now();
  });
  genericItemReadQueue = slot.catch(() => {});
  try {
    await slot;
  } catch (error) {
    pendingGenericItemReads -= 1;
    throw error;
  }
}

function releaseGenericItemRead(): void {
  pendingGenericItemReads = Math.max(0, pendingGenericItemReads - 1);
}

function validateGenericFeedPayload(value: unknown, expectedPage: number): { items: unknown[]; totalItems: number | null; hasNextPage: boolean | null } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Resposta da API não corresponde ao contrato conhecido.');
  const payload = value as Record<string, unknown>;
  if (payload.status !== undefined && (typeof payload.status !== 'string' || payload.status.trim().toLowerCase() !== 'success')) {
    throw new Error('A API não confirmou a consulta de estoque.');
  }
  if (payload.endpoint !== undefined && payload.endpoint !== 'get_last_accounts') throw new Error('A API retornou um endpoint inesperado.');
  if (payload.page !== undefined && payload.page !== expectedPage) throw new Error('A API retornou uma página inesperada.');
  if (!Array.isArray(payload.items)) throw new Error('Resposta da API não corresponde ao contrato conhecido.');
  const total = payload.total_items ?? payload.totalItems;
  if (total !== undefined && (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0)) throw new Error('A API retornou uma contagem de itens inválida.');
  if (payload.hasNextPage !== undefined && typeof payload.hasNextPage !== 'boolean') throw new Error('A API retornou um estado de paginação inválido.');
  return { items: payload.items, totalItems: total === undefined ? null : Number(total), hasNextPage: payload.hasNextPage === undefined ? null : payload.hasNextPage as boolean };
}

function reserveProviderImageRequest(): void {
  const now = Date.now();
  if (now - providerImageWindowStartedAt >= 60_000) {
    providerImageWindowStartedAt = now;
    providerImageRequestsInWindow = 0;
  }
  if (providerImageRequestsInWindow >= 90) throw new ServiceUnavailableException('Prévia de inventário temporariamente limitada.');
  providerImageRequestsInWindow += 1;
}

async function readJsonLimited(response: Response, maxBytes: number): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Resposta sem corpo.');
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new Error('Resposta acima do limite.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8')) as unknown;
}

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService) {}

  async robloxAvatars(requestedIds: string[]) {
    const ids = [...new Set(requestedIds)].filter((id) => /^\d{1,20}$/.test(id)).slice(0, 24);
    if (!ids.length) return { avatars: {} as Record<string, string> };
    const listed = await this.db.query<{ user_id: string }>(
      `SELECT DISTINCT p.attributes #>> '{inventory,roblox_id}' AS user_id
       FROM products p LEFT JOIN seller_blocklist b ON b.seller_id=p.seller_id
       WHERE p.game='roblox' AND p.status='available' AND b.seller_id IS NULL
         AND p.attributes #>> '{inventory,roblox_id}' = ANY($1::text[])`, [ids]);
    const allowedIds = listed.rows.map((row) => row.user_id).filter((id) => id && /^\d{1,20}$/.test(id));
    const now = Date.now();
    const avatars: Record<string, string> = {};
    const missing: string[] = [];
    for (const id of allowedIds) {
      const cached = avatarCache.get(id);
      if (cached && cached.expiresAt > now) avatars[id] = cached.value;
      else missing.push(id);
    }
    if (missing.length) {
      const endpoint = new URL('https://thumbnails.roblox.com/v1/users/avatar-headshot');
      endpoint.searchParams.set('userIds', missing.join(','));
      endpoint.searchParams.set('size', '150x150');
      endpoint.searchParams.set('format', 'Png');
      endpoint.searchParams.set('isCircular', 'false');
      let response: Response;
      try { response = await fetch(endpoint, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }); }
      catch { throw new ServiceUnavailableException('As miniaturas Roblox estão temporariamente indisponíveis.'); }
      if (!response.ok) throw new ServiceUnavailableException('As miniaturas Roblox estão temporariamente indisponíveis.');
      let payload: { data?: Array<{ targetId?: number; imageUrl?: string; state?: string }> };
      try { payload = await readJsonLimited(response, 128_000) as typeof payload; }
      catch { throw new ServiceUnavailableException('As miniaturas Roblox retornaram uma resposta inválida.'); }
      for (const item of payload.data ?? []) {
        const id = String(item.targetId ?? '');
        if (!missing.includes(id) || typeof item.imageUrl !== 'string') continue;
        try {
          const imageUrl = new URL(item.imageUrl);
          if (imageUrl.protocol !== 'https:' || !(imageUrl.hostname === 'rbxcdn.com' || imageUrl.hostname.endsWith('.rbxcdn.com')) || imageUrl.username || imageUrl.password) continue;
          avatarCache.set(id, { value: imageUrl.toString(), expiresAt: now + 30 * 60_000 });
          avatars[id] = imageUrl.toString();
        } catch { /* Ignore malformed thumbnail URLs from the upstream response. */ }
      }
      if (avatarCache.size > 500) {
        for (const [id, cached] of avatarCache) if (cached.expiresAt <= now || avatarCache.size > 400) avatarCache.delete(id);
      }
    }
    return { avatars };
  }

  async fortniteInventoryImage(productId: string, type: string) {
    if (!['skins', 'pickaxes', 'dances', 'gliders'].includes(type)) throw new NotFoundException('Prévia de inventário não encontrada.');
    const result = await this.db.query<{ provider_item_id: string }>(
      `SELECT p.provider_item_id FROM products p LEFT JOIN seller_blocklist b ON b.seller_id=p.seller_id
       WHERE p.id=$1 AND p.game='fortnite' AND p.status='available' AND b.seller_id IS NULL`, [productId]);
    const itemId = result.rows[0]?.provider_item_id;
    if (!itemId || !/^\d+$/.test(itemId)) throw new NotFoundException('Prévia de inventário não encontrada.');
    const cacheKey = `${itemId}:${type}`;
    const cached = imageCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return { imageDataUrl: cached.value };
    let request = imagePending.get(cacheKey);
    if (!request) {
      request = (async () => {
        const base = process.env.API_BASE_URL;
        const token = process.env.LZT_MARKET_API_TOKEN;
        if ((process.env.API_PROVIDER ?? 'lzt-market') !== 'lzt-market' || !base || !token) {
          throw new ServiceUnavailableException('Prévia de inventário LZT não configurada.');
        }
        let root: URL;
        try {
          root = new URL(base.endsWith('/') ? base : `${base}/`);
          if (root.protocol !== 'https:' || root.hostname !== 'api.lzt.market' || root.pathname !== '/' || root.username || root.password || root.search || root.hash) throw new Error();
        } catch { throw new ServiceUnavailableException('API_BASE_URL deve apontar para a API oficial segura.'); }
        reserveProviderImageRequest();
        const endpoint = new URL(`${encodeURIComponent(itemId)}/image`, root);
        endpoint.searchParams.set('type', type);
        let response: Response;
        try { response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) }); }
        catch { throw new ServiceUnavailableException('Prévia de inventário temporariamente indisponível.'); }
        if (!response.ok) throw new ServiceUnavailableException('Prévia de inventário temporariamente indisponível.');
        let payload: { base64?: unknown };
        try { payload = await readJsonLimited(response, 2_100_000) as typeof payload; }
        catch { throw new ServiceUnavailableException('O fornecedor retornou uma prévia inválida ou acima do limite.'); }
        if (typeof payload.base64 !== 'string' || payload.base64.length > 2_000_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload.base64)) {
          throw new ServiceUnavailableException('O fornecedor retornou uma prévia inválida.');
        }
        const bytes = Buffer.from(payload.base64, 'base64');
        if (!bytes.length || bytes.length > 1_500_000 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new ServiceUnavailableException('A prévia do fornecedor excede o limite permitido ou não é PNG.');
        const imageDataUrl = `data:image/png;base64,${payload.base64}`;
        imageCache.set(cacheKey, { value: imageDataUrl, expiresAt: Date.now() + 60 * 60_000 });
        for (const [key, entry] of imageCache) {
          if (entry.expiresAt <= Date.now()) imageCache.delete(key);
          if (imageCache.size > 32) imageCache.delete(imageCache.keys().next().value!);
        }
        return imageDataUrl;
      })();
      imagePending.set(cacheKey, request);
    }
    try { return { imageDataUrl: await request }; }
    finally { if (imagePending.get(cacheKey) === request) imagePending.delete(cacheKey); }
  }

  async list(game?: string, page = 1, pageSize = 24, filters: { minPrice?: number; maxPrice?: number; minDaysOffline?: number } = {}) {
    const minPriceCents = filters.minPrice === undefined ? null : Math.round(filters.minPrice * 100);
    const maxPriceCents = filters.maxPrice === undefined ? null : Math.round(filters.maxPrice * 100);
    const minDaysOffline = filters.minDaysOffline ?? null;
    const result = await this.db.query(
      `SELECT p.id,p.provider_item_id,p.game,p.generated_title,p.price_brl_cents,p.attributes,p.synced_at,
         sf.feedback_total AS seller_feedback_total,sf.positive_count AS seller_feedback_positive_count,
         sf.negative_count AS seller_feedback_negative_count,sf.positive_percentage AS seller_feedback_positive_percentage,
         sf.checked_at AS seller_feedback_checked_at
       FROM products p LEFT JOIN seller_blocklist b ON b.seller_id=p.seller_id
       LEFT JOIN seller_feedback_cache sf ON sf.seller_id=p.seller_id AND sf.checked_at IS NOT NULL
       WHERE p.status='available' AND p.price_brl_cents > 0 AND b.seller_id IS NULL
         AND ($1::text IS NULL OR p.game=$1)
          AND p.game=ANY($7::text[])
         AND ($4::bigint IS NULL OR p.price_brl_cents >= $4)
         AND ($5::bigint IS NULL OR p.price_brl_cents <= $5)
         AND ($6::integer IS NULL OR CASE WHEN p.attributes->>'days_offline' ~ '^[0-9]+$' THEN (p.attributes->>'days_offline')::integer ELSE NULL END >= $6)
      ORDER BY p.price_brl_cents ASC,
         CASE WHEN sf.feedback_total > 0 THEN sf.positive_percentage END DESC NULLS LAST,
         sf.feedback_total DESC NULLS LAST,
         CASE WHEN p.attributes#>>'{seller_reputation,sold_items_count}' ~ '^[0-9]+$'
           THEN (p.attributes#>>'{seller_reputation,sold_items_count}')::numeric END DESC NULLS LAST,
         p.created_at DESC LIMIT $2 OFFSET $3`,
       [game ?? null, pageSize, (page - 1) * pageSize, minPriceCents, maxPriceCents, minDaysOffline, [...STORE_CATALOG_GAMES]]);
    const count = await this.db.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM products p LEFT JOIN seller_blocklist b ON b.seller_id=p.seller_id
       WHERE p.status='available' AND p.price_brl_cents > 0 AND b.seller_id IS NULL
         AND ($1::text IS NULL OR p.game=$1)
          AND p.game=ANY($5::text[])
         AND ($2::bigint IS NULL OR p.price_brl_cents >= $2)
         AND ($3::bigint IS NULL OR p.price_brl_cents <= $3)
         AND ($4::integer IS NULL OR CASE WHEN p.attributes->>'days_offline' ~ '^[0-9]+$' THEN (p.attributes->>'days_offline')::integer ELSE NULL END >= $4)`,
       [game ?? null, minPriceCents, maxPriceCents, minDaysOffline, [...STORE_CATALOG_GAMES]]);
    return { items: result.rows, page, pageSize, total: Number(count.rows[0]?.total ?? 0), currency: 'BRL' };
  }

  async detail(id: string) {
    const result = await this.db.query(
      `SELECT p.id,p.provider_item_id,p.game,p.generated_title,p.price_brl_cents,p.attributes,p.synced_at,
         sf.feedback_total AS seller_feedback_total,sf.positive_count AS seller_feedback_positive_count,
         sf.negative_count AS seller_feedback_negative_count,sf.positive_percentage AS seller_feedback_positive_percentage,
         sf.checked_at AS seller_feedback_checked_at
       FROM products p LEFT JOIN seller_blocklist b ON b.seller_id=p.seller_id
       LEFT JOIN seller_feedback_cache sf ON sf.seller_id=p.seller_id AND sf.checked_at IS NOT NULL
        WHERE p.id=$1 AND p.status='available' AND p.price_brl_cents > 0 AND b.seller_id IS NULL
          AND p.game=ANY($2::text[])`, [id, [...STORE_CATALOG_GAMES]]);
    return result.rows[0] ?? null;
  }

  async importProviderItems(items: unknown[]) {
    if (!Array.isArray(items) || items.length > 500) throw new Error('Lote de catálogo inválido.');
    const settingsResult = await this.db.query<{ setting_key: string; setting_value: unknown }>("SELECT setting_key,setting_value FROM store_settings WHERE setting_key IN ('markup_percent','usd_brl_rate','rub_brl_rate')");
    const settings = Object.fromEntries(settingsResult.rows.map((row) => [row.setting_key, row.setting_value])) as Record<string, unknown>;
    const markup = Math.max(50, Math.min(59, Number(settings.markup_percent ?? 55)));
    const rates: Record<string, number | null> = {
      USD: Number(settings.usd_brl_rate) > 0 ? Number(settings.usd_brl_rate) : null,
      RUB: Number(settings.rub_brl_rate) > 0 ? Number(settings.rub_brl_rate) : null,
      BRL: 1,
    };
    const rowsByItemId = new Map<string, {
      provider_item_id: string;
      seller_id: string | null;
      game: string;
      source_title: string | null;
      generated_title: string;
      source_price: number;
      source_currency: string;
      price_brl_cents: number | null;
      markup_percent: number;
      status: string;
      attributes: Record<string, unknown>;
      provider_updated_at: null;
    }>();
    const sellerIds = new Set<string>();
    for (const value of items) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const product = normalizeProduct(value as Record<string, unknown>);
      if (!product || !storeGameSet.has(product.game)) continue;
      if (product.sellerId && /^\d{1,40}$/.test(product.sellerId)) sellerIds.add(product.sellerId);
      const rate = rates[product.currency];
      let priceCents = rate === null ? null : Math.round(product.sourcePrice * rate * (1 + markup / 100) * 100);
      if (priceCents !== null && (!Number.isSafeInteger(priceCents) || priceCents <= 0)) priceCents = null;
      rowsByItemId.set(product.itemId, {
        provider_item_id: product.itemId,
        seller_id: product.sellerId,
        game: product.game,
        source_title: product.sourceTitle,
        generated_title: product.title,
        source_price: product.sourcePrice,
        source_currency: product.currency,
        price_brl_cents: priceCents,
        markup_percent: markup,
        status: product.status,
        attributes: product.attributes,
        provider_updated_at: null,
      });
    }
    const rows = [...rowsByItemId.values()];
    if (rows.length) {
      await this.db.query(
        `WITH incoming AS (
           SELECT DISTINCT ON (provider_item_id) provider_item_id,seller_id,game,source_title,generated_title,
             source_price,source_currency,price_brl_cents,markup_percent,status,attributes,provider_updated_at
           FROM jsonb_to_recordset($1::jsonb) AS batch(
             provider_item_id text,seller_id text,game text,source_title text,generated_title text,
             source_price numeric,source_currency text,price_brl_cents bigint,markup_percent smallint,
             status text,attributes jsonb,provider_updated_at timestamptz
           )
           ORDER BY provider_item_id
         )
         INSERT INTO products(provider_item_id,seller_id,game,source_title,generated_title,source_price,source_currency,price_brl_cents,markup_percent,status,attributes,provider_updated_at,synced_at)
         SELECT provider_item_id,seller_id,game,source_title,generated_title,source_price,source_currency,price_brl_cents,markup_percent,status,attributes,provider_updated_at,now()
         FROM incoming
         ON CONFLICT(provider_item_id) DO UPDATE SET seller_id=EXCLUDED.seller_id,game=EXCLUDED.game,source_title=EXCLUDED.source_title,
           generated_title=EXCLUDED.generated_title,source_price=EXCLUDED.source_price,source_currency=EXCLUDED.source_currency,
           price_brl_cents=EXCLUDED.price_brl_cents,markup_percent=EXCLUDED.markup_percent,
           status=CASE WHEN products.status='sold' THEN 'sold' ELSE EXCLUDED.status END,
           attributes=EXCLUDED.attributes,provider_updated_at=EXCLUDED.provider_updated_at,synced_at=now()`,
        [JSON.stringify(rows)]);
    }
    if (sellerIds.size) {
      await this.db.query(
        `INSERT INTO seller_feedback_cache(seller_id)
         SELECT DISTINCT seller_id FROM unnest($1::text[]) AS candidate(seller_id)
         WHERE seller_id ~ '^[0-9]{1,40}$' ON CONFLICT(seller_id) DO NOTHING`,
        [[...sellerIds]]);
    }
    return rows.length;
  }

  async revalidateProviderItem(itemId: string, expectedGame?: string): Promise<Record<string, unknown> | null> {
    const base = process.env.API_BASE_URL;
    const apiProvider = process.env.API_PROVIDER ?? 'lzt-market';
    const token = apiProvider === 'lzt-market' ? process.env.LZT_MARKET_API_TOKEN : process.env.API_TOKEN;
    if (!base || !token) throw new Error('Integração de estoque indisponível: configure API_BASE_URL e a credencial correspondente no Vault.');
    let url: URL;
    try { url = new URL(base); } catch { throw new Error('API_BASE_URL inválida.'); }
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('A API de estoque deve usar HTTPS.');
    if (url.username || url.password) throw new Error('API_BASE_URL não pode conter credenciais.');
    const timeout = integerEnv('API_REQUEST_TIMEOUT_MS', 10_000, 1000, 60_000);
    if (apiProvider === 'lzt-market') {
      const root = url.toString().endsWith('/') ? url : new URL(`${url}/`);
      await reserveLztItemReadSlot();
      let response: Response;
      try {
        response = await fetch(new URL(encodeURIComponent(itemId), root), {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(timeout),
        });
      } finally {
        releaseLztItemRead();
      }
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Consulta do item falhou com HTTP ${response.status}.`);
      const payload = await response.json() as { item?: unknown };
      const fresh = payload.item && typeof payload.item === 'object' && !Array.isArray(payload.item)
        ? payload.item as Record<string, unknown>
        : payload as Record<string, unknown>;
      const normalized = normalizeProduct(expectedGame ? { ...fresh, catalog_game_hint: expectedGame } : fresh);
      return normalized?.itemId === itemId && normalized.status === 'available' ? fresh : null;
    }
    const maxPages = integerEnv('API_REVALIDATE_MAX_PAGES', 100, 1, 500);
    const delayMs = integerEnv('API_RATE_DELAY_MS', 3000, 0, 60_000);
    const root = url.toString().endsWith('/') ? url : new URL(`${url}/`);
    let itemsSeen = 0;
    for (let page = 1; page <= maxPages; page += 1) {
      await reserveGenericItemReadSlot(delayMs);
      let response: Response;
      try {
        response = await fetch(new URL(`get_last_accounts?page=${page}`, root), {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(timeout),
        });
      } finally { releaseGenericItemRead(); }
      if (!response.ok) throw new Error(`Consulta de estoque falhou com HTTP ${response.status}.`);
      let rawPayload: unknown;
      try { rawPayload = await response.json(); }
      catch { throw new Error('A API retornou uma resposta de estoque inválida.'); }
      const payload = validateGenericFeedPayload(rawPayload, page);
      itemsSeen += payload.items.length;
      if (payload.totalItems !== null && itemsSeen > payload.totalItems) throw new Error('A paginação da API contradiz a contagem total de itens.');
      if (payload.hasNextPage === false && payload.totalItems !== null && itemsSeen < payload.totalItems) throw new Error('A paginação da API terminou antes da contagem total de itens.');
      if (payload.hasNextPage === true && payload.totalItems !== null && itemsSeen >= payload.totalItems) throw new Error('A paginação da API excede a contagem total de itens.');
      if (payload.items.length === 0) {
        if (payload.hasNextPage === true || (payload.totalItems !== null && itemsSeen < payload.totalItems)) {
          throw new Error('A paginação da API terminou antes da contagem total de itens.');
        }
        return null;
      }
      const found = payload.items.find((raw) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
        const normalized = normalizeProduct(raw as Record<string, unknown>);
        return normalized?.itemId === itemId && normalized.status === 'available';
      });
      if (found) return found as Record<string, unknown>;
      const hasMore = payload.hasNextPage ?? (payload.totalItems === null || itemsSeen < payload.totalItems);
      if (!hasMore) return null;
    }
    throw new Error('Não foi possível confirmar a disponibilidade dentro do limite de páginas configurado.');
  }
}
