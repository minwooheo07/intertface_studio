package com.ifstudio.ifengine.engine.adapter;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;

/**
 * 소스 어댑터 규격. 채널(DB/REST/FILE/SOCKET)별로 구현체를 추가하면
 * IF_MASTER.SRC_TYPE 값만으로 자동 선택된다.
 */
public interface SourceAdapter {

    /** 어댑터 타입 키 (IF_MASTER.SRC_TYPE 값과 일치) */
    String type();

    /** 소스에서 미전송 데이터를 수집한다. */
    List<Map<String, Object>> collect(JsonNode config);

    /** 건별 전송 성공 후 소스에 처리완료 표시 (선택 구현) */
    default void markProcessed(JsonNode config, Map<String, Object> row) {
        // 기본: 아무것도 하지 않음
    }
}
