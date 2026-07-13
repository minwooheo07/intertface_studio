package com.samchully.ifengine.engine;

/** 인터페이스 1회 실행 결과 요약 */
public record ExecResult(String execId, int total, int success, int fail, int skip) {
}
