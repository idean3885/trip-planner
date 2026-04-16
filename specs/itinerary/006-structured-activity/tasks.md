# Tasks: v2.1 일정 구조화

**Input**: Design documents from `/specs/006-structured-activity/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1~US4)

---

## Phase 1: Setup

**Purpose**: 브랜치 준비 및 의존성 확인

- [ ] T001 main 최신화 후 이슈별 브랜치에서 작업 시작
- [ ] T002 [P] Node.js 의존성 확인 (npm install)
- [ ] T003 [P] Python 가상환경 확인 (.venv 활성화, pip install -e ".[dev]")

---

## Phase 2: Foundational — Activity 데이터 모델 (#124)

**Purpose**: Activity 스키마 + 마이그레이션. 모든 US의 전제 조건.

**⚠️ CRITICAL**: 이 페이즈가 완료되어야 US1~US3 작업 가능

- [ ] T004 ActivityCategory enum 추가 in prisma/schema.prisma (SIGHTSEEING, DINING, TRANSPORT, ACCOMMODATION, SHOPPING, OTHER)
- [ ] T005 ReservationStatus enum 추가 in prisma/schema.prisma (REQUIRED, RECOMMENDED, ON_SITE, NOT_NEEDED)
- [ ] T006 Activity 모델 추가 in prisma/schema.prisma (data-model.md 참조: dayId, category, title, startTime, endTime, location, memo, cost, currency, reservationStatus, sortOrder)
- [ ] T007 Day 모델에 activities 관계 추가 in prisma/schema.prisma
- [ ] T008 Prisma 마이그레이션 생성 및 적용 (npx prisma migrate dev --name add-activity)
- [ ] T009 [P] OpenAPI 스펙에 Activity 엔드포인트 추가 in src/lib/openapi.ts

**Checkpoint**: Activity 테이블 생성 완료. `npx prisma studio`에서 확인.

---

## Phase 3: US1 — AI 에이전트가 구조화된 활동을 추가한다 (Priority: P1) 🎯 MVP

**Goal**: MCP 도구로 활동 CRUD → 웹에서 구조화 카드 즉시 확인

**Independent Test**: `create_activity` MCP 호출 → trip.idean.me에서 카드 표시 확인

**이슈**: #127 MCP 도구 확장 — Activity CRUD

### Web API

- [ ] T010 [P] [US1] GET/POST /api/trips/[id]/days/[dayId]/activities 구현 in src/app/api/trips/[id]/days/[dayId]/activities/route.ts (contracts/api.md 참조)
- [ ] T011 [P] [US1] PUT/DELETE /api/trips/[id]/days/[dayId]/activities/[activityId] 구현 in src/app/api/trips/[id]/days/[dayId]/activities/[activityId]/route.ts
- [ ] T012 [US1] PATCH /api/trips/[id]/days/[dayId]/activities/reorder 구현 in src/app/api/trips/[id]/days/[dayId]/activities/route.ts

### MCP 도구

- [ ] T013 [US1] create_activity 도구 구현 in mcp/trip_mcp/planner.py (contracts/mcp-tools.md 참조)
- [ ] T014 [P] [US1] update_activity 도구 구현 in mcp/trip_mcp/planner.py
- [ ] T015 [P] [US1] delete_activity 도구 구현 in mcp/trip_mcp/planner.py
- [ ] T016 [US1] reorder_activities 도구 구현 in mcp/trip_mcp/planner.py
- [ ] T017 [US1] get_trip 도구 수정 — activities 수 표시 in mcp/trip_mcp/planner.py
- [ ] T018 [US1] 통합 서버 도구 등록 확인 (14→18개) in mcp/trip_mcp/server.py

### 웹 렌더링 (최소)

- [ ] T019 [US1] ActivityCard 컴포넌트 구현 — 카테고리/시간/장소/비용 표시 in src/components/ActivityCard.tsx
- [ ] T020 [US1] 일자 상세 페이지에 Activity 목록 렌더링 추가 in src/app/trips/[id]/day/[dayId]/page.tsx
- [ ] T021 [US1] MCP Activity CRUD E2E 검증: create → 웹 확인 → update → delete

**Checkpoint**: MCP 18개 도구, 웹에서 구조화 카드 표시. MVP 완료.

---

## Phase 4: US2 — 웹에서 구조화 폼으로 활동을 관리한다 (Priority: P2)

**Goal**: 웹 UI에서 활동 추가/수정/삭제 폼

**Independent Test**: 웹에서 "활동 추가" → 폼 입력 → 저장 → 카드 표시

**이슈**: #125 구조화 폼 UI + #126 컴포넌트 기반 렌더링

- [ ] T022 [P] [US2] ActivityForm 컴포넌트 구현 — 카테고리/시간/장소/메모/비용/예약 상태 입력 폼 in src/components/ActivityForm.tsx
- [ ] T023 [US2] 일자 상세 페이지에 "활동 추가" 버튼 + ActivityForm 연동 in src/app/trips/[id]/day/[dayId]/page.tsx
- [ ] T024 [US2] ActivityCard에 편집/삭제 버튼 추가 + ActivityForm 편집 모드 in src/components/ActivityCard.tsx
- [ ] T025 [US2] 활동 순서 변경 UI (위/아래 버튼) in src/components/ActivityCard.tsx
- [ ] T026 [US2] Day.content(마크다운)가 있으면 읽기 전용 렌더링 + activities 우선 표시 in src/app/trips/[id]/day/[dayId]/page.tsx

**Checkpoint**: 웹에서 활동 CRUD + 순서 변경 + 레거시 마크다운 호환.

---

## Phase 5: US3 — 기존 마크다운 → 활동 변환 (Priority: P3)

**Goal**: MCP로 기존 마크다운을 활동 단위로 변환

**Independent Test**: Claude Desktop에서 "3일차 마크다운을 활동으로 변환해줘" → 변환 결과 확인

**이슈**: #134 기존 마크다운 → 활동 변환 기능

- [ ] T027 [US3] convert_markdown_to_activities MCP 도구 설계 — 마크다운 입력 → Activity JSON 배열 출력 가이드 in mcp/trip_mcp/planner.py
- [ ] T028 [US3] 웹 일자 상세에 "구조화 변환" 안내 UI — "Claude Desktop에서 변환 요청" 가이드 표시 in src/app/trips/[id]/day/[dayId]/page.tsx
- [ ] T029 [US3] 변환 E2E 검증: 마크다운 있는 일자 → MCP 변환 → 웹 확인

**Checkpoint**: 기존 마크다운 일정을 활동으로 변환 가능. 원본 보존.

---

## Phase 6: US4 — CHANGELOG + README (Priority: P4)

**Purpose**: 변경 이력 추적 + 문서 갱신

**이슈**: #135 CHANGELOG.md 도입 + README v2.1 업데이트

- [ ] T030 [P] [US4] CHANGELOG.md 생성 — v2.0.0, v2.0.1 소급 + v2.1.0 기록 in CHANGELOG.md
- [ ] T031 [P] [US4] README.md 업데이트 — 구조화 활동 기능 반영, MCP 18개 도구, 로드맵 섹션 제거 in README.md
- [ ] T032 [US4] pyproject.toml version 2.1.0 + description 업데이트 in pyproject.toml

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: 최종 검증 + 배포

- [ ] T033 quickstart.md 검증: 개발자 셋업 가이드 전수 확인 in specs/006-structured-activity/quickstart.md
- [ ] T034 Vercel 프리뷰 + 프로덕션 배포 확인
- [ ] T035 PyPI 배포: trip-planner-mcp 2.1.0
- [ ] T036 GitHub Release: v2.1.0 생성

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 후 — **모든 US의 전제 조건**
- **US1 (Phase 3)**: Foundational 완료 후 — MCP + 최소 렌더링
- **US2 (Phase 4)**: US1 완료 후 — 웹 폼 (ActivityCard 재사용)
- **US3 (Phase 5)**: US1 완료 후 — 변환은 Activity 모델 필요
- **US4 (Phase 6)**: 모든 US 완료 후 — 문서 갱신
- **Polish (Phase 7)**: 모든 US 완료 후

### User Story Dependencies

```
Phase 2 (Foundational: Activity 모델)
    ↓
