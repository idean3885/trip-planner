# Trip Planner - 작업 지침

## 프로젝트 개요
범용 여행 서포터/플래너. Next.js 웹앱(`src/`) + Python MCP 서버(`mcp/`) 구성. 여행 일정·숙소·활동 데이터는 Postgres(Neon)에 저장되며, 웹 UI(trip.idean.me)와 MCP 도구(trip)로 CRUD 한다. Apple iCloud '여행' 캘린더와 연동.

## 업무 프로세스 단일 정본

업무 프로세스(이슈 흐름·브랜치·릴리즈·디자이너 협업·마일스톤·핫픽스 전 과정)의 단일 정본은 [`docs/WORKFLOW.md`](./docs/WORKFLOW.md)다. 본 CLAUDE.md의 "Git 워크플로우 규칙"·"릴리즈 프로세스"·"마일스톤 정책" 섹션은 AI 에이전트 즉시 참조용 요약이며, 사람·에이전트 모두 **모호하거나 본 문서와 WORKFLOW.md가 상충하는 경우 WORKFLOW.md를 따른다**. 디자이너 핸드오프 상세는 [`docs/design-handoff.md`](./docs/design-handoff.md).

## Git 워크플로우 규칙

### 필수: feature → develop PR
- 모든 코드 변경은 feature 브랜치 → develop PR로 진행한다
- main, develop 브랜치에 직접 push 금지 (`enforce_admins: true`)
- feature 브랜치 → develop PR → 머지 → 마일스톤 완료 시 develop → main PR

### 브랜치 최신화
- feature 브랜치 작업 전 반드시 `git pull origin develop`으로 최신화
- PR 생성 전 base 브랜치(develop)와 충돌 여부 확인
- 충돌 발생 시 rebase로 해결 후 PR 생성

### 브랜치 전략: Git Flow Lite

```
main ────────────●───────────────●──── (production: trip.idean.me)
                 ↑               ↑
develop ──●──●──●───●──●──●──●──● ── (dev: dev.trip.idean.me)
          ↑  ↑  ↑   ↑  ↑  ↑  ↑
        feat feat hotfix feat feat
```

- **main**: 프로덕션 브랜치. trip.idean.me 배포. 버전 태그가 붙는 유일한 브랜치.
- **develop**: 통합 브랜치. dev.trip.idean.me 배포. feature/hotfix가 여기로 머지.
- **feature**: `NNN-short-name` 형식. speckit(`/speckit.specify`) 실행 시 3자리 일련번호를 자동 부여. speckit 프로세스(spec → plan → tasks)를 거친 후 구현 시작. (예: `007-oauth-cli-reauth`)
- **hotfix**: `hotfix/설명` 형식. speckit 미경유. (예: `hotfix/v2.2.2-gitflow-harness`)
- 머지된 feature/hotfix 브랜치는 GitHub가 자동 삭제 (`deleteBranchOnMerge: true`).

### PR 머지 전략

**전 방향 `Create a merge commit`**. Squash and merge는 off(repo 설정으로 고정).

| PR 방향 | 머지 방식 | 이유 |
|---------|----------|------|
| feature/hotfix → develop | **Create a merge commit** | 커밋 조절은 개발자가 feature 브랜치에서 직접(push 전 `git rebase -i` 등). AI 하네스로 커밋을 관리하는 상황에서 웹의 수동 squash는 단순 합치기일 뿐 메시지가 의미에 맞게 재구성되지 않음 |
| develop → main | **Create a merge commit** | 커밋 해시 보존, 역머지 시 충돌 방지 |

> 커밋 수가 많아 정리가 필요하면 feature 브랜치에서 rebase/amend로 직접 정돈한 뒤 push한다. 웹 UI의 squash는 사용하지 않는다.

### 배포 환경 매핑

