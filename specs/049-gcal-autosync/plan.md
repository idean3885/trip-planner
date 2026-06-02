---
description: "Plan for spec 049 — 활동 변경 시 외부 캘린더 자동 반영"
---

# Plan: 활동 변경 시 외부 캘린더 자동 반영

## Coverage Targets

- 활동 CRUD·가져오기 확정 후 외부 캘린더 자동 반영(응답 이후 비동기, 미연결 skip) [why: autosync] [multi-step: 4]

## Technical Context

- 백엔드: Next.js 16 App Router Route Handler. **`after()`(next/server)**로 응답 이후
  자동 반영을 수행해 변경 응답을 블록하지 않는다(#715 검토 — 동기 인라인 지양).
- 자동 반영은 기존 수동 동기화 진입점이 쓰는 **`syncCalendar({ userId, tripId },
  { tripUrl })`(`src/lib/calendar/service.ts`)을 그대로 재사용**한다. 이 함수가 이미
  (1) 편집 권한 확인(OWNER/HOST), (2) Google/Apple provider 분기, (3) 미연결 시
  404 반환, (4) 412 충돌·부분 실패 처리를 담고 있어 자동·수동 경로가 같은 동작을 탄다.
- 신규 `src/lib/calendar/auto-sync.ts` — `triggerCalendarAutoSync(tripId, userId,
  tripUrl)`: `syncCalendar` 호출 후 미연결(404)·실패를 삼키고 로그만 남긴다(변경
  자체는 이미 커밋됨, 반영 실패가 응답/저장에 영향 없음).
- 트리거 부착 위치(응답 직전 `tripUrl` 계산 → `after(() => triggerCalendarAutoSync)`):
  - 활동 생성 `POST .../days/[dayId]/activities`
  - 활동 수정·삭제 `PUT`·`DELETE .../activities/[activityId]`
  - 가져오기 확정 `POST .../drafts/[draftId]/promote`, `.../drafts/promote-batch`
  - 정렬 `PATCH`(sortOrder만)는 외부 이벤트 내용 불변이라 제외.
- `tripUrl` 은 `getAppOrigin(request)`(`src/lib/app-url.ts`)로 만든다.
- **데이터 스키마 변경 없음.** Apple link 도 같은 `syncCalendar` 분기로 함께 해소된다.

## Risks

- `after()`는 응답 후 실행이라 자동 반영 실패가 사용자에게 즉시 보이지 않는다 — 수동
  "다시 반영하기" 경로가 그대로 남아 보정 가능.
- 전체 활동 재동기화 비용 — 변경 1건마다 전체 sync지만 응답 밖이라 사용자 지연 없음.
