ALTER TABLE catalog_sync_runs
  ADD COLUMN IF NOT EXISTS items_discarded integer NOT NULL DEFAULT 0;
