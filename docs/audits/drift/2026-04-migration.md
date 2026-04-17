# Drift Audit — Phase B 마이그레이션 스냅샷 (2026-04-17)

**목적**: speckit 하네스(이슈 #181 / 010-speckit-harness) 도입 직후의 기존 피처 drift 상태를 Phase B 마이그레이션 작업 전 시점으로 고정한다. 이후 Phase B 진행 결과는 이 스냅샷과 비교하여 효과를 확인한다.

**Phase B 계획**:
- [x] `_infra/009-git-release-strategy` — `[why]` 소급 완료(본 PR #215)
- [ ] `collaboration/004-fullstack-transition` — 171 라인. **#191 재현 기준** 피처. 별도 PR 예정
- [ ] `itinerary/006-structured-activity` — 200 라인. 별도 PR
- [ ] `collaboration/007-oauth-cli-reauth` — 142 라인. 별도 PR

**Phase C 전환 조건** (T093, 본 PR 범위 아님):
- 위 4개 피처 retrofit 완료
- `validate-drift.sh --audit` errors=0, warnings ≤5
- 본 스냅샷 대비 경고 60% 이상 감소
- 1주일 모니터링 (추가 경고 미발생)

생성 시각: 2026-04-17T09:41:46Z (UTC)
리포트 범위: 활성 피처 순회 (.specify/config/harness.json .categoryDirs 기준)

## Summary

- total errors: 0
- total warnings: 4

## _infra/009-git-release-strategy

- errors: 0
- warnings: 0
## _infra/010-speckit-harness

- errors: 0
- warnings: 4

### Details

#### Warnings

- _infra/010-speckit-harness/tasks.md:151 — 미체크인데 아티팩트 존재: `specs/_infra/010-speckit-harness/quickstart.md`
- _infra/010-speckit-harness/tasks.md:154 — 미체크인데 아티팩트 존재: `.specify/config/harness.json`
- _infra/010-speckit-harness/tasks.md:155 — 미체크인데 아티팩트 존재: `CLAUDE.md`
- _infra/010-speckit-harness/tasks.md:156 — 미체크인데 아티팩트 존재: `CHANGELOG.md`

## _retired/003-companion-feedback-channel

- errors: 0
- warnings: 0
## travel-search/001-ax-travel-planning

- errors: 0
- warnings: 0
## travel-search/005-ax-api-mcp

- errors: 0
- warnings: 0
## itinerary/006-structured-activity

- errors: 0
- warnings: 0
## collaboration/004-fullstack-transition

- errors: 0
- warnings: 0
## collaboration/007-oauth-cli-reauth

- errors: 0
- warnings: 0
## export/002-bundle-ical-mcp

- errors: 0
- warnings: 0
