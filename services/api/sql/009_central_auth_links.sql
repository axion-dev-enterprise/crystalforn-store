ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id text;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique_idx
  ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

ALTER TABLE users ADD CONSTRAINT users_crystalforn_customer_identity_check
  CHECK (auth_user_id IS NULL OR (role IN ('client','admin') AND tenant_id = 'crystalforn'));
