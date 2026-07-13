package com.samchully.ifengine.engine.adapter.rest;

import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * REST 요청 바디 빌더 (Spring 의존 없는 순수 로직 → 단위 테스트 용이).
 * form-urlencoded 조립을 담당한다. JSON은 어댑터에서 ObjectMapper로 처리.
 */
@Component
public class RestBodyBuilder {

    /** null 값은 제외하고 x-www-form-urlencoded 문자열로 조립 */
    public String toFormUrlEncoded(Map<String, Object> params, String charset) {
        Charset cs = Charset.forName(charset == null ? "UTF-8" : charset);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> e : params.entrySet()) {
            if (e.getValue() == null) continue;
            if (sb.length() > 0) sb.append('&');
            sb.append(URLEncoder.encode(e.getKey(), cs))
              .append('=')
              .append(URLEncoder.encode(String.valueOf(e.getValue()), cs));
        }
        return sb.toString();
    }

    /**
     * 최종 전송 파라미터 병합: 고정파라미터(constParams) → 인증필드(auth) → 매핑결과(row).
     * 뒤에 오는 것이 우선한다(매핑 결과가 최종적으로 값을 덮어쓸 수 있음).
     */
    public Map<String, Object> mergeParams(Map<String, Object> constParams,
                                           Map<String, Object> authFields,
                                           Map<String, Object> row) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (constParams != null) out.putAll(constParams);
        if (authFields != null) out.putAll(authFields);
        if (row != null) out.putAll(row);
        return out;
    }
}
