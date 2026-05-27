# Feature Specification: 캘린더 동기화 UI 통합

**Feature Branch**: `028-calendar-sync-dialog`
**Created**: 2026-05-27
**Status**: Draft
**Input**: User description: "캘린더 동기화 UI 통합 — 단일 진입점 + 단일 다이얼로그(섹션 동적 확장)로 SidePanel 분산 패널 통합"
**Related**: Epic #535, Milestone v2.16.0 (#38), Spec 019/020·025·027

## Clarifications

1. **단일 진입점** — trip 상세 SidePanel에 "외부 캘린더 동기화" 카드 1개만 노출. 5종 분산 패널(`CalendarProviderChoice`, `GCalLinkPanel`, `AppleEntryCard`, `CalendarImportPanel`, `DraftListPanel`)은 모두 본 카드의 다이얼로그 내부로 흡수.
2. **단일 다이얼로그 + 섹션 동적 확장** — 진입 카드 클릭 시 다이얼로그 1개가 열리고, 그 내부에서 모든 동선이 처리된다. 새 페이지·서브 모달·라우팅 분기 없음(depth 0).
3. **도메인·API 미변경** — v2.15.x 엔드포인트·서비스·DB 그대로 재사용. UI 컴포넌트 트리만 재배치.
4. **권한 분기 유지** — OWNER·HOST·GUEST 표시 정책 동일. GUEST 다이얼로그에는 편집 액션 비활성/숨김.
5. **모바일 회귀 0건** — 다이얼로그가 <768px 폭에서 섹션 스택, 가로 스크롤 발생 금지.

## Metatag Conventions

본 피처의 tasks.md·plan.md는 네 종 메타태그(`[artifact]`, `[why]`, `[multi-step]`, `[migration-type]`)로 후속 자동 검증과 연결.

## User Scenarios & Testing

### User Story 1 — 단일 진입점 + provider 연결 (Priority: P1) 🎯 MVP

OWNER가 trip 상세에 진입 시 SidePanel에 "외부 캘린더 동기화" 카드 1개만 보임. 카드 클릭 → 다이얼로그 1개가 열림. 다이얼로그 안에 현재 연결 상태와 provider 선택지가 같이 보이고, 연결 액션이 같은 다이얼로그 안에서 수행된다.

**Why this priority**: SidePanel 노이즈 제거 + 진입점 단일화가 본 피처의 핵심 가치. P1 단독 머지로 이 가치는 닫힌다.

**Independent Test**: 새 trip 생성 후 SidePanel에 "외부 캘린더 동기화" 카드 1개만 보임. 카드 클릭 → 다이얼로그 안에서 provider 선택지·연결 상태·연결 액션이 같이 노출.

**Acceptance Scenarios**:

1. **Given** OWNER가 trip 상세에 진입하고 캘린더 미연결 상태일 때, **When** SidePanel을 보면, **Then** "외부 캘린더 동기화" 카드 1개만 보이고 기존 5종 패널은 직접 노출되지 않는다.
2. **Given** 카드를 클릭할 때, **When** 다이얼로그가 열리면, **Then** provider 선택지(Google·Apple)와 현재 연결 상태가 같은 화면 안에 보인다.
3. **Given** 다이얼로그 안에서 Google 연결을 완료할 때, **When** 결과가 갱신되면, **Then** 다이얼로그가 닫히지 않고 "외부 캘린더에서 가져오기" 섹션이 동적으로 자라 같은 다이얼로그에 표시된다.

---

### User Story 2 — 같은 다이얼로그 안에서 import + draft 관리 (Priority: P2)

다이얼로그가 열린 사용자가 같은 화면 안에서 import 실행 → draft 목록이 자람 → 같은 다이얼로그 안에서 승격·refresh·삭제 모두 수행. 별도 페이지·서브 모달 없음.

**Why this priority**: P1만 머지해도 진입점 단일화 가치는 닫히지만, draft 관리까지 같은 화면에서 처리되어야 깊이 0 정책이 완성.

**Independent Test**: P1 통과 후 다이얼로그 안에서 "가져오기 시작" → 같은 다이얼로그 안에 draft 목록이 자람 → 승격·다시 가져오기·삭제 모두 같은 다이얼로그 안에서 수행 가능.

**Acceptance Scenarios**:

1. **Given** 다이얼로그 안에서 import를 실행해 draft 3건이 만들어질 때, **When** 결과가 반영되면, **Then** 같은 다이얼로그 안에 draft 3건 목록이 자라 표시된다(별도 페이지·서브 모달 없음).
2. **Given** draft 1건을 승격할 때, **When** 카테고리·예약 상태·시간대 입력 폼이 표시되면, **Then** 폼이 같은 다이얼로그 내부 영역에서 나타나고 승격 후 row가 사라진다.
3. **Given** draft 컨텍스트 메뉴 "다시 가져오기"를 실행할 때, **When** 외부 최신 값으로 매핑 가능 필드가 갱신되면, **Then** 같은 다이얼로그 안에서 변경이 반영된다.

---

### User Story 3 — 권한별 분기 (Priority: P3)

같은 진입 카드를 클릭해도 사용자 권한(OWNER·HOST·GUEST)에 따라 다이얼로그가 노출하는 섹션·액션이 다르다. GUEST는 읽기만 가능, 편집 액션은 비활성/숨김.

