# Feature Specification: 예약 완료 상태 추가 + 동기화 타임존 옵션 보강

**Feature Branch**: `035-reservation-status-reserved`  
**Created**: 2026-05-30  
**Status**: Draft  
**Input**: 예약 상태(ReservationStatus)에 "예약 완료"(RESERVED)를 추가해 온라인 등으로 이미 예약을 마친 일정을 표시한다. 더불어 동기화·일정 보정의 타임존 선택 목록에 스페인(Europe/Madrid)·포르투갈(Europe/Lisbon) 등 누락된 여행지 타임존을 보강하고, 두 곳에 중복된 타임존 목록을 공통 정본으로 모은다. 연관 이슈 #632 / #633.

## Clarifications

1. **예약 완료는 기존 enum에 1값 추가** — `ReservationStatus`에 `RESERVED`("예약 완료")를 더한다. 기존 4값(필수·권장·현장·불필요)은 "예약 필요성" 축이고 완료는 "이행" 축이라 의미가 섞이지만, 한 셀렉트에서 고르는 단순함을 택한다(별도 이행 필드 분리는 과한 비용). WHY: 사용자는 일정에 "이미 예약함"을 한 번에 표시하려 한다.
2. **예약 완료 의미** — 추가 예약 행동이 필요 없는, 이미 마친 상태. "예약 불필요(NOT_NEEDED)"는 원래 예약이 필요 없는 경우이고, "예약 완료"는 필요했으나 이미 끝낸 경우로 구분한다.
3. **타임존 목록은 공통 정본 하나로** — 현재 타임존 선택 목록이 두 화면에 각각 하드코딩돼 한쪽만 보강하면 어긋난다. 목록을 공통 모듈로 모으고 거기에 여행지 타임존을 보강한다. WHY: 중복이 회귀의 원인이다.
4. **타임존 보강 범위** — 스페인(Europe/Madrid)·포르투갈(Europe/Lisbon)을 포함해 여행 흔한 타임존을 더한다. 타임존 표기는 헌법 VII(부동 시간)에 따라 표시 시각을 바꾸지 않는 라벨이며, 외부 캘린더 연동 환산에만 쓰인다.

## Metatag Conventions *(normative, inherited from PR #204)*

본 피처의 tasks.md·plan.md는 네 종 메타태그를 통해 후속 자동 검증과 연결된다:

- `[artifact: <path>|<path>::<symbol>]` — 산출 파일 식별자(drift 감사 기준)
- `[why: <short-tag>]` — 추적 그룹 키(plan↔tasks 커버리지·이슈 합산)
- `[multi-step: N]` — plan bullet이 다단 작업일 때 최소 매핑 태스크 수(N ≥ 2)
- `[migration-type: schema-only | data-migration]` — 마이그레이션 산출물 구분

형식 검증은 `.specify/scripts/bash/validate-metatag-format.sh`가 수행한다. 의미 검증은 각 US의 validator가 담당한다.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 이미 예약한 일정을 "예약 완료"로 표시한다 (Priority: P1)

사용자는 온라인 등으로 이미 예약을 마친 일정에 "예약 완료" 상태를 지정합니다. 일정 폼·초안 폼에서 이 상태를 고를 수 있고, 일정 카드에 "예약 완료"로 보입니다.

**Why this priority**: 이미 예약을 끝낸 일정을 표시할 값이 없던 것이 이 피처의 핵심 결핍입니다.

**Independent Test**: 일정 폼에서 "예약 완료"를 선택해 저장하면 일정 카드에 "예약 완료"로 표시되는지 확인하면 검증된다.

**Acceptance Scenarios**:

1. **Given** 일정 추가·수정 폼 **When** 예약 상태 목록을 연다 **Then** "예약 완료"가 선택지에 있다.
2. **Given** "예약 완료"로 저장한 일정 **When** 일정 카드를 본다 **Then** "예약 완료" 라벨이 표시된다.
3. **Given** 외부에서 가져온 초안 **When** 승격 시 예약 상태를 고른다 **Then** "예약 완료"를 선택할 수 있다.

---

### User Story 2 — 예약 완료가 API·MCP·외부 캘린더에 일관되게 노출된다 (Priority: P1)

API·MCP 도구·외부 캘린더 연동에서도 "예약 완료"가 누락 없이 다뤄집니다. API가 RESERVED를 거부하지 않고, 문서(OpenAPI·MCP)에 값이 노출되며, 외부 캘린더 이벤트 설명에 "예약 완료"로 표기됩니다.

**Why this priority**: 한 표면(UI)에만 추가하면 API·MCP·캘린더에서 값이 누락돼 정합이 깨집니다.

