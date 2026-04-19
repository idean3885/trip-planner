# Trip Planner — 업무 프로세스 (WORKFLOW)

> **대상 독자**: 기여자·개발자·운영자 공통 — 이슈·브랜치·릴리즈 프로세스를 따르거나 검증하려는 분.

**단일 정본**. 이슈·브랜치·릴리즈·디자이너 협업·AI 에이전트 활용·마일스톤·핫픽스의 전 과정을 이 문서 하나가 권위한다. 다른 문서(CLAUDE.md, DEVELOPMENT.md, README.md)가 본 문서와 충돌할 경우 본 문서를 따른다.

본 문서는 두 독자를 동시에 겨냥한다:

1. **사람** — BE 개발자, 디자이너, 기획자, 외부 합류자. "첫 이슈부터 릴리즈까지 한 번 읽고 스스로 돌아갈 수 있게".
2. **AI 에이전트** — Claude Code·v0.dev·devex:flow 등. "모호한 흐름에서 1차 컨텍스트로 참조".

관련 문서:

- [`docs/design-handoff.md`](./design-handoff.md) — 디자이너 핸드오프 상세 절차
- [`docs/DEVELOPMENT.md`](./DEVELOPMENT.md) — 로컬 개발·테스트·빌드
- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — 시스템 구조·도메인 결합도
- [`specs/README.md`](../specs/README.md) — 기획 도메인 정의
- [루트 CLAUDE.md](../CLAUDE.md) — AI 에이전트 기본 지시(상세 흐름은 본 문서 위임)
- [`changes/README.md`](../changes/README.md) — towncrier 단편 가이드

## 팀 구성·역할

1인 BE 개발자 중심 + 디자이너 1인 + AI 에이전트 다수의 하이브리드 구조. 각 역할의 책임·권한·경계는 다음과 같다.

| 역할 | 담당 | 권한 경계 |
|------|------|----------|
| **BE 개발자 (게이트)** | 제품·도메인 이해, 구현, 리뷰, 배포, 최종 머지 승인. `main`/`develop`은 개발자만 머지. | 모든 코드·DB·인프라 변경. 다른 역할 결과물을 머지 전에 도메인·접근성·회귀 기준으로 검수(게이트). |
| **디자이너** | Figma 디자인, Tokens Studio를 통한 토큰 export, 핸드오프 이슈 작성. | `design/tokens.json`, `docs/design-handoff.md`의 산출물 형식. 코드·CSS·JSX 직접 편집 없음. |
| **AI 에이전트** | 핸드오프 변환, 구현, 리뷰, 문서화 보조. Claude Code(구현·리뷰), v0.dev(컴포넌트 생성), devex:flow(이슈→브랜치→PR 자동화), 여러 MCP 서버(trip, dooray-api, ssh-tools 등). | 개발자가 게이트로 동작하는 한 실코드 수정 허용. 최종 머지·배포 결정은 개발자. |
| **기획 (선택적)** | 제품 요구 정리, 스펙 초안. | 기획 도메인 문서(`specs/`). 구현 세부에는 개입하지 않음. |

결정 원칙:

- **단방향 참조**: 디자이너 → 이슈 → 개발자 → AI 에이전트 활용 → PR → 개발자 머지. 역방향 개입(예: AI가 디자인 의도를 역정의) 금지.
- **자동화는 보조, 게이트는 사람**: AI 에이전트는 반복 작업·탐색을 가속한다. 최종 판단은 개발자가 책임진다.

## 이슈 흐름

모든 코드 변경(버그 수정·핫픽스·문서 포함)은 이슈 → 브랜치 → PR → 머지 순서를 따른다. 예외 없음.

