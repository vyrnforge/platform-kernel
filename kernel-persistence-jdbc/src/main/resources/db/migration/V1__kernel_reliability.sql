CREATE TABLE platform_event_outbox (
    event_id UUID PRIMARY KEY,
    event_fingerprint VARCHAR(64) NOT NULL,
    event_type VARCHAR(192) NOT NULL,
    event_version INTEGER NOT NULL CHECK (event_version > 0),
    occurred_at TIMESTAMPTZ NOT NULL,
    tenant_id UUID NULL,
    producer VARCHAR(128) NOT NULL,
    subject_type VARCHAR(128) NOT NULL,
    subject_id VARCHAR(512) NOT NULL,
    correlation_id UUID NOT NULL,
    causation_id UUID NULL,
    actor_type VARCHAR(16) NULL,
    actor_id VARCHAR(512) NULL,
    identity_issuer VARCHAR(512) NULL,
    identity_subject VARCHAR(512) NULL,
    actor_display_name VARCHAR(256) NULL,
    payload_json JSONB NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','PUBLISHED','DEAD')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at TIMESTAMPTZ NOT NULL,
    locked_until TIMESTAMPTZ NULL,
    last_error_code VARCHAR(128) NULL,
    published_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_event_outbox_delivery
    ON platform_event_outbox(status, available_at, locked_until, occurred_at);

CREATE TABLE platform_audit_event (
    audit_id UUID PRIMARY KEY,
    audit_fingerprint VARCHAR(64) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    tenant_id UUID NULL,
    actor_type VARCHAR(16) NULL,
    actor_id VARCHAR(512) NULL,
    identity_issuer VARCHAR(512) NULL,
    identity_subject VARCHAR(512) NULL,
    actor_display_name VARCHAR(256) NULL,
    action VARCHAR(192) NOT NULL,
    resource_type VARCHAR(128) NOT NULL,
    resource_id VARCHAR(512) NOT NULL,
    resource_tenant_id UUID NULL,
    outcome VARCHAR(16) NOT NULL,
    source VARCHAR(128) NOT NULL,
    correlation_id UUID NOT NULL,
    reason VARCHAR(2048) NULL,
    changes_json JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platform_audit_tenant_time
    ON platform_audit_event(tenant_id, occurred_at DESC);
CREATE INDEX idx_platform_audit_correlation
    ON platform_audit_event(correlation_id);

CREATE TABLE platform_idempotency (
    tenant_id UUID NOT NULL,
    operation VARCHAR(192) NOT NULL,
    idempotency_key VARCHAR(512) NOT NULL,
    request_fingerprint VARCHAR(512) NOT NULL,
    lease_id UUID NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('IN_PROGRESS','COMPLETED')),
    result_text TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (tenant_id, operation, idempotency_key)
);

CREATE INDEX idx_platform_idempotency_expiry
    ON platform_idempotency(expires_at);
