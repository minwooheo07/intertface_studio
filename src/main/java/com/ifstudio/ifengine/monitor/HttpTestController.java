package com.ifstudio.ifengine.monitor;

import com.ifstudio.ifengine.monitor.dto.HttpTestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 포스트맨식 API 테스터 엔드포인트.
 * 주의: 실제 HTTP 호출이 나간다 (dryRun 없음). 프론트가 경고를 표시한다.
 */
@RestController
@RequestMapping("/api/http-test")
@RequiredArgsConstructor
public class HttpTestController {

    private final HttpTestService service;

    @PostMapping
    public HttpTestDto.Response run(@RequestBody HttpTestDto.Request req) {
        return service.run(req);
    }
}
