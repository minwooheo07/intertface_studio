package {{basePackage}}.service;

import {{basePackage}}.dao.{{className}}Dao;
import {{basePackage}}.vo.{{className}}Vo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * {{ifName}} 연동 서비스
 * 생성: Interface Studio ({{ifId}})
 *
 * 흐름: 소스 수집 → 필드 변환 → 타겟 전송 → 처리표시
 *
 * ⚠️ 생성된 코드입니다. 아래를 확인하세요:
 *  - 트랜잭션 경계가 업무 요건에 맞는지 (현재: 건별 처리, 실패 시 해당 건만 롤백)
 *  - 에러 처리/재시도 정책 (현재: 로그만 남기고 다음 건 진행)
 *  - 중복 방지 로직 ({{#hasDupKey}}dupKey: {{dupKeyCols}}{{/hasDupKey}}{{^hasDupKey}}미설정{{/hasDupKey}})
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class {{className}}Service {

    private final {{className}}Dao dao;
{{#isRestTarget}}
    private final {{className}}Sender sender;
{{/isRestTarget}}

    /** 미전송 건을 수집해 타겟으로 전송한다. */
    public void execute() {
        List<{{className}}Vo> list = dao.selectPending();
        log.info("[{{ifId}}] 수집 {}건", list.size());

        int ok = 0, fail = 0;
        for ({{className}}Vo src : list) {
            try {
                process(src);
                ok++;
            } catch (Exception e) {
                fail++;
                log.error("[{{ifId}}] 처리 실패: {}", src, e);
                // TODO: 재시도/장애큐 정책을 업무 요건에 맞게 구현하세요.
            }
        }
        log.info("[{{ifId}}] 완료 성공={} 실패={}", ok, fail);
    }

    @Transactional
    protected void process({{className}}Vo src) {
        Map<String, Object> tgt = transform(src);
{{#isDbTarget}}
        dao.insertTarget(tgt);
{{/isDbTarget}}
{{#isRestTarget}}
        sender.send(tgt);
{{/isRestTarget}}
        dao.markProcessed(src);
    }

    /** 필드 매핑/변환 (Interface Studio 매핑 정의에서 생성) */
    private Map<String, Object> transform({{className}}Vo src) {
        Map<String, Object> tgt = new HashMap<>();
{{#mappings}}
        tgt.put("{{tgtField}}", {{javaExpr}});{{#needsTodo}}  // TODO: 변환룰 "{{transformRule}}" 확인 필요{{/needsTodo}}
{{/mappings}}
        return tgt;
    }
}
