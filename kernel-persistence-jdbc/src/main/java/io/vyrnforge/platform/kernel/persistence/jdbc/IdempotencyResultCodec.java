package io.vyrnforge.platform.kernel.persistence.jdbc;

public interface IdempotencyResultCodec<R> {
    String encode(R value);
    R decode(String value);

    static IdempotencyResultCodec<String> strings() {
        return new IdempotencyResultCodec<>() {
            @Override public String encode(String value) { return value; }
            @Override public String decode(String value) { return value; }
        };
    }
}
