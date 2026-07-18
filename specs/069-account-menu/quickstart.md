# Quickstart & Evidence: 헤더 계정 메뉴 통합

**Feature**: `069-account-menu` | **Spec**: [spec.md](./spec.md)

dev(develop 머지) 또는 프리뷰에서 확인. 시각은 실기기 정본.

## US1 — 계정 메뉴
### Evidence
- 자동 테스트: `tests/components/account-menu.test.tsx` (`AuthButton`이 flat 링크 대신 계정 트리거+메뉴로 렌더되고 이메일·설정·로그아웃 항목을 포함하며, `hidden sm:` 뷰포트 분기 클래스가 없는지 검증)
- 수동 체크리스트:
  - [ ] 실기기: 헤더 우측에 계정 트리거(원형) 하나만, 이메일·설정·로그아웃은 눌러야 나온다
  - [ ] 실기기: 좁은 폭(375px)에서도 헤더 가로 넘침 없음
  - [ ] 실기기: 설정→/settings 이동, 로그아웃 동작
- 스크린샷: `docs/evidence/069-account-menu/us1-*.png`
