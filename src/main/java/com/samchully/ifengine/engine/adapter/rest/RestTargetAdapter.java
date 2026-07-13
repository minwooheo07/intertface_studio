package com.samchully.ifengine.engine.adapter.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.samchully.ifengine.engine.adapter.TargetAdapter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 설정 기반 REST 타겟 어댑터 (다우오피스 전자결재/Works/알림 공용).
 *
 * 다우 기안의 특성을 코드가 아닌 TGT_CONFIG로 흡수한다:
 *  - DOAS 서버(api.daouoffice.com)로 호출 (고객사 그룹웨어 URL 아님)
 *  - Content-Type: application/x-www-form-urlencoded (기안), 리턴값 없음 → 2xx면 성공
 *  - Works 등 JSON 방식도 bodyType=JSON 으로 동일 어댑터 재사용
 *
 * TGT_CONFIG 예시(전자결재 기안, 키 미발급 → dryRun):
 * {
 *   "url": "https://api.daouoffice.com/public/approval/...",
 *   "method": "POST",
 *   "bodyType": "FORM",                 // FORM | JSON
 *   "charset": "UTF-8",
 *   "dryRun": true,                     // 키 발급 전: 실제 전송 없이 요청내용만 로그
 *   "auth": { "in": "BODY",             // BODY | HEADER
 *             "fields": { "clientId": "${DAOU_CLIENT_ID}",
 *                         "clientSecret": "${DAOU_CLIENT_SECRET}" } },
 *   "constParams": { "productName": "SamchullyIF",
 *                    "productVersion": "1.0",
 *                    "clientCompanyName": "삼천리에너지" }
 * }
 *
 * 인증정보는 ${ENV} 문법으로 환경변수에서 주입 → 시크릿을 DB에 넣지 않는다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RestTargetAdapter implements TargetAdapter {

    private static final Pattern ENV = Pattern.compile("\\$\\{([^}]+)}");

    private final RestBodyBuilder bodyBuilder;
    private final ObjectMapper om;
    private final Environment env;
    private final RestClient rest = RestClient.create();

    @Override
    public String type() {
        return "REST";
    }

    @Override
    public void sendOne(JsonNode config, Map<String, Object> row) {
        String url = required(config, "url");
        String method = text(config, "method", "POST");
        String bodyType = text(config, "bodyType", "FORM").toUpperCase();
        String charset = text(config, "charset", "UTF-8");
        boolean dryRun = config.path("dryRun").asBoolean(false);

        Map<String, Object> constParams = asMap(config.get("constParams"));
        Map<String, Object> authFields = new LinkedHashMap<>();
        Map<String, String> authHeaders = new LinkedHashMap<>();
        resolveAuth(config.get("auth"), authFields, authHeaders);

        // 바디 병합: 고정파라미터 + (auth in BODY) + 매핑결과
        Map<String, Object> params = bodyBuilder.mergeParams(constParams, authFields, row);

        String body;
        MediaType contentType;
        if ("JSON".equals(bodyType)) {
            body = toJson(params);
            contentType = MediaType.APPLICATION_JSON;
        } else {
            body = bodyBuilder.toFormUrlEncoded(params, charset);
            contentType = MediaType.APPLICATION_FORM_URLENCODED;
        }

        if (dryRun) {
            // 키 미발급 단계: 실제 호출 없이 "보낼 요청"을 그대로 로그로 남긴다.
            // 시크릿 노출 방지를 위해 마스킹.
            log.info("[REST dryRun] {} {}\n  headers={}\n  body={}",
                    method, url, mask(authHeaders), mask(body));
            return;
        }

        var spec = rest.method(org.springframework.http.HttpMethod.valueOf(method))
                .uri(url)
                .contentType(contentType);
        authHeaders.forEach(spec::header);

        var resp = spec.body(body).retrieve().toBodilessEntity();
        // 다우 기안은 리턴값이 없으므로 2xx면 성공으로 간주
        if (!resp.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("REST 전송 실패: HTTP " + resp.getStatusCode() + " url=" + url);
        }
    }

    /** auth 블록 해석: in=BODY면 authFields, in=HEADER면 authHeaders에 채운다. ${ENV} 치환. */
    private void resolveAuth(JsonNode auth, Map<String, Object> bodyFields, Map<String, String> headers) {
        if (auth == null || !auth.hasNonNull("fields")) return;
        String in = auth.path("in").asText("BODY").toUpperCase();
        JsonNode fields = auth.get("fields");
        fields.fields().forEachRemaining(e -> {
            String val = resolveEnv(e.getValue().asText());
            if ("HEADER".equals(in)) headers.put(e.getKey(), val);
            else bodyFields.put(e.getKey(), val);
        });
    }

    /** "${VAR}" → 환경변수/프로퍼티 값. 미설정 시 빈 문자열 + 경고. */
    private String resolveEnv(String raw) {
        if (raw == null) return null;
        Matcher m = ENV.matcher(raw);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String key = m.group(1);
            String v = env.getProperty(key);
            if (v == null) v = System.getenv(key);
            if (v == null) {
                log.warn("[REST] 미설정 인증변수: {} (환경변수/프로퍼티 확인)", key);
                v = "";
            }
            m.appendReplacement(sb, Matcher.quoteReplacement(v));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private Map<String, Object> asMap(JsonNode node) {
        Map<String, Object> m = new LinkedHashMap<>();
        if (node != null && node.isObject()) {
            node.fields().forEachRemaining(e ->
                    m.put(e.getKey(), e.getValue().isValueNode() ? e.getValue().asText() : e.getValue().toString()));
        }
        return m;
    }

    private String toJson(Object o) {
        try { return om.writeValueAsString(o); }
        catch (Exception e) { throw new IllegalStateException("JSON 직렬화 실패", e); }
    }

    private String text(JsonNode n, String field, String def) {
        return n != null && n.hasNonNull(field) ? n.get(field).asText() : def;
    }

    private String required(JsonNode n, String field) {
        if (n == null || !n.hasNonNull(field)) throw new IllegalStateException("TGT_CONFIG에 " + field + " 누락");
        return n.get(field).asText();
    }

    /** 로그용 마스킹: secret/password/token 포함 키의 값을 가린다. */
    private Map<String, String> mask(Map<String, String> headers) {
        Map<String, String> m = new LinkedHashMap<>();
        headers.forEach((k, v) -> m.put(k, isSecret(k) ? "****" : v));
        return m;
    }

    private String mask(String body) {
        // clientSecret / token / password 값 마스킹 (form & json 모두 대략 커버)
        return body.replaceAll("(?i)(clientSecret|token|password)=([^&]+)", "$1=****")
                   .replaceAll("(?i)\"(clientSecret|token|password)\"\\s*:\\s*\"[^\"]*\"", "\"$1\":\"****\"");
    }

    private boolean isSecret(String key) {
        String k = key.toLowerCase();
        return k.contains("secret") || k.contains("token") || k.contains("password") || k.contains("authorization");
    }
}
