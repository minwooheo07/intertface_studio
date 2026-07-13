package com.ifstudio.ifengine.engine.transform;

import com.ifstudio.ifengine.domain.IfMapping;
import com.ifstudio.ifengine.repository.CodeMapRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * IF_MAPPING 정의에 따라 소스 1건을 타겟 형태로 변환한다.
 *
 * 지원 변환룰:
 *  - (없음)                    : 값 그대로 복사
 *  - CONST:값                  : 고정값 (SRC_FIELD 불필요)
 *  - DEFAULT:값                : 소스값이 null이면 기본값
 *  - DATEFMT:yyyyMMdd>yyyy-MM-dd : 날짜 포맷 변환
 *  - CODEMAP:그룹ID            : CODE_MAP 테이블에서 그룹ID 기준 소스코드->타겟코드 치환.
 *                                매핑에 없는 코드는 원본값을 그대로 유지한다(데이터 유실 방지).
 */
@Component
@RequiredArgsConstructor
public class MappingTransformer {

    private final CodeMapRepository codeMapRepository;

    public Map<String, Object> apply(List<IfMapping> mappings, Map<String, Object> src) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (IfMapping m : mappings) {
            Object v = (m.getSrcField() == null || m.getSrcField().isBlank())
                    ? null : src.get(m.getSrcField().trim());
            out.put(m.getTgtField(), applyRule(m.getTransformRule(), v));
        }
        return out;
    }

    private Object applyRule(String rule, Object v) {
        if (rule == null || rule.isBlank()) return v;

        if (rule.startsWith("CONST:")) {
            return rule.substring("CONST:".length());
        }
        if (rule.startsWith("DEFAULT:")) {
            return v != null ? v : rule.substring("DEFAULT:".length());
        }
        if (rule.startsWith("DATEFMT:")) {
            if (v == null) return null;
            String[] p = rule.substring("DATEFMT:".length()).split(">");
            LocalDate d = LocalDate.parse(v.toString().trim(), DateTimeFormatter.ofPattern(p[0].trim()));
            return d.format(DateTimeFormatter.ofPattern(p[1].trim()));
        }
        if (rule.startsWith("CODEMAP:")) {
            if (v == null) return null;
            String groupId = rule.substring("CODEMAP:".length()).trim();
            return codeMapRepository.findByGroupIdAndSrcCode(groupId, v.toString().trim())
                    .map(c -> (Object) c.getTgtCode())
                    .orElse(v);
        }
        return v;
    }
}
