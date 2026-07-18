# Quickstart & Evidence: 글래스모피즘 확장 (콘텐츠 + 테두리)

**Feature**: `066-glass-content-surfaces` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

브랜치 프리뷰(또는 `dev.trip.idean.me`)에서 확인. 시각·스크롤 성능은 실기기 정본(os=linux 로컬 렌더 불가).

## US1 — 여행 상세 콘텐츠 유리 표면
### Evidence

- 자동 테스트: `tests/components/glass-content.test.tsx` (`ActivityCard`가 glass 표면으로 렌더되고, 여행 상세 모바일 주간 달력 래퍼가 `glass-surface` 클래스를 갖는지 검증)
- 수동 체크리스트:
  - [ ] 실기기: 여행 상세에서 활동 카드가 반투명 유리로 보인다
  - [ ] 실기기: 주간 달력 래퍼가 반투명 유리로 보이고 날짜 텍스트는 선명하다
  - [ ] 실기기: 긴 일정 목록 스크롤 시 끊김이 없다(끊기면 `--glass-blur` 하향)
- 스크린샷: `docs/evidence/066-glass-content-surfaces/us1-*.png` (실기기 검증 시)

## US2 — 카드 테두리 네 변 선명화
### Evidence

- 자동 테스트: `tests/components/glass-content.test.tsx` (`card.tsx` 테두리 대비가 `ring-foreground/15`로 상향됐는지 검증)
- 수동 체크리스트:
  - [ ] 실기기: 카드 상하좌우 테두리가 같은 세기로 보인다
- 스크린샷: `docs/evidence/066-glass-content-surfaces/us2-*.png` (실기기 검증 시)
