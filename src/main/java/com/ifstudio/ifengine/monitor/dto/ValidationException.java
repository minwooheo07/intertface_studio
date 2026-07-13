package com.ifstudio.ifengine.monitor.dto;

import java.util.ArrayList;
import java.util.List;

/** 입력 검증 실패. 필드별 메시지를 담아 400으로 반환된다. */
public class ValidationException extends RuntimeException {

    public static class FieldError {
        public String field;
        public String message;
        public FieldError(String field, String message) { this.field = field; this.message = message; }
    }

    private final List<FieldError> errors = new ArrayList<>();

    public ValidationException add(String field, String message) {
        errors.add(new FieldError(field, message));
        return this;
    }

    public boolean hasErrors() { return !errors.isEmpty(); }
    public List<FieldError> getErrors() { return errors; }

    @Override
    public String getMessage() {
        if (errors.isEmpty()) return "검증 실패";
        StringBuilder sb = new StringBuilder();
        for (FieldError e : errors) {
            if (sb.length() > 0) sb.append("; ");
            sb.append(e.message);
        }
        return sb.toString();
    }
}
