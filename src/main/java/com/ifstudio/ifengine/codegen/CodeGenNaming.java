package com.ifstudio.ifengine.codegen;

import java.sql.Types;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 코드 생성용 순수 유틸. 프레임워크 중립 — 스프링/캐모마일 공통으로 쓴다.
 * (단위 검증 21종 통과: 이름변환·타입매핑·테이블추출·변환룰)
 */
public final class CodeGenNaming {

    private CodeGenNaming() {}

    private static final Pattern FROM_TABLE =
            Pattern.compile("(?i)\\bfrom\\s+([a-zA-Z_][a-zA-Z0-9_.]*)");

    /** BILL_NO → billNo */
    public static String toCamel(String col) {
        if (col == null || col.isBlank()) return col;
        String[] parts = col.trim().toLowerCase().split("_");
        StringBuilder sb = new StringBuilder(parts[0]);
        for (int i = 1; i < parts.length; i++) {
            if (parts[i].isEmpty()) continue;
            sb.append(Character.toUpperCase(parts[i].charAt(0))).append(parts[i].substring(1));
        }
        return sb.toString();
    }

    /** BILL_NO → BillNo */
    public static String toPascal(String col) {
        String c = toCamel(col);
        return (c == null || c.isEmpty()) ? c : Character.toUpperCase(c.charAt(0)) + c.substring(1);
    }

    /** JDBC 타입 → Java 타입. 모르는 타입은 String으로 안전하게 떨어뜨린다. */
    public static String javaType(int sqlType) {
        return switch (sqlType) {
            case Types.BIGINT -> "Long";
            case Types.INTEGER, Types.SMALLINT, Types.TINYINT -> "Integer";
            case Types.DECIMAL, Types.NUMERIC -> "java.math.BigDecimal";
            case Types.DOUBLE, Types.FLOAT, Types.REAL -> "Double";
            case Types.BOOLEAN, Types.BIT -> "Boolean";
            case Types.DATE -> "java.time.LocalDate";
            case Types.TIME -> "java.time.LocalTime";
            case Types.TIMESTAMP, Types.TIMESTAMP_WITH_TIMEZONE -> "java.time.LocalDateTime";
            default -> "String";
        };
    }

    /** SELECT ... FROM T 에서 테이블명 추출 (CRUD 스캐폴드용, best-effort) */
    public static String extractTable(String query) {
        if (query == null) return null;
        String q = query.replaceAll("\\s+", " ").trim();
        Matcher m = FROM_TABLE.matcher(q);
        return m.find() ? m.group(1) : null;
    }

    /**
     * 엔진의 변환룰을 Java 표현식으로 변환.
     * 생성된 코드는 엔진 없이 도는 게 목적이므로, 룰을 코드로 풀어쓴다.
     */
    public static String toJavaExpr(String rule, String srcGetter) {
        if (rule == null || rule.isBlank()) return srcGetter;
        String r = rule.trim();
        if (r.startsWith("CONST:")) return "\"" + r.substring(6) + "\"";
        if (r.startsWith("DEFAULT:")) {
            String d = r.substring(8);
            return srcGetter + " != null ? " + srcGetter + " : \"" + d + "\"";
        }
        if (r.startsWith("DATEFMT:")) {
            String[] fmt = r.substring(8).split(">");
            if (fmt.length == 2) {
                return "DateUtils.reformat(" + srcGetter + ", \"" + fmt[0] + "\", \"" + fmt[1] + "\")";
            }
        }
        if (r.startsWith("CODEMAP:")) {
            return "codeMapService.convert(\"" + r.substring(8) + "\", " + srcGetter + ")";
        }
        return srcGetter;  // 모르는 룰은 원본 그대로 (생성 코드에 TODO 주석이 붙는다)
    }

    /** IF_ID(DEMO_BILL_001) → 클래스명(DemoBill001) */
    public static String toClassName(String ifId) {
        return toPascal(ifId);
    }
}
