# Quickstart: 대문 접근성·진입 플로우 정비

**Feature**: `064-landing-access-flow` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

각 User Story의 회귀 케이스와 실행 증거를 기록한다. 시각·터치 항목은 로컬 렌더 불가(os=linux)로 실기기/스크린샷을 정본으로 하되, 라우팅·표시·카피 로직은 자동 테스트로 가드한다.

## US1 — 로그인 사용자도 대문을 본다

### Scenario US1-1: 로그인 상태 루트 진입 시 대문 표시

로그인 세션으로 `/`에 진입하면 `/trips`로 리다이렉트되지 않고 대문이 렌더된다.

### Scenario US1-2: 로그아웃 상태 루트 진입 시 대문 표시(회귀 없음)

세션 없이 `/`에 진입하면 이전과 동일하게 대문이 렌더된다.

### Scenario US1-3: 로고 클릭 시 대문 이동

상단 로고는 `href="/"`이며, 리다이렉트 제거로 로그인 사용자도 대문에 도달한다.

### Evidence

- 자동 테스트: `tests/app/landing-access.test.tsx` (로그인·로그아웃 세션 목킹 → `page.tsx`가 `redirect`를 호출하지 않고 `LandingPage`를 렌더하는지 검증)
- 수동 체크리스트:
  - [ ] 실기기: 로그인 상태로 루트 진입 시 대문 표시 확인
  - [ ] 실기기: 여행 목록에서 로고 클릭 시 대문 이동 확인
- 스크린샷: `docs/evidence/064-landing-access-flow/us1-*.png` (실기기 검증 시)

## US2 — 로그인 후 여행 목록으로 이동

### Scenario US2-1: 목적지 미지정 로그인의 기본 목적지

`callbackUrl`이 없으면 로그인 후 목적지는 `/trips`다.

### Scenario US2-2: 목적지 지정 로그인의 복귀

`callbackUrl`이 있으면 그 경로로 복귀한다(기존 동작 유지).

### Evidence

- 자동 테스트: `tests/app/signin-redirect.test.tsx` (`searchParams` 유무에 따른 `redirectTo` 값 검증)
- 수동 체크리스트:
  - [ ] 실기기: 대문 "시작하기" → 로그인 → 여행 목록 도착 확인
- 스크린샷: 해당없음 (자동 테스트로 대체)

## US3 — 로그인 사용자용 대문 진입 유도

### Scenario US3-1: 로그인 상태 CTA는 "여행 목록으로"

로그인 상태에서 Hero·BottomCta 주 CTA가 `/trips`를 가리키는 "여행 목록으로"다.

### Scenario US3-2: 로그아웃 상태 CTA는 "시작하기"

로그아웃 상태에서 주 CTA가 `/auth/signin?callbackUrl=/trips`를 가리키는 "시작하기"다.

### Scenario US3-3: 로그인 상태에서 로그아웃 전제 문구 제거

BottomCta 본문의 "1초 로그인" 류 문구가 로그인 상태에서 노출되지 않는다.

### Evidence

- 자동 테스트: `tests/components/landing-cta.test.tsx` (`isLoggedIn` prop 분기로 Hero·BottomCta의 CTA 라벨·href·본문 검증)
- 수동 체크리스트:
  - [ ] 실기기: 로그인 상태 대문 CTA "여행 목록으로" 표시·이동 확인
- 스크린샷: `docs/evidence/064-landing-access-flow/us3-*.png` (실기기 검증 시)

## US4 — 랜딩 중복 "할 수 있다" 섹션 통합

### Scenario US4-1: 최상위 소개 섹션은 1개

대문에 "할 수 있다" 취지의 최상위 섹션이 하나만 존재한다.

### Scenario US4-2: 고유 가치 항목 보존

통합 전 두 섹션이 전하던 고유 항목(3계층 관리·현지 시간·Apple 캘린더·한 줄 설치·통화 합산)이 통합 후에도 존재한다.

### Evidence

- 자동 테스트: `tests/unit/landing-content.test.ts` (통합 카드 데이터에 고유 항목 문자열이 모두 포함되는지 검증) + `tests/components/landing-sections.test.tsx` (LandingPage 렌더 시 소개 섹션 헤딩이 1개, 카드 제목이 `h3`인지 검증)
- 수동 체크리스트:
  - [ ] 실기기: 대문 스크롤 시 소개 섹션 중복 없음 확인
- 스크린샷: `docs/evidence/064-landing-access-flow/us4-*.png` (실기기 검증 시)
