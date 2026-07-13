package com.samchully.ifengine.monitor;

import com.samchully.ifengine.monitor.dto.HttpTestDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * 포스트맨식 API 테스터 백엔드.
 * 브라우저 대신 서버가 호출하므로 CORS 제약이 없고, 연계서버가 접근 가능한 사내망 API도 테스트된다.
 *
 * 설계 원칙:
 *  - 4xx/5xx도 "실패"가 아니라 응답 그대로 보여준다 (테스터의 본분).
 *  - 연결 실패/타임아웃 등 전송 자체가 안 된 경우만 error 필드로 구분.
 *  - 타임아웃 상한 30초, 응답 바디 1MB 캡 (대용량 응답으로부터 서버 보호).
 *  - 이 기능은 실제 호출이다. dryRun 같은 안전장치가 없으므로 프론트가 경고를 표시한다.
 */
@Service
@Slf4j
public class HttpTestService {

    private static final int MAX_BODY_BYTES = 1024 * 1024; // 1MB
    private static final int DEFAULT_TIMEOUT_SEC = 15;
    private static final int MAX_TIMEOUT_SEC = 30;
    private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "DELETE", "PATCH");

    public HttpTestDto.Response run(HttpTestDto.Request req) {
        HttpTestDto.Response out = new HttpTestDto.Response();

        if (req.url == null || req.url.isBlank()) {
            out.error = "URL은 필수입니다.";
            return out;
        }
        String url = req.url.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            out.error = "URL은 http:// 또는 https:// 로 시작해야 합니다.";
            return out;
        }
        String method = (req.method == null ? "GET" : req.method.trim().toUpperCase());
        if (!METHODS.contains(method)) {
            out.error = "지원하지 않는 메서드입니다: " + method;
            return out;
        }

        int timeout = req.timeoutSec == null ? DEFAULT_TIMEOUT_SEC
                : Math.min(Math.max(req.timeoutSec, 1), MAX_TIMEOUT_SEC);

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout * 1000);
        factory.setReadTimeout(timeout * 1000);
        RestClient client = RestClient.builder().requestFactory(factory).build();

        long start = System.currentTimeMillis();
        try {
            RestClient.RequestBodySpec spec = client.method(HttpMethod.valueOf(method)).uri(url);

            if (req.headers != null) {
                for (Map.Entry<String, String> h : req.headers.entrySet()) {
                    if (h.getKey() != null && !h.getKey().isBlank()) {
                        spec = spec.header(h.getKey().trim(), h.getValue() == null ? "" : h.getValue());
                    }
                }
            }

            String bodyType = req.bodyType == null ? "NONE" : req.bodyType.toUpperCase();
            boolean hasBody = !"NONE".equals(bodyType) && req.body != null && !req.body.isBlank();
            if (hasBody) {
                MediaType ct = switch (bodyType) {
                    case "JSON" -> MediaType.APPLICATION_JSON;
                    case "FORM" -> MediaType.APPLICATION_FORM_URLENCODED;
                    default -> (req.contentType != null && !req.contentType.isBlank())
                            ? MediaType.parseMediaType(req.contentType)
                            : MediaType.TEXT_PLAIN;
                };
                spec.contentType(ct).body(req.body);
            }

            // exchange: 4xx/5xx에도 예외 없이 응답을 그대로 받는다
            return spec.exchange((request, response) -> {
                HttpTestDto.Response r = new HttpTestDto.Response();
                r.durationMs = System.currentTimeMillis() - start;
                r.status = response.getStatusCode().value();
                r.statusText = response.getStatusText();

                Map<String, String> headers = new LinkedHashMap<>();
                response.getHeaders().forEach((k, v) -> headers.put(k, String.join(", ", v)));
                r.headers = headers;

                byte[] raw = response.getBody().readNBytes(MAX_BODY_BYTES + 1);
                if (raw.length > MAX_BODY_BYTES) {
                    r.body = new String(raw, 0, MAX_BODY_BYTES, StandardCharsets.UTF_8);
                    r.bodyTruncated = true;
                } else {
                    r.body = new String(raw, StandardCharsets.UTF_8);
                }
                return r;
            });

        } catch (Exception e) {
            out.durationMs = System.currentTimeMillis() - start;
            Throwable t = e;
            while (t.getCause() != null && t.getCause() != t) t = t.getCause();
            out.error = t.getMessage() != null ? t.getMessage() : t.toString();
            log.info("API 테스트 호출 실패: {} {} → {}", method, url, out.error);
            return out;
        }
    }
}
