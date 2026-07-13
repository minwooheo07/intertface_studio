package {{basePackage}}.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * {{ifName}} - REST 전송
 * 생성: Interface Studio ({{ifId}})
 *
 * ⚠️ 인증정보는 환경변수/설정으로 주입하세요. 코드에 하드코딩 금지.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class {{className}}Sender {

    private static final String URL = "{{tgtUrl}}";

    private final RestClient rest = RestClient.create();

{{#authFields}}
    @Value("${{{envRef}}:}")
    private String {{javaName}};
{{/authFields}}

    public void send(Map<String, Object> params) {
{{#isFormBody}}
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        params.forEach((k, v) -> { if (v != null) form.add(k, String.valueOf(v)); });
{{#authFields}}
        form.add("{{name}}", {{javaName}});
{{/authFields}}
{{#constParams}}
        form.add("{{key}}", "{{value}}");
{{/constParams}}

        String res = rest.method(org.springframework.http.HttpMethod.{{tgtMethod}})
                .uri(URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(String.class);
{{/isFormBody}}
{{^isFormBody}}
        java.util.Map<String, Object> body = new java.util.HashMap<>(params);
{{#authFields}}
        body.put("{{name}}", {{javaName}});
{{/authFields}}
{{#constParams}}
        body.put("{{key}}", "{{value}}");
{{/constParams}}

        String res = rest.method(org.springframework.http.HttpMethod.{{tgtMethod}})
                .uri(URL)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
{{/isFormBody}}

        log.info("[{{ifId}}] 전송 완료: {}", res);
        // TODO: 응답 규격에 맞게 성공/실패 판정을 구현하세요. (2xx여도 본문에 에러코드가 오는 API가 많습니다)
    }
}
