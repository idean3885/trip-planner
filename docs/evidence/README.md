# Evidence

피처별 quickstart에서 수집한 시각·접근성·회귀 증거를 모은다. PR 머지 게이트(`validate-quickstart-ev.sh`)가 이 경로를 참조한다.

## 구성 규칙

- 피처 번호별 디렉토리: `docs/evidence/<NNN>-<feature-name>/`
- 파일명 규약: `<us-id>-<matter>-<variant>.<ext>` 예: `us1-mobile-home.png`, `us2-ci-step.png`, `us3-inventory-diff.md`
- 자동 테스트 로그는 `.log`, 스크린샷은 `.png`, 비교표는 `.md`.

## 하위 색인

| 피처 | 내용 |
|------|------|
| [011-project-identity-surface/](011-project-identity-surface/.gitkeep) | 프로젝트 아이덴티티 표면(v2.4.0) |
| [012-shadcn-design-system/](012-shadcn-design-system/.gitkeep) | 디자인 시스템 기반(v2.4.3) |

## 작성 시점

피처 quickstart에서 `### Evidence` 블록이 요구하는 항목을 실행 결과로 채울 때 이 경로를 사용한다. 머지 전 체크리스트가 완료되어야 한다.
