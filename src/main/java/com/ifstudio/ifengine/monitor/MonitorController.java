package com.ifstudio.ifengine.monitor;

import com.ifstudio.ifengine.domain.IfLog;
import com.ifstudio.ifengine.domain.IfMaster;
import com.ifstudio.ifengine.engine.ExecResult;
import com.ifstudio.ifengine.engine.InterfaceExecutor;
import com.ifstudio.ifengine.engine.scheduler.JobRegistrar;
import com.ifstudio.ifengine.repository.IfLogRepository;
import com.ifstudio.ifengine.repository.IfMasterRepository;
import lombok.RequiredArgsConstructor;
import org.quartz.SchedulerException;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 모니터링 대시보드 API */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MonitorController {

    private final IfMasterRepository masterRepo;
    private final IfLogRepository logRepo;
    private final InterfaceExecutor executor;
    private final JobRegistrar registrar;

    /** 금일 현황 요약 */
    @GetMapping("/dashboard/summary")
    public Map<String, Object> summary() {
        LocalDateTime from = LocalDate.now().atStartOfDay();
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("success", logRepo.countByStatusAndCreatedAtAfter("SUCCESS", from));
        r.put("fail", logRepo.countByStatusAndCreatedAtAfter("FAIL", from));
        r.put("skip", logRepo.countByStatusAndCreatedAtAfter("SKIP", from));
        r.put("asOf", LocalDateTime.now().toString());
        return r;
    }

    /** 인터페이스 목록 + 최근 실행 상태 */
    @GetMapping("/interfaces")
    public List<Map<String, Object>> interfaces() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (IfMaster m : masterRepo.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("ifId", m.getIfId());
            row.put("ifName", m.getIfName());
            row.put("srcSystem", m.getSrcSystem());
            row.put("tgtSystem", m.getTgtSystem());
            row.put("srcType", m.getSrcType());
            row.put("tgtType", m.getTgtType());
            row.put("cronExpr", m.getCronExpr());
            row.put("useYn", m.getUseYn());
            logRepo.findFirstByIfIdOrderByLogIdDesc(m.getIfId()).ifPresent(l -> {
                row.put("lastStatus", l.getStatus());
                row.put("lastAt", l.getCreatedAt());
            });
            out.add(row);
        }
        return out;
    }

    /** 로그 조회 (최근 100건, ifId/status 필터) */
    @GetMapping("/logs")
    public List<IfLog> logs(@RequestParam(required = false) String ifId,
                            @RequestParam(required = false) String status) {
        if (ifId != null && !ifId.isBlank()) return logRepo.findTop100ByIfIdOrderByLogIdDesc(ifId);
        if (status != null && !status.isBlank()) return logRepo.findTop100ByStatusOrderByLogIdDesc(status);
        return logRepo.findTop100ByOrderByLogIdDesc();
    }

    /** 수동 즉시 실행 */
    @PostMapping("/interfaces/{ifId}/run")
    public ExecResult run(@PathVariable String ifId) {
        return executor.execute(ifId, "MANUAL");
    }

    /** 실패건 재처리 */
    @PostMapping("/logs/{logId}/reprocess")
    public Map<String, Object> reprocess(@PathVariable Long logId) {
        return executor.reprocess(logId);
    }

    /** IF_MASTER 변경 후 스케줄 재적재 */
    @PostMapping("/admin/reload-jobs")
    public Map<String, Object> reloadJobs() throws SchedulerException {
        return Map.of("registered", registrar.reload());
    }
}
