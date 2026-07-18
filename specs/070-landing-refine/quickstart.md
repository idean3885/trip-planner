# Quickstart & Evidence: 대문 정보위계·카피 정리

**Feature**: `070-landing-refine` | **Spec**: [spec.md](./spec.md)

dev(develop 머지) 또는 프리뷰에서 확인. 시각·여백은 실기기 정본.

## US1 — 위계·카피 정리
### Evidence
- 자동 테스트: `tests/components/landing-refine.test.tsx` (하단 CTA에 "Google 계정으로 로그인" 서브텍스트 부재, 섹션 제목 h2가 `text-foreground`·큰 크기 클래스, `LandingPage`에서 `GcalTestingNotice`가 `BottomCta` 뒤 순서, Features 제목이 Hero 킥커 문구와 다름 검증)
- 수동 체크리스트:
  - [ ] 실기기: 섹션 제목(Features·Demo·시작해 볼까요)이 본문보다 크고 진하다
  - [ ] 실기기: 하단 CTA에 군더더기 문구 없이 제목+버튼만
  - [ ] 실기기: 최종 CTA 직전에 경고 배너가 없고, 배너는 CTA 아래에 있다
  - [ ] 실기기: Hero 킥커와 Features 제목이 같은 문구를 반복하지 않는다
- 스크린샷: `docs/evidence/070-landing-refine/us1-*.png`
