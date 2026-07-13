package com.ifstudio.ifengine.monitor.dto;

import java.util.List;
import java.util.Map;

/**
 * 시험실행 결과 DTO.
 * 편집기의 두 기능이 이 하나의 엔드포인트를 공유한다:
 *  - 필드매핑 탭의 "자동 매핑 초안" → columns만 사용
 *  - 테스트 탭의 "시험실행" → columns + sampleRow + mappedRecord + targetPreview 전부 사용
 */
public class TestRunResultDto {

    /** 소스 쿼리 결과의 컬럼명 (결과가 0건이어도 메타데이터로 확인됨) */
    public List<String> columns;

    /** 소스에서 실제로 가져온 1건 (없으면 null) */
    public Map<String, Object> sampleRow;

    /** 매핑 정의가 있으면 변환 적용 결과 (sampleRow가 없으면 null) */
    public Map<String, Object> mappedRecord;

    /** 타겟별 미리보기 (실제 전송/적재는 절대 하지 않음) */
    public TargetPreview targetPreview;

    /** 사용자에게 보여줄 주의사항 (예: "결과 0건", "REST 소스 미구현") */
    public List<String> warnings;

    public static class TargetPreview {
        public String type;          // DB / REST / FILE / SOCKET
        public String body;          // REST: 조립된 전송 바디 (시크릿 마스킹됨)
        public Map<String, Object> bindParams; // DB: 적재 쿼리 바인딩 값
        public Boolean dryRun;       // REST: 설정된 dryRun 값 (참고용, 시험실행 자체는 항상 미전송)
        public String note;
    }
}
