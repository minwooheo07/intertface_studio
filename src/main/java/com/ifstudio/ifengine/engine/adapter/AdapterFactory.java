package com.ifstudio.ifengine.engine.adapter;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 스프링에 등록된 어댑터 구현체를 type() 키로 찾아준다. */
@Component
public class AdapterFactory {

    private final Map<String, SourceAdapter> sources = new HashMap<>();
    private final Map<String, TargetAdapter> targets = new HashMap<>();

    public AdapterFactory(List<SourceAdapter> sourceAdapters, List<TargetAdapter> targetAdapters) {
        sourceAdapters.forEach(a -> sources.put(a.type(), a));
        targetAdapters.forEach(a -> targets.put(a.type(), a));
    }

    public SourceAdapter source(String type) {
        SourceAdapter a = sources.get(type);
        if (a == null) throw new IllegalArgumentException("소스 어댑터 미구현: " + type);
        return a;
    }

    public TargetAdapter target(String type) {
        TargetAdapter a = targets.get(type);
        if (a == null) throw new IllegalArgumentException("타겟 어댑터 미구현: " + type);
        return a;
    }
}
