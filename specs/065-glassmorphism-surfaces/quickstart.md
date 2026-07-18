# Quickstart & Evidence: 글래스모피즘 표면 디자인 (크롬+컨테이너)

**Feature**: `065-glassmorphism-surfaces` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

브랜치 배포 프리뷰(또는 `dev.trip.idean.me`)에서 아래 시나리오를 확인한다. 시각·블러 체감·성능은 실기기가 정본(로컬 os=linux 렌더 불가).

## US1 — 크롬·오버레이 유리 표면
### Evidence

- 자동 테스트: `tests/components/glass-surfaces.test.tsx` (헤더·푸터·Dialog·Dropdown·Select 표면에 글래스 유틸 클래스가 부착되고, `src/app/globals.css`에 `--glass-bg`/`--glass-overlay`/`--glass-blur` 토큰이 정의되어 있는지 검증)
- 수동 체크리스트:
  - [ ] 실기기: 다이얼로그를 열었을 때 뒤 콘텐츠가 블러되고 본문 텍스트가 선명히 읽힌다
  - [ ] 실기기: 헤더·푸터가 캔버스 그라데이션을 블러하는 유리 바로 보인다
  - [ ] 실기기: 드롭다운/셀렉트를 어두운/복잡한 콘텐츠 위에서 열어도 항목 텍스트 대비가 유지된다
- 스크린샷: `docs/evidence/065-glassmorphism-surfaces/us1-*.png` (실기기 검증 시)

## US2 — 컨테이너 카드 유리 패널
### Evidence

- 자동 테스트: `tests/components/glass-card.test.tsx` (`Card`의 `glass` prop on→`glass-surface` 부착, off→불투명 `bg-card` 유지, 콘텐츠 카드 `ActivityCard`가 불투명을 유지하는지 회귀 검증)
- 수동 체크리스트:
  - [ ] 실기기: 설정·캘린더 연동·멤버·빈 상태 패널이 유리 패널로 보인다
  - [ ] 실기기: 활동 카드·여행 목록 행은 기존 불투명 흰 배경을 유지한다
  - [ ] 실기기: 긴 일정 목록 스크롤 시 끊김이 없다(블러 스택 없음)
- 스크린샷: `docs/evidence/065-glassmorphism-surfaces/us2-*.png` (실기기 검증 시)
