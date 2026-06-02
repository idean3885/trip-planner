---
description: "Quickstart & Evidence for spec 049 — 활동 변경 시 외부 캘린더 자동 반영"
---

# Quickstart: 활동 변경 시 외부 캘린더 자동 반영

## US1 — 활동 변경 자동 반영

### Evidence

- 자동 테스트: 자동 반영 헬퍼 단위테스트 — 미연결(404) 시 조용히 종료, 동기화 실패가
  예외로 전파되지 않음, 연결 시 syncCalendar 호출.
- 수동 체크리스트:
  - [ ] 활동 추가 → 외부 캘린더 반영
  - [ ] 활동 수정·삭제 → 반영
  - [ ] 가져오기 확정 → 반영
  - [ ] 미연결 여행 → 무동작
- 스크린샷: 후속(실제 외부 캘린더 반영 확인)

## 공통 — 회귀

### Evidence

- 자동 테스트: `npx vitest run` 전체 통과, `npx eslint .` 0 errors, `tsc --noEmit`.
- 수동 체크리스트:
  - [ ] 활동 CRUD 응답이 자동 반영으로 지연되지 않음(응답 후 비동기)
