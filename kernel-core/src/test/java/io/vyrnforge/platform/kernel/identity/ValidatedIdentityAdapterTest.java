package io.vyrnforge.platform.kernel.identity;

import io.vyrnforge.platform.kernel.context.*;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ValidatedIdentityAdapterTest {
    private static final UUID TENANT =
            UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");

    @Test
    void nativeIamAndExternalIdpCanNormalizeToSamePlatformActor() {
        ValidatedIdentityAdapter adapter = new ValidatedIdentityAdapter();

        ValidatedIdentityCredential nativeIam = credential(
                "https://iam.vyrnforge.example",
                "native-subject");
        ValidatedIdentityCredential external = credential(
                "https://login.example-idp.com/tenant",
                "external-subject");

        ActorContext nativeContext =
                adapter.authenticate(nativeIam, TenantContext.tenant(TENANT));
        ActorContext externalContext =
                adapter.authenticate(external, TenantContext.tenant(TENANT));

        assertEquals("019a7f0e-1234-7abc-8def-1234567890ab",
                nativeContext.actor().actorId());
        assertEquals(nativeContext.actor().actorId(),
                externalContext.actor().actorId());
        assertEquals(TENANT, nativeContext.tenant().tenantId());
        assertEquals(TENANT, externalContext.tenant().tenantId());
        assertEquals(Set.of("asset.read"),
                nativeContext.authorization().permissions());
    }

    private ValidatedIdentityCredential credential(String issuer, String subject) {
        return new ValidatedIdentityCredential(
                new ActorReference(
                        ActorType.USER,
                        "019a7f0e-1234-7abc-8def-1234567890ab",
                        new IdentityReference(issuer, subject),
                        "Asset Operator"),
                new AuthorizationProjection(
                        Set.of("asset-operators"),
                        Set.of("asset_manager"),
                        Set.of("asset.read")),
                new AuthenticationContext(
                        Instant.parse("2026-11-14T00:00:00Z"),
                        Set.of("pwd")));
    }
}
