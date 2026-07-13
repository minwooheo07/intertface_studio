package com.samchully.ifengine.engine.adapter.db;

import com.fasterxml.jackson.databind.JsonNode;
import com.samchully.ifengine.engine.adapter.DataSourceRegistry;
import com.samchully.ifengine.engine.adapter.TargetAdapter;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * DB 적재 타겟 어댑터.
 *
 * TGT_CONFIG 예시:
 * {
 *   "datasource": "douzone",
 *   "insertQuery": "INSERT INTO TGT_TBL (A, B) VALUES (:A, :B)"
 * }
 * :named 파라미터명은 IF_MAPPING의 TGT_FIELD와 대소문자까지 일치해야 한다.
 */
@Component
@RequiredArgsConstructor
public class DbTargetAdapter implements TargetAdapter {

    private final DataSourceRegistry registry;

    @Override
    public String type() {
        return "DB";
    }

    @Override
    public void sendOne(JsonNode config, Map<String, Object> row) {
        if (!config.hasNonNull("insertQuery")) {
            throw new IllegalStateException("TGT_CONFIG에 insertQuery 누락");
        }
        String ds = config.hasNonNull("datasource") ? config.get("datasource").asText() : null;
        NamedParameterJdbcTemplate njt = new NamedParameterJdbcTemplate(registry.get(ds));
        njt.update(config.get("insertQuery").asText(), row);
    }
}
