# Quickstart: 지출 중심 일정 UX 정비

**Feature**: `061-expense-first-itinerary` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

PR 머지 게이트가 `validate-quickstart-ev.sh`로 본 문서를 검증한다.

## US1 — 모바일 간소화 추가

### Scenario US1-1: 제목·가격·내용만으로 저장

모바일 추가 기본 화면에 3필드(제목·가격·내용)만. 시간 미입력으로 저장 성공.

### Scenario US1-2: 확장으로 전체 입력

"확장" 토글 → 시간·장소·카테고리·지출시점 등 전체 필드가 같은 화면에 노출.

### Evidence

- 자동 테스트: `tests/components/ActivityForm.test.tsx` (간소 모드 3필드·시간 비강제 저장·확장 토글)
- 수동 체크리스트(실기기, 구현 후):
  - [ ] 모바일에서 제목·가격·내용만으로 저장되는지 확인

## US2 — 예약상태 제거

### Scenario US2-1: 입력/표시 부재

활동 추가·편집·상세·카드 어디에도 예약상태 요소가 없다.

### Scenario US2-2: 기존 데이터 회귀 없음

예약상태가 있던 활동도 백필 후 조회·편집 정상.

### Evidence

- 자동 테스트: `tests/components/ActivityForm.test.tsx`·`tests/components/ActivityCard.test.tsx` (예약상태 요소 부재 단언)
- 자동 테스트: `tests/lib/expense.test.ts` (백필 규칙 매핑)

## US3 — 사전/현장 지출 + 디폴트

### Scenario US3-1: 맥락 디폴트

여행 전 추가 → 디폴트 ADVANCE(사전). 여행중+모바일 추가 → 디폴트 ON_SITE(현장) + 주간 뷰.

### Scenario US3-2: 수동 토글

사전/현장 토글 변경분이 저장된다.

### Evidence

- 자동 테스트: `tests/lib/expense.test.ts` (`isTripInProgress`·디폴트 결정 규칙)
- 자동 테스트: `tests/components/ActivityForm.test.tsx` (지출시점 토글)

## US4 — 금액 합산

### Scenario US4-1: 총액·일별·소계

금액 있는 활동들 → 여행 총액·일별 합계·사전/현장 소계가 통화별로 정확.

### Evidence

- 자동 테스트: `tests/lib/expense.test.ts` (총액·일별·사전/현장 소계·통화별 구분·cost 없음 0 기여)
- 수동 체크리스트(구현 후):
  - [ ] 여행 상세에서 총액·일별·소계 표시 확인

## 회귀 (US-공통)

### Scenario REG-1: 데스크탑·기존 조회 유지

데스크탑 전체 폼·기존 활동 조회·편집 회귀 0.

### Evidence

- 자동 테스트: `tests/components/ActivityList.test.tsx` (기존 추가/편집/삭제 흐름 — 예약상태 제거 반영 후에도 통과)
