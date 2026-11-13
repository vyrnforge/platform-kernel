package io.vyrnforge.platform.kernel.pipeline;

import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.context.ResourceReference;
import io.vyrnforge.platform.kernel.context.TenantContext;

import java.util.Objects;

public record RequestContextInput<C>(
        C credential,
        TenantContext requestedTenant,
        CorrelationContext correlation,
        EndpointPolicy endpointPolicy,
        ResourceReference resource) {

    public RequestContextInput {
        Objects.requireNonNull(requestedTenant, "requestedTenant");
        correlation = correlation == null ? CorrelationContext.create() : correlation;
        Objects.requireNonNull(endpointPolicy, "endpointPolicy");
    }
}
