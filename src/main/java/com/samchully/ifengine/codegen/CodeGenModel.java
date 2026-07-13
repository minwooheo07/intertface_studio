package com.samchully.ifengine.codegen;

import java.util.ArrayList;
import java.util.List;

/**
 * 코드 생성의 중간 모델.
 * 인터페이스 정의(IF_MASTER/IF_MAPPING) → 이 모델 → 템플릿 → 실제 코드.
 *
 * 이 모델이 "프레임워크 중립"이라는 게 핵심이다.
 * 스프링이든 캐모마일이든 이 모델은 그대로 두고 템플릿만 갈아끼운다.
 */
public class CodeGenModel {

    /** 생성 종류 */
    public enum Kind {
        /** 이 인터페이스와 동일하게 동작하는 연동 코드 (수집→변환→전송) */
        INTEGRATION,
        /** 소스 테이블 기준 CRUD 스캐폴드 (Controller/Service/DAO/VO) */
        CRUD
    }

    public Kind kind;
    public String basePackage;      // 예: com.samchully.billing
    public String className;        // 예: BillSlip  (IF_ID에서 파생)
    public String ifId;
    public String ifName;
    public String description;

    /** 소스 (DB 기준) */
    public String srcDatasource;
    public String srcQuery;
    public String srcMarkQuery;
    public String srcTable;         // 쿼리에서 추출 시도 (CRUD용)

    /** 타겟 */
    public String tgtType;          // DB | REST
    public String tgtDatasource;
    public String tgtInsertQuery;
    public String tgtUrl;
    public String tgtMethod;
    public String tgtBodyType;

    /** VO 필드 (소스 컬럼 기준) */
    public List<Field> srcFields = new ArrayList<>();
    /** 타겟 필드 + 변환 룰 */
    public List<MappingField> mappings = new ArrayList<>();

    public static class Field {
        public String columnName;   // BILL_NO
        public String javaName;     // billNo
        public String javaType;     // String / Long / BigDecimal / LocalDate ...
        public Field(String columnName, String javaName, String javaType) {
            this.columnName = columnName;
            this.javaName = javaName;
            this.javaType = javaType;
        }
    }

    public static class MappingField {
        public String srcField;
        public String tgtField;
        public String srcJavaName;
        public String tgtJavaName;
        public String transformRule;   // 원본 룰 (CONST:/DATEFMT:/...)
        public String javaExpr;        // 템플릿에 넣을 자바 표현식
    }
}
