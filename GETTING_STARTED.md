# Claude Code로 이어서 작업하기

이 프로젝트를 Claude Code에서 열어 이어받는 절차.

## 1. 준비

```bash
# 압축 푼 폴더로 이동
cd if-engine

# git 초기화 (아직 안 했다면)
git init
git add .
git commit -m "IF Engine 초기 골격: 엔진 코어 + DB/REST 어댑터 + 대시보드"
```

## 2. Claude Code 실행

```bash
# 프로젝트 폴더 안에서
claude
```

Claude Code가 열리면 루트의 `CLAUDE.md`를 자동으로 컨텍스트에 넣는다.
이 파일에 프로젝트 구조, 규약, 작업 백로그(T1~T6)가 정리되어 있다.

## 3. 첫 지시 예시

Claude Code에게 이렇게 시작하면 된다:

> CLAUDE.md 읽고 현재 프로젝트 상태 파악해줘. 그다음 T1(JUnit 테스트 편입)부터 진행해줘.

또는 바로 원하는 작업으로:

> T2 인터페이스 관리 UI 만들어줘. IF_MASTER/IF_MAPPING CRUD API랑 편집 화면.

> T3 모뎀 소켓 어댑터 붙이자. 전문 포맷은 내가 스펙 줄게.

## 4. 작업 중 확인

```bash
# 빌드 & 실행 (Maven 미설치 환경이면 ./mvnw 사용)
./mvnw spring-boot:run      # 또는 mvn spring-boot:run
# http://localhost:8080 에서 대시보드 확인

# 테스트 (T1 완료 후)
./mvnw test                 # 또는 mvn test
```

> Maven이 안 깔려 있어도 프로젝트에 포함된 Maven Wrapper(`./mvnw`, 윈도우는 `mvnw.cmd`)로
> 빌드할 수 있다. 최초 1회 Maven 배포본 다운로드가 필요한데, 사내망에서 막히면
> `.mvn/wrapper/maven-wrapper.properties`의 `distributionUrl`을 사내 Nexus/미러로 바꾸면 된다.

## 백로그 요약 (상세는 CLAUDE.md)

- **T1** JUnit 테스트 정식 편입 ← 먼저 권장 (지금까지 검증은 순수 Java 스니펫뿐, 회귀망 없음)
- **T2** 인터페이스 정의 관리 UI (스튜디오) — **대부분 완료**: 편집기 5탭+코드생성 탭, CRUD API,
  시험실행/자동매핑, API 테스터+가져오기, 3D 대시보드. **⬜ 사내망에서 실제 빌드/구동 미검증** (아래 "빠른 시작" 필수)
- **T3** 소켓 어댑터 (모뎀/열량 검침) — 미착수, 전문 포맷 스펙 필요
- **T4** CODEMAP 코드매핑 — 미착수
- **T5** NotifyService 실연동 (메일/다우 알림) — 미착수
- **T6** 운영 배포 (jar, systemd, Quartz jdbc) — 미착수

캐모마일 소스 제너레이터: 표준 스프링 템플릿으로 만들어둠. 실제 캐모마일 샘플 소스
(Controller/Service/DAO/VO/XML 한 벌) 받으면 `resources/codegen/chamomile/` 템플릿 추가할 것.

## 주의

- DB 확정 전까지는 내장 H2로 돌아간다. 실 DB 전환은 CLAUDE.md의 "실 DB 전환" 참고.
- 다우 clientSecret 등 시크릿은 환경변수로. 코드/DB에 평문 금지.
- 새 연동은 코드가 아니라 IF_MASTER 등록으로 처리되게 (설정 주도 원칙 유지).
