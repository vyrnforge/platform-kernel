package io.vyrnforge.platform.kernel.persistence.jdbc;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JacksonRecordCodecTest {
    record Payload(String name, String optional) {
    }

    @Test
    void defaultCodecRetainsDeterministicMapKeyOrder() {
        var codec = new JacksonRecordCodec();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("z", 1);
        payload.put("a", 2);
        assertEquals("{\"a\":2,\"z\":1}", codec.encode(payload));
    }

    @Test
    void configuredMapperIsCopiedAndDefaultTypingIsNotRequired() {
        var mapper = new ObjectMapper();
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        var codec = new JacksonRecordCodec(mapper);
        mapper.setSerializationInclusion(JsonInclude.Include.ALWAYS);

        assertEquals("{\"name\":\"x\"}", codec.encode(new Payload("x", null)));
        assertEquals(Map.of("name", "x"), codec.decodeMap(codec.encode(new Payload("x", null))));
    }

    @Test
    void codecRequiresMapperAndStoredJsonObjectForDecodeMap() {
        assertThrows(NullPointerException.class, () -> new JacksonRecordCodec(null));
        assertThrows(IllegalStateException.class,
                () -> new JacksonRecordCodec().decodeMap("[1,2]"));
    }
}
