CREATE TABLE IF NOT EXISTS customer_cancellation_requests (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_message text NOT NULL DEFAULT '' CHECK (length(customer_message) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','declined')),
  admin_response text CHECK (admin_response IS NULL OR length(admin_response) <= 1000),
  reviewed_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_cancellation_requests_queue_idx
  ON customer_cancellation_requests (status, created_at DESC);
