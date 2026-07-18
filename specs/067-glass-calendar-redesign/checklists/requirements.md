# Requirements Quality Checklist: 글래스 캘린더 재설계

**Feature**: `067-glass-calendar-redesign`

- [x] 카드 아티팩트 근본 원인(overflow 클립 충돌)이 결정으로 봉합됐는가 (FR-001, research)
- [x] 선택/오늘/기간 표현이 사용자 선택(밴드·틴트·링)으로 확정됐는가 (Clarifications 2·3)
- [x] 접근성(밴드 위 텍스트 4.5:1)이 성공 기준에 있는가 (FR-006)
- [x] 색 정본(하드코딩 금지, 신규 토큰 :root)이 명시됐는가 (FR-007·SC-004)
- [x] 요일 색 코딩·팔레트·이미지 불변이 명시됐는가 (FR-008)
- [x] 각 US 독립 테스트 가능한가 (US1 카드/US2 글래스/US3 사이즈)
- [x] 스키마 변경 없음 명시 (data-model.md)
- [x] 실기기 검증 전제가 명시됐는가 (quickstart)
