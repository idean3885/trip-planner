---
description: "Tasks for 019 Google Calendar 공유 플로우 재설계"
---

# Tasks: Google Calendar 공유 플로우 재설계

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)
**Prerequisites**: spec.md, plan.md, [docs/research/v290-gcal-share-poc.md](../../docs/research/v290-gcal-share-poc.md)

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 다른 파일 · 의존성 없음 → 병렬 가능
- **[Story]**: US1·US2·US3 태그
- **[artifact]**: 산출 파일 상대경로 또는 `path::symbol`
- **[why]**: plan.md Coverage Targets의 [why] 태그와 일치
- 마이그레이션 태스크는 **[migration-type: schema-only | data-migration]** 포함

## Phase 1: Setup (공통 인프라)

**Purpose**: 스키마 확장과 공통 모듈 skeleton. 다른 단계 착수 전 완료 필요.

- [ ] T001 신규 Prisma 모델 추가 (`TripCalendarLink`, `MemberCalendarSubscription`, 관련 enum) [artifact: prisma/schema.prisma] [why: schema-migration]
- [ ] T002 schema-only 마이그레이션 SQL 생성 (신규 테이블 + 제약) [artifact: prisma/migrations/20260422_add_trip_calendar_link/migration.sql] [why: schema-migration] [migration-type: schema-only]

---

## Phase 2: Foundational (블로킹 의존성)

**Purpose**: 공통 모듈. 어느 US도 시작 전 완료 필요.

- [ ] T003 [P] ACL 래퍼 모듈 (insert/patch/delete, idempotent 호출 헬퍼) [artifact: src/lib/gcal/acl.ts] [why: owner-link]
- [ ] T004 [P] v2 API 공통 타입 확장 (TripCalendarLinkState, SubscriptionState 등) [artifact: src/types/gcal.ts] [why: owner-link]
- [ ] T005 [P] sync 엔진 per-trip 변형 스켈레톤 (기존 `src/lib/gcal/sync.ts` 분리 없이 context 변경) [artifact: src/lib/gcal/sync.ts] [why: sync-engine]

**Checkpoint**: Foundation 준비 → US1·US2·US3 병렬 가능.

---

## Phase 3: User Story 1 — 오너 연결 + 자동 ACL (Priority: P1) 🎯 MVP

**Goal**: 오너가 "외부 캘린더 연결"을 실행하면 캘린더 1개 생성 + 현재 멤버 전원 ACL 부여.

**Independent Test**: 오너가 연결 → 3멤버 모두에게 역할별 권한 부여 + 멤버 계정에는 새 캘린더 없음.

### Implementation for US1

- [ ] T006 [US1] 오너 연결 엔드포인트 (v2) — 캘린더 생성 또는 기존 채택, 현재 멤버 ACL 자동 부여 [artifact: src/app/api/v2/trips/<id>/calendar/route.ts::POST] [why: owner-link]
- [ ] T007 [US1] 멤버 라이프사이클 훅 통합 — 가입/수락 경로에서 ACL 자동 부여 [artifact: src/lib/auth-helpers.ts::onMemberJoin] [why: member-lifecycle]
- [ ] T008 [US1] 역할 변경 훅 — host↔guest 전환 시 acl.patch 호출 [artifact: src/lib/auth-helpers.ts::onRoleChange] [why: member-lifecycle]
- [ ] T009 [US1] 멤버 탈퇴 훅 — acl.delete 호출 [artifact: src/lib/auth-helpers.ts::onMemberLeave] [why: member-lifecycle]

**Checkpoint**: US1 단독 테스트 가능 — 오너 연결 + 3멤버 ACL 확인.

---

## Phase 4: User Story 2 — 멤버 수동 subscribe (Priority: P1)

**Goal**: 멤버가 트립 페이지 버튼으로 본인 외부 캘린더에 공유 캘린더를 추가/제거. 옵트인.

**Independent Test**: US1 완료 트립에서 게스트가 버튼 클릭 → 본인 외부 UI에 캘린더 표시 → 제거 시 사라짐.

### Implementation for US2

- [ ] T010 [US2] 멤버 subscribe/unsubscribe 엔드포인트 (본인 토큰으로 calendarList.insert/delete) [artifact: src/app/api/v2/trips/<id>/calendar/subscribe/route.ts] [why: member-subscribe]
- [ ] T011 [US2] scope 미보유 시 consent 리다이렉트 흐름 반환 + subscribe 재개 경로 [artifact: src/app/api/v2/trips/<id>/calendar/subscribe/route.ts::scopeGate] [why: member-subscribe]

**Checkpoint**: US2 단독 테스트 가능 — 오너 연결 후 멤버 수동 on/off.

---

## Phase 5: User Story 3 — v2.8.0 마이그레이션 (Priority: P2)

**Goal**: 기존 사용자 무중단 승격. 오너 DEDICATED 재사용 + 멤버 DEDICATED 자동 unlink + 이벤트 유실 0.

**Independent Test**: v2.8.0 샘플 트립(오너+호스트+게스트 전원 DEDICATED)에서 마이그레이션 실행 후 SC-004 만족.

