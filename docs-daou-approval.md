# 다우오피스 전자결재 기안 연동 가이드

이 문서는 REST 어댑터로 **다우오피스 전자결재 기안**을 붙이는 방법을 정리한다.
엔진은 이미 REST 어댑터(`RestTargetAdapter`)를 포함하며, 인터페이스 추가는 코드 수정 없이
`IF_MASTER` / `IF_MAPPING` 등록만으로 끝난다. 데모 인터페이스 `DAOU_APPR_001`이 포함되어 있다.

## 알아둘 다우 API 특성

이 세 가지 때문에 REST 어댑터를 "설정 주도"로 설계했다.

1. **DOAS 서버로 호출** — 고객사 그룹웨어 URL이 아니라 `https://api.daouoffice.com`으로 보낸다.
   TGT_CONFIG의 `url`을 반드시 이 도메인으로 잡을 것.
2. **form-urlencoded** — 전자결재 기안은 `application/x-www-form-urlencoded` (모바일 본문저장은 multipart).
   어댑터의 `bodyType: "FORM"`이 이걸 처리한다.
3. **리턴값 없음** — 기안 API는 응답 본문이 없다. 검증은 다우 관리자(Site admin)의
   "전자결재 연동로그" 화면에서 한다. 어댑터는 HTTP 2xx면 성공으로 간주한다.

## 진행 순서

### 1단계 — 인증키 발급 (지금 해야 할 일)
다우오피스 관리자 > 통합설정 > 시스템 연동에서 연동을 활성화하고 **인증키(clientId/clientSecret)**를 발급받는다.
발급 전까지는 데모처럼 `dryRun: true`로 두고 매핑·필드 흐름을 먼저 완성하면 된다.

### 2단계 — 결재 양식(연동 서식) 준비
연동할 결재양식을 다우에서 만들고 `formId`를 확보한다. 본문 연동 태그(예: 제목 태그)는
다우의 전자결재 양식 설정 가이드를 따른다. 이 `formId`가 IF_MAPPING의 타겟 필드로 들어간다.

### 3단계 — 실전송 전환
키가 나오면:
1. 환경변수 설정 (시크릿은 DB에 넣지 않는다)
   ```bash
   export DAOU_CLIENT_ID=발급받은_clientId
   export DAOU_CLIENT_SECRET=발급받은_clientSecret
   ```
2. `IF_MASTER.TGT_CONFIG`에서 `dryRun`을 `false`로, `url`을 발급 스펙의 실제 기안 엔드포인트로 변경
3. `POST /api/admin/reload-jobs` (스케줄 인터페이스인 경우) 또는 대시보드 [실행]으로 재전송

## TGT_CONFIG 필드 설명

| 필드           | 설명                                                        |
|----------------|-------------------------------------------------------------|
| url            | DOAS 기안 엔드포인트 (`https://api.daouoffice.com/...`)       |
| method         | 보통 POST                                                   |
| bodyType       | `FORM`(기안) 또는 `JSON`(Works 등)                          |
| charset        | UTF-8                                                        |
| dryRun         | true면 실제 전송 없이 "보낼 요청"만 로그 (키 미발급 단계용)   |
| auth.in        | `BODY`(기안: 바디에 clientId 등 포함) 또는 `HEADER`          |
| auth.fields    | 인증 필드. `${ENV}` 문법으로 환경변수 주입                   |
| constParams    | 매 요청 고정값 (productName, clientCompanyName 등)          |

> `${DAOU_CLIENT_SECRET}` 같은 시크릿은 환경변수/프로퍼티에서 읽으며,
> dryRun 로그에서도 secret/token/password는 `****`로 마스킹된다.

## 필드 매핑 (IF_MAPPING)

소스 결재요청 테이블의 컬럼을 다우 기안 파라미터로 매핑한다.
**TGT_FIELD 이름은 발급받은 연동 스펙의 실제 파라미터명에 맞춰 조정**하면 된다.
데모 매핑:

| SRC_FIELD | TGT_FIELD    | 의미              |
|-----------|--------------|-------------------|
| DRAFTER   | drafterId    | 기안자 사번        |
| FORM_ID   | formId       | 연동 결재양식 ID   |
| TITLE     | title        | 문서 제목          |
| CONTENT   | docBody      | 본문               |
| REQ_NO    | externalKey  | 외부 문서 식별키   |

## dryRun 로그 예시

키 없이 데모(`DAOU_APPR_001`)를 실행하면 콘솔에 실제 전송될 요청이 찍힌다:

```
[REST dryRun] POST https://api.daouoffice.com/public/approval/draft
  headers={}
  body=productName=OurServiceIF&clientCompanyName=우리회사&clientId=&clientSecret=****&drafterId=E1001&formId=FORM_LEAVE&title=연차+신청서+-+홍길동&docBody=...&externalKey=AP20260710001
```

이 상태에서 매핑이 맞는지 검수한 뒤, 키를 넣고 dryRun을 끄면 그대로 실전송된다.

## 다른 다우 기능으로 확장

같은 REST 어댑터로 커버된다. 새 IF_MASTER만 등록:
- **Works 데이터 등록** : `bodyType: JSON`, `url: https://api.daouoffice.com/public/v1/works`,
  auth 필드에 clientId/clientSecret/token
- **알림/근태** : 각 기능 엔드포인트 + 스펙에 맞는 파라미터 매핑
