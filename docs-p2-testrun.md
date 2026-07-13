# P2: 시험실행 · 자동 매핑 초안

## 개요
편집기에서 저장 없이 실제 소스 1건을 가져와 매핑·타겟까지 검증하는 기능. 백엔드 엔드포인트
하나(`POST /api/interfaces/test-run`)를 두 화면 기능이 공유한다.

- **필드매핑 탭 "자동 매핑 초안"**: 소스 쿼리를 실행해 컬럼명만 뽑아, 아직 매핑 안 된 컬럼을
  1:1(같은 이름) 매핑 행으로 채워준다. 사람이 타겟필드명·변환룰을 다듬는 시작점.
- **테스트 탭 "시험실행"**: 컬럼 + 실제 1건 값 + 매핑 변환 결과 + 타겟 미리보기(REST 바디 조립
  또는 DB 바인딩 파라미터)까지 한 번에 보여준다.

## 안전 설계
- **절대 실전송/실적재하지 않는다.** REST는 dryRun 설정과 무관하게 바디만 조립해 보여주고, 실제
  HTTP 호출은 하지 않는다. DB 타겟도 INSERT를 실행하지 않고 바인딩될 값만 보여준다.
- **소스 조회는 항상 1건으로 캡핑**: `JdbcTemplate.setMaxRows(1)`을 사용해 사용자의 쿼리에
  LIMIT/ROWNUM이 없어도(대량 쿼리여도) DB 방언 관계없이 안전하게 1건만 가져온다.
- **결과 0건이어도 컬럼은 확인 가능**: `ResultSetMetaData`로 컬럼명을 먼저 읽으므로, 소스에
  데이터가 아직 없어도 자동 매핑 초안은 동작한다.
- **시크릿 마스킹**: REST 미리보기 바디에서 clientSecret/token/password는 `****`로 마스킹
  (서버가 최종 마스킹 처리; 프론트 로컬 미리보기와 동일 규칙 유지).
- 저장 여부와 무관하게 동작(신규 등록 중에도 사용 가능) — 요청 바디가 전체 정의(master+mappings)라
  DB에 저장된 IF_ID가 없어도 된다.

## 제약 (현재)
- 소스는 **DB 타입만 지원**. REST/FILE/SOCKET 소스는 어댑터 미구현이라 명확한 에러 메시지로 안내.
- 타겟 미리보기는 DB/REST만 지원. FILE/SOCKET 타겟은 "미구현" 안내만.

## API
```
POST /api/interfaces/test-run
Body: InterfaceDetailDto (master + mappings, 저장 여부 무관)
Response: TestRunResultDto
  { columns: string[], sampleRow, mappedRecord, targetPreview: {type, body?, bindParams?, dryRun?, note?}, warnings: string[] }
```

## 검증
- 핵심 로직(시크릿 마스킹 정규식, mergeParams 우선순위, form-urlencoded null 제외, 결과0건 판단)을
  순수 Java로 10종 단위검증 통과 (`/tmp/keep/TestRunLogicTest.java` 참고용, 레포 미포함).
- 프론트 tsc+vite 빌드 통과. 목업 API로 화면 렌더 스크린샷 확인
  (필드매핑 탭 자동초안 버튼, 테스트 탭 실행 전/후 실제값 표시).
- 이 개발환경은 Maven Central 차단으로 백엔드 실제 DB 조회는 미검증 — 사내망에서
  `./mvnw spring-boot:run` 후 데모 인터페이스(DEMO_BILL_001)로 시험실행 버튼 눌러 확인 필요.