```text
마일스톤 배정                         (= 버전 단위)
        ↓
이슈 생성 (Bug/Feat/Chore/Handoff)    ← GitHub Issue Templates
        ↓
워크트리 + 브랜치 분기                 /devex:flow 또는 수동
        ↓ (NNN-short-name 또는 hotfix/*)
구현 (speckit 하네스 + AI 세션)
        ↓
단편 추가  changes/<이슈>.<타입>.md   ← towncrier
        ↓
PR 생성 (develop 대상)                ← gh pr create
        ↓
CI 게이트 통과 (타입·빌드·테스트·린트·speckit)
        ↓
dev 환경 배포 검증 (dev.trip.idean.me)
        ↓
Merge commit 로 머지                  ← Squash off, 웹 UI 수동 squash 금지
        ↓
(마일스톤 완료 시) release 브랜치 → main
```

세부 규칙:

- **브랜치 명**: 피처는 `NNN-short-name`(speckit이 부여). 핫픽스는 `hotfix/설명`.
- **브랜치 최신화**: 작업 전 `git pull origin develop` 필수. PR 생성 전 base와 충돌 확인, 있으면 rebase.
- **PR 대상**: 기본은 `develop`. `main` 직접 머지 금지.
- **머지 방식**: `Create a merge commit`. Squash·Rebase는 off. 커밋 정리는 push 전 개발자가 feature 브랜치에서 직접(interactive rebase).
- **CI 게이트**: `towncrier-fragment-check`(단편 없으면 `chore-no-news` 라벨 필요), `speckit-gate`(피처 브랜치 산출물 검증), 타입·빌드·테스트·린트 전건.

피처 브랜치에서의 speckit 하네스 상세는 [CLAUDE.md의 "speckit 하네스" 섹션](../CLAUDE.md) 참조. 본 문서는 전체 흐름만 안내한다.

## 버전·릴리즈 정책

Git Flow Lite. `main`은 프로덕션 유일 정본(태그 부여), `develop`은 통합 브랜치, 피처·핫픽스는 `develop`으로 머지 후 마일스톤 단위로 `main`에 반영.

### 배포 환경 매핑

