import { createCipheriv, randomBytes } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { integerEnv } from './config';

// This release is demo-only. Runtime credentials cannot authorize an external purchase.
const PUBLISHED_DEMO_ONLY = true;

type Job = { order_id: string; provider_item_id: string; source_price: string; source_currency: string };
type ProviderCredential = { raw?: unknown; login?: unknown; password?: unknown; oldPassword?: unknown };
type FastBuyResponse = { status?: unknown; item?: { loginData?: ProviderCredential; emailLoginData?: ProviderCredential; requireVideoRecording?: unknown; accountLink?: unknown; accountLinks?: unknown; emailLoginUrl?: unknown }; error?: unknown; errors?: unknown };

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Configuração ausente: ${name}`);
  return value;
}

const apiBase = PUBLISHED_DEMO_ONLY ? 'https://example.invalid/' : required('API_BASE_URL');
const apiToken = PUBLISHED_DEMO_ONLY ? '' : required('LZT_MARKET_API_TOKEN');
const balanceId = PUBLISHED_DEMO_ONLY ? 0 : Number(required('LZT_BALANCE_ID'));
const balanceCurrency = PUBLISHED_DEMO_ONLY ? 'BRL' : required('LZT_BALANCE_CURRENCY').toUpperCase();
const rawKey = PUBLISHED_DEMO_ONLY ? '' : required('DELIVERY_ENCRYPTION_KEY');
const key = /^[a-f\d]{64}$/i.test(rawKey) ? Buffer.from(rawKey, 'hex') : null;
const timeoutMs = integerEnv('LZT_FULFILLMENT_TIMEOUT_MS', 300_000, 300_000, 600_000);
if (!PUBLISHED_DEMO_ONLY && !key) throw new Error('DELIVERY_ENCRYPTION_KEY inválida.');
if (!PUBLISHED_DEMO_ONLY && (process.env.API_PROVIDER ?? 'lzt-market') !== 'lzt-market') throw new Error('Compra automática está disponível somente para LZT Market.');
if (!PUBLISHED_DEMO_ONLY && /[\r\n]/.test(apiToken)) throw new Error('LZT_MARKET_API_TOKEN inválido.');
if (!PUBLISHED_DEMO_ONLY && (!Number.isSafeInteger(balanceId) || balanceId <= 0)) throw new Error('LZT_BALANCE_ID inválido.');
if (!PUBLISHED_DEMO_ONLY && !['USD', 'RUB', 'BRL'].includes(balanceCurrency)) throw new Error('LZT_BALANCE_CURRENCY inválida.');
const apiRoot = new URL(apiBase.endsWith('/') ? apiBase : `${apiBase}/`);
if (!PUBLISHED_DEMO_ONLY && (apiRoot.protocol !== 'https:' || apiRoot.username || apiRoot.password || apiRoot.hostname !== 'api.lzt.market' || apiRoot.pathname !== '/' || apiRoot.search || apiRoot.hash)) {
  throw new Error('API_BASE_URL deve ser https://api.lzt.market/ sem credenciais.');
}
const databaseUrl = PUBLISHED_DEMO_ONLY ? undefined : required('DATABASE_URL');
const pool = new Pool({ connectionString: databaseUrl, max: 3, application_name: 'digital-store-supplier-fulfillment', connectionTimeoutMillis: 5000 });
let stopping = false;

function credentialsFrom(payload: FastBuyResponse): string | null {
  const login = payload.item?.loginData;
  if (!login || typeof login !== 'object') return null;
  const loginRaw = typeof login.raw === 'string' ? login.raw.trim() : '';
  const loginName = typeof login.login === 'string' ? login.login.trim() : '';
  const password = typeof login.password === 'string' ? login.password : '';
  if (!loginRaw && (!loginName || !password)) return null;
  const emailLogin = payload.item?.emailLoginData;
  const email = emailLogin && typeof emailLogin === 'object' ? {
    dados: typeof emailLogin.raw === 'string' ? emailLogin.raw : undefined,
    login: typeof emailLogin.login === 'string' ? emailLogin.login : undefined,
    senha: typeof emailLogin.password === 'string' ? emailLogin.password : undefined,
    senhaAnterior: typeof emailLogin.oldPassword === 'string' ? emailLogin.oldPassword : undefined,
  } : undefined;
  const delivery = {
    conta: {
      dados: loginRaw || undefined,
      login: loginName || undefined,
      senha: password || undefined,
      senhaAnterior: typeof login.oldPassword === 'string' ? login.oldPassword : undefined,
    },
    email,
    links: {
      conta: typeof payload.item?.accountLink === 'string' ? payload.item.accountLink : undefined,
      contas: Array.isArray(payload.item?.accountLinks) ? payload.item.accountLinks.filter((value): value is string => typeof value === 'string') : undefined,
      acessoEmail: typeof payload.item?.emailLoginUrl === 'string' ? payload.item.emailLoginUrl : undefined,
    },
    gravacaoDeTelaExigida: payload.item?.requireVideoRecording === true,
  };
  return JSON.stringify(delivery);
}

async function claim(client: PoolClient): Promise<Job | null> {
  await client.query('BEGIN');
  try {
    const result = await client.query<Job>(
      `WITH candidate AS (
         SELECT f.order_id FROM supplier_fulfillments f
         JOIN orders o ON o.id=f.order_id
         WHERE f.status='queued' AND o.status='delivery_required'
           AND NOT EXISTS (SELECT 1 FROM account_deliveries d WHERE d.order_id=f.order_id)
         ORDER BY f.created_at LIMIT 1 FOR UPDATE OF f SKIP LOCKED
       )
       UPDATE supplier_fulfillments f SET status='processing',attempt_count=attempt_count+1,claimed_at=now(),error_code=NULL,updated_at=now()
       FROM candidate c,orders o WHERE f.order_id=c.order_id AND o.id=f.order_id
       RETURNING f.order_id,f.provider_item_id,f.source_price::text,f.source_currency`,
    );
    await client.query('COMMIT');
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function markReview(orderId: string, errorCode: string): Promise<void> {
  await pool.query(
    `UPDATE supplier_fulfillments SET status='review',error_code=$2,updated_at=now()
     WHERE order_id=$1 AND status='processing'`, [orderId, errorCode]);
}

function providerErrorMessages(payload: FastBuyResponse): string[] {
  const errors = [payload.error, ...(Array.isArray(payload.errors) ? payload.errors : [payload.errors])];
  return errors.flatMap((error) => {
    if (typeof error === 'string') return [error.toLowerCase()];
    if (!error || typeof error !== 'object' || Array.isArray(error)) return [];
    const record = error as Record<string, unknown>;
    return [record.error, record.message, record.code].filter((value): value is string => typeof value === 'string').map((value) => value.toLowerCase());
  });
}

function isItemUnavailable(payload: FastBuyResponse): boolean {
  return providerErrorMessages(payload).some((message) => message.includes('item is sold') || message.includes('item deleted') || message.includes('item not found'));
}

function isRetryRequest(payload: FastBuyResponse): boolean {
  return providerErrorMessages(payload).some((message) => message.includes('retry_request'));
}

async function creditWalletForUnavailableItem(job: Job): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await client.query<{ id: string; user_id: string; total_cents: string; status: string; coupon_code: string | null }>(
      'SELECT id,user_id,total_cents,status,coupon_code FROM orders WHERE id=$1 FOR UPDATE', [job.order_id]);
    const fulfillment = await client.query<{ status: string }>(
      'SELECT status FROM supplier_fulfillments WHERE order_id=$1 FOR UPDATE', [job.order_id]);
    if (!order.rows[0] || order.rows[0].status !== 'delivery_required' || fulfillment.rows[0]?.status !== 'processing') {
      throw new Error('order_state_changed');
    }
    const amountCents = Number(order.rows[0].total_cents);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('refund_amount_invalid');
    const credit = await client.query(
      `INSERT INTO wallet_ledger(user_id,order_id,kind,amount_cents,idempotency_key)
       VALUES($1,$2,'purchase_refund',$3,$4) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,
      [order.rows[0].user_id, order.rows[0].id, amountCents, `supplier-unavailable:${order.rows[0].id}`]);
    if (credit.rowCount) {
      const wallet = await client.query(
        'UPDATE wallet_accounts SET balance_cents=balance_cents+$2,updated_at=now() WHERE user_id=$1',
        [order.rows[0].user_id, amountCents]);
      if (wallet.rowCount !== 1) throw new Error('wallet_account_missing');
    }
    await client.query("UPDATE products SET status='sold',synced_at=now() WHERE provider_item_id=$1", [job.provider_item_id]);
    await client.query("UPDATE orders SET status='refunded',updated_at=now() WHERE id=$1", [order.rows[0].id]);
    if (order.rows[0].coupon_code) await client.query('UPDATE coupons SET redemption_count=GREATEST(0,redemption_count-1) WHERE code=$1', [order.rows[0].coupon_code]);
    const fulfillmentUpdate = await client.query(
      "UPDATE supplier_fulfillments SET status='refunded',error_code='item_unavailable_wallet_refund',completed_at=now(),updated_at=now() WHERE order_id=$1 AND status='processing'",
      [order.rows[0].id]);
    if (fulfillmentUpdate.rowCount !== 1) throw new Error('fulfillment_state_changed');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

