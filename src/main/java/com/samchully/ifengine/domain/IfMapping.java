package com.samchully.ifengine.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** 인터페이스 필드 매핑 + 변환룰 */
@Entity
@Table(name = "IF_MAPPING")
@Getter @Setter
public class IfMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MAPPING_ID")
    private Long mappingId;

    @Column(name = "IF_ID", length = 30, nullable = false)
    private String ifId;

    @Column(name = "SRC_FIELD", length = 100)
    private String srcField;                // null이면 상수 매핑(CONST) 전용

    @Column(name = "TGT_FIELD", length = 100)
    private String tgtField;

    @Column(name = "TRANSFORM_RULE", length = 200)
    private String transformRule;           // CONST: / DEFAULT: / DATEFMT: / CODEMAP:

    @Column(name = "SORT_ORDER")
    private Integer sortOrder;
}
