# Quickstart & Evidence: 글래스 캘린더 재설계 + 카드 테두리 버그 수정

**Feature**: `067-glass-calendar-redesign` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

브랜치 프리뷰에서 확인. 시각·아티팩트·대비는 실기기 정본(os=linux 로컬 렌더 불가).

## US1 — 글래스 카드 테두리 버그
### Evidence
- 자동 테스트: `tests/components/glass-calendar.test.tsx` (글래스 카드에서 `overflow-hidden`이 제거되고 비글래스는 유지되는지 검증)
- 수동 체크리스트:
  - [ ] 실기기: 활동 카드·컨테이너 카드의 좌우 세로 테두리·모서리가 깨지지 않는다
- 스크린샷: `docs/evidence/067-glass-calendar-redesign/us1-*.png`

## US2 — 캘린더 글래스 재설계
### Evidence
- 자동 테스트: `tests/components/glass-calendar.test.tsx` (`--cal-range-band`/`--cal-ring` 토큰 존재, 선택/오늘/기간이 솔리드 필·`after:bg-primary` 밑줄 대신 글래스 클래스로 전환됐는지 검증)
- 수동 체크리스트:
  - [ ] 실기기: 선택일이 반투명 틴트 + 링(솔리드 박스 아님)
  - [ ] 실기기: 오늘이 얇은 브랜드 블루 링(검은 박스 아님)
  - [ ] 실기기: 여행 기간이 반투명 밴드로 이어지고 시작·끝이 둥글다(검은 밑줄 아님)
  - [ ] 실기기: 밴드·틴트 위 날짜 텍스트가 선명하다
- 스크린샷: `docs/evidence/067-glass-calendar-redesign/us2-*.png`

## US3 — 캘린더 사이즈
### Evidence
- 자동 테스트: `tests/components/glass-calendar.test.tsx` (셀 종횡비가 정사각보다 낮게 설정됐는지 검증)
- 수동 체크리스트:
  - [ ] 실기기: 월 그리드가 콤팩트하고 아래 빈 영역이 작다
- 스크린샷: `docs/evidence/067-glass-calendar-redesign/us3-*.png`
