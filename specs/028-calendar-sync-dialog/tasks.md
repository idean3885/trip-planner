---

description: "캘린더 동기화 UI 통합 — 작업 목록"
---

# Tasks: 캘린더 동기화 UI 통합

**Input**: Design documents in `/specs/028-calendar-sync-dialog/`
**Prerequisites**: plan.md, spec.md (US1·US2·US3), quickstart.md
**Related**: Epic #535, Milestone v2.16.0 (#38)

## Format

- **[P]**: 병렬 가능
- **[USx]**: User Story
- **[artifact: ...]**: 산출 파일 (필수)
- **[why: ...]**: plan Coverage Target 매핑 (필수)
- **[multi-step: N]**: 같은 `[why]` 묶음 최소 N개

---

## Phase 1: Setup

- [ ] T001 `src/components/calendar-sync/` 디렉토리 생성 + 진단용 README 작성 [artifact: src/components/calendar-sync/README.md] [why: entry-card]

---

## Phase 2: Foundational

- [ ] T002 다이얼로그 컨테이너 + 섹션 라우팅 컴포넌트 [artifact: src/components/calendar-sync/CalendarSyncDialog.tsx] [why: dialog-shell] [multi-step: 2]
- [ ] T003 다이얼로그 open URL query param(`?calsync=open`) 처리 hook [artifact: src/components/calendar-sync/CalendarSyncDialog.tsx::useQueryParamOpen] [why: dialog-shell] [multi-step: 2]

---

## Phase 3: US1 — 단일 진입점 + provider 연결 (P1) 🎯 MVP

- [ ] T004 [US1] `CalendarSyncEntryCard` server component — SidePanel 진입 카드 [artifact: src/components/calendar-sync/CalendarSyncEntryCard.tsx] [why: entry-card] [multi-step: 2]
- [ ] T005 [US1] SidePanel 변경 — 5종 패널 직접 import 제거 + 진입 카드만 노출 [artifact: src/app/trips/<id>/SidePanel.tsx] [why: entry-card]
- [ ] T006 [P] [US1] `ProviderSection` — provider 선택·연결 상태(`CalendarProviderChoice` + `GCalLinkPanel` + `AppleEntryCard` 기능 흡수) [artifact: src/components/calendar-sync/sections/ProviderSection.tsx] [why: section-link] [multi-step: 2]
- [ ] T007 [US1] `useCalendarLinkStatus` hook — `/api/trips/<id>/calendar/status` 호출 [artifact: src/components/calendar-sync/hooks/useCalendarLinkStatus.ts] [why: section-link] [multi-step: 2]
- [ ] T008 [P] [US1] ProviderSection 단위 테스트 — 미연결/연결/scope 부족 상태 표시 [artifact: src/components/calendar-sync/sections/ProviderSection.spec.tsx] [why: section-link]
- [ ] T009 [P] [US1] CalendarSyncEntryCard 단위 테스트 — 권한별 노출 [artifact: src/components/calendar-sync/CalendarSyncEntryCard.spec.tsx] [why: entry-card]

**Checkpoint**: US1 단독 머지로 진입 단일화 + 연결 흐름 닫힘.

---

## Phase 4: US2 — 같은 다이얼로그 안에서 import + draft 관리 (P2)

- [ ] T010 [P] [US2] `ImportSection` — 외부 캘린더에서 가져오기(`CalendarImportPanel` 흡수, scope 진단 분기 포함) [artifact: src/components/calendar-sync/sections/ImportSection.tsx] [why: section-import]
- [ ] T011 [P] [US2] `DraftSection` — draft 목록·승격·refresh·삭제(`DraftListPanel` 흡수) [artifact: src/components/calendar-sync/sections/DraftSection.tsx] [why: section-drafts]
- [ ] T012 [US2] `PromoteForm` — draft 승격 inline 폼 [artifact: src/components/calendar-sync/PromoteForm.tsx] [why: section-drafts]
- [ ] T013 [US2] `useExternalCalendars` hook — `/api/users/me/external-calendars` 호출 + diagnostics 처리 [artifact: src/components/calendar-sync/hooks/useExternalCalendars.ts] [why: section-import]
- [ ] T014 [US2] `useDrafts` hook — draft 목록·승격·refresh·삭제 호출 [artifact: src/components/calendar-sync/hooks/useDrafts.ts] [why: section-drafts]
- [ ] T015 [P] [US2] ImportSection 단위 테스트 [artifact: src/components/calendar-sync/sections/ImportSection.spec.tsx] [why: section-import]
- [ ] T016 [P] [US2] DraftSection 단위 테스트 [artifact: src/components/calendar-sync/sections/DraftSection.spec.tsx] [why: section-drafts]

