ALTER TABLE admin_audit
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS admin_audit_actor_time_idx
  ON admin_audit (actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS catalog_item_overrides (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  hidden boolean NOT NULL DEFAULT false,
  updated_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS catalog_item_overrides_hidden_idx
  ON catalog_item_overrides (updated_at DESC) WHERE hidden = true;
