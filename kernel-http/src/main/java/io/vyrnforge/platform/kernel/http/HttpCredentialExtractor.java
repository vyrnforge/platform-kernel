package io.vyrnforge.platform.kernel.http;

@FunctionalInterface
public interface HttpCredentialExtractor<C> {
    C extract(HttpRequestMetadata request);
}
