package {{basePackage}}.util;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * 날짜 형식 변환 유틸 (DATEFMT 변환룰 지원용)
 * 생성: Interface Studio
 *
 * 이미 사내 표준 날짜 유틸이 있다면 그걸 쓰고 이 파일은 삭제하세요.
 */
public final class DateUtils {

    private DateUtils() {}

    /**
     * 날짜 문자열의 형식을 바꾼다.
     * 예: reformat("20260712", "yyyyMMdd", "yyyy-MM-dd") → "2026-07-12"
     *
     * @return 입력이 null/빈값이면 null. 파싱 실패 시 원본을 그대로 돌려준다(데이터 유실 방지).
     */
    public static String reformat(Object value, String fromPattern, String toPattern) {
        if (value == null) return null;
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return null;
        try {
            LocalDate d = LocalDate.parse(s, DateTimeFormatter.ofPattern(fromPattern));
            return d.format(DateTimeFormatter.ofPattern(toPattern));
        } catch (Exception e) {
            // 형식이 안 맞으면 원본 유지. 필요하면 예외로 바꾸세요.
            return s;
        }
    }
}
