# Feature Specification: shadcn/ui Phase 2 — 복합 컴포넌트 + 레거시 유틸리티 제거

**Feature Branch**: `013-shadcn-phase2`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "shadcn/ui Phase 2 — 복합 컴포넌트 마이그레이션. 스펙 012의 명시적 후속. 추적 이슈 #301. 선행 POC: spike/shadcn-trip-detail. v2.4.4 develop 머지 완료 상태에서 최신 develop 기준 시작."

## Clarifications *(confirmed decisions)*

1. **semantic ↔ 브랜드 토큰 브릿지는 중성 유지** — 디자이너 합류 전까지 shadcn 기본 semantic 토큰(neutral)을 그대로 둔다. 브랜드 파랑(`--color-primary-*`)을 `--primary`에 연결하지 않는다. 이유: 디자이너가 합류 시 이 매핑을 1순위로 결정할 사안이며, 지금 연결해두면 되돌리기가 토큰 계층 변경이라 비용이 큼.
2. **Latin 폰트 교체는 도입 보류** — Geist 등 Latin 서브셋 교체는 한국어 중심 콘텐츠에서 체감이 미미하고, fallback으로 시스템 한글 서체가 렌더된다. 디자이너가 한국어 포함 타이포 제안을 가져올 때 재검토한다. POC에서 적용했던 Geist 변경은 정식 구현에 포함하지 않는다.
3. **Phase 2 범위는 "마이그레이션 + 정리"로 한정** — 컴포넌트별 세부 디자인 튜닝(애니메이션, 마이크로 인터랙션, 고급 상태 표현)은 Phase 3 이후로 분리. 본 스펙은 "이전 + 레거시 제거" 완수만 성공 기준으로 삼는다.
4. **의존성**: 스펙 012 완료(Phase 1) + develop #285(DAY 넘버링) 머지 + #300(Decimal 직렬화) 해결을 전제. Decimal 미해결 시 Day 상세에서 콘솔 오류가 남아 회귀 판정이 불가.

## Metatag Conventions *(normative, inherited from PR #204)*

본 피처의 tasks.md·plan.md는 네 종 메타태그를 통해 후속 자동 검증과 연결된다:

- `[artifact: <path>|<path>::<symbol>]` — 산출 파일 식별자(drift 감사 기준)
- `[why: <short-tag>]` — 추적 그룹 키(plan↔tasks 커버리지·이슈 합산)
- `[multi-step: N]` — plan bullet이 다단 작업일 때 최소 매핑 태스크 수(N ≥ 2)
- `[migration-type: schema-only | data-migration]` — 마이그레이션 산출물 구분(본 피처는 UI 전용이라 미사용 예상)

형식 검증은 `.specify/scripts/bash/validate-metatag-format.sh`가 수행한다.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 복합 컴포넌트가 디자인 시스템 위로 올라와 주요 여행 플로우가 일관된 감성으로 표현 (Priority: P1)

사용자가 여행 목록 → 여행 상세 → Day 상세 → 활동 편집으로 이동하는 주 플로우에서 카드·리스트·폼이 동일한 시각 체계(모서리·간격·그림자·포커스) 위에 얹혀 렌더된다. 이전까지는 페이지마다 레거시 유틸리티(`rounded-card`, `shadow-card`)로 개별 정의된 상태였다.

**Why this priority**: 사용자가 앱을 쓰는 시간의 대부분이 이 플로우이며, 복합 컴포넌트(ActivityCard/ActivityList/DayEditor)를 옮기지 않으면 Phase 1(폼 6종)의 시각 기반이 고립된 섬으로 남는다. 이 슬라이스만 완료되어도 사용자가 "디자인이 갖춰졌다"고 체감 가능한 최소 단위.

**Independent Test**: 다른 슬라이스가 하나도 완료되지 않은 상태에서도 (1) 여행 목록·여행 상세·Day 상세·활동 편집 폼을 순회할 때 카드 외곽·패딩·타이포 크기 계층이 동일 규칙을 따르고 (2) 빌드·타입체크·테스트·CI 파이프라인이 전환 전과 동일한 통과 상태를 유지하며 (3) 시각 회귀 판정이 "개선 또는 동등"이면 본 스토리는 완료.

**Acceptance Scenarios**:

1. **Given** 여행 목록 페이지에 진입했을 때, **When** 각 여행 카드를 비교하면, **Then** 모든 카드가 동일한 외곽·간격·호버 피드백 규칙을 따르며 레거시 `rounded-card`/`shadow-card` 기반 카드가 관찰되지 않는다.
2. **Given** 여행 상세에서 Day를 클릭해 상세로 이동할 때, **When** 일정·동행자·개요 영역을 비교하면, **Then** 동일한 카드 체계(외곽 radius·간격·타이포) 위에 얹혀 있고 영역 간 시각 간섭이 없다.
3. **Given** 활동을 추가/편집하는 폼을 열 때, **When** 라벨·입력·버튼이 렌더되면, **Then** Phase 1에서 이미 마이그레이션된 폼 6종과 동일한 포커스 링·상태 표현·접근성 규칙을 따른다.

---

### User Story 2 - 개발자/AI 에이전트가 신규 UI 추가 시 레거시 유틸리티 선택지 자체가 사라져 일관성이 구조적으로 보장 (Priority: P2)

개발자 또는 AI 에이전트가 새 UI를 작성할 때, `rounded-card`·`shadow-card`·`shadow-card-hover`·`bg-primary-500`·`text-surface-*`·`text-heading-*`·`text-body-*` 같은 커스텀 유틸리티 이름이 코드베이스와 토큰 소스에서 제거되어 자동완성·IDE 힌트에 노출되지 않는다. 결과적으로 새 UI는 shadcn semantic 토큰과 `design/tokens.json`이 정의한 정본 토큰만으로 구성된다.

**Why this priority**: US1을 완료해도 레거시 유틸리티가 살아있으면 "과거 관행으로 돌아가는" 퇴행이 반복된다. 본 스토리 완료 시 "일관성 유지"가 규율이 아닌 구조적 제약이 된다. P1과 독립 PR로 분리 가능.

**Independent Test**: (1) 리포지토리 전체 grep에서 레거시 유틸리티 이름 0건(의도된 예외 경로 제외) (2) `design/tokens.json`과 `globals.css` `@theme` 블록이 정합(유실·중복 토큰 없음) (3) 신규 파일을 추가할 때 레거시 유틸리티 자동완성이 뜨지 않으면 완료.

**Acceptance Scenarios**:

1. **Given** 개발자가 새 컴포넌트 파일을 작성할 때, **When** `className`에 `rounded-card`/`shadow-card`/`text-surface-500` 등을 입력해도, **Then** 해당 유틸리티는 Tailwind에서 해석되지 않고(또는 빌드 경고) 코드 리뷰에서 차단 가능한 신호가 남는다.
2. **Given** 리포지토리 루트에서 레거시 유틸리티 이름을 검색할 때, **When** 검색 결과를 집계하면, **Then** 소스 코드·CSS·템플릿 모두에서 해당 이름이 0건이며, 남아있다면 해당 위치가 의도된 예외(문서 예시 등)임을 스펙에 명시한다.
3. **Given** 신규 Phase 3 피처 스펙을 작성할 때, **When** 토큰 참조가 필요하면, **Then** `design/tokens.json` + shadcn semantic 토큰 문서만으로 결정 가능하고 `globals.css`를 직접 읽을 필요가 없다.

---

### User Story 3 - 디자인 토큰 정본 정합성이 복구되어 이후 디자이너 합류 시 매핑·재지정이 결정적 (Priority: P3)

`design/tokens.json`(정본) → `globals.css` `@theme` 블록(빌드 산출) → 실제 유틸리티 사용처의 3계층이 단방향·결정적으로 연결되고, 고아 토큰(정의되었으나 미사용) 및 그림자 토큰(사용되지만 정본에 없음)이 제거된다.

**Why this priority**: US1·US2 완료 후에도 토큰 계층이 어긋나 있으면 디자이너 합류 시 "어느 값이 정본인가" 논의에 시간이 소모된다. 본 스토리 완료 시 "정본 → 빌드 → 사용"이 일방향이라 디자이너가 `tokens.json`만 편집해도 반영이 예측 가능.

