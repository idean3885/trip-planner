# Contract: 폐지(410 Gone) 엔드포인트

**Feature**: 056-calendar-export-removal | **Date**: 2026-06-04

외부 캘린더 쓰기·동기화·연결·구독 엔드포인트를 410 Gone으로 폐지한다. 레거시 `GET/POST /api/trips/[id]/gcal/sync`가 쓰는 410 패턴과 일관한다.

## 폐지 엔드포인트

| 엔드포인트 | 메서드 | 기존 동작 | 변경 후 |
|-----------|--------|-----------|---------|
| `/api/v2/trips/[id]/calendar/sync` | POST | 활동 → 외부 캘린더 sync | `410 Gone` |
| `/api/v2/trips/[id]/calendar` | POST | 외부 캘린더 연결(전용 캘린더 생성+ACL) | `410 Gone` |
| `/api/v2/trips/[id]/calendar` | DELETE | 연결 해제(ACL 회수) | `410 Gone` |
| `/api/v2/trips/[id]/calendar` | GET | 연결 상태 조회 | `410 Gone` |
| `/api/v2/trips/[id]/calendar/apple/connect` | POST | trip별 Apple 캘린더 연결(전용 캘린더) | `410 Gone` |
| `/api/v2/trips/[id]/calendar/subscribe` | POST | 멤버 CalendarList 구독 | `410 Gone` |
| `/api/v2/trips/[id]/calendar/subscribe` | DELETE | 멤버 CalendarList 구독 해제 | `410 Gone` |

## 응답 계약

```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": "gone",
  "message": "외부 캘린더 내보내기/동기화는 더 이상 제공되지 않습니다. trip-planner는 외부 캘린더에서 가져오기(읽기)만 지원합니다."
}
```

- 상태 코드: `410 Gone`
- 본문: `error: "gone"` + 가져오기 전용 안내 메시지(한국어). 기존 `gcal/sync` 폐지 응답 형식과 정합.
- 인증·권한 검증 이전 단계에서 즉시 410 반환(불필요한 DB·외부 호출 없음).

## 유지 엔드포인트 (폐지 아님)

| 엔드포인트 | 사유 |
|-----------|------|
| `POST /api/trips/[id]/calendar-import` | 가져오기 — 유지 |
| `GET /api/users/me/external-calendars` | 외부 캘린더 계정 연결 상태 조회(가져오기 게이트) — 유지 |
| `/settings/calendars` 관련(Apple credential 등록) | user-level 가져오기 읽기 인증 — 유지 |
| `POST /api/trips/[id]/drafts/[draftId]/promote`, `promote-batch` | 초안 확정 — 유지(단, 내부 자동 sync 호출만 제거) |

## MCP

trip MCP(`mcp/trip_mcp/**`)는 외부 캘린더 쓰기 도구를 보유하지 않는다. 폐지 대상 도구 없음. (외부 캘린더 조회는 별도 `che-ical-mcp`로 trip-planner와 독립.)

## OpenAPI 문서

`/docs` OpenAPI 문서에서 위 폐지 엔드포인트를 `deprecated: true` 표기 또는 410 응답 명세로 갱신한다. 가져오기 관련 엔드포인트만 정상 노출.
