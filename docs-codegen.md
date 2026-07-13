# 소스 코드 생성기

## 목적
Interface Studio에 등록한 인터페이스 정의를 실제 백엔드 소스코드로 뽑아낸다.
편집기의 **[코드생성]** 탭.

## 생성 종류 (선택)

### 1. 연동 코드 (INTEGRATION)
이 인터페이스와 **동일하게 동작하는 코드**. IF 엔진 없이 앱 안에서 직접 실행하는 용도.
- `{Class}Vo.java` — 소스 컬럼 기준 VO (JDBC 타입 → Java 타입 자동 매핑)
- `{Class}Service.java` — 수집 → 변환 → 전송 → 처리표시. 매핑 정의가 `transform()` 코드로 풀림
- `{Class}Dao.java` + `{Class}Mapper.xml` — MyBatis
- `{Class}Sender.java` — 타겟이 REST일 때만 (인증은 @Value로 주입, 하드코딩 안 함)
- `DateUtils.java` — **DATEFMT 룰을 쓰면 자동 포함** (없으면 컴파일이 안 되므로)

### 2. CRUD 스캐폴드 (CRUD)
소스 테이블 기준 Controller/Service/DAO/VO/Mapper 한 벌. 업무 화면 기본 골격.
- 쿼리의 `FROM` 절에서 테이블명을 추출한다.
- **첫 컬럼을 PK로 가정**한다 (Mapper XML에 경고 주석 있음 — 실제 PK로 수정 필요).

## 변환룰 → Java 코드
엔진 룰이 실행 가능한 코드로 풀린다:

| 룰 | 생성 코드 |
|---|---|
| (없음) | `src.getBillNo()` |
| `CONST:01` | `"01"` |
| `DEFAULT:00` | `src.getX() != null ? src.getX() : "00"` |
| `DATEFMT:yyyyMMdd>yyyy-MM-dd` | `DateUtils.reformat(src.getBillYmd(), "yyyyMMdd", "yyyy-MM-dd")` |
| `CODEMAP:TAX` | `codeMapService.convert("TAX", src.getX())` ※ 서비스는 직접 구현 필요 |
| 모르는 룰 | 원본 getter + `// TODO: 변환룰 확인 필요` 주석 |

## ⚠️ 캐모마일 대응 (중요)
**현재는 표준 스프링 템플릿이다.** 롯데정보통신 캐모마일 프레임워크 샘플이 없어서 그 규약을 모른다.
추측으로 만들면 컴파일도 안 되는 코드가 나오므로 표준 스프링으로 먼저 만들었다.

**설계상 나중에 캐모마일로 바꾸기 쉽게 되어 있다:**
- `CodeGenService`는 "무엇을 만들지"(클래스명·필드·타입·매핑식)만 계산한다. **프레임워크 중립.**
- "어떻게 생겼는지"는 `resources/codegen/spring/*.tpl` 템플릿이 결정한다.
- → 캐모마일 샘플을 받으면 **`resources/codegen/chamomile/` 폴더만 추가**하면 된다.
  `CodeGenService` 자바 코드는 손댈 필요 없다. (요청의 `framework` 파라미터로 선택)

받아야 할 샘플: 전형적인 CRUD 한 벌 (Controller + Service + DAO/Mapper + VO + XML).
그걸 보고 패키지 구조·네이밍·어노테이션·상속 관계를 템플릿에 반영한다.

## API
```
POST /api/codegen/preview   → { "경로/파일명": "내용", ... }
POST /api/codegen/download  → zip 바이너리
Body: { definition: {master, mappings}, kind: INTEGRATION|CRUD, framework: "spring", basePackage: "com.x.y" }
```
저장 여부와 무관하게 동작 (편집 중인 정의로도 생성 가능).

## 제약
- **DB 소스만 지원**. 소스 컬럼 정보(이름·타입)를 읽어야 VO를 만들 수 있기 때문.
- 생성 코드는 **시작점**이지 완성품이 아니다. 트랜잭션 경계·에러 처리·재시도 정책은 업무 요건에 맞게
  검토·보완해야 한다. 코드 안에 TODO로 표시해 둠.

## 검증
- 이름변환(BILL_NO→billNo)·JDBC타입매핑·테이블추출·변환룰→Java 21종 통과
- 템플릿 렌더러(Mustache 서브셋: 변수/raw/리스트/조건/부정조건) 11종 통과
- cleanup(빈줄 정리)이 코드를 손상시키지 않는지 8종 통과
- 실제 템플릿 렌더링 결과 육안 확인: 컴파일 가능한 형태, 미치환 태그 0개, 한글 주석 정상
- 프론트 빌드 통과 + 목업 백엔드로 화면 렌더 확인 (5개 파일 생성, DateUtils 자동 포함)
- ⚠️ 이 개발환경은 Maven Central 차단으로 **생성 코드의 실제 컴파일은 미검증**. 사내망에서 확인 필요.
