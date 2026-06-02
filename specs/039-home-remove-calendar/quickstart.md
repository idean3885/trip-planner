# Quickstart: 로그인 후 홈 캘린더 제거

**Feature**: `039-home-remove-calendar` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## US1 — 홈에서 여행 목록만

### Scenario US1-1: 캘린더 부재 + 목록 노출

홈 진입 시 상단 월 캘린더가 없고 여행 목록 카드만 단일 컬럼으로 나열된다.

### Scenario US1-2: dead code 제거

홈 전용 통합 캘린더 컴포넌트가 삭제되어 미사용 코드가 남지 않는다.

### Evidence

- 자동 테스트: `tests/app/trips/list-grid.test.ts` — 캘린더 부재 + 단일 컬럼 검증. `npm run test` 전체 통과.
- 수동 체크리스트:
  - [x] 홈에 월 캘린더 그리드 없음 (page.tsx에 TripsCalendar 부재)
  - [x] 여행 목록 카드 단일 컬럼 나열
  - [x] TripsCalendar.tsx 삭제 확인
- 스크린샷: 해당없음 (정적 검증 + 단위 테스트로 대체)
