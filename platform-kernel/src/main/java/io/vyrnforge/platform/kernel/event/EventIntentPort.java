package io.vyrnforge.platform.kernel.event;

/**
 * Reliability boundary for required event publication intent.
 *
 * A successful return means the implementation has accepted responsibility for eventual delivery
 * under its documented durability guarantees. It does not mean a broker has already delivered the
 * event. Implementations may use an outbox, durable queue, broker transaction, or another mechanism.
 *
 * When an event is required by a domain mutation, callers must compose this port with the mutation
 * so success cannot be acknowledged while the required event intent can be silently lost.
 */
@FunctionalInterface
public interface EventIntentPort {
    void accept(EventEnvelope<?> event);
}
