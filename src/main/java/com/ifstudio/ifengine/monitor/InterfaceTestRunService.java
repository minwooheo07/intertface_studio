package com.ifstudio.ifengine.monitor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ifstudio.ifengine.domain.IfMapping;
import com.ifstudio.ifengine.domain.IfMaster;
import com.ifstudio.ifengine.engine.adapter.DataSourceRegistry;
import com.ifstudio.ifengine.engine.adapter.rest.RestBodyBuilder;
import com.ifstudio.ifengine.engine.transform.MappingTransformer;
import com.ifstudio.ifengine.monitor.dto.InterfaceDetailDto;
import com.ifstudio.ifengine.monitor.dto.TestRunResultDto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 인터페이스 정의를 저장하지 않고도 소스에서 1건을 뽑아 매핑/전송까지 미리 검증한다.
 *
 * 두 화면 기능이 이 서비스를 공유한다:
 *  - 필드매핑 탭 "자동 매핑 초안": columns만 사용해 빈 매핑 행을 채운다.
 *  - 테스트 탭 "시험실행": columns + sampleRow + mappedRecord + targetPreview 전부 사용.
 *
 * 안전 원칙: 이 서비스는 절대 타겟에 실제로 전송하거나 소스에 처리표시를 남기지 않는다.
 * 소스 조회도 setMaxRows(1)로 캡핑해 사용자의 쿼리가 대량이어도 안전하다.
 */
@Service
@RequiredArgsConstructor
public class InterfaceTestRunService {

    private final DataSourceRegistry registry;
    private final MappingTransformer transformer;
    private final RestBodyBuilder restBodyBuilder;
    private final ObjectMapper om;

    public TestRunResultDto run(InterfaceDetailDto dto) {
        IfMaster m = dto.master;
        List<String> warnings = new ArrayList<>();
        TestRunResultDto result = new TestRunResultDto();
        result.warnings = warnings;

        if (m == null) throw new IllegalArgumentException("인터페이스 정의가 비어 있습니다.");
        if (!"DB".equalsIgnoreCase(m.getSrcType())) {
            throw new IllegalArgumentException(
                    "시험실행은 현재 DB 소스만 지원합니다 (" + m.getSrcType() + " 어댑터 미구현). "
                    + "REST/FILE/SOCKET 소스는 백엔드 어댑터 구현 후 지원됩니다.");
        }

        JsonNode srcCfg = parseJson(m.getSrcConfig(), "srcConfig");
        String query = requiredText(srcCfg, "query", "소스 설정에 query가 없습니다. 소스 탭에서 수집 쿼리를 입력하세요.");
        String datasource = optText(srcCfg, "datasource");

        // setMaxRows(1): 사용자의 쿼리가 LIMIT/ROWNUM 없이 대량이어도 항상 1건만 가져온다 (DB 방언 무관, 안전).
        JdbcTemplate jt = new JdbcTemplate(registry.get(datasource));
        jt.setMaxRows(1);

        List<String> columns = new ArrayList<>();
        Map<String, Object> sampleRow;
        try {
            sampleRow = jt.query(query, rs -> {
                ResultSetMetaData md = rs.getMetaData();
                for (int i = 1; i <= md.getColumnCount(); i++) {
                    columns.add(md.getColumnLabel(i));
                }
                if (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (String c : columns) row.put(c, rs.getObject(c));
                    return row;
                }
                return null;
            });
        } catch (Exception e) {
            throw new IllegalArgumentException("소스 쿼리 실행 실패: " + rootMessage(e));
        }

        result.columns = columns;
        result.sampleRow = sampleRow;

        if (sampleRow == null) {
            warnings.add("소스 쿼리 결과가 없어 컬럼 구조만 확인했습니다 (컬럼 " + columns.size() + "개). "
                    + "데이터가 있는 상태에서 다시 시도하면 실제 값으로 검증할 수 있습니다.");
            return result;
        }

        if (dto.mappings == null || dto.mappings.isEmpty()) {
            warnings.add("필드매핑이 없어 변환 결과는 생략합니다. 컬럼 목록으로 매핑 초안을 만들어보세요.");
            return result;
        }

        List<IfMapping> mappings = toEntities(dto.mappings);
        Map<String, Object> mapped = transformer.apply(mappings, sampleRow);
        result.mappedRecord = mapped;
        result.targetPreview = buildTargetPreview(m, mapped, warnings);
        return result;
    }

