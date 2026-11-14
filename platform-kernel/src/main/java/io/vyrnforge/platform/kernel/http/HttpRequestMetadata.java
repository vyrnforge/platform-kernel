package io.vyrnforge.platform.kernel.http;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Framework-neutral immutable HTTP request metadata.
 * Header lookup is case-insensitive and preserves duplicate values so sensitive duplicates can be rejected.
 */
public final class HttpRequestMetadata {
    private final Map<String, List<String>> headers;

    private HttpRequestMetadata(Map<String, List<String>> headers) {
        this.headers = headers;
    }

    public static HttpRequestMetadata of(Map<String, List<String>> headers) {
        Objects.requireNonNull(headers, "headers");
        Map<String, List<String>> normalized = new LinkedHashMap<>();

        for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
            String key = normalizeName(entry.getKey());
            List<String> values = Objects.requireNonNull(entry.getValue(), "header values");
            List<String> target = normalized.computeIfAbsent(key, ignored -> new ArrayList<>());

            for (String value : values) {
                Objects.requireNonNull(value, "header value");
                if (value.indexOf('\r') >= 0 || value.indexOf('\n') >= 0) {
                    throw new IllegalArgumentException("header values must not contain CR/LF");
                }
                target.add(value);
            }
        }

        Map<String, List<String>> immutable = new LinkedHashMap<>();
        normalized.forEach((key, values) -> immutable.put(key, List.copyOf(values)));
        return new HttpRequestMetadata(Map.copyOf(immutable));
    }

    public static HttpRequestMetadata ofSingleValueHeaders(Map<String, String> headers) {
        Objects.requireNonNull(headers, "headers");
        Map<String, List<String>> values = new LinkedHashMap<>();
        headers.forEach((name, value) -> values.put(name, List.of(value)));
        return of(values);
    }

    public List<String> headerValues(String name) {
        return headers.getOrDefault(normalizeName(name), List.of());
    }

    public String singleOptional(String name) {
        List<String> values = headerValues(name);
        if (values.isEmpty()) {
            return null;
        }
        if (values.size() != 1) {
            throw new IllegalArgumentException("multiple values are not allowed for header " + name);
        }
        return values.getFirst();
    }

    public Map<String, List<String>> headers() {
        return headers;
    }

    private static String normalizeName(String name) {
        Objects.requireNonNull(name, "header name");
        if (name.isBlank()) {
            throw new IllegalArgumentException("header name must not be blank");
        }
        return name.toLowerCase(Locale.ROOT);
    }
}
