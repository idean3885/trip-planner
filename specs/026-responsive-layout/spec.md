# Feature Specification: 데스크탑·모바일 반응형 근본 대응

**Feature Branch**: `026-responsive-layout`
**Created**: 2026-05-26
**Status**: Draft
**Input**: User description: "데스크탑·모바일 반응형 근본 대응 (v2.13.0). 현재 UI가 모바일 폭(~640px)에 고정되어 데스크탑에서 좌우 공백이 과하고 정보 밀도가 낮다. 실 사용은 웹에서 일정 탐색·편집·저장이 다수고 여행 중에만 모바일. 디자인 시스템 토큰에 breakpoint·container max-width·grid·gap 정비를 우선하고, 주요 페이지·컴포넌트의 데스크탑 ≥1024px 멀티컬럼·정보 밀도 향상을 적용. 모바일 <768px는 현 동작 유지(회귀 없음). 마일스톤 #33."

## Clarifications

1. **breakpoint 분류** — `<768px = 모바일`, `768–1023px = 태블릿(전환구간, 기존 모바일 동작 유지)`, `≥1024px = 데스크탑(멀티컬럼 활성)`, `≥1440px = 와이드(컨텐츠 max-width 적용으로 좌우 공백 제한)`. /docs 페이지가 v2.12.0(#477)에서 적용한 풀폭 패턴(컨텐츠 max ~1280–1440px)을 다른 화면에도 같은 토큰으로 확장한다.
2. **회귀 기준** — 모바일(<768px)에서 보이는 화면·동작은 본 작업으로 변경하지 않는다. 데스크탑 변경은 추가 분기로 들어가며, 모바일은 기존 클래스 유지.
3. **출발선** — 디자인 토큰(Tailwind v4 `@theme`·Style Dictionary)부터 정비하고 페이지·컴포넌트를 그 위에서 손본다. 페이지를 먼저 손보고 토큰을 사후 보강하지 않는다(근본 대응).
4. **사용 빈도 우선순위** — trip 상세(`/trips/[id]`) > trip 목록(`/trips`) > 캘린더 모달(`GCalLinkPanel`) > 설정·기타. 데스크탑 이득이 큰 화면부터 작업.

## Metatag Conventions *(normative, inherited from PR #204)*

본 피처의 tasks.md·plan.md는 네 종 메타태그를 사용한다:

- `[artifact: <path>|<path>::<symbol>]`
- `[why: <short-tag>]`
- `[multi-step: N]`
- `[migration-type: ...]` (본 피처는 스키마 변경 없음 — 사용 0)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 데스크탑에서 trip 상세를 좌우 분할로 본다 (Priority: P1)

여행 계획을 세우는 동안 사용자는 데스크탑 브라우저에서 trip 상세 페이지를 연다. 현재는 모바일 폭에 고정된 단일 컬럼이라 좌우에 큰 공백이 비고, 한 화면에 보이는 Day·Activity 수가 적다. 데스크탑 ≥1024px에서는 여행 요약·멤버·캘린더 패널이 우측 사이드로 분리되고, 본문은 Day/Activity 목록이 더 넓게 펼쳐져 한 화면에 더 많은 일정이 보인다.

**Why this priority**: 사용자 본인이 가장 자주 쓰는 화면(일정 탐색·편집·저장). 데스크탑 이득이 가장 크고, 토큰을 한 번 정비하면 다른 화면에도 같은 패턴이 재사용된다.

**Independent Test**: 데스크탑(≥1024px)에서 trip 상세 페이지를 열면 좌우 멀티컬럼 레이아웃이 노출되고, 동일 페이지를 모바일(<768px)에서 열면 단일 컬럼 그대로(회귀 없음)임을 시각 비교로 확인 가능.

**Acceptance Scenarios**:

1. **Given** 데스크탑(1440px) 브라우저, **When** trip 상세를 연다, **Then** 좌측에 Day/Activity 본문(약 2/3 폭), 우측 사이드에 trip 메타·멤버·캘린더 패널(약 1/3 폭)이 나란히 보인다.
2. **Given** 모바일(375px) 브라우저, **When** 동일 trip 상세를 연다, **Then** v2.12.x와 동일한 단일 컬럼 레이아웃이 보인다(회귀 없음).
3. **Given** 태블릿(900px) 브라우저, **When** trip 상세를 연다, **Then** 모바일 단일 컬럼 동작이 유지된다(전환구간).
4. **Given** 와이드(1920px) 모니터, **When** trip 상세를 연다, **Then** 컨텐츠는 정의된 최대 폭에서 중앙 정렬되어 좌우 빈 공간이 무한 확장되지 않는다.

---

### User Story 2 - 디자인 시스템 토큰에 반응형 척도가 있다 (Priority: P1)

다음 화면을 작업하는 개발자(사용자 본인 + 향후 AI 에이전트)는 breakpoint·container max-width·grid·gap을 매번 임의로 정하지 않고 한 곳의 토큰을 참조한다. /docs 페이지가 #477에서 쓴 풀폭 패턴이 같은 토큰을 참조하도록 일원화된다.

**Why this priority**: 토큰이 없으면 페이지마다 다른 px 값이 흩어져 다음 화면 작업·유지보수 비용이 누적된다. 본 피처의 근본 대응 정의 = 토큰을 먼저 정비.

**Independent Test**: 디자인 토큰 파일(Tailwind `@theme` 블록 / Style Dictionary 소스)에 `breakpoint-mobile`, `breakpoint-tablet`, `breakpoint-desktop`, `breakpoint-wide`, `container-max-content`, `container-max-wide` 같은 정식 토큰이 정의되어 있고, 적어도 trip 상세·trip 목록·캘린더 모달이 그 토큰을 직접 참조하는지 grep으로 확인 가능.

**Acceptance Scenarios**:

1. **Given** 디자인 토큰 SSOT, **When** 새 페이지를 만든다, **Then** 컨테이너·breakpoint 클래스를 토큰에서 즉시 가져와 쓸 수 있다(중복 px 정의 없음).
2. **Given** 토큰 값을 한 곳에서 변경, **When** 빌드 재실행, **Then** 토큰을 참조하는 페이지·컴포넌트가 일괄 갱신된다(임의 px가 어디에도 남지 않음).

---

### User Story 3 - 캘린더 모달·Form·Card 그리드가 데스크탑에서 정보 밀도를 높인다 (Priority: P2)

`GCalLinkPanel` 다이얼로그, `/trips` 카드 그리드, 활동 편집 Form 등 사용 빈도가 높은 컴포넌트가 데스크탑에서 더 넓은 폭·다단 그리드를 사용한다.

**Why this priority**: trip 상세 사이드 패널 확보 후 두 번째로 자주 접하는 표면. trip 상세를 먼저 끝낸 뒤 같은 토큰을 재사용해 진행.

**Independent Test**: 데스크탑(1440px)에서 `/trips`를 열면 카드가 한 행에 2~3개 보이고, 모달은 정의된 최대 폭(예: 640–720px)에서 중앙 정렬된다. 모바일에서는 1열·풀폭 모달 그대로.

**Acceptance Scenarios**:

1. **Given** 데스크탑, **When** `/trips`를 연다, **Then** 카드 그리드가 2~3열로 노출된다.
2. **Given** 데스크탑, **When** 캘린더 모달을 연다, **Then** 모달 폭이 모바일보다 넓되 정의된 최대치를 초과하지 않는다.
3. **Given** 모바일, **When** 동일 화면을 연다, **Then** 카드 1열·모달 풀폭 동작이 유지된다.

---

### User Story 4 - 글로벌 NavBar·헤더가 데스크탑에서 정보·액션을 더 노출한다 (Priority: P3)

데스크탑에서 NavBar는 햄버거 메뉴 뒤에 숨어 있던 액션·정보를 가로로 펼친다. 모바일에서는 햄버거 그대로.

**Why this priority**: 다른 P1·P2 작업이 끝난 뒤 일관 정비. 단독으로도 가치 있으나 trip 상세·목록 개선이 더 큰 효과.

**Independent Test**: 데스크탑에서 NavBar에 주요 액션(여행 추가·설정·로그인 상태)이 직접 노출되는지, 모바일에서는 햄버거가 그대로인지 시각 비교.

**Acceptance Scenarios**:

1. **Given** 데스크탑, **When** 어떤 페이지든 연다, **Then** NavBar에 주요 액션이 가로로 펼쳐져 보인다.
2. **Given** 모바일, **When** 동일 페이지를 연다, **Then** 햄버거 메뉴 동작 그대로 유지된다.

---

### Edge Cases

- 브라우저 폭이 정확히 breakpoint 경계(768px, 1024px, 1440px)일 때 한 분기만 일관 적용 — 깜박이지 않는다.
- 데스크탑에서 사이드 패널 컨텐츠가 비어 있는 경우(예: 멤버 0명) 본문 컬럼이 폭을 자연 흡수해 빈 공간이 무한 확장되지 않는다.
- 사용자가 데스크탑에서 브라우저 창을 좁히면 즉시 모바일 단일 컬럼으로 전환된다(JS 의존 없이 CSS만으로 동작).
- 인쇄(print) 미디어는 본 피처 범위 외 — 별도 작업.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 디자인 토큰 SSOT(Tailwind `@theme` + Style Dictionary 소스)에 breakpoint(`mobile / tablet / desktop / wide`), container max-width(`content / wide`), 데스크탑 grid·gap 토큰이 정식 키로 정의되어 있다.
- **FR-002**: trip 상세 페이지(`/trips/[id]`)는 ≥1024px에서 본문 + 사이드 멀티컬럼 레이아웃을 노출한다. <768px에서는 v2.12.x와 동일한 단일 컬럼 동작을 유지한다.
- **FR-003**: trip 목록 페이지(`/trips`)는 ≥1024px에서 카드 그리드를 2열 이상으로 노출한다. <768px에서는 1열 그대로 유지한다.
- **FR-004**: 캘린더 공유 다이얼로그(`GCalLinkPanel`)는 데스크탑에서 정의된 최대 폭에서 중앙 정렬되고, 모바일에서는 풀폭에 가까운 기존 동작을 유지한다.
- **FR-005**: 활동 편집·생성 Form은 ≥1024px에서 라벨·입력이 가로 정렬 또는 2열로 정보 밀도를 높이고, <768px에서는 세로 단일 컬럼 그대로 유지한다.
- **FR-006**: 글로벌 NavBar는 ≥1024px에서 주요 액션·메뉴를 가로로 노출하고, <768px에서는 햄버거 메뉴 동작을 유지한다.
- **FR-007**: 와이드 디스플레이(≥1440px)에서 전 페이지가 정의된 컨텐츠 max-width 안에서 중앙 정렬되어 좌우 공백이 무한 확장되지 않는다.
- **FR-008**: 토큰을 참조하지 않는 임의 px 값이 페이지·컴포넌트 코드에 잔존하지 않는다(작업 대상 범위 내). 잔존이 필요한 경우 사유를 코드 또는 ADR에 명시한다.
- **FR-009**: 본 피처의 데이터 스키마·API 변경은 없다.
- **FR-010**: 작업 대상 페이지·컴포넌트는 데스크탑·모바일 각각에서 e2e 또는 비주얼 회귀 검증(스크린샷 비교)으로 통과한다. 자동 e2e 가용성에 따라 수동 시나리오로 대체 가능.

### Key Entities

본 피처는 데이터·엔티티 변경이 없다. UI 토큰과 레이아웃 분기만 변경된다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 데스크탑(1440px)에서 trip 상세를 열면 한 화면에 보이는 Day·Activity 수가 동일 데이터 기준 모바일 대비 1.5배 이상 증가한다(스크린샷·요소 카운트 비교).
- **SC-002**: 데스크탑(1440px)에서 trip 상세·trip 목록·캘린더 모달의 좌우 빈 여백 합이 전체 가로 폭의 20% 이하가 된다(현재 50% 이상에서 개선).
- **SC-003**: 모바일(375px)에서 본 피처 작업 대상 페이지 시각 회귀 0건(스크린샷 diff 또는 수동 점검 체크리스트).
- **SC-004**: 새 화면을 추가할 때 breakpoint·max-width·grid를 토큰 1개 참조로 끝낸다(즉 신규 페이지 PR에 임의 px 정의 0건).
- **SC-005**: 사용자 본인이 데스크탑에서 일정 편집 1건을 끝내는 데 걸리는 클릭·스크롤 수가 모바일 대비 명확히 감소(주관 평가 + 수동 측정 1라운드).

## Assumptions

- v2.12.0 `/docs` 풀폭 패턴(#477)이 본 피처의 토큰 정비와 호환되는 출발선이다. 동일 토큰으로 일원화한다.
- Tailwind v4 `@theme` CSS-first 구성과 Style Dictionary v4(이미 도입됨, spec 012/013) 위에서 작업한다. 추가 라이브러리 도입 없음.
- 데이터·API 변경이 없으므로 prisma migration·MCP 도구 변경은 없다.
- 본 피처 종료 시점에 모든 신규 React 컴포넌트는 데스크탑 분기 코드가 토큰 키로만 작성되어 있다.

## Out of Scope

- 인쇄(print) 미디어 최적화
- 다크/라이트 테마 토큰 추가(별도 작업)
- 모바일 UX 자체 재설계(본 작업은 모바일은 유지·데스크탑 추가)
- 접근성 키보드 단축키·포커스 트랩 재정비(별도 이슈)
- 새로운 페이지·기능 추가
