# Feature Specification: 외부 캘린더 import

**Feature Branch**: `027-external-calendar-import`
**Created**: 2026-05-27
**Status**: Draft
**Input**: User description: "외부 캘린더 import — 다른 캘린더(사용자가 가진 다른 Google·Apple 캘린더)에 이미 쌓아둔 일정을 trip-planner의 Activity로 받아오는 기능."
**Related**: Epic #527, Milestone v2.15.0 (#36), ADR 0003 per-trip-shared-calendar (유지)

## Clarifications *(WHAT/WHY 결정만, 구현 수단은 plan에서)*

1. **캘린더 정본 모델 — ADR 0003 유지** — trip-planner가 만든 캘린더가 trip의 유일한 source of truth. 외부 캘린더는 import의 "원천 데이터"로만 쓰이고, trip의 캘린더로 채택하지 않는다. 이유: 사용자 자산의 외부 노출·삭제 위험 회피.
2. **import 시점은 사용자 수동 트리거** — 자동 polling·webhook 없음. 사용자가 trip 페이지에서 명시적으로 "외부 캘린더에서 일정 가져오기"를 실행한 시점에만 외부 데이터를 읽는다. 이유: 동기화 충돌·삭제 race 회피.
3. **매핑 불가 필드는 draft 상태로 보관** — 외부 이벤트가 trip-planner Activity의 필수 의미 필드(activity type, hotel·attraction 참조, reservation status, 시작·종료 타임존)를 채우지 못하므로, 자동으로 정식 Activity로 만들지 않는다. draft 라는 별도 상태로 분리 보관하고 사용자가 부족한 필드를 채워 정식 Activity로 승격한다.
4. **외부 → 내부 단방향, 양방향 sync 아님** — 한 번 import한 후 외부에서 이벤트가 수정·삭제되어도 trip-planner draft·Activity는 자동으로 반영하지 않는다. 양방향은 후속 마일스톤에서 별도 평가.
5. **같은 외부 이벤트 재import 시 멱등** — 외부 이벤트 식별자 기준으로 이미 import된 이벤트는 기본적으로 다시 draft를 만들지 않고 건너뛴다. 사용자가 명시적으로 "다시 가져오기"를 선택할 때만 기존 draft를 덮어쓴다.

## Metatag Conventions *(normative, inherited from PR #204)*

본 피처의 tasks.md·plan.md는 네 종 메타태그로 후속 자동 검증과 연결된다:

- `[artifact: <path>|<path>::<symbol>]` — 산출 파일 식별자(drift 감사 기준)
- `[why: <short-tag>]` — 추적 그룹 키(plan↔tasks 커버리지·이슈 합산)
- `[multi-step: N]` — plan bullet이 다단 작업일 때 최소 매핑 태스크 수(N ≥ 2)
- `[migration-type: schema-only | data-migration]` — 마이그레이션 산출물 구분

형식 검증은 `.specify/scripts/bash/validate-metatag-function.sh`가 수행한다. 의미 검증은 각 US의 validator가 담당한다.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 외부 캘린더의 일정을 trip으로 가져오기 (Priority: P1)

여행 일정을 이미 본인의 다른 캘린더(예: 개인 Google 캘린더, iCloud의 다른 캘린더)에 쌓아둔 사용자가 trip-planner의 해당 trip 페이지에서 외부 캘린더 1개를 선택하고 "일정 가져오기"를 실행하면, 해당 캘린더에서 trip 기간과 겹치는 이벤트들이 trip의 draft 일정으로 등록된다. 각 draft에는 외부 이벤트의 제목·시작·종료·장소 문자열·설명이 그대로 옮겨지고, 어느 외부 이벤트에서 왔는지 식별 정보가 남는다.

**Why this priority**: 처음 동기 자체("다른 캘린더에 쌓아둔 일정을 trip-planner로 옮기고 싶다")를 직접 해소하는 MVP. 이 흐름 한 줄만 동작하면 마일스톤의 사용자 가치는 달성된다.

**Independent Test**: 외부 캘린더에 이벤트 3개를 만들어둔 후, trip-planner에서 새 trip을 만들고 외부 캘린더 1개를 선택해 import 실행 → trip의 일정 화면에 draft 3개가 trip 기간과 매칭되는 일자에 표시되는지 확인.

**Acceptance Scenarios**:

