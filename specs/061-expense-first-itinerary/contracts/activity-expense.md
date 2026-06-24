# Contract: 활동 스키마 변경 + 합산 (061)

신규 엔드포인트 없음. 기존 활동 CRUD의 **필드 계약 변경** + 합산은 클라이언트 파생.

## 활동 필드 계약 변경

기존 활동 생성/수정/조회(`/api/trips/{id}/days/{dayId}/activities` 등)에서:

- **제거**: `reservationStatus`(요청·응답·문서·zod 스키마에서 삭제). 클라이언트가 보내도 무시(또는 400 아님 — 단순 무시).
- **추가**: `paymentTiming`: `"ADVANCE" | "ON_SITE"`. 생성 시 미지정이면 서버 default `ON_SITE`. (디폴트의 맥락 결정은 클라이언트가 사전/현장을 채워 보냄 — 서버 default는 안전망.)
- 나머지 필드(title·memo·cost·currency·category·startTime·endTime·location·url·allDay·sortOrder) 불변. `startTime`/`endTime` 선택(미지정 허용 — 기존과 동일).

## OpenAPI

- `Activity` 스키마에서 `reservationStatus`·`ReservationStatus` enum 제거, `paymentTiming` enum 추가.
- 예약상태 관련 설명 문구 제거. 통화·floating-time 설명 유지.

## MCP / 외부 소비자

- MCP 도구·`web_client`가 `reservationStatus`를 참조하면 제거. `paymentTiming` 노출(있으면).

## 합산(클라이언트 파생, 계약상 표시)

- 여행 상세 화면이 활동 목록에서 **여행 총액·일별 합계·사전/현장 소계**를 통화별로 계산·표시. 서버 신규 필드 없음.

## 디폴트(클라이언트)

- 추가 폼 `paymentTiming` 초기값: 여행중(오늘∈여행기간) → `ON_SITE`, 그 외 → `ADVANCE`.
- 여행중+모바일 → 일정 기본 뷰 주간.

## 불변(회귀 금지)

- 기존 활동 조회·편집(예약상태 보유분 포함, 백필 후) 회귀 0. 데스크탑 전체 폼 동작 유지. 카테고리·시간·통화 계약 유지.
