# Phase 0 Research: 061-expense-first-itinerary

## R1. 예약상태 제거 — expand-and-contract

- **Decision**: 단일 마이그레이션에서 ① `paymentTiming` 컬럼/enum 추가(expand) → ② 기존 `reservationStatus`에서 보정 백필(data-migration) → ③ `reservationStatus` 컬럼 + `ReservationStatus` enum DROP(contract). 헤더 `[migration-type: data-migration]`.
- **Rationale**: 1인 앱이라 단일 마이그레이션으로 충분. 백필을 DROP 전에 수행해 기존 의미(현장/사전)를 보존한다. 코드 참조(폼·카드·OpenAPI·MCP·테스트)는 같은 PR에서 일괄 제거해 런타임 불일치 없음.
- **Alternatives**: 두 릴리즈로 분리(expand 후 다음 릴리즈에서 contract) — 안전하나 1인 규모 과설계, 기각. 컬럼 유지·UI만 숨김 — 과한 데이터 잔존, 기각.

## R2. 지출시점 필드 + 백필 규칙

- **Decision**: `Activity.paymentTiming` enum `PaymentTiming { ADVANCE, ON_SITE }`. 백필: `RESERVED|REQUIRED|RECOMMENDED → ADVANCE`(사전 결제·예약 성격), `ON_SITE|NOT_NEEDED → ON_SITE`(현장/해당없음), `null → ON_SITE`(여행 중 현장 기록이 다수라 안전 디폴트). 컬럼은 NOT NULL + default `ON_SITE` 또는 nullable — **NOT NULL default ON_SITE** 채택(합산·필터 단순).
- **Rationale**: 두 값이면 토글 1개로 충분. 백필 규칙은 "예약/완료=미리 냄, 현장/불필요=가서 냄"이라는 직관에 맞춤.
- **Alternatives**: nullable(미정 허용) — 합산·디폴트 분기 복잡, 기각. 3값(미정 포함) — 사용자 요구는 2값, 기각.

## R3. 간소화 추가 폼

- **Decision**: 기존 `ActivityForm`에 **간소 모드**를 더한다. 모바일 추가 진입 시 기본은 제목·가격·내용 3필드 + "확장" 토글. 확장하면 기존 전체 필드(시간·장소·카테고리·지출시점 등)를 같은 폼에서 노출. 간소 경로에선 `getLocalTimes()` 자동 시간 주입을 생략(시간 비강제).
- **Rationale**: 신규 컴포넌트 분리보다 한 폼에 모드 플래그가 유지보수 단순. 확장=기존 전체 폼이라 데스크탑/플래닝 회귀 없음.
- **Alternatives**: 별도 QuickAddForm 신설 — 중복·동기화 부담, 기각.

## R4. 여행중 판정 + 맥락 디폴트

- **Decision**: `src/lib/expense.ts`에 `isTripInProgress(trip, now)` = 오늘이 `[startDate, endDate]` 내. 추가 폼의 지출시점 디폴트: 여행중 → `ON_SITE`, 그 외(여행 전/기간 미설정) → `ADVANCE`. 모바일+여행중이면 일정 화면 기본 뷰를 주간으로.
- **Rationale**: "현장 돈은 여행 끝나야 확정" 사용자 멘탈모델. 기간 미설정 시 사전이 안전.
- **Alternatives**: 사용자 수동 모드 토글만 — 매번 설정 부담, 기각.

## R5. 금액 합산

- **Decision**: 클라이언트에서 활동 `cost`를 집계. 여행 총액·일별 합계 + `paymentTiming`별 소계. **통화별로 구분**(혼재 시 통화별 라인, 임의 환산 없음). cost 없는 활동은 0 기여.
- **Rationale**: 활동 데이터가 이미 화면에 로드되므로 클라이언트 집계가 단순·즉시. 서버 집계 엔드포인트 신설은 과설계.
- **Alternatives**: API 집계 엔드포인트 — 추가 라운드트립·복잡, 기각(후속 여지).

## R6. 주간 달력 디폴트

- **Decision**: 여행중+모바일에서 `CalendarView` 기본 뷰를 주간으로 초기화(사용자가 월로 전환 가능). 그 외는 기존 기본 유지.
- **Rationale**: 여행 중에는 "이번 주/오늘" 단위 조작이 잦다. 기존 월 뷰 회귀 없이 초기값만 맥락 분기.
- **Alternatives**: 항상 주간 — 플래닝(월 조망) 불편, 기각.

## R7. 참조 정리 범위(회귀 가드)

- **Decision**: `ReservationStatus` 참조를 전수 제거: `ActivityForm`·`ActivityCard`·`src/lib/openapi.ts`·활동 API zod 스키마·MCP(있으면)·관련 테스트·CLAUDE.md 예약상태 섹션. 기존 활동(예약상태 보유분 포함)은 백필 후 조회·편집 회귀 0.
- **Rationale**: 런타임/타입 불일치 차단. 헌법 IV(회귀 금지).
- **Alternatives**: 점진 제거 — 중간 불일치 위험, 기각.