1. **Given** 사용자가 외부 캘린더에 trip 기간 내 이벤트 N개를 가지고 있고 외부 계정이 trip-planner와 연결되어 있을 때, **When** 사용자가 trip 페이지에서 그 외부 캘린더를 선택해 import를 실행하면, **Then** trip 기간과 겹치는 N개 이벤트가 모두 draft 상태로 trip에 등록되고 draft 화면에 "외부 캘린더에서 가져옴" 표시가 보인다.
2. **Given** 외부 캘린더에 trip 기간 밖 이벤트도 섞여 있을 때, **When** import를 실행하면, **Then** trip 기간 내 이벤트만 draft로 등록되고 기간 밖 이벤트는 제외된다.
3. **Given** 외부 이벤트의 제목·시작·종료·장소·설명만 채워져 있고 좌표나 카테고리는 없을 때, **When** import를 실행하면, **Then** 제목·시간·장소 문자열·설명은 draft에 채워지고 나머지(activity type, 호텔·명소 참조, reservation status, 타임존)는 비어 있는 채로 draft가 만들어진다.

---

### User Story 2 — draft를 정식 Activity로 승격 (Priority: P2)

import된 draft는 trip-planner의 정식 일정으로 자동 인정되지 않는다. 사용자는 draft 목록을 확인하고 각 draft에 부족한 필드(어떤 종류의 활동인지, 어느 호텔·명소인지, 예약 상태, 타임존)를 trip-planner UI에서 채워 정식 Activity로 승격한다. 승격이 끝난 draft는 일반 Activity와 동일하게 trip의 캘린더에도 push되어 외부에 "trip 캘린더"에 등록된다.

**Why this priority**: draft만 만들고 끝나면 정식 일정 흐름과 단절된 데이터가 생긴다. 승격 흐름이 있어야 import의 가치가 닫힌다. P1보다 후순위인 이유: 사용자가 직접 trip-planner에서 일정을 다시 입력하는 우회로가 존재하므로 MVP 시점에서는 P1만 있어도 가치는 만들어진다.

**Independent Test**: draft 1건이 만들어진 상태에서 사용자가 draft를 열고 type·호텔/명소·reservation status를 채우면 → draft가 사라지고 정식 Activity로 trip 일정 목록에 나타나며, trip 캘린더(ADR 0003 모델)에도 이벤트가 추가된다.

**Acceptance Scenarios**:

1. **Given** draft 1건이 있고 매핑 불가 필드가 모두 비어 있을 때, **When** 사용자가 draft를 열어 필수 필드를 채우고 "승격"을 실행하면, **Then** draft가 정식 Activity로 전환되고 draft 목록에서 사라진다.
2. **Given** 사용자가 필수 필드를 일부만 채운 상태일 때, **When** "승격"을 실행하면, **Then** 시스템은 부족한 필드를 알려주고 draft 상태를 유지한다(데이터 손실 없음).
3. **Given** 정식 Activity로 승격된 일정이 있을 때, **When** 후속으로 trip 캘린더 push가 동작하면, **Then** 승격된 Activity가 trip 캘린더(현재 ADR 0003 모델)에 이벤트로 등록된다.

---

### User Story 3 — 같은 외부 이벤트의 재import 멱등 (Priority: P3)

사용자가 import를 두 번 이상 실행하더라도 같은 외부 이벤트가 draft를 중복 생성하지 않는다. 외부에서 이벤트가 새로 추가됐을 때만 추가 draft가 생성된다. 사용자가 의도적으로 같은 이벤트의 draft를 새 내용으로 덮어쓰고 싶으면 "다시 가져오기" 옵션으로 명시적으로 실행한다.

**Why this priority**: 사용자가 헷갈려 import를 여러 번 눌렀을 때 draft가 중복으로 쌓이면 정리 부담이 커진다. P3인 이유: P1만으로 한 번 가져오는 흐름은 닫히고, 멱등성은 운영 품질 항목.

**Independent Test**: 외부 캘린더에 이벤트 2개가 있는 상태에서 import를 두 번 실행 → draft가 총 2건만 존재(중복 없음). 그 후 외부에서 이벤트 1개를 추가하고 import를 다시 실행 → draft가 3건이 된다.

**Acceptance Scenarios**:

1. **Given** import 1회로 draft가 N건 생성된 상태일 때, **When** 사용자가 동일 외부 캘린더로 import를 다시 실행하면, **Then** draft 총 개수는 그대로 N건이고 새로 생성되는 draft는 0건이다.
2. **Given** 사용자가 특정 draft를 "다시 가져오기"로 명시 선택할 때, **When** 외부 이벤트가 그동안 수정됐다면, **Then** 해당 draft의 매핑 가능 필드(제목·시간·장소 문자열·설명)는 외부 최신 값으로 덮어써진다. 사용자가 draft에서 이미 채운 매핑 불가 필드는 유지된다.

---

### Edge Cases