**Independent Test**: (1) 토큰 정합성 리포트(정본 ↔ 빌드 산출물 diff 0) (2) 사용처 ↔ 정본 양방향 일치(사용되는 토큰이 모두 정본에 존재, 정본의 활성 토큰이 모두 한 곳 이상에서 사용) (3) 디자이너 핸드오프 파이프라인(스펙 012 US3)이 재실행 가능.

**Acceptance Scenarios**:

1. **Given** `design/tokens.json`을 수정하고 토큰 빌드를 실행할 때, **When** `globals.css` `@theme` 블록이 갱신되면, **Then** diff 결과가 예측 가능(추가·삭제·변경이 입력과 일대일 대응)하고 수동 편집 흔적이 없다.
2. **Given** `@theme` 블록에 정의된 토큰 목록을 조사할 때, **When** 리포 전체에서 해당 토큰 이름을 검색하면, **Then** 모든 토큰은 최소 1회 사용되거나 "미래 예약"으로 스펙에 명시된 토큰이다.
3. **Given** 사용처에서 참조하는 토큰 이름을 조사할 때, **When** `design/tokens.json` 정본과 대조하면, **Then** 정본에 없는 이름이 0건이다.

---

### Edge Cases

- **rebase 충돌**: v2.4.4의 #285(DAY 넘버링)로 `src/app/trips/[id]/day/[dayId]/page.tsx`·`ActivityList.tsx`가 변경됐다. Phase 2는 같은 파일의 UI를 재구성하므로 로직을 우선 수용한 후 스타일만 재작성한다. 회귀는 rebase 직후 US1 Acceptance Scenario로 검증.
- **Day 상세 콘솔 오류**: #300 Decimal 직렬화가 미해결 상태로 머지되면 Day 상세 회귀 판정이 오탐된다. 본 피처는 #300 선행 완료를 전제로 하며, 선행이 지연되면 Day 상세 슬라이스(US1 일부)를 보류 단위로 분리한다.
- **POC 결과의 오염**: `spike/shadcn-trip-detail` 브랜치의 수정은 참고용이며, 정식 구현은 `013-shadcn-phase2` 브랜치에서 재작성한다. POC 파일을 그대로 복사하지 않는다(최신 develop 기준이 이미 달라짐).
- **레거시 유틸리티의 외부 의존**: `changes/*.md` 단편·문서 예시 코드에 레거시 유틸리티가 남아있을 수 있다. 의도된 예외로 분류하고 스펙·검증 스크립트에서 해당 경로를 제외한다.
- **신규 유틸리티 이름 충돌**: shadcn semantic 토큰(`bg-primary`, `text-foreground`)이 Tailwind 기본과 겹친다. 스펙 012에서 해결된 사안이나 Phase 2 대체 시 회귀 가능성을 US2 검증으로 재확인한다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 주요 여행 플로우(여행 목록, 여행 상세, Day 상세, 활동 편집)의 모든 카드·리스트·컨테이너는 shadcn 제공 컴포넌트(또는 그 컴포넌트가 의존하는 semantic 토큰)를 통해 렌더되어야 한다.
- **FR-002**: 레거시 커스텀 유틸리티 이름(`rounded-card`, `shadow-card`, `shadow-card-hover`, `bg-primary-*` 숫자 스케일, `text-surface-*`, `text-heading-*`, `text-body-*`)은 `src/**`·`styles/**`·컴포넌트 JSX에서 0건으로 제거되어야 한다. 의도된 예외는 스펙에 열거한다.
- **FR-003**: 복합 컴포넌트(`ActivityCard`, `ActivityList`, `DayEditor`)는 키보드 내비 가능, 포커스 표시 명확, 라벨·입력·오류 메시지가 보조 기술로 연결되어야 한다(Phase 1 폼 6종과 동일 기준).
- **FR-004**: `design/tokens.json`은 토큰 정본이며, `globals.css` `@theme` 블록은 해당 정본에서 결정적으로 파생되어야 한다. 수동 편집을 막는 가드(헤더 주석·빌드 스크립트 검증)가 유지되어야 한다.
- **FR-005**: 디자인 시스템 전환 PR 범위에서 빌드·타입체크·테스트·CI 파이프라인이 전환 전과 동일한 통과 상태를 유지해야 한다(실패 0건).
- **FR-006**: 본 스펙은 다크 모드 분기·브랜드 컬러 재지정·Figma 자동화·Latin 폰트 교체를 **도입하지 않는다**. 해당 요청은 별도 마일스톤으로 분리한다.
- **FR-007**: 마이그레이션 대상 컴포넌트의 상태(hover/active/disabled/loading/focus-visible)는 디자인 시스템의 공통 상태 규칙을 공유하며, Phase 1 컴포넌트와 시각·상호작용 규칙이 동일해야 한다.
- **FR-008**: 저장소는 Phase 2 마이그레이션 대상 컴포넌트 미리보기 경로(스펙 012에서 도입된 카탈로그)를 확장해야 하며, 해당 경로는 프로덕션 자산 크기에 영향을 주지 않아야 한다.
- **FR-009**: POC 브랜치(`spike/shadcn-trip-detail`)의 수정은 참고 자료로만 활용되며, 정식 구현의 산출물은 `013-shadcn-phase2` 브랜치에서 새로 작성된다.
- **FR-010**: shadcn semantic 토큰(예: `--primary`, `--muted`, `--foreground`)은 디자이너 합류 전까지 shadcn 기본값(neutral)을 유지해야 하며, 브랜드 파랑(`--color-primary-*`)과 연결하지 않는다. 연결 시점은 디자이너 합류 후 별도 스펙에서 결정한다.

