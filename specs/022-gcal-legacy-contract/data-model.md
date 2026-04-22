# Data Model — 022 레거시 매핑 expand

**Created**: 2026-04-23
**Scope**: 신규 매핑 모델 1종 추가. 레거시 모델은 유지.

## 신규 — `TripCalendarEventMapping`

- 여행 공유 캘린더(`TripCalendarLink`) 단위로 이벤트 매핑을 직접 소유.
- 필드:
  - `id` PK
  - `tripCalendarLinkId` (FK → `TripCalendarLink.id`, onDelete: Cascade)
  - `activityId` (FK → `Activity.id`, onDelete: Cascade)
  - `googleEventId` string
  - `syncedEtag` string
  - `lastSyncedAt` timestamptz
  - `createdAt`, `updatedAt` timestamptz
- Unique: `(tripCalendarLinkId, activityId)`
- Index: `(tripCalendarLinkId)`
- Table name: `trip_calendar_event_mappings`

## 유지 — 레거시 모델 (쓰기 중단)

- `GCalLink` (`gcal_links`): 모델·테이블 유지. v2.10.0 이후 **활성 코드 경로에서 참조 금지**. 기존 레코드 그대로 존재.
- `GCalEventMapping` (`gcal_event_mappings`): 모델·테이블 유지. 동일. 기존 레코드 보존(롤백 안전망).

## State Transitions

```
v2.9.x: [GCalLink + GCalEventMapping] ← sync가 bridge로 생성·재사용
           │
           ▼ (v2.10.0 migration)
v2.10.0: [TripCalendarLink + TripCalendarEventMapping (신규)] ← 모든 sync 쓰기/읽기
           │ (구 테이블은 정지 상태로 유지)
           ▼ (v2.11.0+ contract)
v2.11.0: [TripCalendarLink + TripCalendarEventMapping] 만 존재
```

## 마이그레이션

- 1건. 신규 테이블 생성 + 데이터 복사.
- `[migration-type: data-migration]` 헤더.
- 롤백 SQL: 신규 테이블 drop. 구 테이블 유지이므로 구 배포로 revert 시 기능 복구 가능.