async function postFastBuy(job: Job): Promise<FastBuyResponse | null> {
  const url = new URL(`${encodeURIComponent(job.provider_item_id)}/fast-buy`, apiRoot);
  const body = JSON.stringify({ price: Number(job.source_price), balance_id: balanceId });
  const deadline = Date.now() + timeoutMs;
  for (let requestNumber = 1; requestNumber <= 100; requestNumber += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(remainingMs),
      });
    } catch {
      await markReview(job.order_id, 'provider_unreachable');
      return null;
    }
    let payload: FastBuyResponse;
    try { payload = await response.json() as FastBuyResponse; }
    catch {
      await markReview(job.order_id, 'invalid_provider_response');
      return null;
    }
    if (!response.ok) {
      const retryRequest = isRetryRequest(payload);
      if (response.status === 403 && retryRequest && requestNumber < 100) {
        if (deadline - Date.now() <= 3000) break;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
      if ((response.status === 403 || response.status === 404) && isItemUnavailable(payload)) {
        try { await creditWalletForUnavailableItem(job); }
        catch { await markReview(job.order_id, 'wallet_refund_failed'); }
        return null;
      }
      await markReview(job.order_id, retryRequest ? 'retry_request_exhausted' : `provider_http_${response.status}`);
      return null;
    }
    return payload;
  }
  await markReview(job.order_id, 'retry_request_exhausted');
  return null;
}

