# Tasks: 대문 접근성·진입 플로우 정비

**Feature**: `064-landing-access-flow` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 병렬 가능(다른 파일, 미완료 의존 없음)
- **[Story]**: US1~US4 (Setup·Foundational·Polish은 라벨 없음)
- 각 산출 태스크는 `[artifact:]`와 `[why:]`를 부착해 plan Coverage Targets와 매핑

## Phase 1: Setup

- [x] T001 develop 최신 반영 확인 및 대문 관련 파일 현황 점검 (`src/app/page.tsx`, `src/components/landing/*`, `src/lib/landing-content.ts`, `src/app/auth/signin/page.tsx`, `src/middleware.ts`)

## Phase 2: Foundational

- [x] T002 기존 미들웨어 가드 확인 — 로그인 시 `/auth/*`→`/trips`, 비로그인 `/trips`→signin 이 유지되는지 검증(변경 없으면 확인만) [artifact: src/middleware.ts] [why: login-destination]

## Phase 3: US1 — 로그인 사용자도 대문을 본다 (P1)

**목표**: 로그인 시 `/`→`/trips` 강제 리다이렉트 제거, 세션 여부를 대문에 전파. **독립 테스트**: 로그인 세션 목킹 시 `page.tsx`가 `redirect`를 호출하지 않고 대문을 렌더.

- [x] T003 [US1] `page.tsx`에서 로그인 시 `redirect("/trips")` 제거하고 `auth()` 결과로 `isLoggedIn`을 산출해 `LandingPage`에 전달 [artifact: src/app/page.tsx] [why: landing-access]
- [x] T004 [US1] `LandingPage`가 `isLoggedIn` prop을 받아 하위(Hero·BottomCta)로 전파 [artifact: src/components/landing/LandingPage.tsx] [why: landing-access]
- [x] T005 [P] [US1] 대문 접근 회귀 테스트 — 로그인/로그아웃 세션 목킹으로 리다이렉트 미호출·대문 렌더 검증 [artifact: tests/app/landing-access.test.tsx] [why: landing-access]

## Phase 4: US2 — 로그인 후 여행 목록으로 이동 (P1)

**목표**: signin 기본 목적지를 `/trips`로 고정. **독립 테스트**: `callbackUrl` 미지정 시 `redirectTo`가 `/trips`.

- [x] T006 [US2] `auth/signin/page.tsx`의 `redirectTo` 기본값 `"/"` → `"/trips"` 변경(`callbackUrl` 우선 유지) [artifact: src/app/auth/signin/page.tsx] [why: login-destination]
- [x] T007 [P] [US2] signin 목적지 테스트 — `searchParams` 유무에 따른 `redirectTo` 검증 [artifact: tests/app/signin-redirect.test.tsx] [why: login-destination]

## Phase 5: US3 — 로그인 사용자용 대문 진입 유도 (P2)

**목표**: Hero·BottomCta CTA·문구를 세션 상태로 분기. **독립 테스트**: `isLoggedIn` prop별 CTA 라벨·href·본문 검증.

- [x] T008 [US3] `Hero`가 `isLoggedIn`을 받아 주 CTA 분기(로그인 "여행 목록으로"→`/trips`, 로그아웃 "시작하기"→`/auth/signin?callbackUrl=/trips`) [artifact: src/components/landing/Hero.tsx] [why: state-cta]
- [x] T009 [US3] `BottomCta`가 `isLoggedIn`을 받아 CTA·헤딩·본문 분기(로그인 시 "1초 로그인" 류 문구 제거) [artifact: src/components/landing/BottomCta.tsx] [why: state-cta]
- [x] T010 [P] [US3] 상태별 CTA 테스트 — Hero·BottomCta의 라벨·href·본문 분기 검증 [artifact: tests/components/landing-cta.test.tsx] [why: state-cta]

## Phase 6: US4 — 랜딩 중복 "할 수 있다" 섹션 통합 (P3)

**목표**: `ValueProps`·`FeatureHighlights`를 단일 섹션 4카드로 병합, 고유 항목 보존, 카드 제목 `h3` 통일. **독립 테스트**: 소개 섹션 헤딩 1개 + 고유 항목 문자열 전수 포함.

- [x] T011 [US4] `landing-content.ts` 통합 카드 데이터 정리 — 중복 제거, 고유 항목(3계층 관리·현지 시간·Apple 캘린더·한 줄 설치·통화 합산) 보존 [artifact: src/lib/landing-content.ts] [why: section-merge]
- [x] T012 [US4] 단일 소개 섹션 컴포넌트 구성 — `FeatureHighlights`를 뼈대로 통합, 헤딩 "여행 준비를 이렇게 돕습니다", 카드 제목 `h3` 통일, `LandingPage`에서 중복 컴포넌트(`ValueProps`) 제거 [artifact: src/components/landing/LandingPage.tsx|src/components/landing/FeatureHighlights.tsx] [why: section-merge]
- [x] T013 [P] [US4] 섹션 단일화·시맨틱 테스트 — 소개 섹션 헤딩 1개·카드 제목 `h3` 검증 [artifact: tests/components/landing-sections.test.tsx] [why: section-merge]
- [x] T014 [P] [US4] 통합 콘텐츠 데이터 테스트 — 고유 항목 문자열 전수 포함 검증 [artifact: tests/unit/landing-content.test.ts] [why: section-merge]

## Phase 7: Polish & Cross-Cutting

- [x] T015 quickstart Evidence 자동 테스트 전량 통과 확인 (`npx vitest run`) 및 회귀 없음
- [x] T016 UX 서브에이전트(#888)로 통합 결과 재리뷰 후 반영
- [ ] T017 towncrier 단편 작성 (release 단계에서 소비되므로 미체크 유지) [artifact: changes/889.feat.md] [why: section-merge]

## Dependencies

- Setup(T001) → Foundational(T002) → US1~US4.
- US1(T003·T004)이 세션 전파 기반이므로 US3(T008·T009)보다 선행.
- US2(T006)·US4(T011~T014)는 US1과 독립적으로 진행 가능.
- Polish(T015~T017)는 전 US 완료 후.

## Parallel Opportunities

- T005·T007·T010·T013·T014 테스트는 각 구현 완료 후 병렬 실행 가능(서로 다른 파일).
- US2와 US4는 US1과 독립 — 병렬 착수 가능.

## MVP Scope

US1(대문 접근 복구)만으로 요청의 핵심이 해결되는 최소 배포 단위. US2~US4는 순차 증분.
