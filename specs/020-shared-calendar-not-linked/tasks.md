---
description: "020 공유 캘린더 미연결 상태의 역할별 UI — 태스크"
---

# Tasks: 공유 캘린더 미연결 상태의 역할별 UI

**Input**: Design documents from `/specs/020-shared-calendar-not-linked/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/gcal-status.md](./contracts/gcal-status.md), [quickstart.md](./quickstart.md)

**Tests**: 본 피처는 **테스트를 포함**한다(`test-coverage` Coverage Target). 서버 라우트·컴포넌트 렌더 각 1건.

**Organization**: 태스크는 user story별로 묶어 독립 구현·검증 가능.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 병렬 실행 가능(서로 다른 파일, 선행 의존 없음)
- **[Story]**: user story 매핑(US1~US4). Setup/Foundational/Polish는 label 없음.
- **[artifact]**: 산출 파일(또는 `path::symbol`) — drift 감사 기준.
- **[why]**: plan의 Coverage Target과 일치하는 추적 태그.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기화.

- (해당 없음) 본 피처는 기존 Next.js 16 + Prisma 7 환경을 그대로 사용한다. 신규 의존성·빌드 설정·환경 변수 없음.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 user story의 기반이 되는 서버 응답 정합성 확보.

**⚠️ CRITICAL**: 이 단계가 끝나야 US1·US2·US3·US4 UI 분기가 의미를 가진다.

- [X] T001 status 라우트에서 per-user `GCalLink` 폴백 조회(`prisma.gCalLink.findUnique`)를 제거하고, `TripCalendarLink` 부재 시 `{ linked: false, scopeGranted }`만 반환한다 [artifact: src/app/api/trips/<id>/gcal/status/route.ts] [why: status-fallback-removal]
- [X] T002 status 라우트 파일 상단 JSDoc을 "`TripCalendarLink`만 정본, 레거시 폴백 없음" 원칙으로 정비한다(참조 링크: spec 020, Clarification Session 2026-04-22) [artifact: src/app/api/trips/<id>/gcal/status/route.ts] [why: status-fallback-removal]

**Checkpoint**: 서버 응답 정합성 확보. 이제 클라이언트 UI 분기가 정확한 신호를 받는다.

---

## Phase 3: User Story 1 — 미연결 여행에 호스트 진입 (Priority: P1) 🎯 MVP

**Goal**: 호스트가 미연결 상태 여행 페이지에 진입했을 때 의미 없는 버튼·오류 없이 대기 안내만 받고, 앱 내 일정 편집·조회는 정상.

**Independent Test**: 신혼여행(tripId=5)에 호스트 계정으로 진입 → 캘린더 섹션 트리거 클릭 → 다이얼로그에 안내문 + "닫기"만 표시. 네트워크 탭에 `/api/v2/trips/5/calendar/{subscribe,sync}` 호출 없음.

### Implementation for User Story 1

- [X] T003 [US1] `GCalLinkPanel`에서 `status.linked === false && role !== 'OWNER'` 분기를 추가. 주인 트리거와 **동일한 outline sm Button + shadcn Dialog** 구조로 트리거·컨테이너를 렌더한다(DOM 계층·클래스 일치) [artifact: src/components/GCalLinkPanel.tsx::NotLinkedNonOwnerBranch] [why: non-owner-not-linked-dialog]
- [X] T004 [US1] 위 다이얼로그 내부 콘텐츠를 **미연결 안내문 + "닫기" 버튼 하나**로 구성. 공유 캘린더 조작 버튼(추가/다시 반영/해제)은 포함하지 않는다. 문구는 "주인이 공유 캘린더를 아직 연결하지 않았습니다…" 수준 [artifact: src/components/GCalLinkPanel.tsx::NotLinkedNonOwnerBranch] [why: non-owner-not-linked-dialog]

**Checkpoint**: US1 완료 — 호스트 진입 시 404 오류 재현 불가, quickstart S1 수동 검증 가능.

---

## Phase 4: User Story 2 — 미연결 여행에 주인 진입 (Priority: P1)

**Goal**: 주인이 미연결 상태 여행에서 단일 CTA("공유 캘린더 연결")로 공석을 해소할 수 있다.

**Independent Test**: 주인 계정으로 미연결 여행 진입 → 캘린더 트리거 클릭 → 다이얼로그에 단일 CTA만 노출 → 클릭 → 동의 후 연결 완료 → `TripCalendarLink` 생성 + 동행자 ACL 부여.

### Implementation for User Story 2

- [X] T005 [US2] `GCalLinkPanel` 주인 미연결 분기에서 레거시 "업그레이드" 제목·문구·조건 분기를 제거하고 단일 "공유 캘린더 연결" CTA만 유지한다(PR #394에서 도입한 legacy 안내 분기 삭제) [artifact: src/components/GCalLinkPanel.tsx::NotLinkedOwnerBranch] [why: owner-not-linked-cta]

**Checkpoint**: US2 완료 — 주인 CTA 단일화. quickstart S2 수동 검증 가능.

---

## Phase 5: User Story 3 — 미연결 여행에 게스트 진입 (Priority: P2)

**Goal**: 게스트가 호스트와 동일한 대기 안내를 보되, 편집 뉘앙스 문구·액션은 없다.

**Independent Test**: 게스트 권한 계정으로 미연결 여행 진입 → 트리거 클릭 → 호스트와 동일한 안내문 + "닫기" 다이얼로그 표시.

**Note**: US1의 `role !== 'OWNER'` 분기가 `HOST`·`GUEST` 모두 포괄하므로 신규 구현 코드가 없다. 독립 검증만 수행한다.

### Verification for User Story 3

- [X] T006 [US3] quickstart S3 시나리오 수동 검증 — 게스트 계정으로 미연결 여행 진입, 트리거·다이얼로그가 호스트 케이스와 의미상 동일(편집 뉘앙스 없음). 스크린샷을 quickstart.md의 Evidence 섹션에 첨부한다 [artifact: specs/020-shared-calendar-not-linked/quickstart.md::S3] [why: test-coverage]

**Checkpoint**: US3 완료 — 게스트 렌더 동질성 확인.

---

## Phase 6: User Story 4 — 연결 해소 후 상태 자연 전환 (Priority: P2)

**Goal**: 주인이 공유 캘린더를 연결한 이후, 호스트·게스트가 여행 페이지를 새로고침하면 자동으로 연결됨 UI로 전환된다. 해제 후 미연결도 생성 직후 미연결과 완전 동일 UI.

**Independent Test**: 주인이 연결 → 호스트 계정으로 새로고침 1회 → 연결됨 UI 노출. 주인이 해제 → 호스트 새로고침 → 미연결 UI(생성 직후와 동일).

**Note**: 신규 구현 코드 없음(FR-006은 기존 `loadStatus()` re-fetch만으로 충족). 수동 검증으로 완결.

### Verification for User Story 4

- [X] T007 [US4] quickstart S2·S4 시나리오 수동 검증 — 연결→호스트 새로고침으로 전환, 해제→호스트 새로고침으로 미연결 UI 복귀. 각 단계 스크린샷을 quickstart.md의 Evidence 섹션에 첨부한다 [artifact: specs/020-shared-calendar-not-linked/quickstart.md::S2] [why: test-coverage]

**Checkpoint**: US4 완료 — 상태 전환 연속성 확인.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 테스트·용어 정본화·단편·문서 마무리.

- [X] T008 [P] 단위 테스트 작성 — `GET /api/trips/[id]/gcal/status`가 `TripCalendarLink` 부재 시 본인 `GCalLink` 존재 여부와 **무관하게** `{ linked: false, scopeGranted }`를 반환함을 확인(레거시 폴백 회귀 방지). Prisma mock 사용 [artifact: tests/api/gcal-status.test.ts] [why: test-coverage]
- [X] T009 [P] 단위 테스트 작성 — `GCalLinkPanel`이 `status.linked === false + role ∈ {HOST, GUEST}`에서 다이얼로그 내부에 **"닫기" 버튼만** 렌더하고 "추가"/"다시 반영"/"해제" 버튼이 없음을 검증(React Testing Library) [artifact: tests/components/GCalLinkPanel.test.tsx] [why: test-coverage]
- [X] T010 [P] 본 피처가 편집하는 파일(status 라우트, `GCalLinkPanel`) 내의 한국어 주석·에러 메시지에서 "오너" 등 비정본 표기를 "주인"으로 통일한다. glossary.md(`docs/glossary.md`) 매핑 기준 [artifact: src/app/api/trips/<id>/gcal/status/route.ts|src/components/GCalLinkPanel.tsx] [why: role-terminology]
- [X] T011 changes 단편 작성 — What/Why 2줄 원칙으로 본 피처의 사용자 가시 변경을 기술한다. 이슈 번호는 PR 직전 생성 후 파일명에 반영(`changes/<이슈번호>.fix.md`) [artifact: changes/395.feat.md] [why: status-fallback-removal]
- [X] T012 quickstart.md의 Evidence 섹션을 실제 스크린샷·로그 링크로 채우고 자동·수동·모바일·운영 체크박스를 완료 표시한다 [artifact: specs/020-shared-calendar-not-linked/quickstart.md] [why: test-coverage]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: 해당 없음.
- **Phase 2 Foundational (T001·T002)**: 모든 user story를 **차단**. 먼저 완료해야 함.
- **Phase 3 US1 (T003·T004)**: Foundational 완료 후 진행.
- **Phase 4 US2 (T005)**: Foundational 완료 후 진행. US1과 **같은 파일**을 편집하므로 US1 이후 순차 권장.
- **Phase 5 US3 (T006)**: US1 구현 완료 후 수동 검증 가능.
- **Phase 6 US4 (T007)**: US2 구현 완료 후 수동 검증 가능.
- **Phase 7 Polish (T008~T012)**: US1·US2 구현 완료 이후 진행(T010 포함, 편집 파일 중복 회피).

### Within Each Story

- US1: T003 → T004 (같은 분기 내부 렌더링 구조 → 내용 채움 순서).
- US2: T005 단일. 분기 제거 + CTA 단일화 동시에 수행.

### Parallel Opportunities

- Phase 7에서 T008·T009·T010은 서로 다른 파일 범위라 **[P]** 로 병렬 실행 가능.
- T011 changes 단편은 `changes/` 디렉토리라 병렬이지만 이슈 번호 확정 후 작성하므로 마지막 단계.

---

## Parallel Example: Phase 7 Polish

```bash
# 다음 태스크를 동시에 착수 (서로 다른 파일):
Task: "단위 테스트: tests/api/gcal-status.test.ts"         # T008
Task: "단위 테스트: tests/components/GCalLinkPanel.test.tsx" # T009
Task: "역할 용어 정본화: src/app/api/... + src/components/..." # T010
```

---

## Implementation Strategy

### MVP First (User Story 1 + Foundational)

1. **Phase 2**: T001·T002로 서버 응답 정합화.
2. **Phase 3**: T003·T004로 호스트 미연결 UI 완성.
3. **Validate**: 호스트 계정으로 프리뷰 배포에서 404 재현 불가 확인.
4. Deploy MVP to dev.trip.idean.me → 사용자 1차 검증.

### Incremental Delivery

1. MVP (Foundational + US1) → dev 배포 → 호스트 계정 확인.
2. + US2(T005) → 주인 단일 CTA 확인.
3. + US3·US4 검증(T006·T007) → 게스트·상태 전환 확인.
4. + Polish(T008~T012) → 테스트·단편·문서 → PR 머지 → v2.9.1 릴리즈.

### Parallel Team Strategy

1인 개발 + AI 보조 전제로, T008·T009·T010을 워크트리 분기에서 병렬 수행 가능. 다른 태스크는 같은 파일을 건드리므로 순차.

---

## Coverage Target Validation

| Plan `[why]` | Multi-step | Tasks (이번 단계 매핑) | 충족 |
|---|:-:|---|:-:|
| `status-fallback-removal` | 2 | T001, T002, T011 | ✓ |
| `non-owner-not-linked-dialog` | 2 | T003, T004 | ✓ |
| `owner-not-linked-cta` | 1 | T005 | ✓ |
| `role-terminology` | 1 | T010 | ✓ |
| `test-coverage` | 2 | T006, T007, T008, T009, T012 | ✓ |

`validate-plan-tasks-cov.sh` 통과 예상.

---

## Notes

- `[P]`는 서로 다른 파일 + 선행 의존 없음을 의미.
- `[Story]` 레이블은 user story별 독립 구현·회고 추적용.
- 각 user story는 독립 검증 가능(MVP = Phase 2 + Phase 3).
- PR 직전: 이슈 생성 후 T011의 단편 파일명(`changes/<이슈번호>.fix.md`)을 확정한다.
- 체크포인트마다 `pnpm test` + `pnpm exec tsc --noEmit` 수행 권장.
