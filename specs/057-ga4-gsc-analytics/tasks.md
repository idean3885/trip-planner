---

description: "Task list for 사용자 분석(GA4)·검색 노출(GSC) + 캘린더 카피 간소화"
---

# Tasks: 사용자 분석(GA4)·검색 노출(GSC) + 캘린더 카피 간소화

**Input**: Design documents from `/specs/057-ga4-gsc-analytics/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 회귀 가드(미설정 안전·코드명 부재·sitemap 경계)가 성공 기준이라 테스트 포함.

**Organization**: User Story 단위 그룹화. 각 스토리 독립 구현·검증.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

## Phase 1: Setup

- [x] T001 `@next/third-parties` 의존성 추가 in package.json [artifact: package.json] [why: ga4-analytics] [multi-step: 3]
- [x] T002 환경변수 키 추가(NEXT_PUBLIC_GA_ID, 검색 소유 확인값) + 주석 in .env.example [artifact: .env.example] [why: adr-guide] [multi-step: 2]

## Phase 2: Foundational

차단 선행 없음(분석은 관측 계층, DB 무변경). 카피·검색·분석은 서로 독립.

---

## Phase 3: User Story 1 - 가져오기 화면 카피 간소화 (Priority: P1)

**Goal**: 가져오기 화면에서 코드명·기술 설명을 제거하고 제목 + 한 줄 설명만 남긴다.

**Independent Test**: 다이얼로그·빈 상태 안내에 코드명·안내 박스가 없고 제목/설명만 보임.

- [x] T003 [US1] CalendarSyncDialog 카피 간소화 — 코드명 제거(설명·summary), ImportOnlyNotice 안내 박스 제거, 제목 + 한 줄 설명만 in src/components/calendar-sync/CalendarSyncDialog.tsx [artifact: src/components/calendar-sync/CalendarSyncDialog.tsx] [why: copy-simplify] [multi-step: 2]
- [x] T004 [P] [US1] ImportSection 빈 상태 안내에서 코드명 제거(앱 이름 또는 일반 표현) in src/components/calendar-sync/sections/ImportSection.tsx [artifact: src/components/calendar-sync/sections/ImportSection.tsx] [why: copy-simplify] [multi-step: 2]
- [x] T005 [US1] 카피 회귀 테스트 — 코드명 문자열 부재 + 안내 박스 미렌더 + 제목/설명 존재 in tests/components/calendar-sync/CalendarSyncDialog.test.tsx, tests/components/calendar-sync/import-section-copy.test.tsx [artifact: tests/components/calendar-sync/CalendarSyncDialog.test.tsx|tests/components/calendar-sync/import-section-copy.test.tsx] [why: copy-simplify] [multi-step: 2]

**Checkpoint**: 가져오기 화면 코드명 0건, 안내 박스 0개 (SC-001/002).

---

## Phase 4: User Story 2 - 사용 행태 분석(GA4) (Priority: P1)

**Goal**: 페이지뷰 + 핵심 전환 이벤트 + 익명 User-ID 수집. 측정 ID 미설정 시 안전 비활성.

**Independent Test**: 측정 ID 설정 시 수집·이벤트 전송, 미설정 시 태그 0개·앱 정상.

- [x] T006 [US2] 이벤트 전송 헬퍼 — 측정 ID 가드 no-op + track(name, params) + user_id set(PII 금지) in src/lib/analytics.ts [artifact: src/lib/analytics.ts] [why: ga4-analytics] [multi-step: 3]
- [x] T007 [US2] 루트 레이아웃에 GA 컴포넌트 조건부 통합(측정 ID 있을 때만) in src/app/layout.tsx [artifact: src/app/layout.tsx::RootLayout] [why: ga4-analytics] [multi-step: 3]
- [x] T008 [P] [US2] 로그인 사용자 익명 User-ID 연결 클라이언트 컴포넌트 in src/components/analytics/AnalyticsUserId.tsx [artifact: src/components/analytics/AnalyticsUserId.tsx] [why: ga4-analytics] [multi-step: 3]
- [x] T009 [US2] 핵심 전환 이벤트 호출 — 여행 생성 성공(new page)·가져오기 실행 성공(ImportSection) in src/components/calendar-sync/sections/ImportSection.tsx, src/app/trips/new/page.tsx [artifact: src/components/calendar-sync/sections/ImportSection.tsx|src/app/trips/new/page.tsx] [why: ga4-analytics] [multi-step: 3]
- [x] T010 [US2] 분석 헬퍼 테스트 — 미설정 no-op(태그 0개와 동치), 설정 시 전송, user_id PII 부재 in tests/lib/analytics.test.ts [artifact: tests/lib/analytics.test.ts] [why: ga4-analytics] [multi-step: 3]
- [x] T011 [US2] 분석 쿠키 사용 고지를 Footer에 노출(측정 ID 활성 시) in src/components/Footer.tsx [artifact: src/components/Footer.tsx] [why: adr-guide] [multi-step: 2]

**Checkpoint**: 측정 ID 설정 시 페이지뷰 + 2종 전환 집계, 미설정 시 회귀 0 (SC-003/004).

---

## Phase 5: User Story 3 - 검색 노출 최소 (Priority: P3)

**Goal**: 공개 페이지만 sitemap·색인, 앱 본체 noindex, 소유 확인 메타(env 가드).

**Independent Test**: sitemap에 공개 경로만, robots disallow 앱 경로, 인증 영역 noindex.

- [x] T012 [US3] robots 생성 — 공개 allow / 앱 경로 disallow + sitemap 참조 in src/app/robots.ts [artifact: src/app/robots.ts] [why: search-exposure] [multi-step: 3]
- [x] T013 [P] [US3] sitemap 생성 — 공개 페이지(/, /about, /docs)만 in src/app/sitemap.ts [artifact: src/app/sitemap.ts] [why: search-exposure] [multi-step: 3]
- [x] T014 [US3] 소유 확인 메타(env 가드, root) + 앱 본체 noindex 레이아웃(trips·settings) in src/app/layout.tsx, src/app/trips/layout.tsx, src/app/settings/layout.tsx [artifact: src/app/trips/layout.tsx|src/app/settings/layout.tsx] [why: search-exposure] [multi-step: 3]
- [x] T015 [US3] robots·sitemap 테스트 — 공개 경로만 포함·앱 경로 부재, disallow 목록, 소유 확인 env 가드 in tests/app/robots-sitemap.test.ts [artifact: tests/app/robots-sitemap.test.ts] [why: search-exposure] [multi-step: 3]

**Checkpoint**: sitemap 앱 경로 0건, 앱 본체 noindex (SC-005).

---

## Phase 6: Polish & Cross-Cutting

- [x] T016 도구 선택 ADR — GA4 채택, 대안 보류, 동적앱 검색노출 위치, 대세 우선 in docs/adr/0009-analytics-and-search-exposure.md [artifact: docs/adr/0009-analytics-and-search-exposure.md] [why: adr-guide] [multi-step: 2]
- [x] T017 운영 가이드 — 측정 ID·GSC 소유 확인·Vercel 환경변수 등록 절차 in docs/analytics-setup.md [artifact: docs/analytics-setup.md] [why: adr-guide] [multi-step: 2]
- [x] T018 전체 테스트 회귀 — `npx vitest run` 1회 통과 [artifact: tests] [why: ga4-analytics] [multi-step: 3]
- [x] T019 레거시 카피 컴포넌트 활성 경로 부재 재확인(AppleConnectWizard·CalendarImportPanel) — 미노출이면 미수정 기록 in specs/057-ga4-gsc-analytics/research.md [artifact: specs/057-ga4-gsc-analytics/research.md] [why: copy-simplify] [multi-step: 2]
- [ ] T020 릴리즈 노트 단편(feat) in changes/767.feat.md [artifact: changes/767.feat.md] [why: adr-guide] [multi-step: 2]

---

## Dependencies & Execution Order

- **Setup(T001-002)** → 분석(US2)·검색(US3)에 선행(패키지·env). 카피(US1)는 독립.
- **US1(카피)**: 완전 독립. MVP 후보(즉시 가치).
- **US2(GA4)**: T001(패키지) 후. 내부 T006→T007/T008/T009.
- **US3(검색)**: 독립(T002 env는 소유 확인만).
- **Polish**: 전 스토리 후.

**병렬 기회**: T004(US1), T008(US2), T013(US3)은 서로 다른 파일이라 [P].

## Implementation Strategy

- **MVP**: US1(카피) — 사용자가 지적한 즉시 개선. + US2(GA4) 핵심 목적.
- US3(검색)은 비중 낮음(P3)이나 함께 처리.
- ADR·가이드로 의사결정·콘솔 작업 기록. 측정 ID·GSC 발급·env 등록은 사람이 콘솔에서 수행(코드는 가드).

> T020(단편) 등 towncrier 단편 태스크는 release build가 소비하므로 `[ ]` 미체크 유지.
