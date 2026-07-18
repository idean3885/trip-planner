# Tasks: 대문 정보위계·카피 정리

**Feature**: `070-landing-refine` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup
- [x] T001 대문 컴포넌트 현황 확인(Hero·BottomCta·FeatureHighlights·DemoShowcase·LandingPage·GcalTestingNotice)

## Phase 2: US1 — 위계·카피 정리 (P1)
- [x] T002 [US1] `BottomCta` 서브텍스트("Google 계정으로 로그인…") 제거 [artifact: src/components/landing/BottomCta.tsx] [why: landing-copy]
- [x] T003 [US1] `FeatureHighlights` 제목을 Hero 킥커와 다른 문구로 변경 [artifact: src/components/landing/FeatureHighlights.tsx] [why: landing-copy]
- [x] T004 [US1] `FeatureHighlights` h2 위계 상향(킥커→text-xl/2xl semibold foreground) [artifact: src/components/landing/FeatureHighlights.tsx] [why: heading-scale]
- [x] T005 [US1] `DemoShowcase` h2 위계 상향 [artifact: src/components/landing/DemoShowcase.tsx] [why: heading-scale]
- [x] T006 [US1] `BottomCta` h2 위계 상향 [artifact: src/components/landing/BottomCta.tsx] [why: heading-scale]
- [x] T007 [US1] `LandingPage`에서 `GcalTestingNotice`를 최종 CTA 뒤(하단)로 이동 [artifact: src/components/landing/LandingPage.tsx] [why: notice-position]

## Phase 3: Polish
- [x] T008 [P] 회귀 테스트 — CTA 서브텍스트 부재, 섹션 제목 위계 클래스, 배너 CTA 뒤 순서, Features 제목≠Hero 킥커 [artifact: tests/components/landing-refine.test.tsx] [why: heading-scale]
- [x] T009 자가검증 (`npx vitest run`) + 색상 가드
- [ ] T010 towncrier 단편 (release 단계 소비, 미체크 유지) [artifact: changes/954.feat.md] [why: landing-copy]

## Dependencies
Setup → US1 → Polish.

## MVP Scope
US1 = 전부.
