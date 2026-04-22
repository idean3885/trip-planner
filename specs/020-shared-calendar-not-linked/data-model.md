# Data Model — 020 공유 캘린더 미연결 상태의 역할별 UI

**Created**: 2026-04-22
**Scope**: 본 피처는 **신규 DB 엔티티·속성·마이그레이션이 없다**. 참조하는 기존 엔티티의 역할만 요약한다.

## 참조 엔티티

### TripCalendarLink (v2.9.0 도입 · spec 019)

- **역할**: 여행당 1개. **존재 유무**가 본 피처의 미연결/연결됨 상태를 가른다.
- **본 피처의 상호작용**:
  - `prisma.tripCalendarLink.findUnique({ where: { tripId } })` — `GET /api/trips/[id]/gcal/status`에서 조회.
  - 본 피처는 생성·수정·삭제하지 않는다.
- **스키마 변경**: 없음.

### GCalLink (v2.8.0 per-user 레거시)

- **역할**: 사용자별 개인 Google Calendar 연결. v2.9.0 이후 정본 아님.
- **본 피처의 상호작용**: **조회하지 않는다**. 기존 status 라우트의 폴백 조회(`findUnique({ where: { userId_tripId } })`)를 **제거**하는 것이 본 피처의 주요 변경.
- **데이터 정리**: Non-Goal. 별도 contract 릴리즈에서 레거시 테이블 제거 예정.

### TripMember (동행 협업 도메인)

- **역할**: 호출자의 여행 내 역할(`OWNER`/`HOST`/`GUEST`)을 결정.
- **본 피처의 상호작용**: `getTripMember(tripId, userId)`로 조회 후 `role`을 클라이언트 prop으로 전달. **스키마·권한 매트릭스 변경 없음**.

### MemberCalendarSubscription (v2.9.0 도입 · spec 019)

- **역할**: 멤버 본인이 공유 캘린더를 자기 Google Calendar UI에 추가했는지 상태.
- **본 피처의 상호작용**: 미연결 상태(= `TripCalendarLink` 없음)에서는 무관(조회 불가). `TripCalendarLink`가 있을 때만 의미. 본 피처는 참조하지 않는다.

## State Transitions

```
[생성 직후]
    │
    ▼
  미연결 (TripCalendarLink 없음)
    │                          ▲
    │  주인이 "공유 캘린더 연결"  │ 주인이 "해제"
    ▼                          │
  연결됨 (TripCalendarLink 있음)
    │
    └─ 호스트/게스트: "내 구글 캘린더에 추가/제거"
       (MemberCalendarSubscription의 ADDED/NOT_ADDED 토글)
```

- 본 피처는 **미연결 상태의 UI 표현**만 다룬다. 전이 트리거(연결/해제)는 기존 spec 019 범위.
- 해제 후 미연결 = 생성 직후 미연결 — **구분 없이 동일 UI** (Clarification Session 2026-04-22).

## 제약

- 마이그레이션 SQL 없음 → `[migration-type]` 헤더 대상 없음.
- 새 인덱스·컬럼 없음 → 성능 영향 없음(조회 1건 감소 — 폴백 `GCalLink.findUnique` 제거).
