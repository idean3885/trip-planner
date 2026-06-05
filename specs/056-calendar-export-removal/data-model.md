# Data Model: 외부 캘린더 내보내기 제품 노출 제거

**Feature**: 056-calendar-export-removal | **Date**: 2026-06-04

**스키마 변경 없음. 마이그레이션 없음.** 본 피처는 데이터 표면을 만들거나 바꾸지 않고, export 추적 모델의 신규 생성·갱신을 중단하는 행위 변경이다. 아래는 각 모델의 본 피처 이후 취급을 정리한 것이다.

## 보존하되 신규 생성·갱신 중단 (export 추적)

| 모델 | 역할 | 본 피처 이후 |
|------|------|--------------|
| `TripCalendarLink` | per-trip 외부 캘린더 연결 정본(provider·calendarId·lastSyncedAt 등) | 신규 생성(`connectCalendar`) 중단. 기존 행 보존. 자동 쓰기 근거로 사용 안 함 |
| `TripCalendarEventMapping` | Activity ↔ 외부 이벤트 1:1 매핑 | 신규 생성·갱신 중단. 기존 행 보존. 자동 쓰기 트리거 근거로 사용 안 함 |
| `MemberCalendarSubscription` | 멤버 개인 CalendarList 구독 상태 | subscribe/unsubscribe 폐지로 신규 생성 중단. 기존 행 보존 |
| `GCalLink` | 레거시 per-user 캘린더(v2.9.0 이후 비활성) | 변동 없음(이미 비활성) |
| `GCalEventMapping` | 레거시 per-user 이벤트 매핑 | 변동 없음(이미 비활성) |

## 유지 (import — 본 피처 영향 없음)

| 모델 | 역할 | 본 피처 이후 |
|------|------|--------------|
| `ActivityDraft` | 외부 → 내부 단방향 가져오기 초안 | 그대로 동작 |
| `ImportRun` | 가져오기 실행 기록 | 그대로 동작 |
| `AppleCalendarCredential` | user-level Apple 자격 증명(app-specific password) | **유지** — import 읽기 인증. `/settings/calendars`에서 등록·관리 |

## 인증 출처 (참고)

import가 외부 캘린더를 읽는 데 쓰는 인증은 export 연결과 독립적이다(research Decision 2):

- **Google**: Auth.js 계정 세션의 OAuth access token / scope. `TripCalendarLink` 무관.
- **Apple**: `AppleCalendarCredential`(user-level). `TripCalendarLink` 무관.

## 정본 방향(변경 후)

```
[외부 캘린더(구글/애플)]  ──(가져오기/읽기)──▶  [trip-planner DB = 단일 정본]
        ▲
        └────  (쓰기/내보내기 경로 제거 — 제품 표면에서 단방향 차단)
```

trip-planner DB가 여행·활동의 단일 정본이며, 외부 캘린더는 읽어오는 대상으로만 남는다(헌법 원칙 V 부합).
