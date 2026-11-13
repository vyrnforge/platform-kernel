package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.audit.AuditEvent;
import io.vyrnforge.platform.kernel.audit.AuditIntentPort;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Test-only in-memory audit intent sink. It deliberately provides no production durability guarantee. */
public final class InMemoryAuditIntentPort implements AuditIntentPort {
    private final List<AuditEvent> events = new ArrayList<>();

    @Override
    public synchronized void accept(AuditEvent auditEvent) {
        events.add(Objects.requireNonNull(auditEvent, "auditEvent"));
    }

    public synchronized List<AuditEvent> snapshot() {
        return List.copyOf(events);
    }
}
