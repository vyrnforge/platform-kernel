package io.vyrnforge.platform.kernel.errors;

public record FieldError(String field, String code, String message) {
    public FieldError {
        if (field == null || field.isBlank()) throw new IllegalArgumentException("field must not be blank");
        if (code == null || code.isBlank()) throw new IllegalArgumentException("code must not be blank");
        if (message == null || message.isBlank()) throw new IllegalArgumentException("message must not be blank");
    }
}
