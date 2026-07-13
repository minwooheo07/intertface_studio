# 백엔드 CRUD API 검증 가이드

편집기 백엔드(`InterfaceAdminController`)가 붙었다. 사내망(Maven Central 접근 가능 환경)에서
아래 순서로 동작을 확인한다. 이 개발환경은 의존성 다운로드가 막혀 전체 빌드가 안 되므로,
검증은 사내망에서 수행한다.

## 0. 기동

```bash
./mvnw spring-boot:run
# http://localhost:8080
```

## 1. 상세 조회 (기존 데모 인터페이스)

```bash
curl -s localhost:8080/api/interfaces/DEMO_BILL_001 | jq
# { "master": {...}, "mappings": [ ... ] } 형태 확인
```

## 2. 신규 등록

```bash
curl -s -X POST localhost:8080/api/interfaces \
  -H 'Content-Type: application/json' \
  -d '{
    "master": {
      "ifId": "TEST_IF_001", "ifName": "테스트 인터페이스",
      "srcSystem": "BILLING", "tgtSystem": "DOUZONE",
      "srcType": "DB", "tgtType": "DB",
      "srcConfig": "{\"datasource\":\"local\",\"query\":\"SELECT 1 AS A\"}",
      "tgtConfig": "{\"datasource\":\"local\",\"insertQuery\":\"INSERT INTO T (A) VALUES (:A)\"}",
      "cronExpr": null, "dupKeyCols": "A", "useYn": "Y", "description": "curl 테스트"
    },
    "mappings": [
      { "srcField": "A", "tgtField": "A", "transformRule": null, "sortOrder": 1 }
    ]
  }' | jq
# 201 + 저장된 상세 반환. 이후 GET /api/interfaces 목록에 노출되는지 확인.
```

## 3. 검증 실패 확인 (400 + 필드 에러)

```bash
# 소문자 ID + 이름 누락 + 타겟필드 누락 → 400
curl -s -X POST localhost:8080/api/interfaces \
  -H 'Content-Type: application/json' \
  -d '{"master":{"ifId":"bad id","ifName":"","srcType":"DB","tgtType":"DB"},
       "mappings":[{"srcField":"","tgtField":"","transformRule":null}]}' | jq
# { "message": "...", "errors": [ {"field":"ifId",...}, {"field":"ifName",...}, ... ] }
```

## 4. 수정 / 복제 / 삭제

```bash
# 수정 (매핑 전체 치환)
curl -s -X PUT localhost:8080/api/interfaces/TEST_IF_001 \
  -H 'Content-Type: application/json' -d '{ ...상세... }' | jq

# 복제 (비활성 상태로 생성)
curl -s -X POST localhost:8080/api/interfaces/TEST_IF_001/clone \
  -H 'Content-Type: application/json' \
  -d '{"newIfId":"TEST_IF_002","newIfName":"복제본"}' | jq

# 소프트 비활성 (useYn=N)
curl -s -X DELETE localhost:8080/api/interfaces/TEST_IF_002
# 물리 삭제
curl -s -X DELETE 'localhost:8080/api/interfaces/TEST_IF_002?hard=true'
```

## 5. 편집기 연동 확인 (E2E)

1. 개발 모드: 백엔드 `./mvnw spring-boot:run` + 프론트 `cd frontend && npm run dev`
2. http://localhost:5173/interfaces/new 에서 폼 작성 → [저장]
3. 목록(`/interfaces`)에 반영되는지, 다시 편집 진입 시 값이 로드되는지 확인
4. 저장 시 검증 실패를 유도해 탭에 에러 표시(빨간 점)와 인라인 메시지가 뜨는지 확인

## 검증 규칙 (서버·프론트 동일)

- `ifId`: 필수, 신규 시 `^[A-Z0-9_]{1,30}$`, 유일
- `ifName`: 필수
- `srcType`/`tgtType`: DB|REST|FILE|SOCKET
- `cronExpr`: 있으면 Quartz 유효성 (서버는 `CronExpression.isValidExpression`)
- `srcConfig`/`tgtConfig`: 유효한 JSON
- 매핑: `tgtField` 필수·유일(대소문자 무시), `srcField`는 `CONST:` 룰 아니면 필수

주의: 서버 검증이 최종이다. 프론트 `validation.ts`와 규칙을 항상 함께 유지할 것.
