# Quickstart: 토스트 보강 + 훅/라이브러리 정비

**Feature**: `042-cleanup-toast` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## US1 — 인터랙션 성공 토스트

### Evidence

- 자동 테스트: ActivityList 성공 토스트 호출 검증(추가/수정/삭제 시 toast.success).
- 수동 체크리스트:
  - [x] 추가/수정/삭제 성공 토스트 코드 적용(정적·단위)
- 스크린샷: 해당없음 (단위테스트 + dev)

## US2 — 스와이프 단일화 + 미사용 제거

### Evidence

- 자동 테스트: MobileSwipeShell·react-swipeable 잔여 참조 0(grep), `npm run test` 전체 통과.
- 수동 체크리스트:
  - [x] MobileSwipeShell 삭제 확인
  - [x] react-swipeable 의존성 제거 확인
- 스크린샷: 해당없음

## US3 — 훅 인벤토리

### Evidence

- 자동 테스트: 커스텀 훅 디렉토리 부재 확인(점검 기록 hook-inventory.md).
- 수동 체크리스트:
  - [x] 커스텀 훅 현황 점검 기록
- 스크린샷: 해당없음

## 공통 — 회귀

### Evidence

- 자동 테스트: `npm run test`(vitest) 전체 통과, `npx eslint .` 0 errors, `tsc --noEmit`.
- 수동 체크리스트:
  - [x] 기존 동작 불변 확인
