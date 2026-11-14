package io.vyrnforge.platform.kernel.errors;

public record FieldError(String field, String code, String message) {
    public FieldError {
        if (field == null || field.isBlank() || field.codePointCount(0, field.length()) > 512) throw new IllegalArgumentException("field must not be blank");
        if (code == null || code.isBlank() || code.codePointCount(0, code.length()) > 128) throw new IllegalArgumentException("code must not be blank");
        if (message == null || message.isBlank() || message.codePointCount(0, message.length()) > 1024) throw new IllegalArgumentException("message must not be blank");
    }
}
