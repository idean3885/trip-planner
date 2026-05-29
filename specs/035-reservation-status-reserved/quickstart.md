# Quickstart: 예약 완료 상태 추가 + 동기화 타임존 옵션 보강

**Feature**: `035-reservation-status-reserved` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

enum 추가는 비파괴(schema-only). 표면 정합·타임존 정본은 Vitest 자동 회귀, 폼·카드 표시는 브라우저 수동 시각 검증. 시간 규칙은 헌법 VII(부동 시간).

## US1 — 예약 완료 지정·표시

### Scenario US1-1: 폼에서 "예약 완료" 선택
일정 추가·수정 폼과 초안 승격에서 "예약 완료"를 고를 수 있고, 일정 카드에 "예약 완료"로 표시된다.

### Evidence
- 자동 테스트: typecheck — `ActivityCard`·ICS·GCal 의 라벨 Record 가 `ReservationStatus` 전 값을 망라(exhaustive)하므로 RESERVED 누락 시 컴파일 실패.
- 수동 체크리스트:
  - [x] 일정 폼 예약 상태 목록에 "예약 완료"
  - [x] "예약 완료" 저장 후 카드에 "예약 완료" 표시
  - [x] 초안 승격 폼에 "예약 완료"

## US2 — API·MCP·캘린더 정합

### Scenario US2-1: RESERVED 저장·노출
API가 RESERVED를 거부하지 않고, OpenAPI·MCP 문서에 노출되며, 외부 캘린더 변환에 "예약 완료"가 표기된다.

### Evidence
- 자동 테스트: `tests/api/drafts-promote-batch.test.ts` — RESERVED 허용(promoted 1). OpenAPI enum 3곳·MCP 문서·ICS/GCal 라벨에 RESERVED 반영(소스 정합).
- 수동 체크리스트:
  - [x] reservationStatus=RESERVED API 저장 성공
  - [x] /docs OpenAPI enum 에 RESERVED
  - [x] 외부 캘린더 이벤트 설명에 "예약 완료"

## US3 — 타임존 정본 + 보강

### Scenario US3-1: 여행지 타임존 선택
타임존 목록에 스페인(Europe/Madrid)·포르투갈(Europe/Lisbon)이 있고, 목록을 쓰는 화면이 같은 정본을 본다.

### Evidence
- 자동 테스트: `tests/lib/timezones.test.ts` — 정본에 Europe/Madrid·Europe/Lisbon 포함, 기존(Asia/Seoul·UTC) 유지, DraftSection 이 정본 참조(로컬 중복 0).
- 수동 체크리스트:
  - [x] 동기화 타임존 목록에 스페인·포르투갈
  - [x] 목록 쓰는 화면 동일

## 회귀

- `npx vitest run` 전체 통과(기존 4값 일정 동작 불변).
- enum ADD VALUE 비파괴 — 기존 행 영향 0.
