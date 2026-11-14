package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.context.ActorReference;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Versioned length-delimited fingerprint, distinguishing null and literal strings. */
final class IntentFingerprint {
    private IntentFingerprint() {}

    static String hash(String kind, String... fields) {
        StringBuilder input = new StringBuilder("kernel-intent-v2:");
        append(input, kind);
        for (String field : fields) append(input, field);
        return SqlSupport.sha256(input.toString());
    }

    static String[] fields(String[] prefix, ActorReference actor, String... suffix) {
        List<String> result = new ArrayList<>(Arrays.asList(prefix));
        result.addAll(Arrays.asList(actor == null ? new String[5] : new String[] {
            actor.actorType().name(), actor.actorId(),
            actor.identity() == null ? null : actor.identity().issuer(),
            actor.identity() == null ? null : actor.identity().subject(), actor.displayName()
        }));
        result.addAll(Arrays.asList(suffix));
        return result.toArray(String[]::new);
    }

    static String nullable(Object value) {
        return value == null ? null : value.toString();
    }

    private static void append(StringBuilder target, String value) {
        if (value == null) target.append("-1:");
        else target.append(value.length()).append(':').append(value);
    }
}
