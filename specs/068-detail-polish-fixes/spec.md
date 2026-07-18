# Feature Specification: 여행 상세 마감 — 브레드크럼 버그 + 캘린더 배경·사이즈·기간표시 + 카드 테두리 근본 수정

**Feature Branch**: `068-detail-polish-fixes`
**Created**: 2026-07-18
**Status**: Draft
**Input**: 사용자 dev 검증 피드백 배치(브레드크럼·캘린더·카드 테두리·일정 표시).

## Clarifications
1. 카드 테두리 근본 원인 — 카드가 `ring`(바깥 box-shadow)이라 `overflow-hidden` 조상(스와이프 캐러셀 등)이 좌/우/상단을 잘라 테두리가 군데군데 사라진다. 박스모델 `border`로 바꾸면 조상 overflow가 자르지 못한다.
2. 캘린더 배경 — 흰 글래스 박스가 캔버스와 이질적이고 상단 브레드크럼과 통일감이 없다. 투명 + `backdrop-blur`로 캔버스에 블렌딩하고, sticky 시 뒤 콘텐츠는 블러로 가린다.
3. 일정 표시 — 검은/브랜드 연결 바는 과하다. 점(dot)으로 축소. 여행 기간 밴드는 시작·끝만 라운딩, 가운데는 이음새 없이 연속.

## Metatag Conventions *(normative)*
`[artifact]` · `[why]` · `[multi-step]` · `[migration-type]`(해당 없음).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 브레드크럼이 여행 목록으로 간다 (Priority: P1)
여행 상세 상단 '여행 목록' 브레드크럼을 누르면 여행 목록(`/trips`)으로 이동한다.

**Independent Test**: 브레드크럼 링크 href 가 `/trips` 인지 검증.

**Acceptance Scenarios**:
1. **Given** 여행 상세, **When** '여행 목록' 클릭, **Then** `/trips`로 이동한다(인덱스 아님).

---

### User Story 2 - 카드 테두리가 네 변 온전하다 (Priority: P1)
카드 테두리가 좌/우/상단 포함 네 변 모두 온전히 보인다(조상 overflow 클립 없음).

**Independent Test**: 카드 테두리가 `ring`(box-shadow) 대신 `border`로 그려지는지 검증.

**Acceptance Scenarios**:
1. **Given** 스와이프 캐러셀 안 카드, **When** 렌더되면, **Then** 좌/우/상단 테두리가 잘리지 않는다.

---

### User Story 3 - 캘린더가 섹션과 통일되고 콤팩트하다 (Priority: P2)
캘린더가 흰 박스 없이 캔버스에 블렌딩되고(투명+블러), 세로가 줄어 화면을 과점유하지 않는다.

**Independent Test**: 캘린더 래퍼가 불투명 흰 배경/ring/shadow 대신 투명+backdrop-blur 인지, 셀 종횡비가 더 낮은지 검증.

**Acceptance Scenarios**:
1. **Given** 여행 상세, **When** 캘린더가 렌더되면, **Then** 흰 박스가 아니라 투명 글래스로 보인다.
2. **Given** 월 캘린더, **When** 렌더되면, **Then** 세로가 이전보다 줄어 있다.

---

### User Story 4 - 일정 표시가 절제된다 (Priority: P2)
일정 있는 날은 점(dot)으로 표시하고, 여행 기간 밴드는 시작·끝만 둥글고 가운데는 연속이다.

**Independent Test**: 활동 표시가 바 대신 dot 클래스인지, 기간 밴드 라운딩이 시작/끝에만 있는지 검증.

**Acceptance Scenarios**:
1. **Given** 일정 있는 날, **When** 렌더되면, **Then** 연결 바 대신 점으로 표시된다.
2. **Given** 여행 기간, **When** 렌더되면, **Then** 시작·끝만 둥글고 가운데는 이음새 없이 이어진다.

---

### Edge Cases
- 투명+블러 sticky 캘린더 위 날짜 텍스트 대비(4.5:1) — 블러된 콘텐츠 위에서도 판독.
- 기간이 여러 주에 걸칠 때 각 주 행의 양 끝 라운딩.

## Requirements *(mandatory)*
- **FR-001**: '여행 목록' 브레드크럼 링크는 `/trips`로 이동해야 한다.
- **FR-002**: 카드 테두리는 `border`(박스모델)로 그려 조상 overflow 클립을 받지 않아야 한다.
- **FR-003**: 캘린더 래퍼는 불투명 흰 배경 없이 투명+`backdrop-blur`로 렌더(sticky 마스킹 유지).
- **FR-004**: 캘린더 셀 종횡비를 더 낮춰 월 그리드 세로를 줄인다.
- **FR-005**: 일정 있는 날 표시는 점(dot)이어야 한다(연결 바 금지).
- **FR-006**: 여행 기간 밴드는 시작·끝만 라운딩하고 가운데는 연속이어야 한다.
- **FR-007**: 글래스 값·색은 `:root` 토큰 경유(하드코딩 금지).

## Success Criteria *(mandatory)*
- **SC-001**: 브레드크럼이 `/trips`로 이동.
- **SC-002**: 카드 네 변 테두리 온전(클립 0).
- **SC-003**: 캘린더가 투명 글래스로 렌더되고 세로가 축소됨.
- **SC-004**: 일정 표시가 점, 기간 밴드가 끝만 라운딩.