| 브랜치 | 도메인 | 용도 |
|--------|--------|------|
| main | trip.idean.me | 프로덕션 릴리즈 |
| develop | dev.trip.idean.me | 마일스톤 통합 테스트 |
| feature/* | PR 프리뷰 URL | 피처 단위 프리뷰 |

### 릴리즈 프로세스

**개발 (마일스톤 진행 중)**:
1. feature 브랜치에서 작업 → `changes/<이슈번호>.<타입>.md` 단편 1개 추가 → develop PR → 머지
   - 단편 타입: `breaking` / `feat` / `fix` / `removed` / `docs` / `chore`
   - 단편 가이드: [`changes/README.md`](changes/README.md)
   - CI 게이트: 단편 누락 시 `towncrier-fragment-check` 실패. 면제 시 `chore-no-news` 라벨
2. develop에 머지되면 dev.trip.idean.me에 자동 배포
3. 마일스톤의 모든 이슈가 develop에 머지될 때까지 반복

**릴리즈 (마일스톤 완료 시)**:
1. release 브랜치에서 `uv run towncrier build --version X.Y.Z --yes` 실행
   - `changes/*.md` 단편이 자동으로 `CHANGELOG.md`에 합쳐지고 단편은 삭제됨
   - 미리보기는 `--draft` 옵션
2. `pyproject.toml`의 `version` 필드를 동일 X.Y.Z로 범프
3. develop → main PR 생성 → 머지

**CI 자동 (main 머지 후)**:
4. `auto-tag.yml`: pyproject.toml 변경 감지 → annotated 태그 생성
5. `auto-release.yml`: 태그 push → CHANGELOG 추출 → GitHub Release 생성
6. `pypi-publish.yml`: 태그 push → 테스트 → PyPI 배포

**버전 범프 기준 (SemVer)**:
- MAJOR: 호환성 깨지는 변경 (API 스키마 변경, MCP 도구 삭제 등). 단편 타입 `breaking`
- MINOR: 기능 추가 (새 API, 새 MCP 도구, 새 페이지 등). 단편 타입 `feat`
- PATCH: 버그 수정, 성능 개선, 문서 수정. 단편 타입 `fix` / `docs` / `chore`

**핫픽스 프로세스**:
1. develop에서 `hotfix/*` 브랜치 생성
2. 수정 + `changes/<이슈>.fix.md` 단편 추가
3. hotfix → develop PR → 머지 → dev 환경 확인
4. release 단계(towncrier build + 버전 PATCH 범프) 수행
5. develop → main PR → 머지 → CI 자동 릴리즈
6. main 직접 머지 금지 — dev 환경 검증 필수

**마일스톤 정책**:
- 모든 이슈는 마일스톤 필수 (마일스톤 = 버전 단위)
- 마일스톤 신설은 목적이 명확할 때만. 잡다한 작업은 기존 마일스톤에 흡수
- 1인 개발이지만 워크트리 분기 + AI 보조 병렬을 전제로 충돌은 단편 분리(towncrier)로 차단

## 작업 규칙

### speckit 하네스 (spec 010, 이슈 #181)

모든 피처 작업 산출물은 아래 4종 메타태그로 자동 검증된다. 형식 위반은 `validate-metatag-format.sh`가 차단.

| 태그 | 의미 | 사용 위치 |
|------|------|-----------|
| `[artifact: <path>|<path>::<symbol>]` | 산출 파일 경로(또는 심볼). drift 감사 기준 | `tasks.md` 체크박스 라인 |
| `[why: <short-tag>]` | 추적 그룹 키. plan↔tasks 커버리지·이슈 합산 | `tasks.md`, `plan.md` Coverage Targets bullet |
| `[multi-step: N]` | plan bullet이 다단 작업일 때 최소 매핑 태스크 수(N ≥ 2) | `plan.md` Coverage Targets bullet |
| `[migration-type: schema-only \| data-migration]` | 마이그레이션 SQL 상단 헤더 | `prisma/migrations/*/migration.sql` 첫 10줄 |

스펙 본문에서 `[est: Nh]`는 선택적 태그(이슈 합산 시 추정 사용). 위 4종 외는 자유.

#### 검증기 스택

- `validate-metatag-format.sh` — 4종 형식 정합성
- `validate-plan-tasks-cov.sh` — plan Coverage Targets ↔ tasks `[why]` 매핑 수
- `validate-drift.sh` — tasks `[x]` ↔ 실제 아티팩트 일치 (audit 모드 주간 실행)
- `validate-quickstart-ev.sh` — quickstart.md `### Evidence` 존재 + 자동/수동 증거
- `validate-migration-meta.sh` — expand-and-contract (플랜 스키마 bullet ↔ 보정 태스크, 마이그레이션 헤더)
- `validate-constitution.sh` — 헌법 V/VI 휴리스틱 경고 (차단 없음)
- `merge-tasks-to-issues.sh` — tasks.md → 하위 이슈 초안(`[why]` 그룹 + 8h 분할 + 마일스톤, dry-run)
- `enforce-speckit.sh` — Edit/Write PreToolUse 훅. 피처 브랜치(NNN-*)에서 산출물 존재 강제
- `.github/workflows/speckit-gate.yml` — PR 단계 자동 검증
- `.github/workflows/drift-audit.yml` — 주간 drift 리포트 생성·자동 커밋

#### rollout phase

`.specify/config/harness.json`의 `rollout.phase`가 `expand`/`migrate`/`contract` 세 단계 중 하나. 각 단계 동작:

- **expand** (현재): validator 경고만, 머지 차단 없음. 신규 피처 도입기.
- **migrate**: 기존 활성 피처(004/006/007 등) 메타태그 소급 적용. 경고 여전히 비차단.
- **contract**: quickstart-evidence / migration-meta / drift error가 머지 차단. Phase B 완료 + 1주 관찰 후 전환.

전환 조건·스냅샷은 `docs/audits/drift/2026-04-migration.md` 참조.

