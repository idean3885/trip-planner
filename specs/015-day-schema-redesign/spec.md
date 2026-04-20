# Feature Specification: Day 스키마 재설계 + API v2 신설 (v2.7.0)

**Feature Branch**: `015-day-schema-redesign`
**Created**: 2026-04-20
**Status**: Approved (사용자 승인 완료)
**Input**: v2.7.0 Day 모델 구조적 재설계 + API v2 신설 (#296 #304 #317)

## Clarifications

1. **설계 후보 B 채택** — `dayNumber`는 DB 컬럼이 아닌 `(date - trip.startDate) + 1` 파생 값. `sortOrder` 컬럼 폐기. 데이터 감사 결과(2026-04-20) Trip.startDate NULL 0건 / 동일 date Day 0건 / 범위 밖 Day 0건이라 안전하게 채택.
2. **Trip 범위 정책: 자동 확장** — Day 추가 시 date가 Trip 범위 밖이면 Trip.startDate/endDate를 그 날짜를 포함하도록 자동 확장.
3. **API 버저닝**: `/api/trips/...`(=v1)는 응답 스키마 무변경(MCP 호환). `/api/v2/trips/...` 신설은 `dayNumber` 중심.
4. **contract 단계는 본 피처에서 제외** — `sortOrder` 컬럼 DROP은 #317 별도 트래킹. 본 v2.7.0은 expand + migrate + v2 신설 + UI 전환까지.
5. **공유 DB 제약 인지** — dev/prod 같은 Neon 인스턴스. `prisma migrate deploy`만 사용.

## Metatag Conventions

본 피처의 tasks.md·plan.md는 네 종 메타태그 규약을 따른다 (`.specify/scripts/bash/validate-metatag-format.sh` 검증).

## User Scenarios & Testing

### User Story 1 - MCP 사용자 무중단 (Priority: P1)

기존 MCP 클라이언트(`trip-mcp`의 `list_trips`, `get_trip`)는 v2.7.0 배포 전후 어떠한 코드 변경 없이 동일한 응답을 받는다. `day.get('sortOrder')`가 계속 정수 값을 반환한다.

**Why this priority**: 외부 호환성 깨짐은 사용자가 MCP를 재설정해야 하는 큰 마찰. 무중단의 핵심.

**Independent Test**: v2.7.0 배포 후 MCP 클라이언트로 `get_trip(1)` 호출 → 응답에 `days[].sortOrder` 키 존재 + 정수 값.

**Acceptance Scenarios**:
1. **Given** v2.7.0 배포 완료 + 기존 MCP 클라이언트, **When** `get_trip(1)` 실행, **Then** `[Day 1]`, `[Day 2]` ... 형식으로 정상 표시
2. **Given** 동일 환경, **When** `list_trips`, **Then** 트립 목록 정상 표시

### User Story 2 - 웹 UI는 dayNumber 기반 (Priority: P2)

웹 UI(`/trips/[id]`, `/trips/[id]/day/[dayId]`)는 새 v2 API에서 받은 `dayNumber` 값으로 "DAY N" 표시. UI 표시 로직 변경 없이 응답 키만 바뀜.

**Why this priority**: UI는 신규 API의 명확한 의미(`dayNumber`)를 사용해 코드 명료성 확보.

**Independent Test**: 웹에서 트립 진입 → 모든 Day 카드에 "DAY 1", "DAY 2" 등 정확히 표시. DAY 0 절대 없음.

**Acceptance Scenarios**:
1. **Given** 정상 Trip(15일짜리), **When** /trips/1 접속, **Then** DAY 1~15 표시
2. **Given** Day 추가 (Trip 범위 안), **When** POST /api/v2/trips/1/days, **Then** dayNumber가 (date - startDate) + 1로 자동 계산

### User Story 3 - Trip 범위 자동 확장 (Priority: P3)

사용자가 Trip 범위 밖 날짜로 Day를 추가하면, Trip.startDate/endDate가 그 날짜를 포함하도록 자동 확장된다.

**Why this priority**: B 설계의 부작용(범위 밖 dayNumber가 음수/초과 발생)을 자연스러운 UX로 흡수.

**Independent Test**: Trip(2026-05-01~05-05)에 Day(2026-04-30) 추가 → Trip.startDate가 2026-04-30로 갱신되고 dayNumber=1.

**Acceptance Scenarios**:
1. **Given** Trip 범위 5/1~5/5, **When** POST Day(date=4/30), **Then** Trip.startDate=4/30, 새 Day의 dayNumber=1, 기존 5/1 Day의 dayNumber=2
2. **Given** Trip 범위 5/1~5/5, **When** POST Day(date=5/10), **Then** Trip.endDate=5/10, 새 Day의 dayNumber=10

## Functional Requirements

- **FR-001**: `Day.sortOrder` 컬럼은 DB에 그대로 유지 (v2.7.0 스코프). 단 API 채번 로직(`resortDaysByDate`)은 v1 어댑터에서 제거 예정 — `dayNumber`로 대체
- **FR-002**: `Trip.startDate`, `Trip.endDate`에 NOT NULL 제약 적용. 마이그레이션 시 위반 데이터 0건임을 감사로 확인
- **FR-003**: `Day` 테이블에 `@@unique([tripId, date])` 제약 추가. 위반 0건 확인됨
- **FR-004**: `/api/trips/...` (v1) 응답 스키마는 v2.6.0과 동일. `days[].sortOrder` 정수, `days[].dayNumber` 미포함 (또는 deprecated 필드로 함께)
- **FR-005**: `/api/v2/trips/...` 응답에 `days[].dayNumber` 포함. `days[].sortOrder` 미포함
- **FR-006**: 웹 UI는 모든 데이터 fetch에서 `/api/v2/`만 호출. v1은 MCP 외부 클라이언트 전용
- **FR-007**: Day POST/PUT 시 date가 Trip 범위 밖이면 Trip.startDate/endDate를 자동 확장. 트랜잭션 안에서 처리

## Success Criteria

- **SC-001**: v2.7.0 배포 직후 MCP `get_trip` 호출 100% 정상 (sortOrder 응답 유지)
- **SC-002**: 웹 UI 모든 Day 카드 DAY 0 노출 0건
- **SC-003**: Day 추가 E2E 테스트 통과 (범위 안 / 범위 밖 모두)
- **SC-004**: prisma migrate deploy 실행 시 데이터 손실 0건

## Key Entities

- **Trip**: `startDate`, `endDate` NOT NULL. 자동 확장 대상
- **Day**: `sortOrder` 유지 (호환), `dayNumber` 파생. `@@unique([tripId, date])` 신설
- **Activity**: 본 피처 무관 (별개 sortOrder 사용)

## Out of Scope

- `Day.sortOrder` 컬럼 DROP — #317에서 후속 처리
- `Activity.sortOrder` 변경 — 무관
- v1 API deprecation 공지 — 추후 메이저 버전
- Neon DB 환경 분리 — #318 후속
