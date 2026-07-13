package com.ifstudio.ifengine.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** 코드매핑 항목 (GROUP_ID 기준 SRC_CODE -> TGT_CODE 치환) */
@Entity
@Table(name = "CODE_MAP")
@Getter @Setter
public class CodeMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "CODE_MAP_ID")
    private Long codeMapId;

    @Column(name = "GROUP_ID", length = 30, nullable = false)
    private String groupId;

    @Column(name = "SRC_CODE", length = 50, nullable = false)
    private String srcCode;

    @Column(name = "TGT_CODE", length = 50, nullable = false)
    private String tgtCode;

    @Column(name = "DESCRIPTION", length = 200)
    private String description;

    @Column(name = "SORT_ORDER")
    private Integer sortOrder;
}