### Implementation for US3

- [ ] T012 [US3] 백필 로직 — 기존 GCalLink 중 오너 것을 TripCalendarLink로 승격, 나머지는 `status=LEGACY_UNLINKED` 처리 [artifact: src/lib/gcal/migrate.ts::backfillV28] [why: schema-migration]
- [ ] T013 [US3] data-migration SQL — 런타임 백필 대상 식별 + 마킹 [artifact: prisma/migrations/20260422_backfill_v28_gcal_links/migration.sql] [why: schema-migration] [migration-type: data-migration]

**Checkpoint**: 샘플 트립 마이그레이션 시뮬레이션 성공.

---

## Phase 6: UI 재설계 (횡단)

- [ ] T014 [P] TripCalendarPanel 컴포넌트 — 오너/호스트/게스트 역할별 뷰 + 연결/해제/재반영 버튼 [artifact: src/components/TripCalendarPanel.tsx] [why: ui-states]
- [ ] T015 [P] MemberSubscribeButton 컴포넌트 — 버튼 상태(미추가/추가됨/에러) + consent 리다이렉트 연결 [artifact: src/components/MemberSubscribeButton.tsx] [why: ui-states]

---

## Phase 7: sync 엔진 이관

- [ ] T016 sync 엔진을 per-trip calendarId로 호출 — 오너 토큰 1개로 공유 캘린더 sync [artifact: src/lib/gcal/sync.ts::syncActivities] [why: sync-engine]
- [ ] T017 v2 sync 엔드포인트 — 오너만 호출 가능, 부분 실패 리포팅 [artifact: src/app/api/v2/trips/<id>/calendar/sync/route.ts] [why: sync-engine]

---

## Phase 8: 레거시 호환

- [ ] T018 레거시 GET 라우트(`/api/trips/[id]/gcal/status`) 응답을 신규 모델 기반으로 변환, 없으면 기존 GCalLink 폴백 [artifact: src/app/api/trips/<id>/gcal/status/route.ts] [why: legacy-compat]

---

## Phase 9: Verification & 문서

- [ ] T019 quickstart.md 작성 (검증 절차 + Evidence 섹션 — 자동 증거 CI 로그 + 수동 시나리오 3종) [artifact: specs/019-gcal-shared-flow/quickstart.md] [why: verify]
- [ ] T020 통합 테스트 — 오너 연결·멤버 subscribe·마이그레이션 3종 End-to-End [artifact: tests/integration/gcal-shared-flow.test.ts] [why: verify]

---

## Phase 10: Contract 예약 (본 릴리즈 범위 밖, 기록만)

- [ ] T021 ADR + 레거시 모델 제거 체크리스트(후속 릴리즈용) [artifact: docs/adr/v290-per-trip-shared-calendar.md] [why: contract-reserve]

---

## Dependencies & Execution Order

### Phase 의존성

- **Phase 1 Setup**: 의존 없음 — 최초 착수.
- **Phase 2 Foundational**: Phase 1 완료 후.
- **Phase 3 US1 / Phase 4 US2 / Phase 5 US3**: Phase 2 완료 후 병렬 가능.
- **Phase 6 UI**: US1·US2 엔드포인트 스펙 확정 후.
- **Phase 7 sync**: US1 완료 후.
- **Phase 8 Legacy compat**: US3 완료 후(레거시 응답이 신규 모델을 참조하므로).
- **Phase 9 Verification**: 모든 US 완료 후.
- **Phase 10 Contract reserve**: 언제든 병렬.

### Parallel Opportunities

- Phase 2의 T003·T004·T005는 [P] 병렬.
- Phase 6의 T014·T015는 [P] 병렬.
- US1 구현 후 US2와 US3는 병렬로 가능.

---

## Implementation Strategy

### MVP First (US1만)

1. Phase 1 → Phase 2 → Phase 3 순차 완료 → US1 단독 테스트.
2. 여기서 중간 PR 하나로 분리 가능(멤버 subscribe 없이도 "여행당 1개 캘린더" 효과는 달성).

### Incremental Delivery

1. US1 → US2 → US3 순으로 각각 PR 분리 가능.
2. 각 PR에 changes 단편(`changes/<issue>.breaking.md` 또는 `feat.md`) 포함.
3. US3 마이그레이션은 별도 PR로 분리(롤백 용이성).

### 교차 검증 포인트

- US1 완료 후: `/cross-verify:cross-verify` 1회
- US3 완료 후(마이그레이션 SQL): `/cross-verify:cross-verify` 1회
- 전체 머지 직전: `/cross-verify:cross-verify` + 교차검증 라운드트립

---

## Notes

- [P] 태스크 = 다른 파일·의존성 없음
- 각 US는 독립적으로 완성·테스트 가능하도록 설계
- 커밋 단위는 task 혹은 논리적 그룹 단위
- 마이그레이션 태스크 2건(T002 schema-only, T013 data-migration)은 expand-and-contract 원칙 준수
- 레거시 API 완전 제거(`/api/trips/[id]/gcal/*`)는 본 릴리즈 범위 밖 — 별도 v2.9.x 또는 v2.10.x contract 릴리즈