**Independent Test**: API로 RESERVED 일정을 만들고, OpenAPI 문서 enum과 MCP 도구 설명에 RESERVED가 있으며, 외부 캘린더 변환에 "예약 완료"가 들어가는지 확인하면 검증된다.

**Acceptance Scenarios**:

1. **Given** 일정 생성/수정 API **When** reservationStatus=RESERVED로 요청 **Then** 거부 없이 저장된다.
2. **Given** OpenAPI 문서 **When** reservationStatus enum을 본다 **Then** RESERVED가 포함된다.
3. **Given** RESERVED 일정 **When** 외부 캘린더로 변환된다 **Then** 이벤트 설명에 "예약 완료"가 표기된다.

---

### User Story 3 — 동기화 타임존 목록에서 여행지 타임존을 고른다 (Priority: P1)

사용자는 동기화·일정 보정 화면의 타임존 목록에서 스페인·포르투갈 등 여행지 타임존을 고릅니다. 목록은 한 곳의 정본을 공유해 어느 화면에서나 같습니다.

**Why this priority**: 여행지 타임존이 목록에 없으면 일정 시각을 현지 기준으로 맞출 수 없습니다. 목록이 화면마다 다르면 혼란스럽습니다.

**Independent Test**: 동기화 타임존 목록에 Europe/Madrid·Europe/Lisbon이 있고, 타임존 목록을 쓰는 화면들이 같은 목록을 보이는지 확인하면 검증된다.

**Acceptance Scenarios**:

1. **Given** 동기화/보정 타임존 선택 **When** 목록을 연다 **Then** 스페인(Europe/Madrid)·포르투갈(Europe/Lisbon)이 있다.
2. **Given** 타임존 목록을 쓰는 두 화면 **When** 각각의 목록을 비교한다 **Then** 같은 정본 목록을 보인다.

---

### Edge Cases

- 기존에 저장된 4값 일정 → RESERVED 추가 후에도 그대로 표시·동작(비파괴 추가).
- RESERVED를 모르는 외부 소비자(구버전 API 클라이언트) → enum 값 추가는 비파괴이나, 모르는 값을 받을 수 있음을 문서에 반영.
- 타임존 목록 보강 후 기존 선택값(Asia/Seoul 등) → 그대로 유효.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 `ReservationStatus`에 `RESERVED`("예약 완료")를 추가해야 한다(기존 4값 유지, 비파괴).
- **FR-002**: 사용자는 일정 추가·수정 폼과 초안 승격에서 "예약 완료"를 선택할 수 있어야 한다.
- **FR-003**: 시스템은 일정 카드에서 RESERVED를 "예약 완료" 라벨로 표시해야 한다.
- **FR-004**: 일정 생성·수정·승격 API는 reservationStatus=RESERVED를 거부 없이 처리해야 한다.
- **FR-005**: OpenAPI 문서의 reservationStatus enum에 RESERVED가 포함되어야 한다(노출되는 모든 위치).
- **FR-006**: MCP 도구 문서(예약 상태 설명)에 RESERVED가 포함되어야 한다.
- **FR-007**: 외부 캘린더 변환(ICS·Google)에서 RESERVED를 "예약 완료"로 표기해야 한다.
- **FR-008**: 시스템은 타임존 선택 목록을 공통 정본 하나로 두고, 타임존 목록을 쓰는 화면들이 이를 공유해야 한다.
- **FR-009**: 타임존 정본 목록은 스페인(Europe/Madrid)·포르투갈(Europe/Lisbon)을 포함해 여행 흔한 타임존을 제공해야 한다.

### Key Entities

본 피처는 기존 `Activity.reservationStatus`(`ReservationStatus`)에 값 1종을 추가한다. 스키마 마이그레이션 1건(schema-only): 예약 상태 값 집합에 `RESERVED` 추가(비파괴). 타임존 목록은 영속 데이터가 아닌 화면 상수로, 공통 모듈로 정본화한다.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 일정 폼·초안 승격·일정 카드에서 "예약 완료"가 선택·표시된다.
- **SC-002**: reservationStatus=RESERVED 일정이 API로 저장되고, OpenAPI·MCP 문서에 RESERVED가 노출된다(누락 0).
- **SC-003**: RESERVED 일정의 외부 캘린더 변환 결과에 "예약 완료"가 포함된다.
- **SC-004**: 타임존 목록에 Europe/Madrid·Europe/Lisbon이 있고, 목록을 쓰는 화면들이 동일 정본을 사용한다(중복 배열 0).
- **SC-005**: 기존 4값 일정이 추가 후에도 변함없이 동작한다(회귀 0).