| 브랜치 | 도메인 | 용도 |
|--------|--------|------|
| `main` | [trip.idean.me](https://trip.idean.me) | 프로덕션 릴리즈 |
| `develop` | [dev.trip.idean.me](https://dev.trip.idean.me) | 마일스톤 통합 테스트 |
| `NNN-*` / `hotfix/*` | PR 프리뷰 URL | 피처 단위 프리뷰 |

### SemVer 기준 (towncrier 단편 타입과 매핑)

| 변경 유형 | 예시 | 단편 타입 | 버전 범프 |
|----------|------|----------|-----------|
| 호환성 깨지는 변경 | API 스키마 변경, MCP 도구 삭제 | `breaking` | MAJOR |
| 기능 추가 | 새 API, 새 MCP 도구, 새 페이지 | `feat` | MINOR |
| 버그 수정 | 크래시 수정 | `fix` | PATCH |
| 기능 제거 | 데드 코드, 은퇴 API | `removed` | PATCH |
| 문서 변경 | README, 가이드 | `docs` | PATCH |
| 비가시 변경 | 의존성, 빌드, 인프라 | `chore` | PATCH |

단편 누락 PR은 `chore-no-news` 라벨로 면제하거나 `changes/<이슈>.<타입>.md`를 1개 이상 추가해야 한다. 상세: [`changes/README.md`](../changes/README.md).

### 개발 단계 (마일스톤 진행 중)

1. 피처 브랜치에서 작업 → `changes/<이슈번호>.<타입>.md` 단편 1개 이상 추가 → develop PR → 머지.
2. `develop` 머지 시 [dev.trip.idean.me](https://dev.trip.idean.me) 자동 배포. 회귀 확인.
3. 마일스톤의 모든 이슈가 `develop`에 반영될 때까지 반복.

### 릴리즈 단계 (마일스톤 완료 시)

1. `release/vX.Y.Z` 브랜치 분기.
2. `uv run towncrier build --version X.Y.Z --yes` 실행 → `changes/*.md` 단편이 `CHANGELOG.md`로 합쳐지고 단편은 삭제됨. 미리보기는 `--draft`.
3. `pyproject.toml`의 `version` 필드를 `X.Y.Z`로 범프.
4. release → main PR 생성 → 머지(merge commit).
5. CI 자동 동작:
   - `auto-tag.yml` — `pyproject.toml` 변경 감지 → annotated 태그 생성.
   - `auto-release.yml` — 태그 push → CHANGELOG 추출 → GitHub Release 생성.
   - `pypi-publish.yml` — 태그 push → 테스트 → PyPI 배포.

### main→develop 역머지

`main`은 merge commit만 쌓이고 콘텐츠는 release 브랜치와 동일하다. 따라서 기본적으로 역머지는 불필요. `sync/main-to-develop-*` 브랜치는 기록용으로만 남는다.

## 디자이너 협업 흐름

디자이너가 합류한 시점부터의 표준 흐름. 협업은 **수동 트리거 + 개발자 게이트** 모델이다(자동화 보류).

```text
Figma 디자인 작성 (디자이너)
        ↓
Tokens Studio로 토큰 export  또는  Frame URL/스크린샷 수집
        ↓
GitHub Issue 생성: "🎨 Designer Handoff" 템플릿 선택       ← .github/ISSUE_TEMPLATE/design-handoff.yml
        ↓ (필수 필드 6종: Figma URL·스크린샷·Variants·인터랙션·데이터 바인딩·토큰 변경 여부)
개발자 assign + 세션 시작
        ↓
AI 세션에서 변환 (Claude Code, v0.dev)
        ↓
검토 체크포인트 (개발자)
  - 도메인 정합성 (헌법 V)
  - 접근성 (키보드·포커스·ARIA)
  - 시각 회귀 (미리보기 경로 비교)
  - 토큰 변경 있으면 pnpm run tokens:build 결과 확인
        ↓
feature 브랜치에서 PR 생성 (Handoff: #N 표기)
        ↓
CI 게이트 + 개발자 최종 리뷰 → merge commit 머지
```

세부 절차는 [`docs/design-handoff.md`](./design-handoff.md)에 있다. 본 섹션은 흐름 개요만 담는다.

핵심 원칙:

- **수동 트리거**: Figma webhook → CI 자동 PR 같은 자동화는 도입하지 않는다(6개월 운영 후 재평가).
- **개발자 게이트 필수**: AI 변환 결과를 그대로 머지하지 않는다. 도메인·접근성·회귀 4개 체크포인트 통과 후 머지.
- **토큰은 단일 소스**: `design/tokens.json` → `pnpm run tokens:build` → `src/app/globals.css @theme`. 수기 편집 금지.
- **라이트 모드 단독**: 다크 모드는 별도 마일스톤(현재 미도입).

## AI 에이전트 활용

AI 에이전트는 반복 작업·탐색·변환을 가속한다. 게이트는 사람이 유지한다.

| 에이전트 | 주 용도 | 호출 방법 |
|----------|---------|----------|
| **Claude Code** | 구현, 리뷰, 디버깅, 문서 작성, speckit 하네스 실행 | 터미널 세션 직접 시작. 장기 작업은 워크트리 분기 권장. |
| **v0.dev** | shadcn/ui 컴포넌트 생성(Figma → 코드 변환) | v0.dev 웹 인터페이스. 산출물을 `src/components/ui/`에 vendoring. |
| **devex:flow** | 이슈 → 브랜치 → PR 파이프라인 | `/devex:flow` 슬래시 명령(Claude Code 내). 피처 브랜치 네이밍 규약에 주의. |
| **MCP 서버 (trip)** | DB 여행 데이터 조회/편집 | Claude Desktop·Code의 MCP 연동. 주로 검증·조회용. |
| **MCP 서버 (기타)** | Dooray(사내), SSH 도구 등 | 필요 시 사용. 본 프로젝트 릴리즈 흐름엔 비핵심. |

AI 에이전트 동작 지침은 저장소 루트 [`CLAUDE.md`](../CLAUDE.md)에 요약되어 있다. 에이전트는 다음 우선순위로 컨텍스트를 참조한다:

1. **본 문서(WORKFLOW.md)** — 업무 흐름·정책·릴리즈.
2. **CLAUDE.md** — AI 에이전트 전용 지시(speckit 하네스, 메타태그, 데이터 정본, 타임존 규약 등).
3. **specs/** — 피처별 WHAT/WHY.
4. **구현 코드** — 현행 상태.

에이전트가 업무 흐름에 모호함을 만나면 본 문서를 참조하고, 여전히 모호하면 개발자에게 확인 요청한다.

## 마일스톤 운영

마일스톤은 릴리즈 단위다. 버전 = 마일스톤(1:1).

### 기본 규칙

- **모든 이슈는 마일스톤 필수**. 마일스톤 없는 이슈는 운영상 "미정렬"로 간주.
- **마일스톤 신설은 목적이 명확할 때만**. 잡다한 작업은 기존 마일스톤에 흡수. 선택적 사용 원칙.
- **여러 이슈가 하나의 목표에 묶일 때** 마일스톤 신설이 정당화된다(예: "v2.4.3 디자인 시스템 기반" = #250 + #270).
- **닫힌 마일스톤에 이슈 추가 금지**. 추가해야 할 변경은 다음 마일스톤으로.
- **1인 개발 + AI 병렬 전제**: 워크트리 분기 + 단편 분리(towncrier)로 충돌 구조적 차단.

### 마일스톤 완료 신호 = 릴리즈 PR

마일스톤의 모든 이슈가 `develop`에 머지되면 릴리즈 단계로 진입. 세부 절차는 [§ 버전·릴리즈 정책](#버전릴리즈-정책) 참조.

### 사후 정리 정책

이미 릴리즈된 사실은 뒤집지 않는다. 사후 마일스톤 정리가 필요한 경우:

- **새 마일스톤(closed 상태)**을 만들고 해당 이슈를 재배정한다.
- **충돌 해결 목적**이면 PATCH 버전으로 rename.
- `pyproject.toml`·CHANGELOG의 공개된 버전은 수정하지 않는다.

## 핫픽스 흐름

프로덕션 긴급 수정 경로. 정상 피처 흐름을 우회하지 않는다.

```text
main의 문제 발견
        ↓
develop에서 hotfix/설명 브랜치 생성        ← hotfix/v2.x.y-간단설명
        ↓
수정 + changes/<이슈>.fix.md 단편 추가
        ↓
hotfix → develop PR → 머지
        ↓
dev.trip.idean.me 환경에서 검증             ← 반드시 검증
        ↓
release 단계 (towncrier build + PATCH 범프)
        ↓
develop → main PR → 머지
        ↓
CI 자동 릴리즈 (tag·GitHub Release·PyPI)
```

핵심 원칙:

- **`main` 직접 머지 금지**. dev 환경 검증 필수.
- **단편 생략 금지**. 긴급해도 `changes/<이슈>.fix.md` 1개는 추가.
- **피처와 동일한 CI 게이트 통과**. 핫픽스라는 이유로 검증을 건너뛰지 않는다.
- **이슈 번호 필수**. "자명한 버그도 즉시 처리"가 원칙이지만 이슈 자체는 생성한다(추적성).

---

## 변경 이력

본 문서는 **구조적으로 업데이트되는 살아있는 정본**이다. 운영상 변경(정책·도구·규약 추가)이 있을 때마다 본 문서를 먼저 갱신하고 다른 문서(CLAUDE.md·DEVELOPMENT.md·README.md)를 그에 맞춰 조정한다.

- 2026-04-19 초판 — v2.4.3(#270) 디자인 시스템 기반 제정과 함께 도입. 기존 CLAUDE.md의 Git 워크플로우·릴리즈·핫픽스 섹션을 흡수 정리.
