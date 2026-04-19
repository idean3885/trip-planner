# Quickstart: 디자인 시스템 기반 제정 (012)

**Feature**: `012-shadcn-design-system` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 각 User Story의 수동/자동 회귀 케이스를 정의한다. PR 머지 게이트(`.github/workflows/speckit-gate.yml`)가 `validate-quickstart-ev.sh`로 각 Evidence 서브섹션을 자동 검증한다.

## US1 — 디자인 시스템 기반 (Tailwind v4 + shadcn 초기 셋)

### Scenario US1-1: Tailwind v4 전환 후 기존 페이지 시각적 동등성

- 전환 전 `main`(또는 직전 develop) 기준으로 주요 페이지 스크린샷 사전 캡처: `/`, `/trips`, `/trips/<id>`, `/settings`, `/docs`, `/about`(모바일 375px + 데스크톱 1280px 각 6장, 총 12장).
- PR1 머지 전 동일 경로에서 재캡처. 각 쌍을 나란히 두고 "개선 또는 동등" 판정 확인.

### Scenario US1-2: `pnpm run tokens:build` 멱등성

- `design/tokens.json` 변경 없이 `pnpm run tokens:build` 2회 연속 실행 → `git diff src/app/globals.css` 출력 0바이트.

### Scenario US1-3: 신규 shadcn 컴포넌트 추가 명령 동작

- feature 브랜치에서 `npx shadcn@latest add accordion` 실행.
- 산출물: `src/components/ui/accordion.tsx` 생성, 의존 패키지 자동 설치.
- 미리보기 경로(`/_dev/components`)에 임시로 `<Accordion>` 추가 시 토큰 색·여백으로 렌더.

### Scenario US1-4: 다크 모드 분기 부재

- `rg "dark:" src/ tailwind.config.ts 2>/dev/null` 실행 결과 0건(tailwind.config.ts는 PR1에서 삭제 완료).
- `rg "prefers-color-scheme" src/` 0건.

### Scenario US1-5: 빌드 파이프라인 통과

- `pnpm tsc --noEmit` → 0 에러.
- `pnpm build` → 성공.
- `pnpm test` → 기존 테스트 전건 통과.
- `pnpm lint` → 기존 대비 신규 경고 0건(변경 라인 기준).

### Evidence

- 자동 테스트:
  - `pnpm tsc --noEmit`
  - `pnpm build`
  - `pnpm test`
  - `pnpm run tokens:build && git diff --exit-code src/app/globals.css`
- 수동 체크리스트:
  - [ ] US1-1: 주요 페이지 12장 전·후 스크린샷 저장 `docs/evidence/012-shadcn-design-system/us1-1-*.png`
  - [ ] US1-2: 멱등성 실측(재실행 시 diff 0바이트)
  - [ ] US1-3: `shadcn@latest add accordion` 로컬 실행 성공
  - [ ] US1-4: `rg "dark:" src/`·`rg "prefers-color-scheme"` 결과 0건 스크린샷 또는 로그
- 스크린샷: `docs/evidence/012-shadcn-design-system/us1-*.png`

## US2 — 폼 컴포넌트 Phase 1 마이그레이션

### Scenario US2-1: 6종 폼 시각·기능 회귀 없음

- 마이그레이션 대상 6종(`ActivityForm`·`AuthButton`·`DeleteTripButton`·`LeaveTripButton`·`InviteButton`·`TodayButton`)을 미리보기 경로와 실 플로우에서 각각 한 번씩 실행.
- 실 플로우: 로그인 → 여행 생성 → 활동 생성/수정 → 멤버 초대 → 오늘 이동 → 여행 탈퇴/삭제.

### Scenario US2-2: 키보드 내비 + 포커스 트랩

- Tab·Shift+Tab으로 각 폼의 모든 포커스 가능 요소를 순회. 포커스 링 시각적 확인.
- Dialog(`DeleteTripButton`·`LeaveTripButton`·`InviteButton`의 확인 단계)에서 Esc 키 닫힘 + 직전 요소 포커스 복귀.

