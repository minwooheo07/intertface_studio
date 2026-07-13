# P1 상세 설계 — IF Studio SPA

IF Studio의 첫 단계(P1: 인터페이스 CRUD + 정의 편집기) 상세 설계.
스택 확정: **React + Vite + TypeScript**, **Spring Boot 통합 배포(jar 하나)**.

---

## 1. 프로젝트 구조

프론트는 백엔드 리포지토리 안 `frontend/`에 둔다(모노리식). 빌드 산출물이
`src/main/resources/static`으로 나가 jar에 함께 패키징된다.

```
if-engine/
├─ pom.xml                       ← frontend 빌드 연동(P1에서 배선)
├─ frontend/                     ← React + Vite + TS (신규)
│   ├─ package.json
│   ├─ vite.config.ts            ← /api 프록시, 빌드 outDir=../src/main/resources/static
│   ├─ tsconfig.json
│   ├─ index.html
│   └─ src/
│       ├─ main.tsx
│       ├─ App.tsx               ← 라우팅
│       ├─ types.ts              ← 백엔드 DTO 타입
│       ├─ api/
│       │   ├─ client.ts         ← fetch 래퍼(에러/JSON 공통)
│       │   └─ interfaces.ts     ← 인터페이스 API 호출
│       ├─ pages/
│       │   ├─ Dashboard.tsx     ← 현황(기존 화면 이관)
│       │   ├─ InterfaceList.tsx ← 목록
│       │   ├─ InterfaceEditor.tsx ← 정의 편집기(탭)
│       │   └─ LogViewer.tsx     ← 로그(기존 이관)
│       └─ components/
│           ├─ editor/           ← BasicTab, SourceTab, TargetTab, MappingTab
│           └─ common/           ← StatusBadge, JsonEditor, Pipe 등
└─ src/main/java/.../monitor/
    ├─ MonitorController.java    ← 기존(조회/실행/재처리)
    ├─ InterfaceAdminController.java ← 신규(CRUD)  ★P1
    ├─ SpaForwardController.java ← 신규(SPA 라우팅 fallback) ★P1
    └─ dto/                      ← 신규 DTO
```

## 2. 빌드 / 개발 워크플로우

### 개발 중 (2-프로세스)
- 백엔드: `./mvnw spring-boot:run` (8080)
- 프론트: `cd frontend && npm run dev` (5173). Vite dev 서버가 `/api`를 8080으로 프록시.
- 즉, 개발자는 http://localhost:5173 에서 작업, API는 자동으로 백엔드로 흐른다(CORS 불필요).

### 배포 (1-jar)
- `npm run build` → 산출물이 `src/main/resources/static`으로.
- `./mvnw package` → 프론트 포함된 실행 jar 하나.
- pom에 `frontend-maven-plugin`을 걸어 `mvn package` 한 번에 프론트까지 빌드되게 배선(아래 4장).

### SPA 라우팅 fallback
클라이언트 라우팅(예: `/interfaces/DEMO_BILL_001`)을 새로고침해도 404가 안 나게,
`/api/**`·정적리소스가 아닌 경로는 `index.html`로 포워드하는 `SpaForwardController`를 둔다.

## 3. CRUD API 스펙 (P1 신규)

`InterfaceAdminController` (`/api/interfaces`). 기존 조회/실행/재처리는 `MonitorController` 유지.

### GET /api/interfaces  — 목록 (기존, 필터 확장)
쿼리파라미터: `keyword`, `srcSystem`, `tgtSystem`, `srcType`, `useYn` (모두 선택).
응답: 인터페이스 요약 배열 + 최근 실행 상태(기존 형식 유지).

### GET /api/interfaces/{id}  — 상세 (신규)
```json
{
  "master": {
    "ifId": "DEMO_BILL_001", "ifName": "...", "srcSystem": "BILLING", "tgtSystem": "DOUZONE",
    "srcType": "DB", "tgtType": "DB",
    "srcConfig": "{...json...}", "tgtConfig": "{...json...}",
    "cronExpr": "0 * * * * ?", "dupKeyCols": "BILL_NO", "useYn": "Y", "description": "..."
  },
  "mappings": [
    { "mappingId": 1, "srcField": "BILL_NO", "tgtField": "SLIP_NO", "transformRule": null, "sortOrder": 1 }
  ]
}
```

### POST /api/interfaces  — 신규 등록 (신규)
요청 바디: `{ master: {...}, mappings: [...] }` (mappingId 없이).
성공 시 201 + 생성된 상세. 저장 후 스케줄 반영(내부에서 reload 또는 해당 잡만 등록).

