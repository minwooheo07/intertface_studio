package com.ifstudio.ifengine.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * 인터페이스 정의 마스터.
 * 신규 인터페이스는 코드 수정 없이 이 테이블에 등록만 하면 스케줄 실행된다.
 */
@Entity
@Table(name = "IF_MASTER")
@Getter @Setter
public class IfMaster {

    @Id
    @Column(name = "IF_ID", length = 30)
    private String ifId;                    // 예: DZ_AR_001

    @Column(name = "IF_NAME", length = 100)
    private String ifName;

    @Column(name = "SRC_SYSTEM", length = 30)
    private String srcSystem;               // BILLING, DOUZONE, DAOU, AMR ...

    @Column(name = "TGT_SYSTEM", length = 30)
    private String tgtSystem;

    @Column(name = "SRC_TYPE", length = 10)
    private String srcType;                 // DB / REST / FILE / SOCKET

    @Column(name = "TGT_TYPE", length = 10)
    private String tgtType;

    @Lob
    @Column(name = "SRC_CONFIG")
    private String srcConfig;               // JSON: {"datasource":"...","query":"...","markQuery":"..."}

    @Lob
    @Column(name = "TGT_CONFIG")
    private String tgtConfig;               // JSON: {"datasource":"...","insertQuery":"..."}

    @Column(name = "CRON_EXPR", length = 30)
    private String cronExpr;                // Quartz cron. null이면 수동 실행 전용

    @Column(name = "DUP_KEY_COLS", length = 200)
    private String dupKeyCols;              // 중복방지 키가 되는 소스필드 (콤마 구분)

    @Column(name = "USE_YN", length = 1)
    private String useYn;

    @Column(name = "DESCRIPTION", length = 500)
    private String description;
}
