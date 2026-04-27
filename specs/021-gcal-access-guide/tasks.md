---
description: "021 구글 캘린더 권한 제약 감지·안내 — 태스크"
---

# Tasks: 구글 캘린더 권한 제약 감지·안내

**Input**: Design documents from `/specs/021-gcal-access-guide/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/gcal-status.md](./contracts/gcal-status.md), [contracts/oauth-callback.md](./contracts/oauth-callback.md), [quickstart.md](./quickstart.md)

**Tests**: 본 피처는 **테스트를 포함**한다(`test-coverage` Coverage Target). 오류 분류 단위 + 패널 렌더 각 1건.

**Organization**: 태스크는 user story별로 묶어 독립 구현·검증 가능.

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 병렬 실행 가능(서로 다른 파일, 선행 의존 없음).
- **[Story]**: user story 매핑(US1~US3). Setup/Foundational/Polish는 label 없음.
- **[artifact]**: 산출 파일 경로(또는 `path::symbol`). 동적 라우트는 `<id>` placeholder.
- **[why]**: plan Coverage Target과 일치하는 추적 태그.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 프로젝트 초기화.

- (해당 없음) 기존 Next.js 16 + Prisma 7 환경을 그대로 사용. 신규 의존성 없음.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 오류 분류 확대 + OAuth 콜백 감지 + `/status` 응답 신호 노출. 모든 user story의 기반.

**⚠️ CRITICAL**: 이 단계가 끝나야 UI 분기와 안내 카드가 실제 신호를 받는다.

- [X] T001 `src/types/gcal.ts`의 `GCalLastError` union에 `"UNREGISTERED"`를 추가하고, `FailureReason` union에 `"unregistered"`를 추가한다. `StatusResponse`의 `linked:true`·`linked:false` 양쪽에 optional `unregistered?: true` 필드를 병렬 허용한다 [artifact: src/types/gcal.ts] [why: error-classifier]
- [X] T002 `src/lib/gcal/errors.ts::classifyError`가 Google API 응답 메시지/에러 코드에서 Testing 모드 제약 힌트(예: `access_denied`, `App has not completed verification`, `invalid_grant` 중 특정 payload)를 감지하면 `{ reason: "unregistered", lastError: "UNREGISTERED" }`를 반환하도록 확장한다. 일반 401/403과 구분 [artifact: src/lib/gcal/errors.ts] [why: error-classifier]
- [X] T003 `/api/gcal/consent` 콜백이 쿼리에 `error=access_denied`(또는 Google이 돌려주는 동등 표식)를 포함하면, scope 업데이트를 건너뛰고 `Set-Cookie: gcal-unregistered=<ISO timestamp>; Max-Age=600; HttpOnly; SameSite=Lax; Secure(프로덕션)`를 기록한 뒤 `returnTo`에 `?gcal=unregistered` 힌트를 붙여 리다이렉트한다 [artifact: src/app/api/gcal/consent/route.ts] [why: oauth-access-denied-capture]
- [X] T004 `/api/trips/<id>/gcal/status` 라우트가 요청 쿠키에서 `gcal-unregistered`를 읽어 TTL 내이면 응답 본문에 `unregistered: true`를 추가하고 해당 쿠키를 즉시 만료시킨다(`Max-Age=0`) [artifact: src/app/api/trips/<id>/gcal/status/route.ts] [why: oauth-access-denied-capture]

**Checkpoint**: 서버 신호 정비 완료. 클라이언트가 미등록 상태를 식별 가능.

---

## Phase 3: User Story 1 — 미등록 주인이 공유 캘린더 연결 시도 (Priority: P1) 🎯 MVP

**Goal**: 미등록 주인이 "공유 캘린더 연결"을 눌렀을 때 일반 실패 토스트 대신 권한 제약 안내 카드가 노출된다.

**Independent Test**: dev에서 Test user에 등록되지 않은 Google 계정으로 주인 로그인 → "공유 캘린더 연결" 클릭 → access_denied 복귀 → 다이얼로그가 안내 카드로 전환. Discussions 링크 동작 확인.

### Implementation for User Story 1

- [X] T005 [US1] `GCalLinkPanel`에 `status.unregistered === true` 분기를 기존 `linked` 분기보다 **최상위 우선**으로 추가. 트리거는 기존 미연결/연결됨과 동일한 outline sm + Calendar 아이콘, Dialog 골격 렌더 [artifact: src/components/GCalLinkPanel.tsx::UnregisteredBranch] [why: unregistered-ui-card]
- [X] T006 [US1] 미등록 다이얼로그 내부 콘텐츠 — 안내 설명문(문구: "이 기능은 현재 개발자 등록 사용자에게만 제공됩니다. Test user로 등록되어야 사용 가능합니다.") + **단일 CTA "개발자에게 문의 (Discussions)"** (href: `https://github.com/idean3885/trip-planner/discussions/new?category=q-a&title=<프리필>&body=<프리필>`, `target="_blank" rel="noopener"` + 외부 링크 아이콘) + 닫기 [artifact: src/components/GCalLinkPanel.tsx::UnregisteredBranch] [why: unregistered-ui-card]

