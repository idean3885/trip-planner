# Quickstart: 외부 캘린더 가져오기 — 선택 + 시간·타임존 일괄 + 미저장 미리보기

**Feature**: `033-calendar-sync-selection` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

선택·일괄 보정·일괄 확정은 Vitest + Testing Library 로 자동 회귀, sticky·모바일 가로 스크롤은 브라우저 수동 시각 검증으로 확인한다. 시간 규칙은 헌법 VII(부동 시간)를 따른다.

## US1 — 가져온 일정 선택

### Scenario US1-1: 진입 시 전체 선택
가져오기 화면 진입 시 외부 이벤트가 목록으로 나열되고 전부 선택돼 있다.

### Scenario US1-2: 선택분만 확정 저장
일부 체크를 해제하고 확정하면 선택분만 정식 일정으로 저장된다.

### Evidence
- 자동 테스트: `tests/components/calendar-sync/DraftSection.test.tsx` — 진입 시 전체 선택(2/2), 확정 시 promote-batch 로 선택분 전송, 전체 해제 시 확정 비활성.
- 수동 체크리스트:
  - [x] 진입 시 전체 선택 상태
  - [x] 일부 해제 후 확정 → 선택분만 저장

## US2 — 상단 고정 확정 + 일괄

### Scenario US2-1: 목록 스크롤해도 상단 고정
가져온 항목이 많아 목록을 스크롤해도 확정 버튼과 일괄 설정이 상단에 계속 보인다.

### Evidence
- 자동 테스트: 해당없음(레이아웃 sticky — 수동 시각).
- 수동 체크리스트:
  - [x] 확정 버튼 + 시간 미정 일괄 + 타임존 일괄이 헤더에 함께, 목록만 스크롤

## US3 — 미저장 보정 + 일괄 확정

### Scenario US3-1: 시간 미정 일괄 시작 / 타임존 일괄
시간 미정 항목에 일괄 시작 시간을 부여하고, 시간 있는 항목은 시각 숫자를 유지한 채 타임존만 일괄 변경한다. 확정 시 보정값으로 저장.

### Scenario US3-2: 부분 성공
일부 항목 저장이 실패해도 성공분은 저장되고 실패분만 알린다.

### Evidence
- 자동 테스트:
  - `tests/api/drafts-promote-batch.test.ts` — 일괄 승격, 부분 성공(실패는 failed), 필수 누락 항목 건너뛰기, 빈 items 400, 권한 없음 403.
  - `tests/components/calendar-sync/DraftSection.test.tsx` — 확정 body 기본값(`SIGHTSEEING`) 적용.
- 수동 체크리스트:
  - [x] 시간 미정 일괄 시작 → 종일 항목에만 시각 부여
  - [x] 타임존 일괄 → 시각 숫자 유지, 라벨만 교체(헌법 VII)
  - [x] 개별 수정은 해당 항목만 반영

## US4 — 좁은 화면 가로 스크롤 방지

### Scenario US4-1: 375px 가로 스크롤 0
가용폭 375px 이하에서 가져오기 화면에 가로 스크롤이 생기지 않고 항목이 줄바꿈된다.

### Evidence
- 자동 테스트: `tests/components/calendar-sync/DraftSection.test.tsx` — 항목 컨테이너 `flex-wrap` + `min-w-0` 클래스 정합.
- 수동 체크리스트:
  - [x] 375px 에서 가로 스크롤 0, 긴 제목 줄바꿈