#### 참고 문서

- `.specify/templates/implement-template.md` — 레이어·테스트·커밋 가이드
- `.specify/templates/quickstart-template.md` — Evidence 규약
- `.specify/templates/migration-header-guide.md` — SQL 헤더 규약

### 데이터 정본

- 여행·일자·활동 데이터 정본은 DB (Prisma/Postgres, `prisma/schema.prisma`)
- 웹 UI: `src/app/trips/**`
- MCP 도구: `mcp/trip_mcp/**` (list_trips, get_trip, create/update/delete_day/activity 등)
- Apple '여행' 캘린더는 독립 정본 — 확정 일정(예약·티켓)만 등록. `che-ical-mcp`로 조회

### 예약 상태 (Prisma enum `ReservationStatus`)

- `REQUIRED` — 사전 예약 필수 (매진 위험)
- `RECOMMENDED` — 사전 예약 권장
- `ON_SITE` — 현장 구매 가능
- `NOT_NEEDED` — 예약 불필요

### 타임존

- `Activity.startTime`/`endTime`은 Timestamptz 저장 + `startTimezone`/`endTimezone`(IANA) 별도 필드
- 현재 표시 로직은 `getUTCHours()` 기반 "floating-time" 관행 — #232 이슈 참조

## Active Technologies
- Python 3.14 + FastMCP, httpx, python-dotenv, pytes (001-ax-travel-planning)
- 마크다운 파일 (`trips/` 디렉토리, git 관리) (001-ax-travel-planning)
- Bash (install.sh) + che-ical-mcp (macOS 네이티브 바이너리, GitHub Releases) (002-bundle-ical-mcp)
- Python 3.10+ (기존 travel_mcp과 동일), Bash (install.sh) + FastMCP, httpx (기존 의존성 재활용) (003-companion-feedback-channel)
- macOS Keychain (GitHub PAT 저장) (003-companion-feedback-channel)
- TypeScript 5.x, Node.js 20+ + Next.js 15 (App Router), Auth.js v5 (next-auth@5.x), Prisma 7.x (@prisma/adapter-pg TCP), @auth/prisma-adapter (004-fullstack-transition)
- Neon Postgres (Vercel Marketplace 통합, 무료 티어 0.5GB) (004-fullstack-transition)
- TypeScript 5.x (Next.js 웹앱) + Python 3.10+ (MCP 서버) (005-ax-api-mcp)
- Neon Postgres (Vercel Marketplace, Prisma ORM) (005-ax-api-mcp)
- TypeScript 5.x (Next.js 15), Python 3.10+ (MCP 서버) + Next.js App Router, Auth.js v5, Prisma 7.x, FastMCP, httpx (007-oauth-cli-reauth)
- Neon Postgres (Prisma ORM), macOS Keychain (로컬 토큰 저장) (007-oauth-cli-reauth)
- TypeScript 5.x, Node.js 20+ + Next.js 15 (App Router), React 19, Tailwind CSS. 신규 의존성 없음. (011-project-identity-surface)
- TypeScript 5.x, Node.js 20+. CSS는 Tailwind v4 CSS-first 구성(`@theme`). + Next.js 15 (App Router), React 19, Tailwind CSS v4(`tailwindcss@^4`, `@tailwindcss/postcss`), shadcn/ui(vendored), Radix UI primitives(필요분만), `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `tailwindcss-animate`, Style Dictionary(`style-dictionary@^4`). (012-shadcn-design-system)
- N/A (정적 토큰 + 컴파일된 CSS) (012-shadcn-design-system)
- TypeScript 5.x, Node.js 20+. CSS는 Tailwind v4 CSS-first(`@theme`) 그대로 승계. + Next.js 16 (App Router · Turbopack), React 19, Tailwind CSS v4, shadcn/ui(vendored), Radix UI primitives(필요분), `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `tailwindcss-animate`, Style Dictionary v4 (토큰 빌드). v2.4.3 대비 신규 패키지 도입 없음. (013-shadcn-phase2)
- N/A (UI 전용 피처, 데이터 스키마 변경 없음). (013-shadcn-phase2)
- TypeScript 5.x, Node.js 20+ + Next.js 16 (App Router · Turbopack), React 19, Tailwind CSS v4(`@theme` CSS-first), shadcn/ui(vendored), Radix UI primitives(필요분), `class-variance-authority`, `tailwind-merge`, `clsx`, `lucide-react`, `tailwindcss-animate`, Style Dictionary v4. **본 피처에서 신규 의존성 도입 없음** — 013 Active Technologies 승계. (014-landing-docs-refresh)
- N/A (UI·문서 피처. 영속 데이터 스키마 변경 없음). (014-landing-docs-refresh)

## Recent Changes
- 001-ax-travel-planning: Added Python 3.14 + FastMCP, httpx, python-dotenv, pytes
