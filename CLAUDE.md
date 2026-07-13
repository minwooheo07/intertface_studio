# CLAUDE.md — IF Engine 작업 컨텍스트

이 파일은 Claude Code가 이 프로젝트를 이어받아 작업할 때 참고하는 문서다.
먼저 이 파일을 읽고, 그다음 `README.md`와 `docs-daou-approval.md`를 읽으면 전체 맥락이 잡힌다.

## 빠른 시작 (Claude Code에서 처음 열었을 때)

이 프로젝트는 웹 기반 개발 환경(Maven Central·외부 이미지 다운로드 차단)에서 만들어졌다.
그래서 **백엔드 빌드/구동이 한 번도 실제로 검증되지 않았다.** 프론트는 npm이 허용돼 있어
실제로 빌드·스크린샷까지 검증됐다. Claude Code(사내망, 인터넷 정상)에서 가장 먼저 할 일:

```bash
# 1. 백엔드가 실제로 빌드/구동되는지 첫 검증
./mvnw spring-boot:run
# → http://localhost:8080 접속, 콘솔에 에러 없는지 확인

# 2. 프론트 개발 서버 (이미 빌드 검증됨, 참고용)
cd frontend && npm install && npm run dev   # :5173, /api는 :8080으로 프록시

# 3. 정식 배포용 빌드 (프론트를 백엔드 static으로 통합)
cd frontend && npm run build   # → ../src/main/resources/static 에 출력
cd .. && ./mvnw package        # 실행 가능 jar 하나
```

**백엔드 첫 구동에서 흔히 날 수 있는 문제**: pom.xml의 DB 드라이버 버전, lombok 어노테이션 처리,
Spring Boot 3.2.5와 Java 17 조합 관련 이슈. 에러가 나면 당황하지 말고 스택트레이스 그대로 대응할 것.

이후 작업은 아래 "작업 백로그" 섹션 순서대로 진행하면 된다. T1(JUnit 테스트 정식 편입)을
먼저 하는 걸 권장 — 지금까지의 로직 검증이 순수 Java 스니펫으로만 되어 있어 회귀 방지망이 없다.


---

## 이 프로젝트가 뭔가

SI 프로젝트용 **경량 EAI 엔진 + 관제 대시보드**.
더존 ERP, 다우오피스 그룹웨어, 회계빌링, 모뎀/열량 검침 등 여러 시스템 사이의
인터페이스를 **코드가 아니라 메타데이터(DB 테이블)로** 운영한다.

핵심 원칙: **신규 인터페이스 = 코드 작성이 아니라 `IF_MASTER`/`IF_MAPPING` 행 등록.**
이 원칙을 깨지 않는 방향으로만 기능을 확장할 것.

독립 실행형 Spring Boot 앱이다. 다른 프로젝트에 라이브러리로 붙이는 게 아니라,
별도 "연계 서버"로 떠서 각 시스템의 DB/API를 바깥에서 두드린다.

## 기술 스택

- Java 17, Spring Boot 3.2.5 (web, data-jpa, quartz)
- 빌드: Maven (`mvn spring-boot:run`)
- DB: **미정**. 현재는 내장 H2 + 데모데이터로 즉시 실행됨.
  실 DB 확정 시 Oracle 또는 MSSQL로 전환 (아래 "실 DB 전환" 참고)
