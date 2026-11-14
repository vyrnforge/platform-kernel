package io.vyrnforge.platform.kernel.errors;

import java.util.Objects;

/** Safe exception intended to be mapped by a framework adapter into the standard ApiError envelope. */
public final class KernelAccessException extends RuntimeException {
    private final KernelFailure failure;

    public KernelAccessException(KernelFailure failure, String safeMessage) {
        super(Objects.requireNonNull(safeMessage, "safeMessage"));
        this.failure = Objects.requireNonNull(failure, "failure");
    }

    public KernelFailure failure() {
        return failure;
    }
}
