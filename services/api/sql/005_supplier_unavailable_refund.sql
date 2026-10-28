ALTER TABLE supplier_fulfillments
  DROP CONSTRAINT IF EXISTS supplier_fulfillments_status_check;

ALTER TABLE supplier_fulfillments
  ADD CONSTRAINT supplier_fulfillments_status_check
  CHECK (status IN ('queued','processing','completed','review','refunded'));
