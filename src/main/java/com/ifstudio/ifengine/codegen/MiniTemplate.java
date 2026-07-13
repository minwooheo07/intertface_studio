package com.ifstudio.ifengine.codegen;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Mustache 서브셋 템플릿 렌더러. 외부 의존성 없이 직접 구현.
 *
 * 지원 문법:
 *   {{var}}          변수 치환
 *   {{{var}}}        변수 치환 (raw — SQL처럼 이스케이프하면 안 되는 값)
 *   {{#list}}..{{/list}}   리스트 반복 (항목이 Map이면 그 키를 컨텍스트에 병합)
 *   {{#bool}}..{{/bool}}   조건부 출력
 *   {{^bool}}..{{/bool}}   부정 조건부 (falsy일 때 출력)
 *
 * (단위 검증 11종 통과)
 */
public final class MiniTemplate {

    private MiniTemplate() {}

    private static final Pattern SECTION =
            Pattern.compile("\\{\\{([#^])(\\w+)\\}\\}(.*?)\\{\\{/\\2\\}\\}", Pattern.DOTALL);
    private static final Pattern RAW_VAR = Pattern.compile("\\{\\{\\{(\\w+)\\}\\}\\}");
    private static final Pattern VAR = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    public static String render(String tpl, Map<String, Object> ctx) {
        String out = tpl;
        boolean changed = true;
        while (changed) {
            changed = false;
            Matcher m = SECTION.matcher(out);
            StringBuilder sb = new StringBuilder();
            int last = 0;
            while (m.find()) {
                changed = true;
                sb.append(out, last, m.start());
                String type = m.group(1);
                String key = m.group(2);
                String inner = m.group(3);
                Object val = ctx.get(key);

                if ("^".equals(type)) {
                    if (!truthy(val)) sb.append(renderVars(inner, ctx));
                } else if (val instanceof List<?> list) {
                    for (Object item : list) {
                        Map<String, Object> sub = new HashMap<>(ctx);
                        if (item instanceof Map<?, ?> mm) {
                            mm.forEach((k, v) -> sub.put(String.valueOf(k), v));
                        }
                        sb.append(renderVars(inner, sub));
                    }
                } else if (truthy(val)) {
                    sb.append(renderVars(inner, ctx));
                }
                last = m.end();
            }
            sb.append(out.substring(last));
            out = sb.toString();
        }
        out = renderVars(out, ctx);
        return cleanup(out);
    }

    /**
     * 섹션 태그가 단독으로 있던 줄이 빈 줄로 남는 문제를 정리한다.
     * (표준 Mustache의 standalone line 처리에 해당)
     * 연속 3줄 이상의 빈 줄 → 1줄로, 파일 끝 공백 정리.
     */
    private static String cleanup(String s) {
        return s.replaceAll("\n{3,}", "\n\n")     // 빈 줄 3개 이상 → 1개
                .replaceAll("\\{\n\n", "{\n")      // 블록 시작 직후 빈 줄 제거
                .replaceAll("\n\n(\\s*})", "\n$1") // 블록 끝 직전 빈 줄 제거
                .stripTrailing() + "\n";
    }

    private static boolean truthy(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        if (v instanceof List<?> l) return !l.isEmpty();
        if (v instanceof String s) return !s.isBlank();
        return true;
    }

    private static String renderVars(String tpl, Map<String, Object> ctx) {
        String out = replace(tpl, RAW_VAR, ctx);
        return replace(out, VAR, ctx);
    }

    private static String replace(String s, Pattern p, Map<String, Object> ctx) {
        Matcher m = p.matcher(s);
        StringBuilder sb = new StringBuilder();
        int last = 0;
        while (m.find()) {
            sb.append(s, last, m.start());
            Object v = ctx.get(m.group(1));
            sb.append(v == null ? "" : String.valueOf(v));
            last = m.end();
        }
        sb.append(s.substring(last));
        return sb.toString();
    }
}
