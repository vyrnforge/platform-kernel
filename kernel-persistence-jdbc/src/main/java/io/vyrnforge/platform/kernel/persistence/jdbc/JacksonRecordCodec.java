package io.vyrnforge.platform.kernel.persistence.jdbc;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.util.Map;

public final class JacksonRecordCodec {
    private final ObjectMapper mapper;

    public JacksonRecordCodec() {
        this.mapper = new ObjectMapper().enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS);
    }

    public String encode(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("value cannot be serialized", e);
        }
    }

    @SuppressWarnings("unchecked")
    public Object decode(String json) {
        try {
            return mapper.readValue(json, Object.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("stored JSON cannot be decoded", e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String,Object> decodeMap(String json) {
        Object value = decode(json);
        if (!(value instanceof Map<?,?> map)) {
            throw new IllegalStateException("stored JSON is not an object");
        }
        return (Map<String,Object>) map;
    }
}