**Checkpoint**: US1 완료 — 주인 미등록 경로 안내 카드 정상 노출. quickstart S1 검증 가능.

---

## Phase 4: User Story 2 — 미등록 호스트·게스트의 캘린더 접근 (Priority: P2)

**Goal**: 미등록 호스트·게스트가 캘린더 트리거 또는 "내 구글 캘린더에 추가"를 눌렀을 때 주인과 동일한 권한 제약 안내 카드가 노출된다.

**Independent Test**: 미등록 Google 계정이 호스트인 여행에서 트리거/구독 시도 → 동일한 안내 카드.

**Note**: T005·T006의 분기가 `role` 조건 없이 최상위에서 실행되므로 호스트·게스트도 자동 적용. 본 Phase는 검증 전용.

### Verification for User Story 2

- [ ] T007 [US2] quickstart S3 시나리오 dev 재현 — 미등록 호스트·게스트 진입 시 주인과 동일 카드 + 편집 뉘앙스 없음. 결과는 quickstart.md Evidence 체크박스로 기록 [artifact: specs/021-gcal-access-guide/quickstart.md::S3] [why: unregistered-ui-card]

**Checkpoint**: US2 완료 — 비-주인 카드 동질성 확인.

---

## Phase 5: User Story 3 — 사전 인지 가이드 (Priority: P2)

**Goal**: 앱 랜딩 + README에 Testing 모드 제약 사전 고지 블록이 존재해 기능 시도 전에 인지 가능.

**Independent Test**: 랜딩 페이지 + GitHub README 열람 → 제약 문구 블록 확인.

### Implementation for User Story 3

- [X] T008 [US3] [P] README.md의 설치·사용 섹션에 "Google 캘린더 연동 제약" 단락 추가 — 개발자 등록 필요 사실·문의 경로(Discussions Q&A) 링크 포함 [artifact: README.md] [why: preemptive-guide]
- [X] T009 [US3] [P] 랜딩 페이지에 간결한 사전 고지 배너·블록 추가 — "현재 Google 캘린더 연동은 개발자 등록 사용자에게만 제공됩니다" 수준 [artifact: src/app/page.tsx] [why: preemptive-guide]

**Checkpoint**: US3 완료 — 사전 고지 두 경로 모두 확보.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: ADR·테스트·단편·quickstart evidence 마무리.

