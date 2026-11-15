package io.vyrnforge.platform.kernel.contracts;

import io.vyrnforge.platform.kernel.context.*;
import io.vyrnforge.platform.kernel.errors.*;
import io.vyrnforge.platform.kernel.file.FileReference;
import io.vyrnforge.platform.kernel.ids.UuidV7;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class AdditionalContractValidationTest {
    @Test void rejectsOversizedAndInvalidWireFields() {
        UUID id = UuidV7.generate();
        assertThrows(IllegalArgumentException.class, () -> new IdentityReference("x".repeat(513), "subject"));
        assertThrows(IllegalArgumentException.class, () -> new ActorReference(ActorType.USER, "x".repeat(513), null, null));
        assertThrows(IllegalArgumentException.class, () -> new ActorReference(ActorType.USER, "id", null, "x".repeat(257)));
        assertThrows(IllegalArgumentException.class, () -> new FileReference("x".repeat(513), id, "file-storage"));
        assertThrows(IllegalArgumentException.class, () -> new FileReference("opaque", id, "file-storage", "x".repeat(1025), null, null, null));
        assertThrows(IllegalArgumentException.class, () -> new FileReference("opaque", id, "a".repeat(129)));
        assertThrows(IllegalArgumentException.class, () -> new CorrelationContext(UUID.randomUUID(), id, null, null, null));
        assertThrows(IllegalArgumentException.class, () -> new CorrelationContext(id, id, null, null, "x".repeat(513)));
        assertThrows(IllegalArgumentException.class, () -> new ApiError("bad code", "message", id, id, null, null));
        assertThrows(IllegalArgumentException.class, () -> new ApiError("OK", "x".repeat(2049), id, id, null, null));
        assertThrows(IllegalArgumentException.class, () -> new FieldError("x".repeat(513), "invalid", "message"));
        assertDoesNotThrow(() -> new FileReference("legacy:opaque-42", id, "file-storage"));
        assertDoesNotThrow(() -> new IdentityReference("https://issuer.example", "x".repeat(512)));
    }
}