**Why this priority**: 권한 매트릭스는 헌법 VI에서 이미 정의. UI 조건 분기만 추가. P1·P2 후순위.

**Independent Test**: GUEST로 trip 진입 → 같은 카드 클릭 → 다이얼로그 안에 import·승격·삭제 비활성. HOST로 진입 → 모든 액션 활성, OWNER 전용 액션만 비활성.

**Acceptance Scenarios**:

1. **Given** GUEST가 카드를 클릭할 때, **When** 다이얼로그가 열리면, **Then** "외부 캘린더에서 가져오기" 진입은 비활성/숨김이고 안내 문구가 노출된다.
2. **Given** HOST가 다이얼로그를 열 때, **Then** import·승격·refresh·삭제 모두 사용 가능, OWNER 전용 액션(있는 경우)은 비활성.

### Edge Cases

- 외부 캘린더 권한 부족 — 다이얼로그 안 인라인 재동의 진입(v2.15.1 진단 분기 흡수).
- 외부 캘린더 0건 — "가져올 수 있는 외부 캘린더 없음" 같은 섹션 안 표시.
- 모바일(<768px) — 섹션 세로 스택, 가로 스크롤 0건.
- draft 0건 — 빈 상태 또는 섹션 자체 생략(plan에서 결정).
- OAuth 재동의 후 redirect 복귀 — 다이얼로그 자동 재오픈 또는 1회 클릭 복귀.
- 권한 승격 직후 — 새로고침 없이 다이얼로그 액션 활성 갱신 또는 새로고침 안내.

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 trip 상세 SidePanel에 "외부 캘린더 동기화" 진입 카드를 1개만 노출하고 기존 5종 분산 패널은 SidePanel 직접 노출 대상에서 제거해야 한다.
- **FR-002**: 진입 카드 클릭 시 단일 다이얼로그가 열리고 그 안에서 모든 캘린더 관련 동선(provider 선택·연결·sync·import·draft 승격·refresh·삭제)이 처리되어야 한다.
- **FR-003**: 다이얼로그 내부 섹션 표시는 사용자 권한과 trip의 현재 캘린더 연결 상태에 따라 동적으로 결정되어야 한다.
- **FR-004**: 사용자 액션(연결·import·승격·refresh·삭제) 완료 후 같은 다이얼로그 내부 상태·섹션이 갱신되어야 하며, 페이지 새로고침이나 다이얼로그 재오픈을 요구해서는 안 된다.
- **FR-005**: 시스템은 모든 도메인 동작에 대해 v2.15.x 기존 엔드포인트·서비스를 그대로 호출해야 한다. 새 API·DB schema 변경 없음.
- **FR-006**: 다이얼로그는 GUEST에게 읽기 가능 섹션(현재 캘린더 상태·draft 목록 조회)만 표시하고 편집 액션은 노출하지 않거나 비활성화해야 한다.
- **FR-007**: 다이얼로그는 모바일(<768px) 폭에서 섹션이 세로로 스택되며 가로 스크롤이 발생하지 않아야 한다.
- **FR-008**: 시스템은 외부 캘린더 권한 부족·계정 미연결 상태를 같은 다이얼로그 같은 섹션 안에서 분기 안내해야 한다(v2.15.1 진단 분기 흡수).
- **FR-009**: 시스템은 OAuth 재동의 후 redirect 복귀 시 사용자가 다이얼로그를 1회 클릭으로 다시 같은 상태에 도달할 수 있어야 한다.
- **FR-010**: 시스템은 다이얼로그 내부 텍스트 안내가 현재 release 시점의 기능 범위와 일치해야 한다(stale 텍스트 0건).

### Key Entities

UI 통합 피처. 신규 데이터 entity 없음. 기존 entity 재사용:
- `TripCalendarLink`(per-trip 공유 캘린더, ADR 0003)
- `GCalLink`(legacy 병존)
- `AppleCalendarCredential`
- `ActivityDraft`·`ImportRun`(spec 027)

## Success Criteria

### Measurable Outcomes

- **SC-001**: trip 상세 SidePanel 첫 진입 시 캘린더 관련 카드 수가 1개를 넘지 않는다.
- **SC-002**: 사용자가 캘린더 연결 → import 실행 → draft 1건 승격을 다이얼로그 재오픈 없이 1회 진입으로 끝낼 수 있다.
- **SC-003**: 모바일 폭(360·480·768px) 다이얼로그 가로 스크롤 발생 0건.
- **SC-004**: 통합 다이얼로그가 제공하는 액션 매핑이 v2.15.x 5종 패널 액션과 1:1 또는 그 이상으로 닿는다(기능 회귀 0건).
- **SC-005**: GUEST 멤버에게 편집 액션이 노출되는 사례 0건.

## Assumptions

- v2.15.x의 도메인 로직·API·DB schema는 그대로 사용(신규 의존성 0).
- 다이얼로그는 shadcn/ui `Dialog` primitive 위에서 동작(spec 012/013/026 토큰 그대로).
- spec 027의 진단 분기·승격 폼은 통합 다이얼로그 내부 섹션으로 흡수.

## Out of Scope

- 도메인·API·DB schema 변경.
- import 흐름의 양방향 sync 추가(별도 후속).
- AI 기반 draft 보강(별도 ADR).
- 사이드패널 캘린더 외 영역(멤버 목록 등) 재배치.
