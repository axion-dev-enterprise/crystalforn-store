ALTER TABLE catalog_sync_runs
  ADD COLUMN IF NOT EXISTS items_discarded_reasons jsonb NOT NULL DEFAULT '{}'::jsonb;
