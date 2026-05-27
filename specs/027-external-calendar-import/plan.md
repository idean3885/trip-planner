# Implementation Plan: 외부 캘린더 import

**Branch**: `027-external-calendar-import` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-external-calendar-import/spec.md`
**Related**: Epic #527, Milestone v2.15.0 (#36), ADR 0003 per-trip-shared-calendar (유지)

## Summary

사용자가 본인의 다른 Google·Apple 캘린더에 이미 쌓아둔 일정을 trip-planner의 trip으로 가져오는 수동 import 기능을 추가한다. 외부 이벤트 1건당 `ActivityDraft` 레코드 1개를 만들고, 매핑 가능한 필드(제목·시작·종료·장소 문자열·설명)만 자동 채운다. 매핑 불가 필드(activity type, hotel/attraction 참조, reservation status, 타임존)는 비워두고 사용자가 trip-planner UI에서 채워 정식 Activity로 승격한다. ADR 0003 per-trip-shared-calendar 모델은 그대로 유지하며, 외부 → 내부 단방향만 추가한다.

## Coverage Targets

- `ActivityDraft` 모델 + (calendarId, externalEventId) 유니크 인덱스 마이그레이션 [why: draft-schema] [multi-step: 2]
- Google·Apple provider별 외부 캘린더 목록·이벤트 조회 어댑터 [why: provider-fetch] [multi-step: 2]
- POST /api/trips/:id/calendar-import 엔드포인트 + 권한(host 이상) 검증 [why: import-api] [multi-step: 2]
- ActivityDraft → Activity 승격 API + 필수 필드 검증 [why: draft-promote]
- trip 일정 화면 draft 분리 표시 + "외부 캘린더에서 가져옴" 배지 [why: ui-draft-row]
- "외부 캘린더에서 일정 가져오기" 트리거 + 캘린더 선택 모달 [why: ui-import-trigger] [multi-step: 2]
- draft 승격 모달(필수 필드 입력 + 명소·호텔 reference 선택) [why: ui-promote-modal] [multi-step: 2]
- import 결과 요약(가져온/건너뛴/실패 건수) 표시 [why: ui-import-summary]
- trip 삭제 시 draft cascade 제거 [why: draft-cascade]
- ADR 0006 — 외부 캘린더 import 정책 문서화 [why: adr-import-policy]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16). Python 3.10+ (MCP — 본 피처 영향 없음).
**Primary Dependencies**: Next.js 16 (App Router · Turbopack), React 19, Prisma 7 (Neon Postgres adapter), Auth.js v5, `@googleapis/calendar`(Google), 기존 CalDAV 클라이언트 모듈(`src/lib/caldav/*`, v2.11.0 도입). shadcn/ui (vendored), Radix UI primitives, Tailwind CSS v4. **본 피처 신규 의존성 도입 없음** — v2.14.1 Active Technologies 승계.
**Storage**: Neon Postgres (Production `neondb` / Preview·Dev `neondb_dev`). Prisma 마이그레이션 1건(schema-only): `ActivityDraft` 추가 + `(calendarId, externalEventId)` 유니크 인덱스.
**Testing**: Vitest + Testing Library (component·unit), Prisma 통합 테스트(Neon Dev DB), 수동 dev.trip.idean.me 검증(import → draft → 승격 흐름).
**Target Platform**: 데스크탑·모바일 브라우저(Chromium·Safari·Firefox). 단방향 import는 서버 사이드 라우트(Vercel Functions, Fluid Compute).
**Project Type**: Web application (Next.js App Router + Python MCP. MCP는 본 피처 영향 없음).
**Performance Goals**: import 1회 50건 처리에 사용자 체감 1분 이내(SC-001). API 응답은 외부 provider 호출 latency가 지배. 본 피처에서 Active CPU 증가 ≤ 1초/건.
**Constraints**: 외부 캘린더 호출은 read-only(쓰기 안 함). 멱등성 위반 0건. ADR 0003 모델·기존 push 경로 변경 없음. 단방향만(외부 변경 자동 반영 금지).
**Scale/Scope**: 한 번 import에서 다루는 이벤트 ≤ 50건(SC-001·Assumptions). Trip 1개당 활성 draft 수 ≤ 50. 대량 처리(100건+)는 본 마일스톤 범위 외.

## Constitution Check

*GATE: Phase 0 진입 전 통과, Phase 1 설계 후 재확인.*

| 원칙 | 평가 | 비고 |
|------|------|------|
| I. AX-First | ✅ 위반 없음 | import 자체는 데이터 이전 흐름. AI 흐름과 직교. 후속에서 LLM 기반 draft 보강은 별도 ADR 후 검토(Out of Scope). |
| II. Minimum Cost | ✅ 위반 없음 | 신규 라이브러리·서비스 0. 기존 Google·Apple provider 재사용. 외부 호출은 사용자 OAuth/CalDAV 토큰 범위 내. |
| III. Mobile-First Delivery | ✅ 위반 없음 | draft row·승격 모달·import 트리거는 spec 026 반응형 토큰 위에서 모바일 폭 회귀 없이 설계. |
| IV. Incremental Release | ✅ 위반 없음 | US1(P1) → US2(P2) → US3(P3) 단계적. P1 단독 머지로도 사용자 가치 닫힘. |
| V. Cross-Domain Integrity | ⚠ 점검 필요 | "외부 탐색 → 일정 편성"은 헌법 Domain Ownership 테이블의 허용 패턴(검색 결과 → 활동 전환)과 같은 단방향. 다만 외부 캘린더는 "외부 탐색"의 새 유형. Phase 0 research에서 도메인 경계 검토. |
| VI. RBAC | ⚠ 점검 필요 | "캘린더 import"는 권한 매트릭스에 없는 신규 행위. Phase 0에서 매트릭스 추가안 정리(잠정: OWNER·HOST O, GUEST X — 일정/활동 편집과 동일 기준). |

**Gate**: V·VI 행위 분류만 Phase 0에서 결정하면 통과. 신규 매트릭스 행 추가 결정만 필요하며 헌법 개정은 불필요(헌법 VI는 "행위 추가 시 매트릭스에 먼저 등록"을 요구하므로 매트릭스 갱신은 정상 절차).

## Project Structure

### Documentation (this feature)

```text
specs/027-external-calendar-import/
├── plan.md              # This file
├── research.md          # Phase 0 output (provider 어댑터, 멱등성, 권한 결정)
├── data-model.md        # Phase 1 output (ActivityDraft + 관계)
├── quickstart.md        # Phase 1 output (수동 import → 승격 검증 시나리오 + Evidence)
├── contracts/           # Phase 1 output
│   ├── calendar-import.openapi.yaml
│   └── activity-draft.openapi.yaml
├── checklists/
│   └── requirements.md  # spec quality (작성 완료)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
prisma/
└── migrations/
    └── 20260527XXXXXX_add_activity_draft/migration.sql   # [migration-type: schema-only]

src/
├── app/
│   ├── api/
│   │   └── trips/[id]/
│   │       ├── calendar-import/route.ts                  # POST: import 트리거
│   │       └── drafts/
│   │           ├── route.ts                              # GET: draft 목록
│   │           └── [draftId]/promote/route.ts            # POST: 승격
│   └── trips/[id]/
│       └── components/
│           ├── CalendarImportDialog.tsx                  # 캘린더 선택 + 트리거
│           ├── DraftActivityRow.tsx                      # 일정 화면 draft 표시
│           ├── DraftPromoteDialog.tsx                    # 승격 모달
│           └── ImportResultToast.tsx                     # 결과 요약
├── lib/
│   ├── calendar-import/
│   │   ├── google.ts                                     # Google Calendar 외부 이벤트 fetch
│   │   ├── apple.ts                                      # Apple CalDAV 외부 이벤트 fetch
│   │   ├── mapper.ts                                     # 외부 이벤트 → ActivityDraft 매핑
│   │   ├── idempotency.ts                                # (calendarId, externalEventId) 중복 처리
│   │   └── service.ts                                    # import 오케스트레이터
│   └── permissions/
│       └── activity.ts                                   # importCalendar 행위 추가
└── prisma/
    └── schema.prisma                                     # ActivityDraft 모델 추가

docs/
└── adr/
    └── 0006-external-calendar-import-policy.md           # 외부 → 내부 단방향, 캘린더 정본 미변경
```

**Structure Decision**: 기존 도메인 디렉토리 구조에 `src/lib/calendar-import/` 1개 모듈을 신설. provider별 fetch는 v2.8.0 Google + v2.11.0 Apple CalDAV 클라이언트를 어댑터 형태로 호출만 하고 직접 외부 호출 코드는 import 모듈에 두지 않는다(이중 책임 회피). API는 trip 도메인 산하의 `calendar-import`·`drafts` 서브리소스로 둔다.

## Phase 0: Research

### 1. provider별 외부 캘린더 fetch 인터페이스

**Decision**: 어댑터 인터페이스 `ExternalCalendarFetcher`를 두고 Google·Apple 구현체가 같은 시그니처(`listCalendars(userId)`, `listEvents(userId, calendarId, range)`)를 제공한다. import 서비스는 어댑터만 의존, provider 분기는 어댑터 선택에서 끝낸다.
**Rationale**: spec 024 calendar-provider-abstraction에서 push 방향 어댑터가 이미 같은 패턴으로 정착. pull 방향에서도 동일 패턴 재사용으로 신규 경로 0. 헌법 II Minimum Cost 부합.
**Alternatives considered**: provider별 import 서비스를 분리 — 멱등성·요약 처리가 두 곳에 중복. 기각.

### 2. 외부 이벤트 식별자 안정성

**Decision**: Google은 `event.id`(UUID-like, 안정), Apple CalDAV는 `UID`(iCalendar 표준, 안정)를 사용. 두 값을 `externalEventId` 컬럼에 그대로 저장하고 provider 구분은 별도 `provider` 컬럼 + `calendarId`(외부 캘린더 자체 식별자)로 묶는다. 유니크: `(provider, calendarId, externalEventId)`.
**Rationale**: Google·Apple 모두 이벤트 ID 영속성을 문서로 보장. 사용자가 외부에서 동일 내용을 삭제 후 다시 만들면 새 ID가 발급되어 새 draft가 만들어지는 것이 의도(서로 다른 사용자 의도).
**Alternatives considered**: title+start hash로 식별 — 동일 시간 동일 제목 이벤트가 의도적으로 둘일 수 있음(예: 왕복 항공편). 기각.

### 3. 권한 (헌법 VI)

**Decision**: 새 행위 `import calendar events`를 권한 매트릭스에 등록. **OWNER: O, HOST: O, GUEST: X** — "일정/활동 편집"과 동일 기준. draft 승격은 별도 행위가 아니라 "일정/활동 편집"의 일부로 본다(승격은 새 Activity 생성과 동치).
**Rationale**: import는 trip의 일정 내용을 늘리는 작업. 게스트가 열람만 가능한 현재 정책과 일치. 별도 OWNER 한정으로 좁히면 호스트의 일정 편성 권한과 충돌.
**Alternatives considered**: OWNER 한정 — 호스트의 편집 권한과 불일치. 기각. GUEST 허용 — 헌법 VI 위반. 기각.

### 4. 멱등성 구현

**Decision**: import 서비스가 외부 이벤트 N건을 받으면 (provider, calendarId, externalEventId) 셋을 키로 기존 draft를 lookup. 존재하면 skip 카운트만 올리고 새 draft를 만들지 않는다. "다시 가져오기"는 별도 엔드포인트 `POST /api/drafts/:id/refresh`에서 기존 draft를 lookup해 매핑 가능 필드만 덮어쓴다(매핑 불가 필드는 보존).
**Rationale**: 데이터베이스 레벨 유니크 인덱스 + 어플리케이션 레벨 lookup 이중 안전망. 동시성 race에서도 유니크 제약이 차단.
**Alternatives considered**: upsert 사용 — 매핑 불가 필드 보존 로직이 SQL에 섞여 복잡해짐. 기각.

### 5. import 트리거 UX 위치

**Decision**: trip 상세 페이지 우상단의 기존 "외부 캘린더" 패널(spec 019/020에서 도입된 `GCalLinkPanel` 류) 옆에 "외부 캘린더에서 일정 가져오기" 버튼을 추가. 클릭 시 모달이 열리고 사용자가 연결된 외부 계정의 캘린더 목록에서 1개를 선택해 "가져오기" 실행.
**Rationale**: 캘린더 push 흐름과 시각적으로 같은 위치에 있어야 사용자가 "여기는 캘린더 관련"이라는 멘탈 모델을 유지. 별도 페이지·메뉴 진입을 만들면 발견성 저하.
**Alternatives considered**: trip 일정 목록 상단의 "추가" 메뉴 안에 import 옵션 — 가시성은 좋지만 캘린더 push와 위치가 분산되어 사용자 학습 비용 증가. 기각.

### 6. draft 표시 위치 — 일정 목록 vs 별도 탭

**Decision**: 일정 목록(`/trips/[id]`의 Day별 Activity 리스트)에 정식 Activity와 draft를 같이 표시하되, draft는 dimmed 스타일 + "외부 캘린더에서 가져옴" 배지로 시각 구분. 클릭 시 승격 모달이 열린다.
**Rationale**: draft가 별도 탭에 들어가면 "내가 가져온 일정이 어디 갔지" 의 발견 문제. 같은 일정 흐름 안에서 보이고 즉시 승격 가능해야 사용자가 import의 가치를 즉시 체감한다.
**Alternatives considered**: "Draft" 별도 탭 — 발견성 저하. 기각. 알림/배지로만 표시 — 일정 흐름과 분리되어 승격이 별도 작업처럼 보임. 기각.

### 7. 사용자가 channel 미연결 상태 처리

**Decision**: import 트리거 시 백엔드가 사용자 외부 계정 연결 상태를 확인. Google·Apple 둘 다 미연결이면 모달 안에서 "캘린더 계정을 먼저 연결하세요" 안내 + 기존 연결 페이지(`/settings/calendars`)로 가는 버튼만 노출. import 자체는 시작하지 않는다.
**Rationale**: FR-011·SC-005 충족. 미연결 사용자에게 옵션을 숨기지 않고 다음 행동을 안내해야 막다른 길이 안 생긴다.
**Alternatives considered**: 버튼 자체를 숨김 — 사용자가 "기능이 있는지조차" 알 수 없음. 기각.

### 8. 부분 실패 처리

**Decision**: import 한 batch 안에서 이벤트 단위 try/catch. 성공은 draft 생성·skip 분류, 실패는 실패 카운트 + 실패 사유 로그(서버) 후 응답에 `failedCount`로 합산. 사용자 응답에는 실패한 이벤트의 외부 제목 첫 3건을 예시로 보여준다(privacy 고려해 description은 노출 안 함).
**Rationale**: 외부 provider 일시 오류로 전체 import를 막으면 사용자 가치 손실. 멱등성이 있으므로 재실행 시 실패분만 다시 시도하면 됨.
**Alternatives considered**: 전체 batch atomic — 외부 호출 N개를 트랜잭션에 묶을 수 없음. 기각.

## Phase 1: Design & Contracts

### Data Model

`data-model.md`에 상세. 본 plan에서는 요지만:

- 새 모델 `ActivityDraft` — Activity와 별도 테이블. Trip·Day 참조. provider/calendarId/externalEventId 3-tuple 유니크. 매핑 가능 필드(title, startTime, endTime, locationText, description, isAllDay) + 매핑 불가 후보(timezone fields는 nullable). promotedToActivityId nullable(승격 후 정식 Activity와 연결).
- `ImportRun` — import 1회 실행의 메타. tripId, userId, calendarId, importedCount, skippedCount, failedCount, startedAt, finishedAt.
- 헌법 V — `ActivityDraft`는 "일정 편성" 도메인 소유. "여행 탐색"이 외부 캘린더 이벤트를 들고 와서 만든다는 점에서 spec 헌법의 "검색 결과 → 활동 전환" 단방향 패턴과 일치(도메인 위반 아님).

### Contracts

`contracts/calendar-import.openapi.yaml`:

- `POST /api/trips/{tripId}/calendar-import` — request: `{ provider, calendarId }`. response: `{ importRunId, importedCount, skippedCount, failedCount, failedTitles[≤3] }`. 권한: host 이상.
- `GET /api/users/me/external-calendars` — 사용자가 연결한 모든 외부 계정의 캘린더 목록.

`contracts/activity-draft.openapi.yaml`:

- `GET /api/trips/{tripId}/drafts` — trip의 draft 목록.
- `POST /api/trips/{tripId}/drafts/{draftId}/promote` — request: `{ type, hotelId?, attractionId?, reservationStatus, startTimezone, endTimezone }`. response: `{ activityId }`. 필수 필드 미충족 시 422.
- `POST /api/trips/{tripId}/drafts/{draftId}/refresh` — 외부 최신 값으로 매핑 가능 필드 덮어쓰기.
- `DELETE /api/trips/{tripId}/drafts/{draftId}` — draft 단건 삭제.

### Quickstart

`quickstart.md`에 다음 시나리오 + Evidence 섹션:

1. dev에서 외부 Google 캘린더 1개에 trip 기간 내 이벤트 3개 생성
2. trip-planner에서 새 trip 생성 → 외부 캘린더 선택 → import 실행
3. 일정 화면에 draft 3개 노출(배지 확인)
4. 같은 import 재실행 → draft 수 그대로(멱등성 확인)
5. draft 1건 클릭 → 승격 모달 → 필수 필드 입력 → 정식 Activity 전환
6. trip 캘린더에 push 동작 확인(ADR 0003 모델)

Evidence: import 응답 JSON 캡처, draft 목록 스크린샷, 승격 후 trip 캘린더 화면 캡처.

### Agent Context Update

`update-agent-context.sh claude` 실행으로 CLAUDE.md의 Active Technologies에 027 entry 추가:

- TypeScript 5.x, Node.js 20+ + Next.js 16, Prisma 7, 기존 Google·Apple 어댑터 재사용. **신규 의존성 없음**.
- Neon Postgres — `ActivityDraft` 모델 1종 추가, `ImportRun` 모델 1종 추가. 마이그레이션 1건 schema-only.

## Constitution Re-Check (Post-Design)

| 원칙 | 평가 |
|------|------|
| I. AX-First | ✅ — Phase 1에서 AI 호출 도입 안 함. 후속 ADR 후 검토 가능. |
| II. Minimum Cost | ✅ — 신규 의존성 0, 신규 서비스 0. |
| III. Mobile-First | ✅ — 모달·draft row 모두 spec 026 토큰 기반. |
| IV. Incremental Release | ✅ — US1 단독 머지 가능, US2·US3는 후속 PR. |
| V. Cross-Domain Integrity | ✅ — 외부 이벤트 → ActivityDraft는 "여행 탐색 → 일정 편성"의 변형. 단방향. |
| VI. RBAC | ✅ — 권한 매트릭스에 `import calendar events` 행 추가(OWNER·HOST O, GUEST X). 헌법 개정 불요. |

**Re-check 통과** — Phase 2 (`/speckit.tasks`) 진입 가능.

## Complexity Tracking

위반 없음. 표 생략.
