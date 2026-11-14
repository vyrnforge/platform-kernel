package io.vyrnforge.platform.kernel.errors;

/** Stable framework-neutral failure categories for request-context resolution. */
public enum KernelFailure {
    AUTHENTICATION_FAILED("PLATFORM_AUTHENTICATION_FAILED"),
    INVALID_CONTEXT("PLATFORM_INVALID_CONTEXT"),
    TENANT_REQUIRED("PLATFORM_TENANT_REQUIRED"),
    TENANT_MEMBERSHIP_REQUIRED("PLATFORM_TENANT_MEMBERSHIP_REQUIRED"),
    TENANT_CONTEXT_MISMATCH("PLATFORM_TENANT_CONTEXT_MISMATCH"),
    MODULE_DISABLED("PLATFORM_MODULE_DISABLED"),
    DOMAIN_ACCESS_DENIED("PLATFORM_DOMAIN_ACCESS_DENIED");

    private final String code;

    KernelFailure(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }
}
