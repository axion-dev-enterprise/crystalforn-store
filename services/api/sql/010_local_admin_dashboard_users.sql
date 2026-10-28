CREATE TABLE IF NOT EXISTS dashboard_users (
  auth_user_id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text,
  picture_url text,
  tenant_id text NOT NULL CHECK (tenant_id = 'crystalforn'),
  roles text[] NOT NULL CHECK (cardinality(roles) > 0),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  password_salt text,
  password_hash text,
  store_user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((password_salt IS NULL) = (password_hash IS NULL))
);

CREATE INDEX IF NOT EXISTS dashboard_users_tenant_status_idx
  ON dashboard_users (tenant_id, status);

UPDATE users
SET tenant_id = 'crystalforn'
WHERE role = 'admin' AND status = 'ACTIVE' AND auth_user_id IS NULL AND tenant_id IS NULL;

INSERT INTO dashboard_users (
  auth_user_id,email,display_name,tenant_id,roles,status,password_salt,password_hash,store_user_id
)
SELECT 'store-admin:' || id::text,email,'Administrador Crystalforn','crystalforn',ARRAY['store_admin']::text[],status,
       password_salt,password_hash,id
FROM users
WHERE role = 'admin' AND status = 'ACTIVE' AND auth_user_id IS NULL AND tenant_id = 'crystalforn'
ON CONFLICT (auth_user_id) DO NOTHING;
