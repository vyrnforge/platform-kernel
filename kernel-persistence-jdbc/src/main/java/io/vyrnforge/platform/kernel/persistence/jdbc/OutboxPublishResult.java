package io.vyrnforge.platform.kernel.persistence.jdbc;

/** Counts processed candidates, including exhausted expired claims. */
public record OutboxPublishResult(int claimed, int published, int retried, int dead) {
    /** Claims that expired or were superseded before the worker could finalize them. */
    public int lostClaims() { return claimed - published - retried - dead; }
}