### Scenario US2-3: Server Action 시그니처 보존

- 마이그레이션 전·후로 `src/app/actions/**` 또는 인라인 서버 액션의 시그니처(함수명·인자 타입·반환 타입)가 동일.
- `grep -rE "export (async )?function (create|update|delete|invite|leave)" src/app/ src/components/` 결과 diff 확인.

### Scenario US2-4: 모바일 375px 레이아웃

- Chrome DevTools iPhone SE(375px)에서 각 폼 2열로 깨지지 않고 한 화면에 의미 있는 영역이 모임.

### Evidence

- 자동 테스트:
  - `pnpm test` (기존 테스트 통과)
  - `pnpm build` (타입·빌드 성공)
- 수동 체크리스트:
  - [ ] US2-1: 6종 폼 각 1회 실 플로우 실행 로그
  - [ ] US2-2: Tab 내비·Esc 트랩 검증 스크린샷 `docs/evidence/012-shadcn-design-system/us2-2-focus.png`
  - [ ] US2-3: Server Action 시그니처 diff 0건 확인 로그
  - [ ] US2-4: 375px 6종 폼 스크린샷 `docs/evidence/012-shadcn-design-system/us2-4-mobile-*.png`
- 스크린샷: `docs/evidence/012-shadcn-design-system/us2-*.png`

## US3 — 디자이너 핸드오프 파이프라인

### Scenario US3-1: tokens:build 라운드트립

- `design/tokens.json`의 `color.primary.500` 값을 임의 변경(예: `#0e90e0` → `#ff0000`).
- `pnpm run tokens:build` 실행 → `src/app/globals.css`의 `--color-primary-500` 갱신 확인.
- 앱 실행 후 Primary 컬러가 빨간색으로 반영되는지 미리보기 경로에서 확인.
- 검증 후 원복(커밋 금지).

### Scenario US3-2: Issue Forms 템플릿 렌더

- GitHub 저장소 `Issues` → `New Issue` 진입 → "🎨 Designer Handoff" 템플릿이 목록에 표시.
- 선택 후 필수 필드 6종이 순서대로 노출되고 빈 값으로 제출 시 UI가 오류 표시.

### Scenario US3-3: 스크립트 오류 경로

- `design/tokens.json` 파일을 임시 리네임 → `pnpm run tokens:build` 실행 → exit code 1 + stderr 안내 출력.
- 파일 복원.

### Scenario US3-4: 개발자 단독 dry-run 핸드오프

- 예시 토큰 변경(Scenario US3-1)을 dry-run 핸드오프로 시뮬레이션: 이슈 템플릿 작성 → 브랜치 생성 → 토큰 변경 + tokens:build → PR 본문에 `Handoff: #N` 표기 → 리뷰 → 머지(실제 머지는 선택, local 실행만으로도 충분).

### Evidence

- 자동 테스트:
  - `pnpm run tokens:build` (멱등성·오류 처리)
  - `test -f .github/ISSUE_TEMPLATE/design-handoff.yml` (파일 존재 확인)
- 수동 체크리스트:
  - [ ] US3-1: 토큰 변경 → tokens:build → CSS 반영 확인 스크린샷
  - [ ] US3-2: GitHub New Issue 화면 스크린샷 `docs/evidence/012-shadcn-design-system/us3-2-template.png`
  - [ ] US3-3: tokens:build 오류 출력 로그
  - [ ] US3-4: dry-run 시뮬레이션 이슈·브랜치·PR 링크 또는 로그 기록
- 스크린샷: `docs/evidence/012-shadcn-design-system/us3-*.png`

## US4 — 업무 프로세스 문서

### Scenario US4-1: WORKFLOW.md 7개 섹션 존재

- `docs/WORKFLOW.md` 파일 내 `## 팀 구성·역할`, `## 이슈 흐름`, `## 버전·릴리즈 정책`, `## 디자이너 협업 흐름`, `## AI 에이전트 활용`, `## 마일스톤 운영`, `## 핫픽스 흐름` 7개 헤더 순서 확인.

