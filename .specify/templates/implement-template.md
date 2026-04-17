# Implementation Guide: [FEATURE]

**Input**: `specs/[category]/[###-feature-name]/` (spec.md, plan.md, tasks.md, quickstart.md)
**Prerequisites**: 산출물 4종 모두 존재 + `validate-metatag-format.sh` / `validate-plan-tasks-cov.sh` 통과

본 문서는 Trip Planner 컨벤션에 특화된 구현 지침이다. 스펙킷 기본 implement 템플릿을 프로젝트 레이어·테스트·커밋 규칙으로 구체화한다.

## Pre-Implementation Gate

구현 착수 전 아래 체크를 수동 확인한다:

- [ ] `specs/…/<feature>/spec.md` Clarifications 섹션 모든 항목 결정 완료
- [ ] `plan.md` Coverage Targets 섹션에 각 추적 항목이 `[why]` + (필요 시) `[multi-step: N]` 부착
- [ ] `tasks.md` 모든 태스크가 `[artifact]` + `[why]` 메타태그 부착
- [ ] `quickstart.md` 각 `## 섹션`에 `### Evidence` 서브섹션 준비
- [ ] 헌법 V(Cross-Domain Integrity) / VI(RBAC) 위반 가능성 검토

## 레이어 배치 (v2 웹앱 기준)

변경이 **풀스택**(Next.js + Prisma)을 건드릴 때 레이어별 매핑:

| 레이어 | 디렉토리 | 책임 |
|--------|----------|------|
| 도메인 | `lib/domain/<domain>/` | 엔티티·값 객체·도메인 규칙. 외부 의존 금지 |
| 애플리케이션 | `lib/usecases/<domain>/` | 유스케이스 오케스트레이션. 리포지토리 interface에 의존 |
| 인프라 | `lib/prisma/`, `lib/auth/`, `lib/http/` | Prisma/Auth.js/외부 API 어댑터. 인터페이스 구현체 |
| 표현 | `app/`, `components/` | App Router 페이지/컴포넌트. 유스케이스 호출만 |

**예외**:
- MCP 서버(`mcp/` 하위) — Python/FastMCP. 레이어 분리가 과도할 때는 단일 모듈로 허용.
- 스크립트(`scripts/`) — 일회성/유틸성 코드. 레이어 적용 면제.

## 테스트 전략

변경 범위에 따라 최소 테스트 조합:

| 변경 유형 | 최소 테스트 |
|-----------|------------|
| 도메인 규칙 | Vitest 단위 테스트 (`tests/unit/<domain>/*.test.ts`) |
| 유스케이스 | Vitest 통합 테스트 (`tests/integration/*.test.ts`) — 실 DB(Neon) 또는 `testcontainers` |
| API 라우트 | Playwright/Vitest E2E 또는 수동 curl + quickstart Evidence |
| UI 컴포넌트 | Vitest + Testing Library (`tests/components/*.test.tsx`) 또는 수동 브라우저 확인 |
| MCP 도구 | pytest (`tests/test_*.py`) |
| 마이그레이션 | `prisma migrate diff` 확인 + 스테이징 적용 결과를 quickstart Evidence에 기록 |

`quickstart.md` 각 Scenario의 `### Evidence`에 위 테스트 중 하나 이상의 경로를 명시해야 PR 머지 게이트를 통과한다.

## 커밋 규칙 (Git Flow Lite)

- **브랜치**: feature는 `NNN-short-name`, hotfix는 `hotfix/<desc>` (CLAUDE.md 참조)
- **커밋 메시지**: Conventional 접두사 `feat:/fix:/refactor:/docs:/chore:/test:/build:/ci:`
- **본문**: Why 중심으로. 72자 wrap. 이슈 번호 `(#NNN)` 제목 끝에.
- **머지**: 전 방향 `Create a merge commit` (squash off — memory: `feedback_merge_commit_policy`)
- **정리**: PR 생성 전에 `git rebase origin/develop` + 필요 시 커밋 정리

## Breaking Change 검증 (DB 스키마 변경 시 필수)

**plan에 schema/enum/스키마/컬럼 키워드 포함 bullet이 있으면 아래 재확인이 강제된다**:

- [ ] **expand**: 새 컬럼/enum 값을 추가 — default/nullable로 안전하게 (기존 row 영향 없음)
- [ ] **migrate (data-migration)**: 기존 데이터를 새 의미에 맞게 보정하는 마이그레이션 **반드시 별도 파일**로 추가
- [ ] **contract**: 구 컬럼/값을 제거 — 클라이언트 전부 업데이트 확인 후 별 릴리즈에서
- [ ] 각 마이그레이션 SQL 상단에 `-- [migration-type: schema-only]` 또는 `-- [migration-type: data-migration]` 헤더
- [ ] tasks.md에 대응 `[migration-type: data-migration]` 또는 `[why: *-backfill]` 태스크 존재
- [ ] `validate-migration-meta.sh --feature <dir>` 통과 확인

**회고 근거**: #191 — `20260414053446_add_owner_role`이 enum만 추가하고 HOST→OWNER 보정을 빠뜨려 권한 매트릭스가 실제 동작하지 않는 기간 발생. 이 체크리스트는 같은 유형의 재발을 차단한다.

## Post-Implementation Checklist

- [ ] 모든 tasks.md 태스크 [x] 체크 또는 `validate-drift.sh` 경고 납득
- [ ] `quickstart.md` Evidence 실제 증거로 갱신 (자동 테스트 경로 또는 수동 + 스크린샷)
- [ ] PR 본문 자가 검증 표(빌드/테스트/문서 동기화) 기재
- [ ] 이슈 `Closes #NNN` 표기 (develop 타겟이라 auto-close 안 되므로 머지 후 수동 `gh issue close`)

## Related Tooling

- `validate-metatag-format.sh` — 메타태그 4종 형식
- `validate-plan-tasks-cov.sh` — plan↔tasks 커버리지
- `validate-drift.sh` — tasks↔artifact drift
- `validate-quickstart-ev.sh` — Evidence 존재
- `validate-migration-meta.sh` — expand-and-contract
- `enforce-speckit.sh` — PreToolUse에서 산출물 존재·순서 강제
- `.github/workflows/speckit-gate.yml` — PR 단계 자동 검증
