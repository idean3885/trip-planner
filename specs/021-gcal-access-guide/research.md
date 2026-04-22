# Research — 021 구글 캘린더 권한 제약 감지·안내

**Created**: 2026-04-22
**Scope**: plan.md Phase 0 산출물. 미결 결정 해소.

## Decision 1 — 감지 지점 이중화 (콜백 + API 호출)

- **Decision**: OAuth 콜백의 `error=access_denied` 쿼리와 Calendar API 호출 시 403 응답 **두 지점**에서 모두 포착한다. 귀결 상태는 동일한 `UNREGISTERED`로 정규화.
- **Rationale**: Test user 등록 전 신규 사용자는 콜백 경로에서, 등록 해제된 기존 사용자는 API 호출 경로에서 거부된다. 한 지점만 감지하면 케이스 누락.
- **Alternatives considered**:
  - 클라이언트 URL 파라미터 감지 — 신뢰 경계 문제, 조작 가능성.
  - API 호출 경로만 감지 — 신규 사용자 케이스(콜백에서 이미 차단) 누락.

## Decision 2 — 상태 전달 수단 (단기 쿠키 + 응답 필드)

- **Decision**: 콜백 경로는 **httpOnly 쿠키 플래그**(`gcal-unregistered`, TTL 10분)에 기록하고 다음 `/status` 조회에서 응답에 `{ unregistered: true }`로 노출. API 호출 경로는 해당 **에러 응답 본문**에 `{ error: "unregistered" }` 직접 추가.
- **Rationale**: 쿠키 플래그는 클라이언트가 Lang round-trip 한 번으로 소비 가능. DB 변경 없음.
- **Alternatives considered**:
  - DB에 영속 플래그 — 심사 상태는 앱 레벨 외부 속성이라 사용자 레코드에 영속화하는 것은 부적절.
  - 쿼리스트링 전달(`?gcal=unregistered`) — URL 공유 시 오염 가능, 신뢰 경계 약함.

## Decision 3 — GitHub Discussions 링크 형식

- **Decision**: 프리필 URL — `https://github.com/idean3885/trip-planner/discussions/new?category=q-a&title=<프리필>&body=<프리필>`. body에 "가입 Google 이메일: ___" 빈칸 힌트. 로그인 계정 이메일 **자동 프리필하지 않음**.
- **Rationale**: GitHub이 공식 지원하는 프리필 파라미터. 사용자가 공개 범위(공개 리포이므로 댓글 내용은 전원에게 노출)를 인식하고 직접 작성하게 둔다.
- **Alternatives considered**:
  - 이메일 자동 프리필 — 개인정보 경계. 사용자가 예상치 못한 노출 위험.
  - 이슈(bug) 템플릿 — 카테고리 불일치(Test user 요청은 질문이지 버그 아님).

## Decision 4 — 사전 고지 블록 배치

- **Decision**: 랜딩(`src/app/page.tsx`) + README 두 군데 모두. FR-005는 "최소 하나"지만 비용 낮아 양쪽 커버.
- **Rationale**: 도달 경로가 다른 두 사용자군(신규 일반 사용자 vs GitHub 방문자)을 모두 커버.
- **Alternatives considered**:
  - 랜딩만 — README 방문자(개발자·포트폴리오 관찰자) 놓침.
  - README만 — 앱에서 랜딩으로 들어온 신규 사용자 놓침.
  - 설정 페이지 — 기능 시도 전 도달률 낮음.

## Decision 5 — ADR 0004 배치·범위

- **Decision**: `docs/adr/0004-gcal-testing-mode-cost.md`. 제목 "Google OAuth Testing 모드 유지 — 심사 비용이 가장 큰 유보 이유". 본 피처 PR에 포함.
- **Rationale**: 현재 결정 근거는 `src/types/gcal.ts` 코드 주석 한 곳뿐. "왜 심사 안 올리고 있는가?" 질문이 v2.10+·대체 provider 검토 시점에 다시 나올 것이 확실. ADR 0002 Minimum Cost 원칙의 구체 적용 사례로 고정.
- **Alternatives considered**:
  - README에 긴 설명 — 규범적 결정과 설치 가이드가 뒤섞여 찾기 어려움.
  - 블로그 포스트 — 외부 독자 대상, 내부 규범 정본 부적절.

## Decision 6 — 안내 카드 구조

- **Decision**: spec 020의 "비-주인 미연결" 다이얼로그 패턴 재사용. 트리거 버튼(outline sm + Calendar 아이콘) → 다이얼로그 내부에 **설명문 + 단일 "개발자에게 문의(Discussions)" 버튼(외부 링크 아이콘 수반) + "닫기"**. 역할 3종(주인·호스트·게스트) 모두 동일 구조.
- **Rationale**: 일관성(FR-006). spec 020이 검증한 패턴을 재사용해 디자인·접근성·모바일 대응을 상속.
- **Alternatives considered**:
  - 토스트만 — 사후 즉시 사라져 "해결 경로" 전달 실패.
  - 인라인 배너 — 공간 차지 + 닫기 UX 복잡.

## Open Questions

없음. Phase 1 진행 가능.
