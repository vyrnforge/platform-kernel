package io.vyrnforge.platform.kernel.http;

import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.context.ResourceReference;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.errors.KernelAccessException;
import io.vyrnforge.platform.kernel.errors.KernelFailure;
import io.vyrnforge.platform.kernel.ids.UuidV7;
import io.vyrnforge.platform.kernel.observability.CorrelationPropagation;
import io.vyrnforge.platform.kernel.pipeline.EndpointPolicy;
import io.vyrnforge.platform.kernel.pipeline.RequestContextInput;
import io.vyrnforge.platform.kernel.pipeline.RequestContextPipeline;
import io.vyrnforge.platform.kernel.pipeline.ResolvedRequestContext;

import java.util.Objects;
import java.util.UUID;

/**
 * Framework-neutral HTTP edge adapter.
 * It only resolves transport metadata and delegates semantic enforcement to RequestContextPipeline.
 */
public final class HttpRequestContextAdapter<C> {
    private final HttpHeaderConfiguration headers;
    private final HttpCredentialExtractor<C> credentialExtractor;
    private final RequestContextPipeline<C> pipeline;

    public HttpRequestContextAdapter(
            HttpHeaderConfiguration headers,
            HttpCredentialExtractor<C> credentialExtractor,
            RequestContextPipeline<C> pipeline) {
        this.headers = Objects.requireNonNull(headers, "headers");
        this.credentialExtractor = Objects.requireNonNull(credentialExtractor, "credentialExtractor");
        this.pipeline = Objects.requireNonNull(pipeline, "pipeline");
    }

    public ResolvedRequestContext resolve(
            HttpRequestMetadata request,
            EndpointPolicy policy,
            ResourceReference resource) {
        Objects.requireNonNull(request, "request");
        Objects.requireNonNull(policy, "policy");

        CorrelationContext correlation = CorrelationContext.create();

        try {
            correlation = resolveCorrelation(request);
            TenantContext tenant = resolveTenant(request);
            C credential = credentialExtractor.extract(request);

            return pipeline.resolve(new RequestContextInput<>(
                    credential,
                    tenant,
                    correlation,
                    policy,
                    resource));
        } catch (KernelAccessException failure) {
            throw new HttpContextException(failure, correlation);
        } catch (IllegalArgumentException invalidContext) {
            throw new HttpContextException(
                    new KernelAccessException(
                            KernelFailure.INVALID_CONTEXT,
                            "Request context metadata is invalid."),
                    correlation);
        }
    }

    private TenantContext resolveTenant(HttpRequestMetadata request) {
        String value = request.singleOptional(headers.tenantIdHeader());
        if (value == null || value.isBlank()) {
            return TenantContext.none();
        }

        return TenantContext.tenant(parseCanonicalUuidV7(value, "tenant"));
    }

    private CorrelationContext resolveCorrelation(HttpRequestMetadata request) {
        String suppliedCorrelation = request.singleOptional(headers.correlationIdHeader());
        String traceparent = request.singleOptional(headers.traceparentHeader());
        String tracestate = request.singleOptional(headers.tracestateHeader());

        if (suppliedCorrelation == null || suppliedCorrelation.isBlank()) {
            return CorrelationPropagation.root(traceparent, tracestate);
        }

        return CorrelationPropagation.continueInbound(
                parseCanonicalUuidV7(suppliedCorrelation, "correlation"),
                traceparent,
                tracestate);
    }

    private UUID parseCanonicalUuidV7(String value, String kind) {
        if (!UuidV7.isCanonical(value)) {
            throw new IllegalArgumentException(kind + " identifier must be canonical UUIDv7");
        }
        return UUID.fromString(value);
    }
}