Phase 3 (US1: MCP CRUD + 최소 렌더링) ← MVP
    ↓
Phase 4 (US2: 웹 구조화 폼) ← US1의 ActivityCard 재사용
    ↓
Phase 5 (US3: 마크다운 변환) ← US1 이후 독립 가능
    ↓
Phase 6 (US4: CHANGELOG + README)
    ↓
Phase 7 (Polish)
```

### Parallel Opportunities

- Phase 2 내: T004, T005 병렬 (enum 정의), T009 독립
- Phase 3 내: T010, T011 병렬 (다른 파일), T014, T015 병렬
- Phase 4 내: T022 독립 (새 파일)
- Phase 6 내: T030, T031 병렬 (다른 파일)

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1 + Phase 2 완료 → Activity 모델 준비
2. Phase 3 (US1) 완료 → **MVP: MCP로 활동 CRUD + 웹 카드 렌더링**
3. **STOP and VALIDATE**: Claude Desktop에서 E2E 테스트

### Incremental Delivery

1. Setup + Foundational → Activity 모델
2. US1 → MCP 18개 도구 + 카드 뷰 → 배포 (MVP!)
3. US2 → 웹 구조화 폼 → 배포
4. US3 → 마크다운 변환 → 배포
5. US4 + Polish → CHANGELOG, README, v2.1.0 릴리스

---

## Issue ↔ Task Mapping

| 이슈 | 태스크 | 브랜치 |
|------|--------|--------|
| #124 Activity 데이터 모델 | T004~T009 | 006-124-activity-model |
| #127 MCP 도구 확장 | T010~T021 | 006-127-mcp-activity-crud |
| #125 구조화 폼 UI | T022~T026 | 006-125-activity-form-ui |
| #126 컴포넌트 렌더링 | T019, T024 (US1/US2에 포함) | #125와 통합 |
| #134 마크다운 변환 | T027~T029 | 006-134-markdown-migration |
| #135 CHANGELOG + README | T030~T032 | 006-135-changelog-readme |

## Notes

- #126(컴포넌트 렌더링)은 #125(구조화 폼)에 통합 — ActivityCard가 US1에서 생성, US2에서 확장
- 이슈별 브랜치로 devex:flow 진행
- 커밋은 이슈 단위
