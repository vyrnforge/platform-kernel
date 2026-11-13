package io.vyrnforge.platform.kernel.file;

import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Reference to File Storage-owned content.
 * Snapshot metadata is non-authoritative and possession of this reference never grants access.
 */
public record FileReference(
        String fileId,
        UUID ownerTenantId,
        String storageService,
        String name,
        String mimeType,
        Long size,
        Instant createdAt) {

    private static final Pattern STORAGE_SERVICE =
            Pattern.compile("^[a-z][a-z0-9_.:-]*$");

    public FileReference {
        fileId = requireText(fileId, "fileId");
        if (ownerTenantId != null && !UuidV7.isCanonical(ownerTenantId.toString())) {
            throw new IllegalArgumentException("ownerTenantId must be UUIDv7 when present");
        }
        storageService = requireText(storageService, "storageService");
        if (!STORAGE_SERVICE.matcher(storageService).matches()) {
            throw new IllegalArgumentException("storageService has invalid format");
        }
        if (size != null && size < 0) {
            throw new IllegalArgumentException("size must not be negative");
        }
    }

    public FileReference(String fileId, UUID ownerTenantId, String storageService) {
        this(fileId, ownerTenantId, storageService, null, null, null, null);
    }

    private static String requireText(String value, String name) {
        Objects.requireNonNull(value, name);
        if (value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }
}
