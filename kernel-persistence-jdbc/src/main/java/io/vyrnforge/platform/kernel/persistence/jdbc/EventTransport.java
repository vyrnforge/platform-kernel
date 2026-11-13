package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.event.EventEnvelope;

@FunctionalInterface
public interface EventTransport {
    void publish(EventEnvelope<Object> event) throws Exception;
}