### Key Entities *(include if feature involves data)*

UI 전용 피처이므로 별도 데이터 엔티티는 도입하지 않는다. 기존 여행·일자·활동·동행자 엔티티(스펙 004/005 참조)를 시각적으로만 재표현한다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 주요 4개 플로우(여행 목록, 여행 상세, Day 상세, 활동 편집)의 시각 회귀 판정이 "개선 또는 동등" 범위(4/4 달성). 레이아웃 깨짐·폰트 치환·색상 역전 관찰 0건.
- **SC-002**: 레거시 커스텀 유틸리티 이름의 리포 전역 검출 건수가 0(의도된 예외는 스펙에 명시된 경로로 제한).
- **SC-003**: 복합 컴포넌트 3종(ActivityCard·ActivityList·DayEditor) 모두에서 Tab·Shift+Tab으로 모든 포커스 가능 요소를 순회할 수 있으며, 포커스 링이 항상 시각적으로 식별 가능하다(3/3 달성).
- **SC-004**: 디자인 시스템 전환 커밋 범위에서 빌드·타입체크·테스트·CI 파이프라인 실패 건수 0.
- **SC-005**: `design/tokens.json` ↔ `globals.css` `@theme` ↔ 사용처의 3계층 일치율 100%(고아 토큰·그림자 토큰 각 0건).
- **SC-006**: 디자이너가 합류하여 `--primary` 등 semantic 토큰을 재지정할 때, `design/tokens.json` 수정 → 빌드 → 반영까지의 절차가 단일 커밋으로 완결 가능하다(수동 편집 단계 0).
- **SC-007**: Phase 1에서 마이그레이션된 폼 6종의 시각·상호작용 규칙이 Phase 2 복합 컴포넌트와 동일하다(교차 검증 샘플 6종에서 규칙 불일치 0건).

## Assumptions *(informative)*

- 디자이너 합류 시점은 본 스펙 범위 밖이며, 합류 후 브랜드 컬러·Latin 폰트·다크 모드는 별도 스펙으로 재개한다.
- #285 DAY 넘버링은 develop에 머지된 상태를 전제한다(v2.4.4 기준).
- #300 Decimal 직렬화는 v2.4.4 release 또는 v2.4.5 hotfix에서 해결될 것으로 가정한다. 해결되지 않은 채 본 피처가 develop에 머지되면 Day 상세 회귀 판정이 오탐될 수 있다.
- Phase 3 후속 작업(컴포넌트별 튜닝, 마이크로 인터랙션, 다크 모드 등)은 별도 마일스톤에서 다룬다.

## Dependencies *(informative)*

- **선행 스펙**: 012-shadcn-design-system (Phase 1 완료)
- **선행 머지**: v2.4.4 마일스톤의 #285(DAY 넘버링), #286(CI 게이트)
- **선행 해결 권장**: #300 Decimal 직렬화
- **후속 스펙 후보**: Phase 3 컴포넌트 튜닝, 다크 모드 도입, 브랜드 컬러 semantic 매핑, Latin 폰트 재검토
