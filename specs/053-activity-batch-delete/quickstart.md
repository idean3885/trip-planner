---
description: "Quickstart & Evidence for spec 053 — 활동·일자 다건 삭제 API"
---

# Quickstart: 활동·일자 다건 삭제 API

## US1 — 활동 다건 삭제

### Evidence

- 자동 테스트: 활동 식별자 여러 개를 한 요청으로 삭제 → 모두 삭제·삭제 식별자 반환. 일부 무효/타 여행 식별자 → 유효한 것만 삭제하고 건너뜀 목록 반환(전체 실패 아님). 빈 입력 → 400, 비편집자 → 403. 자동 반영(after)이 요청당 한 번 호출됨을 검증.
- 수동 체크리스트:
  - [ ] `POST /api/trips/{id}/activities/batch-delete` `{ids:[...]}` → deleted/skipped 반환
  - [ ] 외부 캘린더에 삭제가 한 번 반영

## US2 — 일자 다건 삭제

### Evidence

- 자동 테스트: 일자 식별자 여러 개를 한 요청으로 삭제 → 일자와 그 활동이 함께 제거. 일부 무효 식별자 → 부분 성공. 비편집자 → 403.
- 수동 체크리스트:
  - [ ] `POST /api/trips/{id}/days/batch-delete` `{ids:[...]}` → deleted/skipped 반환
  - [ ] 삭제된 일자의 활동도 사라짐

## 공통 — 회귀 & 문서

### Evidence

- 자동 테스트: 단건 삭제 경로 동작 불변 회귀. `npx vitest run` 전체 통과, `npx eslint .` 0 errors, `tsc --noEmit`, 커버리지 100%.
- 수동 체크리스트:
  - [ ] /docs 에서 배치 삭제 두 경로(요청·응답·예시) 노출 확인