async function encryptAndSave(job: Job, credentials: string): Promise<void> {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key!, nonce);
  const ciphertext = Buffer.concat([cipher.update(credentials, 'utf8'), cipher.final()]);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const order = await client.query<{ status: string }>('SELECT status FROM orders WHERE id=$1 FOR UPDATE', [job.order_id]);
    if (order.rows[0]?.status !== 'delivery_required') throw new Error('order_state_changed');
    const locked = await client.query<{ status: string }>(
      'SELECT status FROM supplier_fulfillments WHERE order_id=$1 FOR UPDATE', [job.order_id]);
    if (locked.rows[0]?.status !== 'processing') throw new Error('job_state_changed');
    await client.query(
      `INSERT INTO account_deliveries(order_id,ciphertext,nonce,auth_tag)
       VALUES($1,$2,$3,$4) ON CONFLICT(order_id) DO NOTHING`,
      [job.order_id, ciphertext, nonce, cipher.getAuthTag()]);
    const delivery = await client.query('SELECT 1 FROM account_deliveries WHERE order_id=$1', [job.order_id]);
    if (!delivery.rowCount) throw new Error('delivery_persistence_failed');
    await client.query("UPDATE supplier_fulfillments SET status='completed',error_code=NULL,completed_at=now(),updated_at=now() WHERE order_id=$1", [job.order_id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function processJob(job: Job): Promise<void> {
  if (!/^\d+$/.test(job.provider_item_id) || !Number.isFinite(Number(job.source_price)) || Number(job.source_price) <= 0 || !['USD', 'RUB', 'BRL'].includes(job.source_currency.trim()) || job.source_currency.trim() !== balanceCurrency) {
    await markReview(job.order_id, 'supplier_price_invalid');
    return;
  }
  const payload = await postFastBuy(job);
  if (!payload) return;
  const credentials = credentialsFrom(payload);
  if (!credentials) {
    await markReview(job.order_id, 'provider_credentials_missing');
    return;
  }
  try { await encryptAndSave(job, credentials); }
  catch { await markReview(job.order_id, 'delivery_persistence_failed'); }
}

async function main(): Promise<void> {
  if (PUBLISHED_DEMO_ONLY) {
    process.stdout.write('Worker de fulfillment inativo: versão publicada em modo demonstração.\n');
    await pool.end();
    return;
  }
  const once = process.argv.includes('--once');
  const lockClient = await pool.connect();
  let locked = false;
  const stop = () => { stopping = true; };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  try {
    const result = await lockClient.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(hashtext('digital-store-supplier-fulfillment')) AS locked");
    locked = result.rows[0]?.locked === true;
    if (!locked) throw new Error('Outro worker de compra já está ativo.');
    await pool.query(
      `UPDATE supplier_fulfillments SET status='review',error_code='worker_interrupted',updated_at=now()
       WHERE status='processing' AND claimed_at < now()-interval '15 minutes'`);
    do {
      const client = await pool.connect();
      try {
        const job = await claim(client);
        if (job) await processJob(job);
        else if (!once) await new Promise((resolve) => setTimeout(resolve, 10_000));
        else break;
      } finally { client.release(); }
      } while (!once && !stopping);
  } finally {
    if (locked) await lockClient.query("SELECT pg_advisory_unlock(hashtext('digital-store-supplier-fulfillment'))").catch(() => undefined);
    lockClient.release();
    await pool.end();
  }
}

void main().catch(() => { process.stderr.write('Worker de compra e entrega interrompido; pedidos podem exigir revisão manual.\n'); process.exitCode = 1; });
