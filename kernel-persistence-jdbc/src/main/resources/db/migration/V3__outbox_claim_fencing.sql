-- Additive migration. Drain/stop all pre-hardening publishers before applying.
-- Existing PENDING rows remain recoverable after their prior leases expire.
ALTER TABLE platform_event_outbox ADD COLUMN claim_token UUID NULL;
