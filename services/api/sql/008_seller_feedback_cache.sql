CREATE TABLE IF NOT EXISTS seller_feedback_cache (
  seller_id text PRIMARY KEY CHECK (seller_id ~ '^[0-9]{1,40}$'),
  feedback_total integer NOT NULL DEFAULT 0 CHECK (feedback_total >= 0),
  positive_count integer NOT NULL DEFAULT 0 CHECK (positive_count >= 0),
  negative_count integer NOT NULL DEFAULT 0 CHECK (negative_count >= 0),
  positive_percentage smallint CHECK (positive_percentage BETWEEN 0 AND 100),
  checked_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  failure_count smallint NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  last_error_code text,
  CHECK (positive_count + negative_count <= feedback_total)
);

CREATE INDEX IF NOT EXISTS seller_feedback_due_idx
  ON seller_feedback_cache (next_attempt_at, checked_at ASC NULLS FIRST, seller_id);
