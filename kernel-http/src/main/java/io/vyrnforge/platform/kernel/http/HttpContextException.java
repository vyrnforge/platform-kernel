package io.vyrnforge.platform.kernel.http;

import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.errors.KernelAccessException;

import java.util.Objects;

/** Carries a safe kernel failure together with request/correlation IDs for edge error mapping. */
public final class HttpContextException extends RuntimeException {
    private final KernelAccessException kernelException;
    private final CorrelationContext correlation;

    public HttpContextException(KernelAccessException kernelException, CorrelationContext correlation) {
        super(Objects.requireNonNull(kernelException, "kernelException").getMessage(), kernelException);
        this.kernelException = kernelException;
        this.correlation = Objects.requireNonNull(correlation, "correlation");
    }

    public KernelAccessException kernelException() {
        return kernelException;
    }

    public CorrelationContext correlation() {
        return correlation;
    }
}
