package com.ifstudio.ifengine.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ifstudio.ifengine.domain.IfLog;
import com.ifstudio.ifengine.domain.IfMapping;
import com.ifstudio.ifengine.domain.IfMaster;
import com.ifstudio.ifengine.engine.adapter.AdapterFactory;
import com.ifstudio.ifengine.engine.adapter.SourceAdapter;
import com.ifstudio.ifengine.engine.adapter.TargetAdapter;
import com.ifstudio.ifengine.engine.transform.MappingTransformer;
import com.ifstudio.ifengine.notify.NotifyService;
import com.ifstudio.ifengine.repository.IfLogRepository;
import com.ifstudio.ifengine.repository.IfMappingRepository;
import com.ifstudio.ifengine.repository.IfMasterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * 인터페이스 실행 엔진 코어.
 * 흐름: 수집(collect) -> 건별 [중복체크 -> 변환 -> 전송 -> 처리표시 -> 로그]
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InterfaceExecutor {

    private final IfMasterRepository masterRepo;
    private final IfMappingRepository mappingRepo;
    private final IfLogRepository logRepo;
    private final AdapterFactory adapters;
    private final MappingTransformer transformer;
    private final NotifyService notify;
    private final ObjectMapper om;

    public ExecResult execute(String ifId, String triggeredBy) {
        IfMaster m = masterRepo.findById(ifId)
                .orElseThrow(() -> new IllegalArgumentException("인터페이스 없음: " + ifId));
        if (!"Y".equals(m.getUseYn())) {
            log.info("[{}] USE_YN=N - 실행 생략", ifId);
            return new ExecResult(null, 0, 0, 0, 0);
        }

        String execId = UUID.randomUUID().toString();
        List<IfMapping> mappings = mappingRepo.findByIfIdOrderBySortOrder(ifId);
        JsonNode srcCfg = json(m.getSrcConfig());
        JsonNode tgtCfg = json(m.getTgtConfig());
        SourceAdapter src = adapters.source(m.getSrcType());
        TargetAdapter tgt = adapters.target(m.getTgtType());

        List<Map<String, Object>> rows;
        try {
            rows = src.collect(srcCfg);
        } catch (Exception e) {
            log.error("[{}] 소스 수집 실패", ifId, e);
            saveLog(ifId, execId, "COLLECT", "FAIL", null, null, msg(e), triggeredBy, null);
            notify.onFailure(m, execId, 1);
            return new ExecResult(execId, 0, 0, 1, 0);
        }

        int ok = 0, fail = 0, skip = 0;
        for (Map<String, Object> raw : rows) {
            Map<String, Object> row = caseInsensitive(raw);
            String recKey = buildKey(m.getDupKeyCols(), row);

            // 중복방지: 동일 키의 성공 이력이 있으면 스킵 (재처리 중복전송 방지)
            if (recKey != null && logRepo.existsByIfIdAndRecKeyAndStatus(ifId, recKey, "SUCCESS")) {
                saveLog(ifId, execId, recKey, "SKIP", toJson(row), null,
                        "중복키 - 기전송 성공건", triggeredBy, null);
                skip++;
                continue;
            }

            try {
                Map<String, Object> out = transformer.apply(mappings, row);
                tgt.sendOne(tgtCfg, out);
                src.markProcessed(srcCfg, row);
                saveLog(ifId, execId, recKey, "SUCCESS", toJson(row), toJson(out), null, triggeredBy, null);
                ok++;
            } catch (Exception e) {
                saveLog(ifId, execId, recKey, "FAIL", toJson(row), null, msg(e), triggeredBy, null);
                fail++;
            }
        }

        if (fail > 0) notify.onFailure(m, execId, fail);
        log.info("[{}] 실행완료 exec={} 대상={} 성공={} 실패={} 스킵={}",
                ifId, execId, rows.size(), ok, fail, skip);
        return new ExecResult(execId, rows.size(), ok, fail, skip);
    }

    /** 실패 로그 1건을 보관된 원본 payload 기준으로 재처리 */
    public Map<String, Object> reprocess(Long logId) {
        IfLog orig = logRepo.findById(logId)
                .orElseThrow(() -> new IllegalArgumentException("로그 없음: " + logId));
        IfMaster m = masterRepo.findById(orig.getIfId())
                .orElseThrow(() -> new IllegalArgumentException("인터페이스 없음: " + orig.getIfId()));
        if (orig.getPayloadSrc() == null) {
            throw new IllegalStateException("원본 payload가 없어 재처리 불가");
        }

        List<IfMapping> mappings = mappingRepo.findByIfIdOrderBySortOrder(m.getIfId());
        JsonNode srcCfg = json(m.getSrcConfig());
        JsonNode tgtCfg = json(m.getTgtConfig());

        Map<String, Object> row;
        try {
            row = caseInsensitive(om.readValue(orig.getPayloadSrc(),
                    new TypeReference<Map<String, Object>>() {}));
        } catch (Exception e) {
            throw new IllegalStateException("payload 파싱 실패: logId=" + logId, e);
        }

        String execId = UUID.randomUUID().toString();
        try {
            Map<String, Object> out = transformer.apply(mappings, row);
            adapters.target(m.getTgtType()).sendOne(tgtCfg, out);
            adapters.source(m.getSrcType()).markProcessed(srcCfg, row);
            IfLog nl = saveLog(m.getIfId(), execId, orig.getRecKey(), "SUCCESS",
                    orig.getPayloadSrc(), toJson(out), null, "REPROCESS", logId);
            return Map.of("result", "SUCCESS", "newLogId", nl.getLogId());
        } catch (Exception e) {
            IfLog nl = saveLog(m.getIfId(), execId, orig.getRecKey(), "FAIL",
                    orig.getPayloadSrc(), null, msg(e), "REPROCESS", logId);
            return Map.of("result", "FAIL", "newLogId", nl.getLogId(), "error", msg(e));
        }
    }

    private IfLog saveLog(String ifId, String execId, String recKey, String status,
                          String payloadSrc, String payloadTgt, String errorMsg,
                          String triggeredBy, Long retryOf) {
        IfLog l = new IfLog();
        l.setIfId(ifId);
        l.setExecId(execId);
        l.setRecKey(recKey);
        l.setStatus(status);
        l.setPayloadSrc(payloadSrc);
        l.setPayloadTgt(payloadTgt);
        l.setErrorMsg(errorMsg);
        l.setTriggeredBy(triggeredBy);
        l.setRetryOf(retryOf);
        return logRepo.save(l);
    }

    /** DB별 컬럼명 대소문자 차이 흡수 */
    private Map<String, Object> caseInsensitive(Map<String, Object> src) {
        TreeMap<String, Object> t = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        t.putAll(src);
        return t;
    }

    private String buildKey(String dupKeyCols, Map<String, Object> row) {
        if (dupKeyCols == null || dupKeyCols.isBlank()) return null;
        StringBuilder sb = new StringBuilder();
        for (String c : dupKeyCols.split(",")) {
            if (sb.length() > 0) sb.append('|');
            Object v = row.get(c.trim());
            sb.append(v == null ? "" : String.valueOf(v));
        }
        return sb.toString();
    }

    private JsonNode json(String s) {
        try {
            return om.readTree(s == null || s.isBlank() ? "{}" : s);
        } catch (Exception e) {
            throw new IllegalStateException("설정 JSON 파싱 실패", e);
        }
    }

    private String toJson(Object o) {
        try {
            return om.writeValueAsString(o);
        } catch (Exception e) {
            return String.valueOf(o);
        }
    }

    private String msg(Exception e) {
        String s = e.toString();
        return s.length() > 1900 ? s.substring(0, 1900) : s;
    }
}
