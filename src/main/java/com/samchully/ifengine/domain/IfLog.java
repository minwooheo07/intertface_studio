package com.samchully.ifengine.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 건별 송수신 로그. 원본 payload를 그대로 보관하는 것이 재처리의 핵심.
 */
@Entity
@Table(name = "IF_LOG")
@Getter @Setter
public class IfLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "LOG_ID")
    private Long logId;

    @Column(name = "IF_ID", length = 30)
    private String ifId;

    @Column(name = "EXEC_ID", length = 36)
    private String execId;                  // 실행(배치) 단위 묶음 ID

    @Column(name = "REC_KEY", length = 200)
    private String recKey;                  // 건별 식별키 (DUP_KEY_COLS 조합)

    @Column(name = "STATUS", length = 10)
    private String status;                  // SUCCESS / FAIL / SKIP

    @Lob
    @Column(name = "PAYLOAD_SRC")
    private String payloadSrc;              // 소스 원본 (JSON)

    @Lob
    @Column(name = "PAYLOAD_TGT")
    private String payloadTgt;              // 변환 결과 (JSON)

    @Column(name = "ERROR_MSG", length = 2000)
    private String errorMsg;

    @Column(name = "RETRY_OF")
    private Long retryOf;                   // 재처리 시 원본 로그 ID

    @Column(name = "TRIGGERED_BY", length = 20)
    private String triggeredBy;             // SCHEDULE / MANUAL / REPROCESS

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