    private TestRunResultDto.TargetPreview buildTargetPreview(IfMaster m, Map<String, Object> mapped, List<String> warnings) {
        TestRunResultDto.TargetPreview tp = new TestRunResultDto.TargetPreview();
        tp.type = m.getTgtType();

        if ("DB".equalsIgnoreCase(m.getTgtType())) {
            tp.bindParams = mapped;
            tp.note = "적재 쿼리의 :바인딩 파라미터로 사용됩니다. 실제 INSERT는 실행하지 않았습니다.";
            return tp;
        }

        if ("REST".equalsIgnoreCase(m.getTgtType())) {
            JsonNode tgtCfg = parseJson(m.getTgtConfig(), "tgtConfig");
            boolean dryRun = tgtCfg.hasNonNull("dryRun") && tgtCfg.get("dryRun").asBoolean();
            tp.dryRun = dryRun;

            Map<String, Object> constParams = toMap(tgtCfg.get("constParams"));
            Map<String, Object> authFields = toMap(tgtCfg.get("auth") != null ? tgtCfg.get("auth").get("fields") : null);
            Map<String, Object> merged = restBodyBuilder.mergeParams(constParams, authFields, mapped);

            String bodyType = optText(tgtCfg, "bodyType");
            String body;
            if ("JSON".equalsIgnoreCase(bodyType)) {
                try {
                    body = om.writerWithDefaultPrettyPrinter().writeValueAsString(merged);
                } catch (Exception e) {
                    body = String.valueOf(merged);
                }
            } else {
                body = restBodyBuilder.toFormUrlEncoded(merged, optText(tgtCfg, "charset"));
            }
            tp.body = maskSecrets(body);
            tp.note = dryRun
                    ? "dryRun=ON: 시험실행이 아니어도 실제 전송되지 않습니다."
                    : "dryRun=OFF: 저장 후 실제 실행 시 전송됩니다. 시험실행 자체는 절대 전송하지 않았습니다.";
            return tp;
        }

        tp.note = m.getTgtType() + " 타겟 어댑터는 아직 미구현이라 미리보기를 제공하지 않습니다.";
        warnings.add(tp.note);
        return tp;
    }

    private List<IfMapping> toEntities(List<InterfaceDetailDto.MappingDto> dtos) {
        List<IfMapping> out = new ArrayList<>();
        for (InterfaceDetailDto.MappingDto d : dtos) {
            IfMapping m = new IfMapping();
            m.setSrcField(d.srcField);
            m.setTgtField(d.tgtField);
            m.setTransformRule(d.transformRule);
            m.setSortOrder(d.sortOrder);
            out.add(m);
        }
        return out;
    }

    private String maskSecrets(String body) {
        return body
                .replaceAll("(?i)(clientSecret|token|password)=([^&]+)", "$1=****")
                .replaceAll("(?i)\"(clientSecret|token|password)\"\\s*:\\s*\"[^\"]*\"", "\"$1\":\"****\"");
    }

    private JsonNode parseJson(String raw, String field) {
        try {
            return om.readTree((raw == null || raw.isBlank()) ? "{}" : raw);
        } catch (Exception e) {
            throw new IllegalArgumentException(field + "의 JSON 형식이 올바르지 않습니다.");
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toMap(JsonNode n) {
        if (n == null || n.isNull()) return null;
        return om.convertValue(n, Map.class);
    }

    private String text(JsonNode n, String field) {
        return (n != null && n.hasNonNull(field)) ? n.get(field).asText() : null;
    }
    private String optText(JsonNode n, String field) { return text(n, field); }
    private String requiredText(JsonNode n, String field, String errMsg) {
        String v = text(n, field);
        if (v == null || v.isBlank()) throw new IllegalArgumentException(errMsg);
        return v;
    }

    private String rootMessage(Throwable e) {
        Throwable t = e;
        while (t.getCause() != null && t.getCause() != t) t = t.getCause();
        return t.getMessage() != null ? t.getMessage() : t.toString();
    }
}
