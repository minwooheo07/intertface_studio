package com.samchully.ifengine.engine.adapter;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.Map;

/** 타겟 어댑터 규격. 변환 완료된 1건을 타겟 시스템에 적재/전송한다. */
public interface TargetAdapter {

    /** 어댑터 타입 키 (IF_MASTER.TGT_TYPE 값과 일치) */
    String type();

    void sendOne(JsonNode config, Map<String, Object> row);
}
