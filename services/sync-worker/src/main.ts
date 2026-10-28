import { Pool, PoolClient } from 'pg';
import { integerEnv } from './config';

// Demo release: never connect to or import from the supplier.
// Live catalog access needs a separate reviewed release decision.
const PUBLISHED_CATALOG_SYNC_ENABLED = false;

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Configuração ausente: ${name}`);
  return value;
};

const databaseUrl = PUBLISHED_CATALOG_SYNC_ENABLED ? required('DATABASE_URL') : undefined;
const apiBase = PUBLISHED_CATALOG_SYNC_ENABLED ? required('API_BASE_URL') : 'https://example.invalid/';
const apiProvider = process.env.API_PROVIDER ?? 'lzt-market';
if (!['lzt-market', 'generic'].includes(apiProvider)) throw new Error('API_PROVIDER não reconhecido.');
const apiToken = PUBLISHED_CATALOG_SYNC_ENABLED ? required(apiProvider === 'lzt-market' ? 'LZT_MARKET_API_TOKEN' : 'API_TOKEN') : '';
const internalOrigin = PUBLISHED_CATALOG_SYNC_ENABLED ? required('INTERNAL_API_ORIGIN').replace(/\/$/, '') : '';
const workerSecret = PUBLISHED_CATALOG_SYNC_ENABLED ? required('SYNC_WORKER_SECRET') : '';
const intervalMs = integerEnv('API_SYNC_INTERVAL_SECONDS', 30, 30, 2_147_483) * 1000;
const requestedDelayMs = integerEnv('API_RATE_DELAY_MS', 3000, 0, 60_000);
const maxPages = integerEnv('API_MAX_SYNC_PAGES', 1000, 1, 1000);
const timeoutMs = integerEnv('API_REQUEST_TIMEOUT_MS', 10_000, 1000, 60_000);
const importBatchMaxBytes = integerEnv('API_IMPORT_BATCH_MAX_BYTES', 1_500_000, 16_384, 1_900_000);
let stopping = false;
let nextRunDelayMs = intervalMs;
const pool = new Pool({ connectionString: databaseUrl, max: 2, application_name: 'digital-store-inventory-worker', connectionTimeoutMillis: 5000 });
const apiRoot = new URL(apiBase.endsWith('/') ? apiBase : `${apiBase}/`);
if (apiRoot.username || apiRoot.password || (apiRoot.protocol !== 'https:' && process.env.NODE_ENV === 'production')) throw new Error('API_BASE_URL deve ser uma URL HTTPS sem credenciais.');
const delayMs = apiProvider === 'lzt-market' ? Math.max(3000, requestedDelayMs) : requestedDelayMs;
const lztFeeds = [
  { key: 'fortnite', path: 'epicgames', params: [['epicgames_game[]', 'fortnite']] },
  { key: 'valorant', path: 'riot', params: [['riot_game[]', 'valorant']] },
  { key: 'lol', path: 'riot', params: [['riot_game[]', 'league-of-legends']] },
  { key: 'roblox', path: 'roblox', params: [] as string[][] },
  { key: 'steam', path: 'steam', params: [] as string[][] },
];
const lztOrderVersion = 'pdate_to_down_page_v2';

function itemId(item: unknown): string | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const id = String((item as Record<string, unknown>).item_id ?? '').trim();
  return id && id.length <= 100 ? id : null;
}

function catalogImportBodies(items: unknown[], maxBytes: number): string[] {
  const prefix = '{"items":[';
  const suffix = ']}';
  const maxItems = 500;
  const bodies: string[] = [];
  let encodedItems: string[] = [];
  let bodyBytes = Buffer.byteLength(prefix) + Buffer.byteLength(suffix);
  for (const item of items) {
    const encoded = JSON.stringify(item);
    if (encoded === undefined) throw new Error('catalog_item_not_serializable');
    const itemBytes = Buffer.byteLength(encoded);
    const separatorBytes = encodedItems.length ? 1 : 0;
    if (encodedItems.length >= maxItems || bodyBytes + separatorBytes + itemBytes > maxBytes) {
      if (!encodedItems.length) throw new Error('catalog_item_exceeds_import_request_limit');
      bodies.push(`${prefix}${encodedItems.join(',')}${suffix}`);
      encodedItems = [];
      bodyBytes = Buffer.byteLength(prefix) + Buffer.byteLength(suffix);
    }
    const nextSeparatorBytes = encodedItems.length ? 1 : 0;
    if (bodyBytes + nextSeparatorBytes + itemBytes > maxBytes) throw new Error('catalog_item_exceeds_import_request_limit');
    encodedItems.push(encoded);
    bodyBytes += nextSeparatorBytes + itemBytes;
  }
  if (encodedItems.length) bodies.push(`${prefix}${encodedItems.join(',')}${suffix}`);
  return bodies;
}

async function refreshOneSellerFeedback(): Promise<void> {
  const claimed = await pool.query<{ seller_id: string }>(
    `WITH candidate AS (
       SELECT seller_id FROM seller_feedback_cache
       WHERE next_attempt_at <= now()
         AND (claimed_at IS NULL OR claimed_at < now()-interval '15 minutes')
       ORDER BY checked_at ASC NULLS FIRST,seller_id
       LIMIT 1 FOR UPDATE SKIP LOCKED
     )
     UPDATE seller_feedback_cache cache SET claimed_at=now()
     FROM candidate WHERE cache.seller_id=candidate.seller_id
     RETURNING cache.seller_id`);
  const sellerId = claimed.rows[0]?.seller_id;
  if (!sellerId) return;

  let errorCode = 'provider_unreachable';
  let retryDelayMinutes = 60;
  try {
    const url = new URL('feedback', apiRoot);
    url.searchParams.set('user_id', sellerId);
    url.searchParams.set('type', 'all');
    url.searchParams.set('exclude_automatic', 'true');
    url.searchParams.set('page', '1');
    url.searchParams.set('limit', '1');
    url.searchParams.set('fields_include', 'counts');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 429) { errorCode = 'provider_rate_limited'; retryDelayMinutes = 2; }
    else if (!response.ok) errorCode = `provider_http_${response.status}`;
    if (!response.ok) throw new Error('feedback_http_error');
    let payload: unknown;
    try { payload = await response.json(); }
    catch { errorCode = 'invalid_feedback_json'; throw new Error('feedback_json_error'); }
    const counts = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).counts : undefined;
    const data = counts && typeof counts === 'object' && !Array.isArray(counts)
      ? counts as Record<string, unknown> : null;
    const total = data?.total;
    const positive = data?.positive;
    const negative = data?.negative;
    const percentage = data?.positive_percentage;
    if (![total, positive, negative, percentage].every(Number.isSafeInteger)
      || (total as number) < 0 || (positive as number) < 0 || (negative as number) < 0
      || (positive as number) + (negative as number) > (total as number)
      || (percentage as number) < 0 || (percentage as number) > 100
      || (total as number) > 2_147_483_647) {
      errorCode = 'invalid_feedback_contract';
      throw new Error('feedback_contract_error');
    }
    await pool.query(
      `UPDATE seller_feedback_cache SET feedback_total=$2,positive_count=$3,negative_count=$4,
         positive_percentage=$5,checked_at=now(),next_attempt_at=now()+interval '24 hours',
         claimed_at=NULL,failure_count=0,last_error_code=NULL WHERE seller_id=$1`,
      [sellerId, total, positive, negative, percentage]);
    return;
  } catch {
    await pool.query(
      `UPDATE seller_feedback_cache SET claimed_at=NULL,failure_count=LEAST(failure_count+1,32767),
         next_attempt_at=now()+($2::integer * interval '1 minute'),last_error_code=$3 WHERE seller_id=$1`,
      [sellerId, retryDelayMinutes, errorCode]);
  }
}

async function synchronize(): Promise<void> {
  const lockClient: PoolClient = await pool.connect();
  let runId: string | undefined;
  let locked = false;
  try {
    const lock = await lockClient.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(hashtext('digital-accounts-store-inventory-sync')) AS locked");
    locked = lock.rows[0]?.locked === true;
    if (!locked) return;
    if (apiProvider === 'lzt-market') {
      const savedOrder = await lockClient.query<{ setting_value: unknown }>(
        "SELECT setting_value FROM store_settings WHERE setting_key='lzt_sync_order_version'");
      if (savedOrder.rows[0]?.setting_value !== lztOrderVersion) {
        const previousCursorKeys = lztFeeds.flatMap((feed) => [
          `lzt_sync_cursor_${feed.key}`,
          `lzt_sync_started_at_${feed.key}`,
        ]);
        await lockClient.query('DELETE FROM store_settings WHERE setting_key=ANY($1::text[])', [previousCursorKeys]);
        await lockClient.query(
          "INSERT INTO store_settings(setting_key,setting_value) VALUES('lzt_sync_order_version',$1::jsonb) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()",
          [JSON.stringify(lztOrderVersion)]);
      }
    }
    await lockClient.query(`
      WITH expired AS (
        UPDATE orders SET status='cancelled',updated_at=now()
        WHERE status='pending_payment' AND expires_at IS NOT NULL AND expires_at <= now()
        RETURNING id,coupon_code
      ), payment_updates AS (
        UPDATE payments p SET status='cancelled',updated_at=now()
        FROM expired e WHERE p.order_id=e.id AND p.status IN ('creating','pending')
        RETURNING p.order_id
      )
      UPDATE coupons c SET redemption_count=GREATEST(0,c.redemption_count-expired_coupons.uses)
      FROM (
        SELECT coupon_code,count(*)::integer AS uses FROM expired
        WHERE coupon_code IS NOT NULL GROUP BY coupon_code
      ) AS expired_coupons
      WHERE c.code=expired_coupons.coupon_code
    `);
    const run = await lockClient.query<{ id: string; started_at: Date }>('INSERT INTO catalog_sync_runs DEFAULT VALUES RETURNING id,started_at');
    runId = run.rows[0].id;
    const runStartedAt = run.rows[0].started_at;
    let pages = 0; let itemsSeen = 0; let upserted = 0; let discarded = 0; const discardedReasons: Record<string, number> = {}; let complete = false; let errorCode: string | null = null;
    const releaseResponse = await fetch(`${internalOrigin}/api/v1/internal/catalog/sync-status`, {
      headers: { Authorization: `Bearer ${workerSecret}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!releaseResponse.ok) errorCode = `catalog_release_status_http_${releaseResponse.status}`;
    else {
      const release = await releaseResponse.json() as { catalogSyncEnabled?: boolean };
      if (release.catalogSyncEnabled !== true) errorCode = 'catalog_sync_not_enabled';
    }
    const feeds = apiProvider === 'lzt-market' ? lztFeeds : [{ key: 'generic', path: 'get_last_accounts', params: [] as string[][] }];
    const savedFeed = await lockClient.query<{ setting_value: unknown }>("SELECT setting_value FROM store_settings WHERE setting_key='lzt_sync_feed_index'");
    const firstFeed = apiProvider === 'lzt-market' && Number.isInteger(savedFeed.rows[0]?.setting_value)
      ? Math.max(0, Math.min(feeds.length - 1, Number(savedFeed.rows[0].setting_value))) : 0;
    const savedGenericState = apiProvider === 'generic'
      ? await lockClient.query<{ setting_value: unknown }>("SELECT setting_value FROM store_settings WHERE setting_key='generic_sync_state'")
      : { rows: [] as { setting_value: unknown }[] };
    const genericState = savedGenericState.rows[0]?.setting_value;
    let genericNextPage = genericState && typeof genericState === 'object' && !Array.isArray(genericState)
      ? Number((genericState as Record<string, unknown>).nextPage) : 1;
    let genericItemsSeen = genericState && typeof genericState === 'object' && !Array.isArray(genericState)
      ? Number((genericState as Record<string, unknown>).itemsSeen) : 0;
    const genericStartedValue = genericState && typeof genericState === 'object' && !Array.isArray(genericState)
      ? (genericState as Record<string, unknown>).scanStartedAt : null;
    let genericScanStartedAt = typeof genericStartedValue === 'string' ? new Date(genericStartedValue) : null;
    if (!Number.isSafeInteger(genericNextPage) || genericNextPage < 1) {
      genericNextPage = 1;
      genericItemsSeen = 0;
      genericScanStartedAt = runStartedAt;
    }
    if (!Number.isSafeInteger(genericItemsSeen) || genericItemsSeen < 0) {
      genericNextPage = 1;
      genericItemsSeen = 0;
      genericScanStartedAt = runStartedAt;
    }
    if (!genericScanStartedAt || !Number.isFinite(genericScanStartedAt.getTime()) || genericScanStartedAt > runStartedAt) {
      if (genericNextPage > 1) { genericNextPage = 1; genericItemsSeen = 0; }
      genericScanStartedAt = runStartedAt;
    }
    const resetGenericScan = async () => {
      await lockClient.query("DELETE FROM store_settings WHERE setting_key='generic_sync_state'");
      genericNextPage = 1;
      genericItemsSeen = 0;
      genericScanStartedAt = runStartedAt;
    };
    const orderedFeeds = [...feeds.slice(firstFeed), ...feeds.slice(0, firstFeed)];
    let nextFeedIndex = firstFeed;
    let feedsCompleted = 0;
    let lastLztCategoryRequestAt: number | null = null;
    for (const feed of orderedFeeds) {
      if (pages >= maxPages || errorCode || stopping) break;
      const feedIndex = feeds.indexOf(feed);
      const cursorKey = `lzt_sync_cursor_${feed.key}`;
      const scanStartedKey = `lzt_sync_started_at_${feed.key}`;
      const savedCursor = apiProvider === 'lzt-market'
        ? await lockClient.query<{ setting_value: unknown }>('SELECT setting_value FROM store_settings WHERE setting_key=$1', [cursorKey])
        : { rows: [] as { setting_value: unknown }[] };
      const savedLztPage = typeof savedCursor.rows[0]?.setting_value === 'string'
        ? savedCursor.rows[0].setting_value : null;
      let lztPage = savedLztPage?.startsWith('page:') ? Number(savedLztPage.slice(5)) : 1;
      if (!Number.isSafeInteger(lztPage) || lztPage < 1) lztPage = 1;
      const savedScanStarted = apiProvider === 'lzt-market'
        ? await lockClient.query<{ setting_value: unknown }>('SELECT setting_value FROM store_settings WHERE setting_key=$1', [scanStartedKey])
        : { rows: [] as { setting_value: unknown }[] };
      let scanStartedAt = typeof savedScanStarted.rows[0]?.setting_value === 'string'
        ? new Date(savedScanStarted.rows[0].setting_value as string) : null;
      if (scanStartedAt && !Number.isFinite(scanStartedAt.getTime())) scanStartedAt = null;
      let feedPage = apiProvider === 'generic' ? genericNextPage - 1 : 0;
      let feedComplete = false;
      const seen = new Set<string>();
      if (apiProvider === 'lzt-market') {
        nextFeedIndex = feedIndex;
        if (!savedLztPage || !scanStartedAt) {
          scanStartedAt = runStartedAt;
          await lockClient.query(
            'INSERT INTO store_settings(setting_key,setting_value) VALUES($1,$2::jsonb) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()',
            [scanStartedKey, JSON.stringify(scanStartedAt.toISOString())]);
        }
        await lockClient.query(
          "INSERT INTO store_settings(setting_key,setting_value) VALUES('lzt_sync_feed_index',$1::jsonb) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()",
          [JSON.stringify(nextFeedIndex)]);
      }
      while (pages < maxPages && !stopping) {
        const requestUrl = new URL(feed.path, apiRoot);
        if (apiProvider === 'lzt-market') {
          requestUrl.searchParams.set('page', String(lztPage));
          for (const [key, value] of feed.params) requestUrl.searchParams.append(key, value);
          requestUrl.searchParams.set('order_by', 'pdate_to_down');
          requestUrl.searchParams.set('currency', 'rub');
          requestUrl.searchParams.set('i18n', 'pt-BR');
          requestUrl.searchParams.append('origin[]', 'personal');
        } else requestUrl.searchParams.set('page', String(feedPage + 1));
        if (apiProvider === 'lzt-market' && lastLztCategoryRequestAt !== null) {
          const remainingDelay = delayMs - (Date.now() - lastLztCategoryRequestAt);
          if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));
          if (stopping) break;
        }
        if (apiProvider === 'lzt-market') lastLztCategoryRequestAt = Date.now();
        const response = await fetch(requestUrl, {
          headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (response.status === 429) {
          const retryAfterSeconds = Number(response.headers.get('retry-after'));
          nextRunDelayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? Math.max(intervalMs, Math.ceil(retryAfterSeconds * 1000))
            : Math.max(intervalMs, 60_000);
          errorCode = 'provider_rate_limited';
          break;
        }
        if (!response.ok) {
          if (apiProvider === 'lzt-market' && lztPage > 1 && response.status === 400) {
            await lockClient.query('DELETE FROM store_settings WHERE setting_key=$1', [cursorKey]);
            errorCode = 'pagination_page_rejected';
          } else errorCode = `provider_http_${response.status}`;
          break;
        }
        let payload: { status?: unknown; items?: unknown[]; total_items?: number; totalItems?: number; hasNextPage?: boolean; page?: number; perPage?: number };
        try { payload = await response.json() as { status?: unknown; items?: unknown[]; total_items?: number; totalItems?: number; hasNextPage?: boolean; page?: number; perPage?: number }; }
        catch { errorCode = 'invalid_json'; break; }
        if (apiProvider === 'generic' && payload.status !== undefined
          && (typeof payload.status !== 'string' || payload.status.trim().toLowerCase() !== 'success')) {
          errorCode = 'provider_status_not_success';
          break;
        }
        const totalItems = payload.totalItems ?? payload.total_items;
        if (!Array.isArray(payload.items) || (totalItems !== undefined && (!Number.isFinite(totalItems) || totalItems < 0))
          || (apiProvider === 'lzt-market' && (typeof payload.hasNextPage !== 'boolean' || payload.page !== lztPage
            || !Number.isSafeInteger(payload.perPage) || (payload.perPage as number) < 1))) {
          errorCode = 'invalid_contract';
          break;
        }
        pages += 1;
        feedPage += 1;
        if (payload.items.length === 0) {
          if (apiProvider === 'lzt-market' && payload.hasNextPage === true) {
            errorCode = 'pagination_incomplete';
            break;
          }
          const genericHasUnseenPages = apiProvider === 'generic' && (
            payload.hasNextPage === true ||
            (typeof totalItems === 'number' && genericItemsSeen < totalItems)
          );
          if (genericHasUnseenPages) {
            errorCode = 'pagination_incomplete';
            await resetGenericScan();
            break;
          }
          feedComplete = true;
          if (apiProvider === 'lzt-market') await lockClient.query('DELETE FROM store_settings WHERE setting_key=ANY($1::text[])', [[cursorKey, scanStartedKey]]);
          else {
            await lockClient.query("DELETE FROM store_settings WHERE setting_key='generic_sync_state'");
            genericNextPage = 1;
            genericItemsSeen = 0;
          }
          break;
        }
        const pageIds = payload.items.map(itemId).filter((value): value is string => Boolean(value));
        const newIds = pageIds.filter((id) => !seen.has(id));
        if (feedPage > 1 && newIds.length === 0) {
          if (apiProvider === 'lzt-market') await lockClient.query('DELETE FROM store_settings WHERE setting_key=$1', [cursorKey]);
          else await resetGenericScan();
          errorCode = 'pagination_stalled';
          break;
        }
        pageIds.forEach((id) => seen.add(id));
        itemsSeen += payload.items.length;
        const importItems = apiProvider === 'lzt-market' && feed.key !== 'generic'
          ? payload.items.map((item) => item && typeof item === 'object' && !Array.isArray(item)
            ? { ...(item as Record<string, unknown>), catalog_game_hint: feed.key }
            : item)
          : payload.items;
        const importBodies = catalogImportBodies(importItems, importBatchMaxBytes);
        for (const body of importBodies) {
          const imported = await fetch(`${internalOrigin}/api/v1/internal/catalog/items`, {
            method: 'POST', headers: { Authorization: `Bearer ${workerSecret}`, 'Content-Type': 'application/json' },
            body, signal: AbortSignal.timeout(timeoutMs),
          });
          if (!imported.ok) { errorCode = `catalog_import_http_${imported.status}`; break; }
          const result = await imported.json() as { imported?: number; discarded?: number; discardedReasons?: Record<string, number> };
          upserted += Number(result.imported ?? 0);
          discarded += Number(result.discarded ?? 0);
          for (const [reason, count] of Object.entries(result.discardedReasons ?? {})) {
            if (Number.isSafeInteger(count) && count > 0) discardedReasons[reason] = (discardedReasons[reason] ?? 0) + count;
          }
        }
        await lockClient.query(
          'UPDATE catalog_sync_runs SET pages_read=$2,items_seen=$3,items_upserted=$4,items_discarded=$5,items_discarded_reasons=$6::jsonb WHERE id=$1',
          [runId, pages, itemsSeen, upserted, discarded, JSON.stringify(discardedReasons)]);
        if (errorCode) break;
        if (apiProvider === 'lzt-market' && !stopping) await refreshOneSellerFeedback();
        genericItemsSeen += apiProvider === 'generic' ? payload.items.length : 0;
        if (apiProvider === 'generic' && payload.hasNextPage === false
          && typeof totalItems === 'number' && genericItemsSeen < totalItems) {
          errorCode = 'pagination_incomplete';
          break;
        }
        const hasMore = apiProvider === 'lzt-market'
          ? payload.hasNextPage === true
          : payload.hasNextPage !== false && !(typeof totalItems === 'number' && (totalItems === 0 || genericItemsSeen >= totalItems));
        if (apiProvider === 'lzt-market') {
          if (hasMore) {
            lztPage += 1;
            await lockClient.query(
              'INSERT INTO store_settings(setting_key,setting_value) VALUES($1,$2::jsonb) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()',
              [cursorKey, JSON.stringify(`page:${lztPage}`)]);
          } else await lockClient.query('DELETE FROM store_settings WHERE setting_key=$1', [cursorKey]);
        } else if (hasMore) {
          genericNextPage = feedPage + 1;
          await lockClient.query(
            "INSERT INTO store_settings(setting_key,setting_value) VALUES('generic_sync_state',$1::jsonb) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()",
            [JSON.stringify({ nextPage: genericNextPage, itemsSeen: genericItemsSeen, scanStartedAt: genericScanStartedAt.toISOString() })]);
        } else {
          await lockClient.query("DELETE FROM store_settings WHERE setting_key='generic_sync_state'");
          genericNextPage = 1;
          genericItemsSeen = 0;
        }
        if (!hasMore) { feedComplete = true; break; }
        if (apiProvider === 'generic' && pages < maxPages && delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      if (errorCode) break;
      if (feedComplete) {
        feedsCompleted += 1;
        nextFeedIndex = apiProvider === 'lzt-market' ? (feedIndex + 1) % feeds.length : 0;
        if (apiProvider === 'lzt-market' && feed.key !== 'generic') {
          await lockClient.query("UPDATE products SET status='hidden',synced_at=now() WHERE status='available' AND game=$1 AND synced_at < $2", [feed.key, scanStartedAt ?? runStartedAt]);
          await lockClient.query('DELETE FROM store_settings WHERE setting_key=$1', [scanStartedKey]);
        } else if (apiProvider === 'generic') {
          await lockClient.query(
            "UPDATE products SET status='hidden',synced_at=now() WHERE status='available' AND game IN ('fortnite','valorant','lol','roblox','steam') AND synced_at < $1",
            [genericScanStartedAt]);
        }
        if (apiProvider === 'lzt-market') await lockClient.query(
          "INSERT INTO store_settings(setting_key,setting_value) VALUES('lzt_sync_feed_index',$1::jsonb) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=now()",
          [JSON.stringify(nextFeedIndex)]);
      }
    }
    if (!errorCode && feedsCompleted === feeds.length) { complete = true; nextFeedIndex = 0; }
    if (!errorCode && !complete && pages >= maxPages) errorCode = 'max_pages_reached';
    await lockClient.query(
      'UPDATE catalog_sync_runs SET finished_at=now(),pages_read=$2,items_seen=$3,items_upserted=$4,items_discarded=$5,items_discarded_reasons=$6::jsonb,complete=$7,error_code=$8 WHERE id=$1',
      [runId, pages, itemsSeen, upserted, discarded, JSON.stringify(discardedReasons), complete, errorCode]);
    if (!complete && !errorCode) await lockClient.query("UPDATE catalog_sync_runs SET error_code='unknown_incomplete' WHERE id=$1", [runId]);
  } catch (error) {
    const knownImportError = error instanceof Error
      && ['catalog_item_not_serializable', 'catalog_item_exceeds_import_request_limit'].includes(error.message)
      ? error.message : 'worker_error';
    if (runId) await lockClient.query('UPDATE catalog_sync_runs SET finished_at=now(),complete=false,error_code=$2 WHERE id=$1', [runId, knownImportError]).catch(() => undefined);
  } finally {
    if (locked) await lockClient.query("SELECT pg_advisory_unlock(hashtext('digital-accounts-store-inventory-sync'))").catch(() => undefined);
    lockClient.release();
  }
}

async function main(): Promise<void> {
  if (!PUBLISHED_CATALOG_SYNC_ENABLED) {
    process.stdout.write('Worker de inventário inativo: sincronização não publicada nesta versão.\n');
    await pool.end();
    return;
  }
  const once = process.argv.includes('--once');
  const stop = () => { stopping = true; };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  do {
    nextRunDelayMs = intervalMs;
    await synchronize();
    if (once || stopping) break;
    await new Promise((resolve) => setTimeout(resolve, nextRunDelayMs));
  } while (true);
  await pool.end();
}

void main().catch(() => { process.stderr.write('Worker de estoque encerrado por erro de configuração.\n'); process.exitCode = 1; });
