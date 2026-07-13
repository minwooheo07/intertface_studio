# IF Engine — 인터페이스 공통엔진 + 모니터링 대시보드

SI 프로젝트용. 더존 ERP · 다우오피스 그룹웨어 · 회계빌링 · 모뎀/열량 연동 등
여러 시스템 사이의 인터페이스를 **코드가 아니라 설정(메타데이터)으로** 운영하는 경량 EAI 엔진.

신규 인터페이스는 자바 코드를 짜지 않고 `IF_MASTER` / `IF_MAPPING` 두 테이블에
등록만 하면 스케줄에 따라 실행된다.

---

## 핵심 개념

```
 [소스 시스템]                IF Engine                     [타겟 시스템]
  빌링/AMR 등  ──collect──▶  수집 → 변환 → 전송 → 처리표시  ──sendOne──▶  더존/그룹웨어
                                 │
                                 └── 건별 로그(IF_LOG) : 원본 payload 보관
                                          │
                              모니터링 대시보드 / 실패건 재처리
```

- **IF_MASTER** : 인터페이스 정의 (소스/타겟 시스템, 채널유형, cron, 중복방지 키)
- **IF_MAPPING** : 필드 매핑 + 변환룰
- **IF_LOG** : 건별 송수신 이력 + 원본 payload (재처리의 근거)

## 어댑터 구조 (채널별 확장)

`SourceAdapter` / `TargetAdapter` 인터페이스만 구현하면 채널이 늘어난다.
`type()` 반환값이 `IF_MASTER.SRC_TYPE`/`TGT_TYPE`과 매칭되어 자동 선택.

| 채널   | 상태       | 대상 예시                         |
|--------|-----------|-----------------------------------|
| DB     | 구현 완료  | 더존 I/F 테이블, 빌링 DB           |
| REST   | 구현 완료  | 다우오피스 전자결재·Works·알림     |
| FILE   | 뼈대 예정  | 고정폭/CSV 파일 연계               |
| SOCKET | 뼈대 예정  | 모뎀·열량계 전문(電文)             |

REST 어댑터는 설정 주도로, 다우 전자결재(form-urlencoded)와 Works(JSON)를 같은 클래스로
커버한다. 인증키 미발급 단계에서도 `dryRun`으로 요청 흐름을 개발·검증할 수 있다.
자세한 연동 절차는 `docs-daou-approval.md` 참고.

> DB 어댑터 하나로 더존 연동 대부분(I/F 테이블 방식)이 커버된다.
> REST/FILE/SOCKET은 같은 패턴으로 클래스만 추가하면 된다.

## 변환룰 (IF_MAPPING.TRANSFORM_RULE)

| 룰                             | 설명                    | 예                                   |
|--------------------------------|-------------------------|--------------------------------------|
| (없음)                         | 값 그대로 복사           |                                      |
| `CONST:값`                     | 고정값                  | `CONST:BILL`                         |
| `DEFAULT:값`                   | null이면 기본값          | `DEFAULT:0`                          |
| `DATEFMT:입력>출력`            | 날짜 포맷 변환           | `DATEFMT:yyyyMMdd>yyyy-MM-dd`        |
| `CODEMAP:그룹ID`               | 코드매핑 (CODE_MAP 테이블)| `CODEMAP:ACCT_CD`                    |

## 실행 방법 (로컬 데모)

DB 미정 상태라 내장 H2 + 데모 데이터로 바로 뜬다.

```bash
mvn spring-boot:run
# http://localhost:8080          대시보드
# http://localhost:8080/h2-console  (jdbc:h2:mem:ifengine / sa)
```

기동 시 데모 인터페이스 `DEMO_BILL_001`(빌링→ERP 매출전표)이 매분 실행되어
`SRC_DEMO_BILL`의 미전송건을 `TGT_DEMO_ERP`로 이관하고 `IF_FLAG`를 Y로 갱신한다.
대시보드에서 [실행] 즉시실행, 실패건 [재처리]를 확인할 수 있다.

## 실 DB 전환

1. `pom.xml`에서 해당 JDBC 드라이버 주석 해제 (ojdbc11 / mssql-jdbc)
2. `application.yml`의 datasource를 실 DB로 교체
3. `sql/schema-oracle.sql` 또는 `schema-mssql.sql`로 메타 테이블 생성
4. 연동 시스템별 접속정보를 `if-engine.datasources.*`에 추가
   (SRC_CONFIG/TGT_CONFIG의 `"datasource"` 이름으로 참조)

## API

| 메서드 | 경로                              | 설명                    |
|--------|-----------------------------------|-------------------------|
| GET    | `/api/dashboard/summary`          | 금일 성공/실패/스킵 집계 |
| GET    | `/api/interfaces`                 | 인터페이스 목록 + 최근상태|
| GET    | `/api/logs?ifId=&status=`         | 로그 조회 (최근 100건)   |
| POST   | `/api/interfaces/{ifId}/run`      | 수동 즉시 실행           |
| POST   | `/api/logs/{logId}/reprocess`     | 실패건 재처리            |
| POST   | `/api/admin/reload-jobs`          | 마스터 변경 후 스케줄 재적재|
| GET    | `/api/code-maps/groups`           | 코드매핑 그룹 목록       |
| GET    | `/api/code-maps/groups/{groupId}` | 그룹 내 코드매핑 항목     |
| PUT    | `/api/code-maps/groups/{groupId}` | 그룹 전체 치환 저장(업서트)|
| DELETE | `/api/code-maps/groups/{groupId}` | 그룹 삭제                |

## 다음 확장 (권장 순서)

1. ~~REST 어댑터 → 다우오피스 전자결재 연동~~ ✅ 완료 (`docs-daou-approval.md`)
2. SOCKET 어댑터 → 모뎀/열량계 전문 (별도 제안한 "모뎀 시뮬레이터"와 짝)
3. ~~`CODEMAP` 코드매핑 테이블 + 관리화면~~ ✅ 완료
4. NotifyService 실연동 (메일 또는 다우 알림 API)
5. Quartz job-store를 jdbc로 → 이중화/이력 영속화

## 검증 완료

핵심 로직(변환룰 8종, 중복방지 키·재전송 스킵 8종)은 단위 검증 통과.
전체 스프링 부트 빌드는 사내망(Maven Central 접근 가능 환경)에서 `mvn spring-boot:run`으로 확인.
