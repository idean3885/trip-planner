# Quickstart: 외부 캘린더 내보내기 제품 노출 제거

**Feature**: `056-calendar-export-removal` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

각 User Story의 회귀 케이스와 실행 증거를 정의한다. PR 머지 게이트가 `validate-quickstart-ev.sh`로 검증한다(rollout phase=contract → 차단).

## US1 — 활동 변경 시 외부 캘린더 미반영

### Scenario US1-1: 활동 추가·수정·삭제 후 자동 반영 없음

외부 캘린더가 연동된 여행에서 활동을 추가·수정·삭제(단건·일괄)하고 초안을 확정해도 외부 캘린더 쓰기가 트리거되지 않는다.

### Scenario US1-2: 자동 sync 호출 제거

활동 CRUD·promote 라우트가 `triggerCalendarAutoSync`를 호출하지 않는다.

### Evidence

- 자동 테스트: `tests/api/activities.test.ts`, `tests/api/activity-batch-delete.test.ts`, `tests/api/day-batch-delete.test.ts`, `tests/api/drafts-promote-batch.test.ts` — 자동 sync mock 미호출(assert) 회귀 검증
- 자동 테스트: `tests/lib/calendar-export-removal.test.ts` — 호출처 제거 후 외부 캘린더 쓰기 0건 검증
- 수동 체크리스트:
  - [ ] 연동 여행에서 활동 추가/수정/삭제 후 외부 캘린더 변화 없음(실기기·실연동 확인)
- 스크린샷: 해당없음 (자동 테스트 로그로 대체)

## US2 — 가져오기 전용 다이얼로그

### Scenario US2-1: 내보내기/동기화 진입점 미노출

여행 상세 캘린더 영역에 "내보내기/동기화/다시 반영하기" 쓰기 진입점이 보이지 않는다.

### Scenario US2-2: 가져오기 + 안내 노출

가져오기 진입점과 "가져오기(읽기) 전용" 안내 문구가 보인다.

### Evidence

- 자동 테스트: `tests/components/calendar-sync/CalendarSyncDialog.test.tsx` — 쓰기 진입점 미렌더 + 가져오기 전용 안내 렌더 검증
- 수동 체크리스트:
  - [ ] 여행 상세에서 동기화 버튼이 사라지고 가져오기 전용 안내가 보임(실기기 확인)
- 스크린샷: `docs/evidence/056-calendar-export-removal/us2-import-only-dialog-*.png` (실기기 확인 시 첨부)

## US3 — 가져오기 회귀 없음

### Scenario US3-1: 가져오기 → 초안 → 확정 정상 동작

export 연결 없이도(TripCalendarLink 부재) 가져오기 흐름이 동작한다.

### Evidence

- 자동 테스트: `tests/api/drafts-promote-batch.test.ts`, `tests/components/calendar-sync/DraftSection.test.tsx` — 가져오기·초안 확정 회귀 가드(유지)
- 자동 테스트: `tests/lib/calendar-import-independence.test.ts` — `TripCalendarLink` 없이 `runImport` 호출 가능 + credential 부재 시 미연결 에러 검증
- 수동 체크리스트:
  - [ ] 외부 캘린더에서 가져오기 실행 → 초안 생성 → 확정 정상(실연동 확인)
- 스크린샷: 해당없음

## US4 — 쓰기/동기화 API 410 폐지

### Scenario US4-1: 폐지 엔드포인트 410 응답

`calendar/sync`·`calendar`(connect/disconnect/status)·`calendar/apple/connect`·`calendar/subscribe` 호출 시 `410 Gone`.

### Scenario US4-2: 가져오기 엔드포인트 정상

`calendar-import`·`users/me/external-calendars`는 정상 동작한다.

### Evidence

- 자동 테스트: `tests/api/calendar-export-gone.test.ts` — 폐지 엔드포인트 410 응답 + 가져오기 엔드포인트 미영향 검증
- 수동 체크리스트:
  - [ ] OpenAPI `/docs`에서 폐지 엔드포인트가 deprecated/410으로 표기됨
- 스크린샷: 해당없음

## US5 — 기존 내보낸 항목 안내

### Scenario US5-1: 안내 문구 + 자동 삭제 없음

과거 내보내기 이력이 있어도 trip-planner는 외부 캘린더 항목을 자동 삭제하지 않으며, 직접 정리 안내가 보인다.

### Evidence

- 자동 테스트: `tests/components/calendar-sync/CalendarSyncDialog.test.tsx` — "외부 캘린더에서 직접 정리" 안내 렌더 검증
- 수동 체크리스트:
  - [ ] 과거 연동 여행에서 활동 삭제 시 외부 캘린더 항목 잔존 확인(실연동 확인)
- 스크린샷: 해당없음
