package com.ifstudio.ifengine.codemap;

import com.ifstudio.ifengine.monitor.dto.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** 코드매핑(CODE_MAP) 관리 API. */
@RestController
@RequestMapping("/api/code-maps")
@RequiredArgsConstructor
public class CodeMapController {

    private final CodeMapService service;

    @GetMapping("/groups")
    public List<CodeMapGroupDto> listGroups() {
        return service.listGroups();
    }

    @GetMapping("/groups/{groupId}")
    public List<CodeMapEntryDto> listByGroup(@PathVariable String groupId) {
        return service.listByGroup(groupId);
    }

    /** 그룹 전체 저장(치환). 그룹이 없으면 새로 생성된다. */
    @PutMapping("/groups/{groupId}")
    public List<CodeMapEntryDto> save(@PathVariable String groupId, @RequestBody List<CodeMapEntryDto> entries) {
        return service.replaceGroup(groupId, entries);
    }

    @DeleteMapping("/groups/{groupId}")
    public ResponseEntity<Void> delete(@PathVariable String groupId) {
        service.deleteGroup(groupId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Map<String, Object>> onValidation(ValidationException e) {
        return ResponseEntity.badRequest().body(Map.of(
                "message", e.getMessage(),
                "errors", e.getErrors()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> onNotFound(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
    }
}
