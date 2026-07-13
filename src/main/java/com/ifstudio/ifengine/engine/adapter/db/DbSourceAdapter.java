package com.ifstudio.ifengine.engine.adapter.db;

import com.fasterxml.jackson.databind.JsonNode;
import com.ifstudio.ifengine.engine.adapter.DataSourceRegistry;
import com.ifstudio.ifengine.engine.adapter.SourceAdapter;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * DB I/F 테이블 방식 소스 어댑터 (더존 연동의 표준 패턴).
 *
 * SRC_CONFIG 예시:
 * {
 *   "datasource": "douzone",
 *   "query": "SELECT ... FROM IF_TBL WHERE IF_FLAG = 'N'",
 *   "markQuery": "UPDATE IF_TBL SET IF_FLAG = 'Y', IF_DT = GETDATE() WHERE KEY_COL = :KEY_COL"
 * }
 * markQuery의 :named 파라미터에는 소스 row의 컬럼값이 바인딩된다.
 */
@Component
@RequiredArgsConstructor
public class DbSourceAdapter implements SourceAdapter {

    private final DataSourceRegistry registry;

    @Override
    public String type() {
        return "DB";
    }

    @Override
    public List<Map<String, Object>> collect(JsonNode config) {
        String query = required(config, "query");
        JdbcTemplate jt = new JdbcTemplate(registry.get(text(config, "datasource")));
        return jt.queryForList(query);
    }

    @Override
    public void markProcessed(JsonNode config, Map<String, Object> row) {
        if (config.hasNonNull("markQuery")) {
            NamedParameterJdbcTemplate njt =
                    new NamedParameterJdbcTemplate(registry.get(text(config, "datasource")));
            njt.update(config.get("markQuery").asText(), row);
        }
    }

    private String text(JsonNode n, String field) {
        return n.hasNonNull(field) ? n.get(field).asText() : null;
    }

    private String required(JsonNode n, String field) {
        if (!n.hasNonNull(field)) throw new IllegalStateException("SRC_CONFIG에 " + field + " 누락");
        return n.get(field).asText();
    }
}
