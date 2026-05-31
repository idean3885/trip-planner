# Quickstart: 모바일 트립 상세 2단계 분리 스크롤

**Feature**: `037-mobile-nested-scroll` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

각 User Story의 수동/자동 회귀 케이스를 정의한다. 단계 분리·경계 멈춤 거동은 jsdom에 스크롤·레이아웃 엔진이 없어 자동 검증이 불가하므로, **레이아웃 구조·데스크탑 무영향은 자동 테스트**로, **스크롤 거동은 실기기 수동 확인**으로 나눈다.

## US1 — 헤더가 올라가 캘린더 고정, 경계에서 한 번 멈춤

### Scenario US1-1: 최상단에서 아래로 스크롤하면 헤더만 올라가고 캘린더가 고정된다

모바일 폭에서 최상단부터 아래로 스크롤 → 여행 요약 헤더가 위로 사라지고 일정은 움직이지 않으며 캘린더가 상단 고정에 도달한다.

### Scenario US1-2: 빠른 fling이 캘린더 고정 경계를 넘어 일정으로 이어지지 않는다

한 번의 빠른 아래 스크롤 → 캘린더 고정 지점에서 멈추고 같은 제스처가 일정으로 연쇄되지 않는다.

### Evidence

- 자동 테스트: `tests/components/trip/TripDetailLayout.test.tsx` — 일정 패널이 `snap-start snap-always scroll-mt-[var(--trip-cal-h)]` 정지점 클래스를 갖는 구조를 검증(거동이 아닌 구조).
- 수동 체크리스트(trip.idean.me 실기기):
  - [ ] US1-1 헤더만 올라가 캘린더 고정 확인
  - [ ] US1-2 빠른 fling이 경계를 넘지 않음 확인
- 스크린샷: 필요 시 `docs/evidence/037-mobile-nested-scroll/us1-*.png`

## US2 — 일정만 스크롤, 일정 최상단 경계 멈춤 후 헤더 복귀

### Scenario US2-1: 캘린더 고정 상태에서 일정만 스크롤된다

캘린더 고정 후 아래로 스크롤 → 일정 목록만 움직이고 캘린더는 상단 고정 유지.

### Scenario US2-2: 일정 최상단에서 한 번 멈춘 뒤 헤더가 복귀한다

일정을 내려본 뒤 위로 스크롤 → 일정 최상단에서 끊김 → 위로 더 스크롤하면 캘린더 고정이 풀리고 여행 헤더가 다시 나타난다.

### Evidence

- 자동 테스트: `tests/components/trip/TripDetailLayout.test.tsx` — 일정 패널 정지점 클래스와 캘린더 sticky 구조를 검증.
- 수동 체크리스트(trip.idean.me 실기기):
  - [ ] US2-1 캘린더 고정 중 일정만 스크롤 확인
  - [ ] US2-2 일정 최상단 경계 멈춤 + 추가 제스처로 헤더 복귀 확인
- 스크린샷: 필요 시 `docs/evidence/037-mobile-nested-scroll/us2-*.png`

## US3 — 좌우 날짜 스와이프 공존

### Scenario US3-1: 일정 영역에서 좌우 스와이프로 날짜가 이동한다

세로 스크롤 분리 후에도 좌우 스와이프 시 선택 날짜가 하루씩 이동한다.

### Scenario US3-2: 세로 스크롤이 좌우 스와이프를 트리거하지 않는다

일정 영역 세로 스크롤 시 날짜가 바뀌지 않는다.

### Evidence

- 자동 테스트: `tests/components/trip/SwipeCarousel.test.tsx` 및 `TripDetailLayout.test.tsx` — `SwipeCarousel`의 `touch-pan-y` 유지와 onCommit(날짜 이동) 핸들러 결선을 검증.
- 수동 체크리스트(trip.idean.me 실기기):
  - [ ] US3-1 좌우 스와이프로 날짜 이동 확인
  - [ ] US3-2 세로 스크롤이 날짜를 바꾸지 않음 확인
- 스크린샷: 해당없음 (실기기 동작 확인으로 대체)

## 데스크탑 무영향 (회귀 가드)

### Scenario DT-1: 데스크탑 2분할 레이아웃·스크롤 불변

≥1024px에서 좌(캘린더+동기화)/우(동행자+일정) 2분할과 스크롤이 본 피처 도입 전과 동일하다.

### Evidence

- 자동 테스트: `tests/components/trip/TripDetailLayout.test.tsx` — 데스크탑(`lg:`) DOM 구조가 변하지 않고 모바일 전용 컨테이너가 데스크탑에 영향을 주지 않음을 검증.
- 수동 체크리스트:
  - [ ] DT-1 데스크탑 폭에서 레이아웃·스크롤 회귀 없음 확인
