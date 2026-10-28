CREATE TABLE IF NOT EXISTS supplier_fulfillments (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider = 'lzt-market'),
  provider_item_id text NOT NULL,
  source_price numeric(14,4) NOT NULL CHECK (source_price > 0),
  source_currency char(3) NOT NULL CHECK (source_currency IN ('USD','RUB','BRL')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','review','refunded')),
  attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 100),
  claimed_at timestamptz,
  error_code text CHECK (error_code IS NULL OR error_code ~ '^[a-z0-9_]{1,64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS supplier_fulfillments_queue_idx ON supplier_fulfillments(status, created_at)
  WHERE status = 'queued';