### Scenario US4-2: 문서 링크 1홉 진입 (3 지점)

- `docs/README.md`, `CLAUDE.md`, 루트 `README.md` 세 파일에서 `docs/WORKFLOW.md` 경로를 직접 링크하는지 `rg "docs/WORKFLOW.md"` 검증.

### Scenario US4-3: `docs/design-handoff.md` 링크

- `docs/WORKFLOW.md`의 "디자이너 협업 흐름" 섹션에서 `docs/design-handoff.md` 링크가 존재.

### Scenario US4-4: CLAUDE.md 권위 위임 문구 존재

- `CLAUDE.md`에 "업무 프로세스의 단일 정본은 [`docs/WORKFLOW.md`]" 혹은 동등 위임 문구가 포함.

### Evidence

- 자동 테스트:
  - `rg "^## (팀 구성·역할|이슈 흐름|버전·릴리즈 정책|디자이너 협업 흐름|AI 에이전트 활용|마일스톤 운영|핫픽스 흐름)$" docs/WORKFLOW.md | wc -l` → 7
  - `rg "WORKFLOW\.md" docs/README.md CLAUDE.md README.md` → 3건 이상 (docs/README.md는 같은 디렉토리이므로 상대 경로 `WORKFLOW.md` 허용)
- 수동 체크리스트:
  - [x] US4-1: 7개 섹션 헤더 확인 — `grep -E "^## (팀 구성·역할|이슈 흐름|버전·릴리즈 정책|디자이너 협업 흐름|AI 에이전트 활용|마일스톤 운영|핫픽스 흐름)$" docs/WORKFLOW.md | wc -l` → 7
  - [x] US4-2: 3 지점 링크 존재 확인 — `grep -l "WORKFLOW\.md" docs/README.md CLAUDE.md README.md` → 3 files
  - [x] US4-3: WORKFLOW.md → design-handoff.md 링크 확인 — `grep -c "design-handoff.md" docs/WORKFLOW.md` → 3
  - [x] US4-4: CLAUDE.md 권위 위임 문구 확인 — `grep -c "docs/WORKFLOW.md" CLAUDE.md` → 1 이상, 문구 "단일 정본은" 포함
- 스크린샷: 해당없음 (문서 존재는 CLI 검증으로 충분)

## Rollout 순서

1. **PR1 (A — Tailwind v4 전환)**: `package.json` 의존성 교체, `postcss.config.mjs` 교체, `src/app/globals.css`에 `@import + @theme + @plugin` 구성, `tailwind.config.ts` 삭제. dev 환경 검증(US1-1~US1-5) 후 develop 머지.
2. **PR2 (B — shadcn 초기화 + 초기 컴포넌트 셋)**: `components.json` 생성, `src/components/ui/` 11종 vendoring, `src/lib/utils.ts`, `src/app/_dev/components/page.tsx`. PR1 머지 후 진행.
3. **PR3 (C — 폼 6종 마이그레이션)**: `ActivityForm`·`AuthButton`·`DeleteTripButton`·`LeaveTripButton`·`InviteButton`·`TodayButton` 교체, 미리보기 카탈로그에 섹션 추가. PR2 머지 후.
4. **PR4 (D — 핸드오프 파이프라인)**: `design/tokens.json` 시드, `scripts/build-tokens.ts`, `package.json`에 `tokens:build` 스크립트, `.github/ISSUE_TEMPLATE/design-handoff.yml`. PR1 머지 후 PR2~3과 병행 가능.
5. **PR5 (E — 업무 프로세스 문서)**: `docs/WORKFLOW.md`, `docs/design-handoff.md`, `docs/README.md` 갱신, `CLAUDE.md` 권위 위임 블록, 루트 `README.md` 협업 모델 한 줄. 다른 PR과 독립.

PR1~3은 순차 머지 필수. PR4와 PR5는 PR1 이후 어느 시점이든 독립 머지 가능.
