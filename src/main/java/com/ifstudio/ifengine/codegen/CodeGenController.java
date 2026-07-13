package com.ifstudio.ifengine.codegen;

import com.ifstudio.ifengine.monitor.dto.InterfaceDetailDto;
import com.ifstudio.ifengine.domain.IfMapping;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * 소스 코드 생성 API.
 *  - POST /api/codegen/preview : 생성될 파일들을 JSON으로 (화면 미리보기용)
 *  - POST /api/codegen/download : zip으로 묶어 다운로드
 *
 * 저장 여부와 무관하게 동작한다 (편집 중인 정의로도 생성 가능).
 */
@RestController
@RequestMapping("/api/codegen")
@RequiredArgsConstructor
public class CodeGenController {

    private final CodeGenService service;

    public static class GenRequest {
        public InterfaceDetailDto definition;
        public String kind;          // INTEGRATION | CRUD
        public String framework;     // spring (추후 chamomile)
        public String basePackage;   // com.example.billing
    }

    @PostMapping("/preview")
    public Map<String, String> preview(@RequestBody GenRequest req) {
        return generate(req);
    }

    @PostMapping("/download")
    public ResponseEntity<byte[]> download(@RequestBody GenRequest req) {
        Map<String, String> files = generate(req);
        String ifId = req.definition.master.getIfId();

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(bos, StandardCharsets.UTF_8)) {
            for (Map.Entry<String, String> e : files.entrySet()) {
                zos.putNextEntry(new ZipEntry(e.getKey()));
                zos.write(e.getValue().getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }
        } catch (Exception e) {
            throw new IllegalStateException("zip 생성 실패: " + e.getMessage(), e);
        }

        String filename = (ifId == null ? "generated" : ifId.toLowerCase()) + "-"
                + (req.kind == null ? "code" : req.kind.toLowerCase()) + ".zip";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(bos.toByteArray());
    }

    private Map<String, String> generate(GenRequest req) {
        if (req.definition == null || req.definition.master == null) {
            throw new IllegalArgumentException("인터페이스 정의가 필요합니다.");
        }
        CodeGenModel.Kind kind;
        try {
            kind = CodeGenModel.Kind.valueOf(
                    (req.kind == null ? "INTEGRATION" : req.kind).toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("생성 종류는 INTEGRATION 또는 CRUD 여야 합니다.");
        }

        List<IfMapping> mappings = new ArrayList<>();
        if (req.definition.mappings != null) {
            for (InterfaceDetailDto.MappingDto d : req.definition.mappings) {
                IfMapping m = new IfMapping();
                m.setSrcField(d.srcField);
                m.setTgtField(d.tgtField);
                m.setTransformRule(d.transformRule);
                m.setSortOrder(d.sortOrder);
                mappings.add(m);
            }
        }
        return service.generate(req.definition.master, mappings, kind, req.framework, req.basePackage);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> onBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }
}