### PUT /api/interfaces/{id}  — 수정 (신규)
요청 바디: 상세와 동일. 매핑은 **전체 치환**(기존 삭제 후 재삽입)으로 단순화.
P4에서 변경 전 스냅샷을 `IF_CHANGE_LOG`에 기록(P1은 자리만).

### DELETE /api/interfaces/{id}  — 삭제/비활성 (신규)
기본은 **소프트 비활성**(`useYn='N'` + 스케줄 해제). `?hard=true`면 물리 삭제(매핑·정의).
로그(IF_LOG)는 보존.

### POST /api/interfaces/{id}/clone  — 복제 (신규, P2 킬러기능 선반영)
요청: `{ "newIfId": "...", "newIfName": "..." }`. 마스터+매핑 복제, `useYn='N'`으로 생성(테스트 후 활성).

### 검증 규칙 (등록/수정 공통, 서버에서 강제)
- `ifId`: 필수, 유일, 패턴 `^[A-Z0-9_]{1,30}$`
- `srcType`/`tgtType`: `DB|REST|FILE|SOCKET` 중 하나, 구현된 어댑터인지 확인
- `srcConfig`/`tgtConfig`: 유효한 JSON (파싱 실패 시 400)
- `cronExpr`: 있으면 Quartz cron 유효성 검사
- `mappings[].tgtField`: 필수, 인터페이스 내 유일
- `mappings[].srcField`: 필수. 단 `transformRule`이 `CONST:`로 시작하면 생략 가능
- 검증 실패는 400 + 필드별 메시지 배열로 반환(편집기에서 인라인 표시)

## 4. pom.xml 빌드 통합 (배선 방법)

`frontend-maven-plugin`으로 `mvn package` 시 npm install+build 자동 수행.
빌드 산출물을 static으로 보내는 건 vite.config.ts의 `outDir`가 담당.

주의: 이 플러그인은 기본적으로 nodejs.org에서 Node를 내려받는다. **사내망(폐쇄망)이면**
`<nodeDownloadRoot>`를 사내 미러로 지정하거나, 이미 설치된 Node를 쓰도록
`installNodeAndNpm` 실행을 생략하고 로컬 Node를 참조하는 프로파일을 둔다.

```xml
<!-- pom.xml <build><plugins> 에 추가 -->
<plugin>
  <groupId>com.github.eirslett</groupId>
  <artifactId>frontend-maven-plugin</artifactId>
  <version>1.15.0</version>
  <configuration>
    <workingDirectory>frontend</workingDirectory>
    <!-- 폐쇄망: 사내 미러로 교체하거나 로컬 Node 사용 프로파일 분리 -->
    <nodeDownloadRoot>https://nodejs.org/dist/</nodeDownloadRoot>
  </configuration>
  <executions>
    <execution>
      <id>install-node-npm</id>
      <goals><goal>install-node-and-npm</goal></goals>
      <configuration>
        <nodeVersion>v20.18.0</nodeVersion>
      </configuration>
    </execution>
    <execution>
      <id>npm-install</id>
      <goals><goal>npm</goal></goals>
      <configuration><arguments>install</arguments></configuration>
    </execution>
    <execution>
      <id>npm-build</id>
      <goals><goal>npm</goal></goals>
      <phase>prepare-package</phase>
      <configuration><arguments>run build</arguments></configuration>
    </execution>
  </executions>
</plugin>
```

## 5. 화면 와이어프레임

### 인터페이스 목록 (InterfaceList)
```
┌ IF Studio ────────────────────────────────────────────────┐
│ [대시보드] [인터페이스] [실행이력] [장애큐] [산출물] [설정]      │
├────────────────────────────────────────────────────────────┤
│ 인터페이스                              [+ 신규] [템플릿에서 생성]│
│ 검색[________]  소스[전체▾] 타겟[전체▾] 채널[전체▾] 사용[전체▾]  │
├──────────┬─────────────┬────────────┬────────┬──────┬───────┤
│ IF ID    │ 이름        │ 흐름        │ 주기    │ 최근  │       │
├──────────┼─────────────┼────────────┼────────┼──────┼───────┤
│ DEMO_BILL│ 빌링→ERP    │ BILLING▶DZ │ 매분    │ ●성공 │[편집][복제]│
│ DAOU_APPR│ 결재→다우   │ BILLING▶DAOU│ 수동   │ ●대기 │[편집][복제]│
└──────────┴─────────────┴────────────┴────────┴──────┴───────┘
```

