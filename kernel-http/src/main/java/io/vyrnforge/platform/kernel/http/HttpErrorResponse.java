package io.vyrnforge.platform.kernel.http;

import io.vyrnforge.platform.kernel.errors.ApiError;

import java.util.Map;
import java.util.Objects;

public record HttpErrorResponse(int status, Map<String, String> headers, ApiError body) {
    public HttpErrorResponse {
        if (status < 400 || status > 599) {
            throw new IllegalArgumentException("status must be an HTTP error status");
        }
        headers = Map.copyOf(Objects.requireNonNull(headers, "headers"));
        Objects.requireNonNull(body, "body");
    }
}
