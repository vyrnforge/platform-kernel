package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.event.EventIntentPort;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Test-only in-memory event intent sink. It deliberately provides no production durability guarantee. */
public final class InMemoryEventIntentPort implements EventIntentPort {
    private final List<EventEnvelope<?>> events = new ArrayList<>();

    @Override
    public synchronized void accept(EventEnvelope<?> event) {
        events.add(Objects.requireNonNull(event, "event"));
    }

    public synchronized List<EventEnvelope<?>> snapshot() {
        return List.copyOf(events);
    }
}
