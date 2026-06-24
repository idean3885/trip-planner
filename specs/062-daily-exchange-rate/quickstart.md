# Quickstart: 원화 자동 근사 환산

## 개요

여행자 입력 없이 일자·통화 근사 시세를 자동 확보·캐시하고, 일별 합산·여행 총액에 "약 …원 (참고)"을 병기한다.

## US1 — 일별 합산 원화 자동 병기

근사 환율을 확보한 통화의 일별 합산에 현화 + "약 …원 (참고)" 병기. 미확보 통화는 현화만.

### Evidence

- 자동 테스트: `tests/lib/expense.test.ts` (`convertToKrw` — 환율 적용·KRW 가산·미확보 제외)
- 자동 테스트: `tests/components/trip/ExpenseSummary.test.tsx` (원화 병기·참고 라벨·미확보 시 생략)
- 수동 체크리스트(실기기, 구현 후):
  - [ ] 현지 통화 지출 일자에서 입력 없이 원화 근사가 붙는지 확인
  - [ ] 원화 값에 "참고" 표기가 보이는지 확인

## US2 — 여행 총액 원화 자동 병기

각 지출을 그 일자 근사 환율로 환산해 합한 원화 총합(참고)을 통화별 현화 총액과 함께 표시. 일부 통화만 확보 시 부분 반영 고지.

### Evidence

- 자동 테스트: `tests/lib/expense.test.ts` (`convertToKrw` — 다일자·다통화 합산, `partial` 판정)
- 자동 테스트: `tests/lib/fx/rates.test.ts` (캐시 우선·미스 확보·실패 시 null)
- 수동 체크리스트(구현 후):
  - [ ] 여행 총액에 원화 총합(참고)이 보이는지 확인
  - [ ] 일부 통화 미확보 시 "일부만 반영" 고지가 보이는지 확인

## 회귀 (US-공통)

### Evidence

- 자동 테스트: `tests/components/trip/ExpenseSummary.test.tsx` (환율 미전달 시 기존 현화-only 합산 그대로 렌더)
- 자동 테스트: `tests/lib/expense.test.ts` (`summarize` 기존 동작 불변)
