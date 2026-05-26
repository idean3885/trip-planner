# Quickstart: 데스크탑·모바일 반응형 근본 대응

**Feature**: `026-responsive-layout` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 spec의 각 User Story가 데스크탑·모바일 양쪽에서 의도대로 동작하는지를 검증하는 시나리오를 정의한다. 자동 테스트는 컴포넌트 단위 검증 + Style Dictionary 빌드 self-test로 두고, 시각 비교는 수동 체크리스트로 한다(자동 비주얼 회귀는 ROI 부족, 별도 이슈로 후속).

## 토큰 SSOT — US2 (디자인 시스템 토큰)

### Scenario T-1: 토큰 키 정식화

- `src/app/globals.css` 의 `@theme` 블록(또는 동등 위치)에 `--bp-mobile / --bp-tablet / --bp-desktop / --bp-wide`, `--container-narrow / --container-content / --container-wide`, `--grid-gap-tight / --grid-gap-comfy` 토큰이 정의된다.
- `tokens/` (Style Dictionary 소스) 가 동일 키를 export한다.

### Scenario T-2: 페이지가 토큰만 참조

- `src/app/trips/page.tsx`, `src/app/trips/[id]/page.tsx`, `src/components/GCalLinkPanel.tsx`, `src/components/NavBar.tsx`(또는 동등 헤더)가 컨테이너 max-width·grid·gap 클래스를 토큰 매핑 클래스로만 참조 — `grep`으로 임의 px·`max-w-[1234px]` 잔존 0건.

### Evidence

- 자동 테스트: `npx vitest run tests/lib/tokens/tokens-presence.test.ts` (토큰 키 존재·값 sanity 5케이스).
- 수동 체크리스트:
  - [x] T-1: `@theme` 블록에 9개 신규 키 존재 (단위 테스트 검증)
  - [x] T-2: 작업 대상 범위(`src/app/**`, `src/components/[A-Z]*.tsx`) 잔존 px 0건. vendored `src/components/ui/*` 1건 예외 — `docs/evidence/026-responsive-layout/grep-px-residual.md` 참조
- 스크린샷: 해당없음 (코드 grep 로그로 대체)

## trip 상세 다단 — US1

### Scenario D-1: 데스크탑 1440px 다단

- 브라우저 폭 1440px로 trip 상세를 연다. 좌측 본문(Day/Activity 목록)이 약 2/3, 우측 사이드(메타·멤버·캘린더)가 약 1/3. 사이드 최소 폭 280px 이상.

### Scenario D-2: 모바일 375px 단일 컬럼 (회귀)

- 브라우저 폭 375px로 동일 trip 상세를 연다. v2.12.x 스크린샷과 시각·동작 동일.

### Scenario D-3: 태블릿 900px 전환구간

- 브라우저 폭 900px. 모바일 단일 컬럼 동작 유지. 다단 미적용.

### Scenario D-4: 와이드 1920px 중앙 정렬

- 브라우저 폭 1920px. 본문 + 사이드 합산 폭이 `--container-wide`(1440px)에서 멈춤. 좌우 빈 공간 균등.

### Evidence

- 자동 테스트: `pnpm vitest run tests/app/trips/[id]` (컴포넌트 분기 클래스 존재 검증 — 데스크탑/모바일 wrapper 클래스 자체 테스트).
- 수동 체크리스트:
  - [ ] D-1: 1440px 본문/사이드 비율 시각 확인 + 한 화면 보이는 Activity 수가 모바일 대비 1.5배 이상 (SC-001)
  - [ ] D-2: 375px 스크린샷과 v2.12.x 스크린샷 diff 0
  - [ ] D-3: 900px 단일 컬럼 확인
  - [ ] D-4: 1920px에서 좌우 빈 공간이 정의된 폭 안에 머무름
- 스크린샷: `docs/evidence/026-responsive-layout/trip-detail-{375,900,1440,1920}.png`

## trip 목록 카드 그리드 — US3

### Scenario L-1: 데스크탑 1440px 다단

- 브라우저 폭 1440px로 `/trips`를 연다. 카드가 한 행에 2~3개 노출.

### Scenario L-2: 모바일 375px 단일 컬럼 (회귀)

- 브라우저 폭 375px로 동일 페이지를 연다. v2.12.x와 동일한 1열 카드.

### Evidence

- 자동 테스트: `pnpm vitest run tests/app/trips` (목록 wrapper의 grid 클래스 분기 검증).
- 수동 체크리스트:
  - [ ] L-1: 1440px에서 2열 이상 카드
  - [ ] L-2: 375px에서 1열 유지

## 캘린더 다이얼로그 폭 — US3

### Scenario G-1: 데스크탑 다이얼로그 폭

- 1440px에서 캘린더 모달을 연다. 모달 폭이 ~640–720px에서 중앙 정렬, 화면을 좌우로 끝까지 채우지 않는다.

### Scenario G-2: 모바일 다이얼로그 폭 (회귀)

- 375px에서 모달은 풀폭에 가까운 기존 동작 그대로.

### Evidence

- 자동 테스트: `pnpm vitest run tests/components/GCalLinkPanel.test.tsx` (기존 6/6 + 신규 폭 분기 1건).
- 수동 체크리스트:
  - [ ] G-1: 1440px 모달 폭 ≤720px 확인
  - [ ] G-2: 375px 모달 풀폭 확인

## ActivityForm + NavBar — US3·US4

### Scenario F-1: 데스크탑 폼 2열

- 활동 편집/생성 폼을 데스크탑(1440px)에서 연다. 라벨·입력이 2열로 정렬. 모바일은 1열 유지.

### Scenario N-1: 데스크탑 NavBar 가로 액션

- 데스크탑에서 NavBar 액션(여행 추가·계정·설정)이 가로로 노출. 모바일은 햄버거 그대로.

### Evidence

- 자동 테스트: `pnpm vitest run tests/components/ActivityForm.test.tsx tests/components/NavBar.test.tsx` (분기 클래스 존재 검증).
- 수동 체크리스트:
  - [ ] F-1: 1440px 폼 2열 + 375px 폼 1열
  - [ ] N-1: 1440px NavBar 가로 액션 + 375px 햄버거 유지

## 모바일 회귀 점검 — 묶음 E

### Scenario R-1: 작업 대상 페이지 모바일 시각 회귀

- 본 피처 작업 대상 페이지·컴포넌트 6종을 375px·414px·768px에서 v2.12.x 스크린샷과 직접 diff.

### Evidence

- 자동 테스트: 해당없음 (자동 비주얼 회귀 도구 미도입). 후속 별도 이슈에서 검토.
- 수동 체크리스트:
  - [ ] R-1: 6종 페이지 × 3 폭 = 18종 스크린샷 diff 0건 또는 의도된 변경만 확인
- 스크린샷: `docs/evidence/026-responsive-layout/regression-{page}-{width}.png`
