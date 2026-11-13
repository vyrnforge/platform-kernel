package io.vyrnforge.platform.kernel.persistence.jdbc;

public record OutboxPublishResult(int claimed, int published, int retried, int dead) {}
