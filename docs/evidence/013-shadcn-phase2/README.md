# Evidence: 013-shadcn-phase2

스펙 013 quickstart.md의 Evidence 블록에 대응하는 자동·수동 증거. 자동 테스트 로그는 이 PR의 로컬 실행 결과이며, 시각 회귀 스크린샷(375px/1280px)은 디자이너 검수 시 보완 예정.

## US1 — 복합 컴포넌트 + 주요 페이지 시각 일관성

- `us1-activity-list-tests.log` — `npm test -- tests/components/ActivityList.test.tsx --run` 결과 (29/29 통과)
- 수동 스크린샷(예정): `us1-mobile-home.png`, `us1-desktop-home.png`, `us1-mobile-trip-detail.png`, `us1-desktop-trip-detail.png`, `us1-mobile-day-detail.png`, `us1-desktop-day-detail.png`, `us1-mobile-activity-form.png`, `us1-desktop-activity-form.png`
- 포커스 순회는 dev 배포 확인 후 보강

## US2 — 레거시 유틸리티 제거

- `us2-check-legacy.log` — `bash scripts/check-legacy-utilities.sh` 결과 (위반 0건)
- `us2-audit-tokens.log` — `npm run audit:tokens` 결과 (정본 0 / @theme 0 / 3계층 일치)
- CI step 증거: `.github/workflows/ci.yml` design-system job

## US3 — 디자인 토큰 3계층 정합성

- `us2-audit-tokens.log` (공용) — 3계층 양방향 diff 0 확인
- 단일 토큰 수정 → 빌드 → 반영 재현: 디자이너 합류 시점에 실제 시연으로 보강

## 공용 파이프라인

- `npx tsc --noEmit` 통과
- `npm test` 175/175 통과
- CI: lint / typecheck / test / design-system 모두 녹색 (PR #310)