- [X] T010 [P] ADR 0004 작성 — 제목 "Google OAuth Testing 모드 유지 — 심사 비용이 가장 큰 유보 이유". Context / Decision / Cost / Reconsider triggers / Rejected alternatives 구조. ADR 0002 Minimum Cost의 금전 원칙 적용 사례로 명시 [artifact: docs/adr/0004-gcal-testing-mode-cost.md] [why: adr-testing-mode]
- [X] T011 [P] 단위 테스트 — `tests/lib/gcal/errors.test.ts` 신규. `classifyError`가 Testing 모드 거부 힌트를 `UNREGISTERED`로 분류하고 기존 REVOKED(순수 401/403)와 구분함을 검증. 최소 2 케이스 [artifact: tests/lib/gcal/errors.test.ts] [why: test-coverage]
- [X] T012 [P] 단위 테스트 — `tests/components/GCalLinkPanel.test.tsx` 확장. `status.unregistered === true`일 때 역할(OWNER/HOST/GUEST) 무관하게 안내 카드 + "개발자에게 문의" 버튼이 렌더되고 기존 조작 버튼(연결/추가/sync)이 없음을 검증 [artifact: tests/components/GCalLinkPanel.test.tsx] [why: test-coverage]
- [X] T013 changes 단편 작성 — What/Why 2줄. 이슈 번호 확정 후 파일명에 반영(`changes/<이슈>.feat.md`) [artifact: CHANGELOG.md] [why: unregistered-ui-card]
- [ ] T014 quickstart.md Evidence 섹션 체크박스를 dev 재현 결과로 갱신(S1·S2·S3·S4) [artifact: specs/021-gcal-access-guide/quickstart.md] [why: test-coverage]

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: 해당 없음.
- **Phase 2 Foundational (T001~T004)**: 전 user story 차단. 먼저 완료.
  - T001 → T002 (타입 → classifier)
  - T001 → T004 (타입 → 응답 필드)
  - T003 → T004 (쿠키 기록 → 쿠키 소비; 쿠키 이름 일치 필요)
  - T003는 T001·T002와 독립 파일이라 논리적으론 [P] 가능하나 쿠키 키 이름·ISO 직렬화 방식이 T001의 타입 정의와 일관되어야 하므로 순차 권장.
- **Phase 3 US1 (T005~T006)**: Foundational 완료 후. T005 → T006 (같은 분기 내부).
- **Phase 4 US2 (T007)**: US1 구현 완료 후 수동 검증.
- **Phase 5 US3 (T008·T009)**: Foundational·US1과 독립. 병렬 가능.
- **Phase 6 Polish (T010~T014)**: US1·US3 구현 완료 이후.

### Parallel Opportunities

- Phase 5(T008·T009): README와 랜딩 페이지 병렬.
- Phase 6(T010·T011·T012): 서로 다른 파일 범위라 [P].
- T013(changes 단편)은 이슈 번호 확정 대기 → 마지막.

---

## Parallel Example: Phase 6 Polish

```bash
Task: "ADR 0004 작성: docs/adr/0004-gcal-testing-mode-cost.md"        # T010
Task: "errors 단위 테스트: tests/lib/gcal/errors.test.ts"              # T011
Task: "Panel 렌더 테스트: tests/components/GCalLinkPanel.test.tsx"     # T012
```

---

## Implementation Strategy

### MVP First (Foundational + US1)

1. **Phase 2**: T001~T004로 서버 신호 정비.
2. **Phase 3**: T005·T006으로 주인 미등록 안내 카드 완성.
3. **Validate**: 미등록 Google 계정으로 dev 재현.
4. Deploy MVP → dev.trip.idean.me 확인.

### Incremental Delivery

1. MVP(Foundational + US1) → dev 배포 → 주인 미등록 동작 확인.
2. + US2(T007): 호스트·게스트 동질성 확인.
3. + US3(T008·T009): README·랜딩 사전 고지.
4. + Polish(T010~T014): ADR·테스트·단편·quickstart evidence → PR 머지 → v2.9.2 릴리즈.

### Parallel Team Strategy

1인 개발 + AI 보조 전제. Phase 6에서 T010/T011/T012를 워크트리 분기로 병렬 처리 가능. 그 외는 순차.

---

## Coverage Target Validation

| Plan `[why]` | Multi-step | Tasks (이번 단계 매핑) | 충족 |
|---|:-:|---|:-:|
| `error-classifier` | 2 | T001, T002 | ✓ |
| `oauth-access-denied-capture` | 2 | T003, T004 | ✓ |
| `unregistered-ui-card` | 2 | T005, T006, T007, T013 | ✓ |
| `preemptive-guide` | 1 | T008, T009 | ✓ |
| `adr-testing-mode` | 1 | T010 | ✓ |
| `test-coverage` | 2 | T011, T012, T014 | ✓ |

`validate-plan-tasks-cov.sh` 통과 예상.

---

## Notes

- `[P]` = 서로 다른 파일 + 선행 의존 없음.
- `[Story]` = user story별 독립 회고 추적용.
- 각 user story 독립 검증 가능(MVP = Phase 2 + Phase 3).
- PR 직전: 이슈 생성 후 T013의 단편 파일명(`changes/<이슈번호>.feat.md`)을 확정.
- 체크포인트마다 `pnpm test` + `npx tsc --noEmit` 권장.