- 사용자가 외부 캘린더 계정을 trip-planner에 연결하지 않은 상태에서 import를 시도하면: 연결 화면으로 안내하고 import는 진행하지 않는다.
- 외부 캘린더에 이벤트가 1건도 없거나 모두 trip 기간 밖일 때: "가져올 일정이 없습니다" 안내, draft 생성 없음.
- 외부 이벤트가 "종일(all-day) 이벤트"일 때: 시작·종료 시각이 시간 단위가 아닌 일자 단위로 들어옴. draft는 종일 표시로 보관하고 사용자가 승격 시 시각을 채운다.
- 외부 이벤트가 반복 일정(recurring)일 때: trip 기간 안에 떨어지는 개별 인스턴스만 각각 draft로 만든다. 반복 규칙 자체는 옮기지 않는다.
- 외부 이벤트의 시작·종료가 trip 기간을 일부만 겹칠 때: 겹치는 인스턴스를 draft로 포함한다.
- import 도중 외부 API 오류로 부분 실패 시: 성공한 이벤트는 draft로 만들고 실패한 이벤트는 사용자에게 결과 요약과 함께 알린다. 멱등성 원칙에 따라 재실행해도 중복은 없다.
- trip이 삭제될 때: 해당 trip의 draft도 함께 제거된다(고아 draft 방지).
- 사용자가 draft를 직접 삭제할 때: draft 단건만 제거하고 외부 캘린더 이벤트에는 영향을 주지 않는다.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 사용자가 trip 페이지에서 외부 캘린더 1개를 선택해 그 캘린더의 이벤트를 해당 trip의 draft로 가져오는 작업을 수동으로 실행할 수 있어야 한다.
- **FR-002**: 시스템은 import 시 trip의 시작·종료 일자 범위와 겹치는 외부 이벤트만 대상에 포함해야 한다.
- **FR-003**: 시스템은 외부 이벤트의 제목·시작·종료·장소 문자열·설명을 draft의 대응 필드에 그대로 옮겨야 한다.
- **FR-004**: 시스템은 외부 이벤트로부터 추론할 수 없는 필드(activity type, 호텔·명소 참조, reservation status, 시작·종료 타임존)는 자동으로 채우지 않고 비어 있는 채로 draft를 만들어야 한다.
- **FR-005**: 시스템은 각 draft가 어느 외부 캘린더의 어느 이벤트에서 왔는지 식별 정보를 보관해야 한다. 이 식별 정보는 멱등성과 "다시 가져오기"에 쓰인다.
- **FR-006**: 시스템은 같은 외부 이벤트를 두 번 이상 import할 때 기본적으로 새 draft를 만들지 않아야 한다. 이미 draft가 있으면 건너뛴다.
- **FR-007**: 시스템은 사용자가 특정 draft에 대해 명시적으로 "다시 가져오기"를 선택했을 때만 외부 이벤트의 최신 값으로 draft의 매핑 가능 필드를 덮어써야 한다. 매핑 불가 필드에 사용자가 이미 채운 값은 덮어쓰지 않는다.
- **FR-008**: 시스템은 draft 상태와 정식 Activity 상태를 구분해 표시해야 한다. draft는 trip의 일정 화면에서 "외부 캘린더에서 가져옴"과 같은 상태 표시를 가진다.
- **FR-009**: 사용자는 draft에 부족한 필드를 채워 정식 Activity로 승격할 수 있어야 한다. 필수 필드가 비어 있으면 시스템은 승격을 거부하고 어떤 필드가 비었는지 안내한다.
- **FR-010**: 시스템은 정식 Activity로 승격된 일정이 ADR 0003 모델의 trip 캘린더에 push되도록 기존 push 경로에 연결되어야 한다. draft 상태에서는 trip 캘린더로 push되지 않는다.
- **FR-011**: 시스템은 사용자의 외부 캘린더 계정이 trip-planner에 연결되어 있지 않은 경우 import를 진행하지 않고 계정 연결을 안내해야 한다.
- **FR-012**: 시스템은 외부 이벤트가 종일 이벤트일 때 draft에 종일 표시를 유지하고, 반복 일정일 때는 trip 기간 안의 개별 인스턴스만 각각 draft로 만들어야 한다(반복 규칙 자체는 옮기지 않는다).
- **FR-013**: 시스템은 trip이 삭제될 때 해당 trip의 draft를 함께 제거해야 한다.
- **FR-014**: 시스템은 한 번의 import 작업 결과를 사용자에게 요약해서 알려야 한다(가져온 건수, 건너뛴 건수, 실패 건수).
- **FR-015**: 시스템은 import를 실행할 수 있는 권한을 해당 trip의 일정 편집 권한(현재 ADR 0003 모델 기준 host 이상)을 가진 사용자로 제한해야 한다.
- **FR-016**: 시스템은 외부 → 내부 단방향 import만 수행한다. 한 번 import한 이후 외부 이벤트의 수정·삭제는 draft·Activity에 자동 반영되지 않으며 사용자의 명시적 재실행이 없는 한 trip-planner의 상태는 바뀌지 않아야 한다.

