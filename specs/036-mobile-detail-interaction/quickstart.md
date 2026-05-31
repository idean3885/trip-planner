# Quickstart: 모바일 트립 상세 인터랙션 개선

**Feature**: `036-mobile-detail-interaction` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

각 User Story의 회귀 케이스와 실행 증거를 기록한다. 시각·터치 거동(스크롤 정지·스와이프)은 jsdom에 레이아웃·스크롤이 없어 자동 검증이 불가하므로 dev 실기기 수동 확인을 1순위로 둔다. 헤더·버튼 등 구조 변경은 vitest로 잠근다.

## US1 — 캘린더 sticky 경계 스크롤 양방향 1차 정지

### Scenario US1-1: 아래로 스크롤 시 캘린더 경계 정지

일정이 화면보다 긴 날짜에서 아래로 스크롤 → 캘린더 고정 경계에서 한 번 멈춘 뒤 일정만 스크롤.

### Scenario US1-2: 위로 스크롤 시 일정 최상단 도달 후 캘린더 해제

일정 하단까지 내린 상태에서 위로 스크롤 → 일정이 맨 위에 닿기 전에는 캘린더가 따라 올라가지 않음.

### Evidence

- 자동 테스트: jsdom에 스크롤·레이아웃이 없어 snap 거동 검증 불가. 구조 회귀는 `tests/components/trip/TripDetailLayout.test.tsx`(마운트·자세히 버튼)로 부분 커버.
- 수동 체크리스트(dev 실기기):
  - [ ] US1-1 아래 스크롤 경계 정지 확인
  - [ ] US1-2 위 스크롤 해제 조건 확인
- 스크린샷/녹화: `docs/evidence/036-mobile-detail-interaction/us1-scroll-*.png`

## US2 — 미로딩 날짜 스와이프 즉시 이동

### Scenario US2-1: 미로딩 날짜로 즉시 이동 + 스켈레톤

미로딩 날짜로 스와이프 → 즉시 넘어가고 일정 영역은 스켈레톤.

### Scenario US2-2: 도착 시 채워짐

스켈레톤 상태에서 데이터 도착 → 실제 일정으로 교체.

### Evidence

- 자동 테스트: embla 스냅·레이아웃 의존이라 jsdom 검증 불가. 캐러셀 3슬라이드 구조 계약은 `tests/components/trip/SwipeCarousel.test.tsx` 유지. 스켈레톤 표시는 `tests/components/trip/DayActivitiesPane.test.tsx`(activities=null) 커버.
- 수동 체크리스트(dev 실기기):
  - [ ] US2-1 연속 스와이프 즉시 이동 확인
  - [ ] US2-2 스켈레톤→일정 교체 확인
- 스크린샷/녹화: `docs/evidence/036-mobile-detail-interaction/us2-swipe-*.png`

## US3 — 스와이프-캘린더 강조 동시 갱신

### Scenario US3-1: 강조와 일정 동시 갱신

옆 날짜로 스와이프 정착 → 캘린더 강조와 일정이 같은 날짜를 같은 타이밍에 가리킴.

### Evidence

- 자동 테스트: 스냅 이벤트 의존이라 jsdom 검증 불가. 커밋이 단일 상태(selectedDate)에서 일정·강조를 함께 파생하는 구조는 `tests/components/trip/SwipeCarousel.test.tsx` 계약으로 뒷받침.
- 수동 체크리스트(dev 실기기):
  - [ ] US3-1 강조 지연 없음 확인
- 스크린샷/녹화: `docs/evidence/036-mobile-detail-interaction/us3-highlight-*.png`

## US4 — 일정 섹션 상단 헤더 제거

### Scenario US4-1: 날짜/개수 헤더 미표시

날짜 선택 → 일정 위에 날짜 헤더가 없고 목록이 바로 보임(모바일). 데스크탑은 헤더 유지.

### Evidence

- 자동 테스트: `tests/components/trip/DayActivitiesPane.test.tsx` — `showDateHeader=false` 시 날짜 헤더 미렌더 + 본문 유지 단언.
- 수동 체크리스트:
  - [x] US4-1 vitest 통과(427 pass)로 헤더 토글 확인

## US5 — '자세히' 버튼 디자인 토큰화

### Scenario US5-1: 버튼 외형 + Ellipsis 제거

상단 '자세히'가 토큰 버튼 외형(outline), 점 세 개 아이콘 없음, 클릭 시 여행 정보 Dialog 오픈.

### Evidence

- 자동 테스트: `tests/components/trip/TripDetailLayout.test.tsx` — '자세히' 버튼 내 svg(Ellipsis) 부재 + 클릭 시 "여행 정보" Dialog 오픈 단언.
- 수동 체크리스트:
  - [x] US5-1 vitest 통과(427 pass)로 아이콘 제거·Dialog 동작 확인
  - [ ] dev 실기기에서 버튼 외형(토큰) 최종 확인
- 스크린샷: `docs/evidence/036-mobile-detail-interaction/us5-button-*.png`
