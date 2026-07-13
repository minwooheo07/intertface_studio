package com.samchully.ifengine.monitor;

import com.samchully.ifengine.monitor.dto.CloneRequest;
import com.samchully.ifengine.monitor.dto.InterfaceDetailDto;
import com.samchully.ifengine.monitor.dto.TestRunResultDto;
import com.samchully.ifengine.monitor.dto.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 인터페이스 정의 CRUD API (편집기 백엔드).
 * 목록/실행/재처리는 MonitorController에 있으며, 여기서는 상세/등록/수정/삭제/복제/시험실행을 담당한다.
 */
@RestController
@RequestMapping("/api/interfaces")
@RequiredArgsConstructor
public class InterfaceAdminController {

    private final InterfaceAdminService service;
    private final InterfaceTestRunService testRunService;

    /** 상세 조회 */
    @GetMapping("/{ifId}")
    public InterfaceDetailDto get(@PathVariable String ifId) {
        return service.get(ifId);
    }

    /** 신규 등록 */
    @PostMapping
    public ResponseEntity<InterfaceDetailDto> create(@RequestBody InterfaceDetailDto dto) {
        InterfaceDetailDto saved = service.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** 수정 */
    @PutMapping("/{ifId}")
    public InterfaceDetailDto update(@PathVariable String ifId, @RequestBody InterfaceDetailDto dto) {
        return service.update(ifId, dto);
    }

    /** 삭제 (기본 소프트 비활성, ?hard=true 물리삭제) */
    @DeleteMapping("/{ifId}")
    public ResponseEntity<Void> delete(@PathVariable String ifId,
                                       @RequestParam(defaultValue = "false") boolean hard) {
        service.delete(ifId, hard);
        return ResponseEntity.noContent().build();
    }

    /** 복제 */
    @PostMapping("/{ifId}/clone")
    public InterfaceDetailDto clone(@PathVariable String ifId, @RequestBody CloneRequest req) {
        return service.clone(ifId, req);
    }

    /**
     * 시험실행 (저장 불필요, 실전송/실적재 없음).
     * 필드매핑 탭의 "자동 매핑 초안"과 테스트 탭의 "시험실행"이 공유한다.
     */
    @PostMapping("/test-run")
    public TestRunResultDto testRun(@RequestBody InterfaceDetailDto dto) {
        return testRunService.run(dto);
    }

    // ---- 예외 → HTTP 응답 매핑 ----

    /** 검증 실패 → 400 + 필드별 메시지 */
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Map<String, Object>> onValidation(ValidationException e) {
        return ResponseEntity.badRequest().body(Map.of(
                "message", e.getMessage(),
                "errors", e.getErrors()
        ));
    }

    /** 없는 인터페이스 등 → 404 */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> onNotFound(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
    }
}
