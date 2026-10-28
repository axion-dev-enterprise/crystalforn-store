CREATE INDEX IF NOT EXISTS payments_provider_lookup_idx ON payments (provider, provider_payment_id);
CREATE INDEX IF NOT EXISTS webhook_events_received_idx ON webhook_events (received_at DESC);
