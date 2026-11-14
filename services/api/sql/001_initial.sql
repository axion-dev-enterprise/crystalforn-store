CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client','admin')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  auth_user_id text,
  tenant_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash bytea PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_attempts (
  bucket_hash bytea NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_attempts_window_idx ON auth_attempts (bucket_hash, attempted_at DESC);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_item_id text NOT NULL UNIQUE,
  seller_id text,
  game text NOT NULL CHECK (game IN ('fortnite','valorant','lol','roblox','steam','other')),
  source_title text,
  generated_title text NOT NULL,
  source_price numeric(14,4) NOT NULL CHECK (source_price > 0),
  source_currency char(3) NOT NULL CHECK (source_currency IN ('USD','RUB','BRL')),
  price_brl_cents bigint,
  markup_percent smallint NOT NULL CHECK (markup_percent BETWEEN 50 AND 59),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','invalid','banned','sold','hidden')),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_updated_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_catalog_idx ON products (game, status, price_brl_cents, created_at DESC);
CREATE INDEX IF NOT EXISTS products_seller_idx ON products (seller_id);

CREATE TABLE IF NOT EXISTS seller_blocklist (
  seller_id text PRIMARY KEY CHECK (seller_id ~ '^[0-9]{1,40}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO store_settings(setting_key,setting_value) VALUES('markup_percent','55'::jsonb) ON CONFLICT(setting_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS coupons (
  code text PRIMARY KEY CHECK (code = upper(code) AND code ~ '^[A-Z0-9_-]{3,32}$'),
  discount_percent smallint NOT NULL CHECK (discount_percent BETWEEN 1 AND 4),
  active boolean NOT NULL DEFAULT true,
  max_redemptions integer CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count integer NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet_accounts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  balance_cents bigint NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  provider_item_id text NOT NULL,
  game text NOT NULL,
  product_title text NOT NULL,
  base_price_cents bigint NOT NULL CHECK (base_price_cents >= 0),
  discount_cents bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents bigint NOT NULL CHECK (total_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  status text NOT NULL CHECK (status IN ('pending_payment','paid','delivery_required','delivered','cancelled','refunded','review')),
  coupon_code text REFERENCES coupons(code) ON DELETE SET NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('pix','wallet')),
  idempotency_key text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS orders_user_history_idx ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS orders_active_product_idx ON orders (provider_item_id)
  WHERE provider_item_id <> '__wallet__' AND status IN ('pending_payment','paid','delivery_required','delivered','review');

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('pix_credit','purchase_debit','purchase_refund','admin_adjustment')),
  amount_cents bigint NOT NULL CHECK (amount_cents <> 0),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_ledger_user_idx ON wallet_ledger (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('mercadopago','pushinpay')),
  provider_payment_id text,
  provider_reference text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL CHECK (status IN ('creating','pending','approved','rejected','cancelled','refunded','review')),
  pix_copy_paste text,
  pix_qr_base64 text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);

CREATE TABLE IF NOT EXISTS account_deliveries (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  ciphertext bytea NOT NULL,
  nonce bytea NOT NULL,
  auth_tag bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE TABLE IF NOT EXISTS webhook_events (
  provider text NOT NULL,
  event_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','ignored','failed')),
  PRIMARY KEY (provider, event_id)
);

CREATE TABLE IF NOT EXISTS admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action ~ '^[a-z_]{1,64}$'),
  target_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_time_idx ON admin_audit (created_at DESC);

CREATE TABLE IF NOT EXISTS catalog_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  pages_read integer NOT NULL DEFAULT 0,
  items_seen integer NOT NULL DEFAULT 0,
  items_upserted integer NOT NULL DEFAULT 0,
  items_discarded integer NOT NULL DEFAULT 0,
  items_discarded_reasons jsonb NOT NULL DEFAULT '{}'::jsonb,
  complete boolean NOT NULL DEFAULT false,
  error_code text
);
