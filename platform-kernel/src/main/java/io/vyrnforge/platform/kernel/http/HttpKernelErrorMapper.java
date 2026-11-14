package io.vyrnforge.platform.kernel.http;

import io.vyrnforge.platform.kernel.errors.ApiError;
import io.vyrnforge.platform.kernel.errors.KernelFailure;

import java.util.Objects;

/**
 * Conservative V1 HTTP mapping for kernel access failures.
 * Domain applications may map their own domain errors separately.
 */
public final class HttpKernelErrorMapper {
    private final HttpHeaderConfiguration headers;

    public HttpKernelErrorMapper(HttpHeaderConfiguration headers) {
        this.headers = Objects.requireNonNull(headers, "headers");
    }

    public HttpErrorResponse map(HttpContextException exception) {
        Objects.requireNonNull(exception, "exception");

        KernelFailure failure = exception.kernelException().failure();
        int status = switch (failure) {
            case AUTHENTICATION_FAILED -> 401;
            case INVALID_CONTEXT -> 400;
            case TENANT_CONTEXT_MISMATCH -> 404;
            case TENANT_REQUIRED,
                 TENANT_MEMBERSHIP_REQUIRED,
                 MODULE_DISABLED,
                 DOMAIN_ACCESS_DENIED -> 403;
        };

        ApiError body = ApiError.from(exception.kernelException(), exception.correlation());
        return new HttpErrorResponse(
                status,
                HttpResponseMetadata.from(exception.correlation(), headers).headers(),
                body);
    }
}