- 프론트: **React 19 + Vite + TypeScript + Tailwind CSS + Radix UI** (`frontend/`). Spring Boot 통합 배포(jar 하나).
  - **디자인**: 관제 콘솔 컨셉. 다크 사이드바 + 밝은 메인, 다크/라이트 토글(`hooks/useTheme.ts`).
    디자인 언어 = iOS/Apple HIG. 시스템 블루 액센트(#007AFF/다크 #0A84FF), 쿨 그레이 배경, 순백 카드, 큰 라운드(rounded-2xl), 부드러운 그림자.
    밝은 사이드바(설정앱 느낌, 블러). 세그먼트 컨트롤 탭, iOS 그린 스위치, pill 버튼. 시그니처 = 소스→타겟 파이프라인(활성 시 흐름 애니메이션).
    디자인 토큰은 CSS 변수(`index.css`)로 라이트/다크 두 팔레트. Tailwind가 변수를 참조(`tailwind.config.js`).
  - **브랜드/로고**: `frontend/public/logo-full.png`(원본, Interface Studio 앱아이콘). 파생본:
    logo-180/192/512(파비콘 PNG), favicon.svg(벡터 파비콘).
    사이드바 브랜드 심볼은 PNG 크롭이 잘려서 **SVG로 재현**: `components/brand/Logo.tsx`의 LogoSymbol.
    (i·S + 파랑→보라 그라데이션 + 연결 노드. 어떤 크기든 잘림 없음.)
    브랜드명 "Interface Studio", 서브텍스트 "인터페이스 스튜디오".
  - **UI 프리미티브**: `components/ui/` (Button/Input/Select/Switch/Tabs/Badge/Banner/Card/CodeBox/Pipe).
    Radix(tabs/switch/dropdown-menu/tooltip)로 접근성. 폰트: SF Pro(시스템 스택) 본문 + SF Mono(ID/코드/수치), 살짝 타이트한 자간.
  - 관례: Input/TextArea/Select는 `onValue={(v)=>...}` (값 직접). 에러는 `error` prop. `cn()`(clsx+tailwind-merge)로 클래스 병합.
  - 개발: `cd frontend && npm run dev`(5173, /api 8080 프록시). 배포: `./mvnw package`.
  - 상세 설계: `docs-p1-design.md`. 레거시 대시보드는 `static/dashboard-legacy.html`로 참조 보존.
    (디자인 변천: 순수CSS → Astryx → "올드하다" → Tailwind 현대적 → "iOS 느낌" → 현재 iOS/Apple HIG 스타일.)

## 아키텍처 한눈에

```
소스시스템 ──collect──▶ [IF Engine: 수집→변환→전송→처리표시→로그] ──sendOne──▶ 타겟시스템
                              │
                    IF_LOG(원본 payload 보관) → 대시보드 조회 / 실패건 재처리
```

- **엔진 코어**: `engine/InterfaceExecutor.java` — 실행 흐름의 심장. 여기부터 읽어라.
- **어댑터**: `SourceAdapter`/`TargetAdapter` 인터페이스. `type()` 반환값이
  `IF_MASTER.SRC_TYPE`/`TGT_TYPE`과 매칭되어 `AdapterFactory`가 자동 선택.
  - `adapter/db/`  — DB 어댑터 (더존 I/F 테이블 방식) ✅
  - `adapter/rest/` — REST 어댑터 (다우 전자결재 form / Works JSON, dryRun 지원) ✅
  - `adapter/file/`   — 미구현 (다음 후보)
  - `adapter/socket/` — 미구현 (모뎀/열량 전문, 다음 후보)
- **변환**: `engine/transform/MappingTransformer.java` — CONST/DEFAULT/DATEFMT/CODEMAP 룰
- **스케줄**: `engine/scheduler/` — Quartz. 기동 시 IF_MASTER 읽어 잡 자동 등록
- **관제 API**: `monitor/MonitorController.java`
- **알림**: `notify/NotifyService.java` — 현재 로그만 (실연동 TODO)

## 데이터 모델 (메타 테이블)

- `IF_MASTER` — 인터페이스 정의 (소스/타겟 시스템, 채널유형, cron, 중복방지키, SRC_CONFIG/TGT_CONFIG JSON)
- `IF_MAPPING` — 필드 매핑 + 변환룰
- `IF_LOG` — 건별 송수신 이력 + 원본 payload (재처리의 근거. 절대 payload 보관을 빼지 말 것)

DDL: `src/main/resources/sql/` 에 h2/oracle/mssql 3종. 데모데이터는 `sample-data.sql`.

## 실행 방법

```bash
mvn spring-boot:run
# http://localhost:8080            대시보드
# http://localhost:8080/h2-console (jdbc:h2:mem:ifengine / sa / 공백)
```

데모 인터페이스 2개가 들어있다:
- `DEMO_BILL_001` (빌링→더존ERP, DB→DB, 매분 자동실행)
- `DAOU_APPR_001` (결재요청→다우 전자결재, DB→REST, dryRun=true, 수동실행)

대시보드에서 [실행] 즉시실행, 실패건 [재처리] 확인 가능.

## 빌드/검증 주의사항

- 이 프로젝트의 핵심 로직은 순수 Java 단위검증을 이미 통과했다:
  변환룰, 중복방지키, form-urlencoded 인코딩, 시크릿 마스킹, 통합흐름.
- **정식 테스트 코드(`src/test`)는 아직 없다.** Claude Code에서 가장 먼저 할 만한 일 중 하나가
  이 검증들을 JUnit 5 테스트로 정식 편입하는 것 (아래 백로그 T1).
- 통합/전송 로직 수정 시, 반드시 `mvn test` 통과 후 커밋.

## 실 DB 전환 (DB 확정되면)

1. `pom.xml`에서 해당 JDBC 드라이버 주석 해제 (ojdbc11 또는 mssql-jdbc)
2. `application.yml`의 datasource를 실 DB로 교체, `spring.sql.init.mode: never`로
3. `sql/schema-oracle.sql` 또는 `schema-mssql.sql`로 메타테이블 생성
4. 연동 시스템별 접속정보를 `if-engine.datasources.*`에 추가
   (SRC_CONFIG/TGT_CONFIG의 `"datasource"` 이름으로 참조됨)
5. 시크릿(다우 clientSecret 등)은 환경변수로. `${DAOU_CLIENT_SECRET}` 문법 사용. **DB에 넣지 말 것.**

## 코딩 규약 / 지켜야 할 것

- "설정 주도" 원칙 유지: 새 연동을 코드가 아니라 IF_MASTER 등록으로 처리되게.
- 어댑터를 추가할 땐 기존 `SourceAdapter`/`TargetAdapter` 규격만 구현. 엔진 코어를 고치지 말 것.
- IF_LOG에 원본 payload 저장 유지 (재처리 불가해짐).
- 시크릿은 절대 DB/코드/로그에 평문으로 남기지 말 것 (로그 마스킹 이미 구현됨 — RestTargetAdapter.mask).
- 한글 주석/메시지 유지 (현장 인수 대상이 국내 SI 팀).
- 응답/커밋 메시지는 한국어로.

---

## 작업 백로그 (우선순위 순)

다음 세션에서 이어서 할 일. 위에서부터 권장.

### T1. JUnit 테스트 정식 편입 (마무리 성격, 먼저 권장)
- `src/test/java`에 JUnit 5로 편입: MappingTransformer(변환룰), RestBodyBuilder(form 인코딩),
  InterfaceExecutor의 중복스킵·재처리 로직.
- 이미 검증된 로직이므로 케이스는 아래 "검증 완료된 테스트 시나리오" 참고.

### T2. 인터페이스 정의 관리 UI ("스튜디오" 완성) ★ 기획 완료
- **상세 기획: `docs-planning-management.md` 참고 (IF Studio 기획서).** 이 문서 기준으로 진행.
- 인터페이스 생명주기(개발→테스트→운영→문서화)를 한 화면에서. 개발자 대상 효율 도구.
- 단계별 개발(P1~P5):
  - P1: IF_MASTER/IF_MAPPING CRUD API + 정의 편집기 (SQL 없이 등록/수정)
    - ✅ **프론트 편집기 완료**: 5탭(기본/소스/타겟/필드매핑/테스트) React 컴포넌트.
      `frontend/src/pages/InterfaceEditor.tsx` + `components/editor/*`. 클라이언트 검증,
      채널유형별 폼(DB/REST)+JSON 원문 토글, 매핑 그리드(추가/삭제/정렬)+변환 미리보기,
      REST 페이로드 로컬 미리보기까지. tsc+vite 빌드 통과, 스크린샷 확인 완료.
    - ✅ **백엔드 CRUD 완료**: `InterfaceAdminController` + `InterfaceAdminService`
      + dto(`InterfaceDetailDto`/`CloneRequest`/`ValidationException`).
      GET상세 / POST등록 / PUT수정(매핑 전체치환) / DELETE(?hard=true 물리삭제, 기본 소프트비활성) / clone.
      서버 검증(ID패턴·필수·채널·cron·JSON·매핑 타겟필드 유일/CONST) → 400+필드별 에러.
      저장·삭제 후 스케줄 자동 재적재(registrar.reload). 검증 로직 단위검증 10종 통과.
    - ✅ **SpaForwardController 완료**: 확장자 없는 경로 → index.html 포워드. /api·/h2-console 명시 제외.
    - ⬜ 목록/대시보드/로그 화면 SPA 이관 (InterfaceList는 최소구현, Dashboard/LogViewer는 플레이스홀더).
      레거시 static/index.html 대시보드는 SPA 파리티 전까지 유지.
    - ⬜ **빌드/구동 검증(사내망 필요)**: 이 개발환경은 Maven Central 차단으로 백엔드 전체 빌드 불가.
      사내망에서 `./mvnw spring-boot:run` 후 편집기 저장→목록 반영, `GET /api/interfaces/{id}` 확인할 것.
  - P2: 개발 가속 — 복제, 템플릿(IF_TEMPLATE), 매핑 자동초안(쿼리 인트로스펙션), 단건 시험실행(전 채널 dryRun)
    - ✅ **복제** 완료 (P1에서 백엔드+프론트 함께 구현됨: `POST /api/interfaces/{id}/clone`).
    - ✅ **매핑 자동초안 + 시험실행** 완료. `InterfaceTestRunService` + `POST /api/interfaces/test-run`
      하나를 두 프론트 기능이 공유: 필드매핑 탭 "자동 매핑 초안"(컬럼만 사용해 빈 매핑 채움),
      테스트 탭 "시험실행"(실제 1건 조회+변환+타겟 미리보기). 저장 없이도 동작.
      안전설계: JdbcTemplate.setMaxRows(1)로 소스 캡핑, 실전송/실적재 절대 없음, 시크릿 마스킹.
      현재 DB 소스만 지원(REST/FILE/SOCKET 소스는 어댑터 미구현이라 명확한 에러 안내).
      상세: `docs-p2-testrun.md`.
    - ⬜ 템플릿(IF_TEMPLATE) — 미착수.
  - ✅ **API 테스터** (P2 외 추가): 포스트맨식 `POST /api/http-test` + `/api-tester` 화면.
    서버가 프록시 호출 → CORS 없음·사내망 API 가능. 4xx/5xx는 응답 그대로, 연결실패만 error로 구분.
    **주의: 실제 호출이다(dryRun 없음)** — 화면에 경고 상시 표시.
    **[인터페이스로 가져오기]**: 2xx 응답 후 테스트한 요청을 인터페이스 정의로 전환. 바디 키를 매핑/고정값/인증으로
    분류(시크릿 패턴 자동추론) → tgtConfig+매핑 타겟필드 자동 생성. 인증은 환경변수 참조로, dryRun=true로 안전하게.
    상세: `docs-api-tester.md`.
  - ✅ **소스 코드 생성기** (편집기 [코드생성] 탭): 인터페이스 정의 → 백엔드 소스코드.
    2종 선택: INTEGRATION(연동코드: VO/Service/DAO/Mapper/Sender/DateUtils) / CRUD(스캐폴드 한 벌).
    변환룰이 Java 코드로 풀린다(DATEFMT→DateUtils.reformat 등). zip 다운로드.
    **[캐모마일 대응]** 생성로직(CodeGenService, 프레임워크 중립)과 템플릿(resources/codegen/spring/*.tpl)이
    분리돼 있다. 캐모마일 샘플 받으면 `codegen/chamomile/` 폴더만 추가하면 됨 — 자바 코드는 안 바뀜.
    **아직 캐모마일 규약을 모르므로 표준 스프링으로 만들어둠. 샘플 받으면 템플릿 교체할 것.**
    상세: `docs-codegen.md`.
  - ✅ **3D 대시보드 히어로** (`components/dashboard/FlowScene.tsx`): three.js로 소스→엔진→타겟
    데이터 흐름 시각화. 파티클 420개가 곡선 경로로 흐르고, **실패 건수 비율만큼 붉은 파티클**이 섞인다
    (실데이터 반영). 마우스 parallax, 코어 회전/맥동, 노드 부유.
    성능: 파티클 단일 Points(draw call 1), 백그라운드 탭이면 렌더 중단, **three.js는 lazy 로드**로
    별도 청크 분리(메인 번들 영향 없음). 라이트/다크에 따라 블렌딩 전환(테마 변경 시 key로 씬 재생성).
  - P3: 운영 — 장애 큐, 일괄 재처리(조건 기반), 알림 규칙(IF_ALERT_RULE)
  - P4: 문서화 — 인터페이스 정의서 Excel 자동생성, 총괄표, 변경이력(IF_CHANGE_LOG)
  - P5: 부가 — 코드매핑 UI(T4 흡수), 통계/추이, 권한
- 신규 테이블: IF_TEMPLATE, IF_CHANGE_LOG, IF_ALERT_RULE, CODE_MAP.
- 착수점: P1의 CRUD API부터. 편집기 화면은 기존 index.html 확장 또는 SPA 분리를 먼저 결정.

### T3. SOCKET 어댑터 (모뎀/열량 검침 전문)
- `adapter/socket/SocketSourceAdapter.java` 신규. TCP 소켓 수신, 고정길이/구분자 전문 파싱.
- 짝으로 "모뎀 시뮬레이터"(가상 장비) — 실장비 없이 테스트용 전문 송신 서버.
- **전문 포맷 스펙(고정길이 여부, 헤더구조, 검침 필드 레이아웃)을 사용자에게 먼저 받을 것.** 지어내지 말 것.

### T4. CODEMAP 코드매핑 ✅ 완료
- `CODE_MAP(CODE_MAP_ID, GROUP_ID, SRC_CODE, TGT_CODE, DESCRIPTION, SORT_ORDER)` 테이블(h2/oracle/mssql, GROUP_ID+SRC_CODE 유니크).
- `MappingTransformer`의 `CODEMAP:그룹ID` 룰이 `CodeMapRepository`로 실제 치환. 매핑에 없는 코드는 원본값 유지(데이터 유실 방지).
- 관리 API: `codemap/CodeMapController`+`CodeMapService`. `GET /api/code-maps/groups`(목록), `GET/PUT/DELETE /api/code-maps/groups/{groupId}`(그룹 단위 전체조회/치환저장/삭제 — IF_MAPPING과 동일 패턴).
- 관리화면: 사이드바 "코드매핑" 메뉴. `CodeMapList`(그룹 목록+새 그룹) + `CodeMapEditor`(소스코드/타겟코드/설명 행 편집, MappingTab과 동일한 그리드 UX).
- 데모 데이터: `ACCT_CD` 그룹(더존 계정코드 ↔ 빌링 코드 3건). 필드매핑에서 `TRANSFORM_RULE = 'CODEMAP:ACCT_CD'`로 참조 가능.
- 검증: test-run으로 매칭(101→4001)·미매칭 원본유지(999→999) 확인. 관리화면 CRUD(생성/행추가/저장/삭제) 브라우저로 확인 완료.

### T5. NotifyService 실연동
- 현재 실패 시 로그만 남김. 메일(spring-boot-starter-mail, pom에 주석) 또는 다우 알림 API로.
- 다우 알림은 기존 RestTargetAdapter 패턴 재사용 가능.

### T6. 운영 배포
- `mvn package`로 실행가능 jar, `application-prod.yml` 분리, systemd 서비스 등록 가이드.
- Quartz job-store를 memory→jdbc로 (서버 이중화/이력 영속화).

---

## 검증 완료된 테스트 시나리오 (T1에서 JUnit화할 케이스)

MappingTransformer.applyRule:
- passthrough(rule=null) → 값 그대로
- CONST:BILL → "BILL"
- DEFAULT:00 (null입력) → "00" / (값입력) → 값유지
- DATEFMT:yyyyMMdd>yyyy-MM-dd, "20260701" → "2026-07-01" / null → null
- CODEMAP:ACCT_CD, "101"(매핑 있음) → "4001" / "999"(매핑 없음) → "999"(원본유지) / null → null
  (test-run API로 검증: ad-hoc DB 소스 쿼리 + CODEMAP 룰 조합. src/main/resources/sql/sample-data.sql의
  ACCT_CD 데모 3건 기준)

buildKey (InterfaceExecutor):
- 단일키 "BILL_NO" → "B001"
- 복합키 "BILL_NO,AMT" → "B001|100"
- null/blank dupcols → null
- 대소문자 무시 컬럼 접근 (bill_no, Bill_No 모두 접근 가능)
- 동일키 성공이력 존재 시 2회차 SKIP

RestBodyBuilder.toFormUrlEncoded:
- null 값 필드 제외
- 한글 공백 인코딩 (+)
- &,=,특수문자 이스케이프
- 왕복 디코딩으로 원문 복원

RestTargetAdapter.mask:
- form: clientSecret=xxx → clientSecret=**** (원문 제거)
- json: "token":"xxx" → "token":"****" (원문 제거)
- clientId/title 등 비밀 아닌 필드는 유지
