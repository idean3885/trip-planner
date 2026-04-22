# ADR 0003: 여행 캘린더는 여행당 1개 공유 캘린더로 통일

- **Status**: Accepted (2026-04-22, v2.9.0)
- **Context**: Epic [#349](https://github.com/idean3885/trip-planner/issues/349), 마일스톤 [v2.9.0](https://github.com/idean3885/trip-planner/milestone/26)
- **Supersedes**: spec 018의 per-user `GCalLink` 모델(v2.8.0)

## Context

v2.8.0 Google Calendar 연동은 멤버마다 본인 외부 계정에 DEDICATED 캘린더를 각각 생성했다. 여행 1개에 N명이면:

- 외부 계정 N곳에 같은 제목 캘린더 N개가 중복 생성됨
- 이벤트도 N배 복제
- 멤버끼리 "누가 무엇을 바꿨는지" 외부 UI에서 볼 수 없음
- 멤버가 외부 UI에서 이벤트를 수정하면 다른 멤버에게 반영되지 않음

## Decision

여행 1개에 **외부 공유 캘린더 1개**만 존재한다. 오너가 만든 캘린더에 다른 멤버는 역할별 권한(ACL)으로 참여한다.

- 캘린더 데이터 오너는 여행 오너(외부 API 상)
- 호스트는 `writer`, 게스트는 `reader` ACL
- 멤버의 본인 외부 캘린더 UI 등록은 **옵트인** (`calendarList.insert`를 멤버 본인이 호출). 자동 추가 안 함
- 스키마: 신규 `TripCalendarLink`(per-trip) + `MemberCalendarSubscription`(per-member 옵트인 상태)
- 레거시 per-user `GCalLink`는 본 릴리즈에서 병존 유지, 후속 contract 릴리즈에서 제거

## Why this shape

- **중복 제거**: 여행당 1개 캘린더로 외부 저장 공간 낭비 제거
- **단일 소스**: 이벤트가 한 곳에만 존재 → 동시 편집 문제 최소화
- **안 쓸 자유**: 자동 등록이 아니므로 "외부 캘린더 연동 안 쓰고 싶다"를 구조적으로 지원
- **사용자 자산 보호**: v2.8.0 멤버가 자기 외부 계정에 이미 만든 캘린더는 삭제하지 않음(자동 연결 해제만) — 사용자가 원하면 직접 정리
- **오너 이관 한계 수용**: 외부 API가 데이터 오너 이관을 허용하지 않으므로 앱 내 오너 이관은 ACL role 재부여만 수행, 데이터 오너는 원 오너에 유지

## Rejected alternatives

1. **멤버 모두 자동 subscribe**: 외부 API가 ACL 부여를 자동 subscribe로 연결하지 않음(2019 변경). 또한 개인 OAuth 미부여 멤버에게 scope 강요는 과함.
2. **캘린더 그룹(단체 이메일 공유)**: Workspace 기능 — 개인 Gmail 대상 설계에 부적합.
3. **데이터 오너까지 이관**: 외부 API 제약(secondary calendar라도 데이터 오너 이관 불가)으로 불가능.

## Consequences

**Positive**:
- 여행당 캘린더 1개 → SC-007 달성
- 멤버 수 증가에도 외부 저장·복제 비용 선형 증가 없음
- "안 쓸 자유" UX 가능

**Negative / Trade-offs**:
- 외부 API의 "공유 이메일 알림"은 `sendNotifications:false`로도 억제되지 않음(PoC 확인) → 앱 내 알림 + 외부 이메일 병존 수용
- 오너 계정 해제 시 공유 캘린더 자체가 접근 불가 → `lastError=REVOKED` 표시 + 오너가 재연결 유도
- 레거시 per-user 코드 경로 병존 기간 동안 dual-read 로직 유지 필요

## Contract timeline (후속 릴리즈)

본 ADR은 expand 단계만 포함한다. 이후 contract 릴리즈에서 제거:

- ``prisma/schema.prisma``: ``GCalLink``, ``GCalEventMapping`` model 제거
- ``src/lib/gcal/sync.ts``: per-link 기반 sync 제거, per-trip 전용으로 단일화
- ``src/app/api/trips/[id]/gcal/*``: 레거시 엔드포인트 제거
- 마이그레이션: ``GCalEventMapping`` → ``TripCalendarEventMapping`` 이관(schema + data)

Contract 타이밍: v2.9.0 배포 후 1개 릴리즈 + 1주 관찰 + 실 사용자 호출 로그 0 확인 후.

## Related

- Spec: [`specs/019-gcal-shared-flow/spec.md`](../../specs/019-gcal-shared-flow/spec.md)
- Plan: [`specs/019-gcal-shared-flow/plan.md`](../../specs/019-gcal-shared-flow/plan.md)
- PoC: [`docs/research/v290-gcal-share-poc.md`](../research/v290-gcal-share-poc.md)
- 메모리: [`expand-and-contract 패턴`](https://github.com/idean3885/trip-planner) (v2.7.0부터 적용)