### 정의 편집기 (InterfaceEditor) — 탭 구성
```
┌ 인터페이스 편집: DEMO_BILL_001 ───────────── [저장] [시험실행] [취소] ┐
│ (기본정보) (소스) (타겟) (필드매핑) (테스트)                          │
├────────────────────────────────────────────────────────────────────┤
│ [기본정보 탭]                                                        │
│  IF ID*     [DEMO_BILL_001]  (수정 시 잠금)                          │
│  이름*      [빌링→ERP 매출전표]                                       │
│  소스 시스템 [BILLING]   타겟 시스템 [DOUZONE]                        │
│  주기(cron) [0 * * * * ?]  ⓘ유효  중복키 [BILL_NO]  사용 [Y/N]        │
│  설명       [__________________________]                             │
│                                                                      │
│ [소스 탭] — 채널유형에 따라 폼 전환                                    │
│  채널유형  (DB) REST FILE SOCKET                                     │
│  datasource[local▾]                                                  │
│  query     [SELECT ... WHERE IF_FLAG='N']         [컬럼 추출]        │
│  markQuery [UPDATE ... SET IF_FLAG='Y' WHERE ...]                    │
│  └ [JSON 원문 보기/편집] 토글                                         │
│                                                                      │
│ [필드매핑 탭] — 그리드                                                │
│  순서│ 소스필드 │ 타겟필드 │ 변환룰            │        │             │
│   1  │ BILL_NO  │ SLIP_NO  │ (없음)           │ [삭제]  │             │
│   2  │ BILL_YMD │ SLIP_DT  │ DATEFMT:...>...   │ [삭제]  │             │
│   +  │ [매핑 자동 초안]  [행 추가]                                     │
│      │ 미리보기: {BILL_NO:B001,...} → {SLIP_NO:B001,...}              │
└──────────────────────────────────────────────────────────────────────┘
```

편집기 원칙: 개발자 대상이므로 **폼 ↔ JSON 원문 토글**을 항상 제공. 폼으로 편하게 하되,
복잡한 설정은 JSON을 직접 만질 수 있게. 저장 시 양쪽을 동기화.

## 6. 프론트 컴포넌트 계획 (P1 범위)

- `pages/InterfaceList` : 목록 + 필터 + 신규/복제 진입
- `pages/InterfaceEditor` : 탭 컨테이너 + 저장/검증 오케스트레이션
- `components/editor/BasicTab` : 마스터 기본필드 + cron/JSON 인라인 검증 표시
- `components/editor/SourceTab`·`TargetTab` : 채널유형별 폼 + JSON 토글
- `components/editor/MappingTab` : 매핑 그리드(행 추가/삭제/정렬) + 변환 미리보기(로컬 계산)
- `components/common/StatusBadge`, `JsonEditor`(textarea+검증), `ChannelForm`
- `api/interfaces.ts` : list/get/create/update/remove/clone 타입드 호출
- 라우팅: `/` 대시보드, `/interfaces` 목록, `/interfaces/new`, `/interfaces/:id` 편집

상태관리는 P1 규모에선 로컬 상태 + fetch로 충분(전역 스토어 불필요). 데이터 패칭은
가벼운 커스텀 훅 또는 TanStack Query 중 택1 — 목록/상세만이라 커스텀 훅으로 시작 권장.

## 7. Claude Code 착수 태스크 (P1)

순서대로 진행 권장:

1. **백엔드 DTO + CRUD API**: `dto/InterfaceDetailDto`, `InterfaceAdminController`
   (GET상세/POST/PUT/DELETE/clone) + 검증 로직. 기존 리포지토리 재사용.
2. **SPA 라우팅 fallback**: `SpaForwardController`.
3. **프론트 스캐폴드 확인**: `frontend/`의 package.json·vite.config·tsconfig (P1에서 생성됨). `npm install` → `npm run dev`로 백엔드 연동 확인.
4. **목록 화면**: `InterfaceList` + `api/interfaces.ts`.
5. **편집기**: `InterfaceEditor` + 탭 4종. 저장/검증/인라인 에러.
6. **빌드 통합 검증**: `mvn package`로 jar 하나에 프론트 포함되는지 확인(폐쇄망 Node 이슈는 4장 주의 참고).
7. 기존 `static/index.html`(레거시 대시보드)은 SPA가 대시보드 화면 파리티에 도달하면 대체/제거.

## 8. P1 완료 기준 (DoD)

- SQL 없이 화면에서 인터페이스 신규 등록·수정·복제·비활성이 된다.
- 저장 시 서버 검증(JSON/cron/매핑)이 동작하고 편집기에 인라인 에러가 표시된다.
- 저장 후 스케줄에 반영된다(대시보드 [실행] 및 주기실행 확인).
- `mvn package` 산출 jar 하나로 프론트+백엔드가 함께 뜬다.
