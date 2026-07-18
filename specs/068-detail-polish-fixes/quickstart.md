# Quickstart & Evidence: 여행 상세 마감 배치

**Feature**: `068-detail-polish-fixes` | **Spec**: [spec.md](./spec.md)

dev(develop 머지) 또는 프리뷰에서 확인. 시각은 실기기 정본.

## US1 — 브레드크럼
### Evidence
- 자동 테스트: `tests/components/detail-polish.test.tsx` (여행 상세 브레드크럼 '여행 목록' 링크 href가 `/trips`)
- 수동: [ ] 실기기: '여행 목록' 클릭 → 여행 목록 페이지 도착

## US2 — 카드 테두리
### Evidence
- 자동 테스트: `tests/components/detail-polish.test.tsx` (카드가 `ring` 대신 `border`로 테두리를 그린다)
- 수동: [ ] 실기기: 스와이프 캐러셀 안 빈 상태/활동 카드 좌·우·상단 테두리가 온전

## US3 — 캘린더 블렌딩·사이즈
### Evidence
- 자동 테스트: `tests/components/detail-polish.test.tsx` (캘린더 래퍼가 흰 글래스 박스가 아니라 backdrop-blur, 셀 종횡비가 더 낮음)
- 수동: [ ] 실기기: 캘린더가 흰 박스 없이 캔버스에 블렌딩, 세로가 줄어듦

## US4 — 일정 표시
### Evidence
- 자동 테스트: `tests/components/detail-polish.test.tsx` (활동 표시가 dot, 기간 밴드 라운딩이 주 행 첫/끝에만)
- 수동: [ ] 실기기: 일정 있는 날 점 표시, 여행 기간 밴드 가운데 이음새 없이 연속
