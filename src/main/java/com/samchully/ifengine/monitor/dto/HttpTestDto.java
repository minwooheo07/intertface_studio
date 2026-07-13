package com.samchully.ifengine.monitor.dto;

import java.util.Map;

/** 포스트맨식 API 테스트 요청/응답 DTO */
public class HttpTestDto {

    public static class Request {
        public String url;
        public String method;              // GET/POST/PUT/DELETE/PATCH
        public Map<String, String> headers;
        public String bodyType;            // NONE | JSON | FORM | RAW
        public String body;                // JSON/RAW: 원문, FORM: k=v&k2=v2 형태 원문
        public String contentType;         // RAW일 때 직접 지정 가능 (선택)
        public Integer timeoutSec;         // 기본 15, 최대 30
    }

    public static class Response {
        public int status;
        public String statusText;
        public long durationMs;
        public Map<String, String> headers;
        public String body;
        public boolean bodyTruncated;      // 1MB 초과 시 잘림
        public String error;               // 연결실패 등 (status와 무관한 실패)
    }
}
