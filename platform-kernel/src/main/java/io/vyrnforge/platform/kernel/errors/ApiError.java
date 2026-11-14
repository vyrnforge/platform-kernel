package io.vyrnforge.platform.kernel.errors;

import io.vyrnforge.platform.kernel.context.CorrelationContext;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Framework-neutral representation of the standard API error envelope. */
public record ApiError(
        String code,
        String message,
        UUID requestId,
        UUID correlationId,
        List<FieldError> fieldErrors,
        Map<String, Object> details) {

    public ApiError {
        if (code == null || code.isBlank()) throw new IllegalArgumentException("code must not be blank");
        if (message == null || message.isBlank()) throw new IllegalArgumentException("message must not be blank");
        Objects.requireNonNull(requestId, "requestId");
        Objects.requireNonNull(correlationId, "correlationId");
        fieldErrors = fieldErrors == null ? List.of() : List.copyOf(fieldErrors);
        details = details == null ? Map.of() : Map.copyOf(details);
    }

    public static ApiError from(KernelAccessException exception, CorrelationContext correlation) {
        Objects.requireNonNull(exception, "exception");
        Objects.requireNonNull(correlation, "correlation");
        return new ApiError(
                exception.failure().code(),
                exception.getMessage(),
                correlation.requestId(),
                correlation.correlationId(),
                List.of(),
                Map.of());
    }
}