**Checkpoint**: US2 머지 시 다이얼로그 1개로 import → 승격 → refresh → 삭제 모두 닿음.

---

## Phase 5: US3 — 권한별 분기 (P3)

- [ ] T017 [US3] 세 섹션에 role 분기 추가(OWNER·HOST·GUEST UI 조건) [artifact: src/components/calendar-sync/CalendarSyncDialog.tsx::roleBranching] [why: rbac-dialog]
- [ ] T018 [P] [US3] 권한별 분기 단위 테스트 — GUEST 편집 액션 비노출 [artifact: src/components/calendar-sync/CalendarSyncDialog.spec.tsx::rbac] [why: rbac-dialog]

**Checkpoint**: US3 머지 시 권한별 노출 규칙이 헌법 VI 매트릭스와 1:1.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T019 다이얼로그 모바일(<768px) 반응형 회귀 검증 — Vercel preview 360/480/768px [artifact: docs/evidence/028-calendar-sync-dialog/mobile.md] [why: mobile-regression]
- [ ] T020 stale 텍스트 일소 — "Apple 캘린더는 후속 릴리즈에서 지원될 예정" 등 v2.15.x 잔존 잘못된 안내 제거 검수 [artifact: src/components/calendar-sync/sections/ImportSection.tsx::copywriting] [why: section-import]
- [ ] T021 기존 5개 패널에 deprecated 주석 추가(원본 삭제는 후속 contract) [artifact: src/components/GCalLinkPanel.tsx] [why: entry-card]
- [ ] T022 단편 작성 — feat 타입 [artifact: changes/535.feat.md] [why: dialog-shell]
- [ ] T023 quickstart Evidence 1차 자동 테스트 통과 확인 [artifact: docs/evidence/028-calendar-sync-dialog/] [why: dialog-shell]

---

## Dependency Graph

```text
Phase 1 (T001)
   ↓
Phase 2 (T002·T003 dialog 컨테이너)
   ↓
Phase 3 US1
   T004·T005 (진입 카드 + SidePanel) ──┐
   T006·T007 (ProviderSection)         ├─→ US1 머지 가능
   T008·T009 (테스트)                  ┘

Phase 4 US2 — US1 머지 후
   T010·T013·T015 (Import)
   T011·T012·T014·T016 (Draft·승격)

Phase 5 US3 — US2 후
   T017·T018 (rbac)

Phase 6 Polish
   T019·T020·T021·T022·T023 병렬
```

## Parallel Opportunities

- Phase 3: T006(ProviderSection)·T008·T009 병렬.
- Phase 4: T010·T011 병렬(서로 다른 섹션 파일). 테스트 T015·T016 병렬.
- Phase 6: T019·T020·T021·T022·T023 모두 다른 파일이라 병렬.

## MVP Scope

US1 단독 머지로 사용자 가치(진입 단일화) 닫힘. US2·US3·Polish 후속 PR.

## Coverage Target ↔ tasks 매핑

| [why] | plan multi-step | 매핑 task 수 |
|-------|-----------------|--------------|
| entry-card | 2 | T001, T004, T005, T009, T021 — 5건 (≥ 2 OK) |
| dialog-shell | 2 | T002, T003, T022, T023 — 4건 (≥ 2 OK) |
| section-link | 2 | T006, T007, T008 — 3건 (≥ 2 OK) |
| section-import | — | T010, T013, T015, T020 — 4건 (≥ 1 OK) |
| section-drafts | — | T011, T012, T014, T016 — 4건 (≥ 1 OK) |
| rbac-dialog | — | T017, T018 — 2건 (≥ 1 OK) |
| mobile-regression | — | T019 — 1건 (≥ 1 OK) |

## Implementation Strategy

1. Phase 1·2 머지 1회 (또는 US1과 묶음)
2. US1(P1) 머지 — MVP
3. US2 머지
4. US3 + Polish 묶음 머지
5. release/v2.16.0 분기 → main 머지

본 마일스톤은 UI-only라 v2.16.0 한 묶음 PR 1건으로 마칠 가능성도 있음(분량이 작으면).