### Key Entities

- **외부 캘린더 (External Calendar)**: 사용자가 본인의 외부 계정(Google·Apple)에 보유한 캘린더 중 trip-planner가 만든 것이 아닌 캘린더. 이름과 외부 식별자, 어느 사용자 계정에 속하는지가 핵심 속성.
- **외부 이벤트 (External Event)**: 외부 캘린더에 들어 있는 이벤트. 제목·시작·종료·장소 문자열·설명·외부 식별자가 import의 입력이 된다. 좌표·범주 같은 trip-planner 의미 필드는 일반적으로 포함하지 않는다.
- **Draft Activity**: 외부 이벤트로부터 만들어진, trip-planner의 정식 Activity로 인정되기 전 단계의 일정. 매핑 가능 필드(제목·시간·장소 문자열·설명)는 채워져 있고, 매핑 불가 필드(activity type, 호텔·명소 참조, reservation status, 타임존)는 비어 있다. 어느 외부 이벤트에서 왔는지 식별 정보를 가진다. trip 일정 화면에 정식 Activity와 구분되어 표시된다.
- **Import 실행 기록 (Import Run)**: 한 번의 import 작업의 결과 요약. 어느 trip·어느 외부 캘린더·언제 실행됐는지, 가져온 건수·건너뛴 건수·실패 건수를 기록한다. 사용자 결과 안내와 운영 진단에 쓰인다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 사용자가 trip 페이지에서 외부 캘린더 선택 → import 실행 → draft 목록 확인까지 1분 이내에 완료한다(이벤트 50건 기준).
- **SC-002**: 외부 캘린더에 trip 기간 내 이벤트 N건이 있을 때, import 1회 실행으로 N건이 모두 draft로 등록되는 비율 100% (외부 API 가용 가정).
- **SC-003**: 사용자가 같은 import를 두 번 이상 실행하더라도 외부 이벤트당 draft 수는 1을 넘지 않는다(멱등성).
- **SC-004**: draft 1건을 정식 Activity로 승격하는 데 필요한 사용자 입력은 5필드 이내(activity type, 호텔·명소 중 1, reservation status, 시작·종료 타임존)로 끝난다.
- **SC-005**: 외부 캘린더 계정 미연결 사용자가 import를 시도했을 때 100%가 계정 연결 화면으로 안내되며 draft 생성은 0건이다.
- **SC-006**: 한 번의 import 작업 결과 요약(가져온/건너뛴/실패 건수)이 사용자에게 항상 노출되어 결과 인지율 100%를 만족한다.

## Assumptions

- Google·Apple 외부 캘린더 계정 연결은 v2.14.1 시점의 기존 연동 흐름을 그대로 쓴다. 새로운 인증 경로를 추가하지 않는다.
- "trip 기간"은 trip의 시작·종료 일자(Trip 모델의 startDate·endDate)를 기준으로 한다.
- "외부 이벤트 식별자"는 외부 캘린더 provider가 부여하는 안정적 ID(Google: event id, Apple: UID)가 존재한다고 가정한다.
- 외부 이벤트의 location 문자열은 자유 텍스트이며 trip-planner의 호텔·명소 reference(외래키)로 자동 매핑하지 않는다.
- 한 번의 import에서 가져오는 이벤트 수는 일반적인 trip(7일·이벤트 ≤50)을 기준으로 상정한다. 100건 이상의 대량 처리는 본 마일스톤 범위 외.

## Out of Scope

- 외부 → 내부 양방향 sync (외부 변경의 자동 반영). 후속 마일스톤 검토.
- 외부 캘린더를 trip 캘린더로 직접 사용 (ADR 0003 폐기 옵션). 사용자 자산 노출·삭제 위험으로 채택하지 않음.
- AI 기반 draft 필드 자동 추정(예: 제목에서 호텔명을 추정해 hotelId를 채움). 비용·정확도 검증이 별도 ADR 필요 — 본 마일스톤 외.
- 외부 캘린더의 ACL·공유 권한 변경. import는 read-only 동작.
- trip-planner → 외부 push 경로 변경. 현재 ADR 0003 모델 그대로 유지.
