# Travel Planner - Claude Desktop 작업 지침

## 프로젝트 개요
범용 여행 서포터/플래너. 여행 일정, 예산, 숙소, 교통, 예약, 와인/식사 추천 등을 마크다운으로 관리하고, iCal 연동 및 PDF 추출을 지원합니다.

## 디렉토리 구조
```
trip-planner/
├── trips/                          # 여행별 폴더
│   └── {year}-{trip-name}/         # 예: 2026-honeymoon-portugal-spain
│       ├── overview.md             # 여행 개요 (인원, 기간, 루트, 항공, 날씨)
│       ├── itinerary.md            # 전체 일정 요약
│       ├── daily/                  # 일자별 상세 일정
│       │   └── dayNN-MMDD-*.md     # 숙소, 이동, 관광, 식사, 경비 통합
│       ├── accommodations.md       # 숙소 정보 + 대안
│       ├── transport.md            # 도시 간 이동 + 시내 교통
│       ├── budget.md               # 예산 + 실지출 추적
│       ├── payments.md             # 결제 수단 (트레블월렛, 현금 등)
│       ├── reservations.md         # 사전 예약 체크리스트
│       ├── packing.md              # 패킹 리스트 + 세탁 계획
│       ├── wine-checklist.md       # 와인 체크리스트 (이 여행 특화)
│       ├── shopping.md             # 쇼핑 리스트
│       ├── tips.md                 # 주의사항 & 팁
│       └── calendar/               # .ics 파일
├── templates/                      # 새 여행 생성용 템플릿
├── scripts/                        # PDF 변환, ical 생성 등
└── docs/                           # GitHub Pages용 (추후)
```

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

| PR 방향 | 머지 방식 | 이유 |
|---------|----------|------|
| feature/hotfix → develop | **Squash and merge** | 커밋 정리, 깔끔한 develop 히스토리 |
| develop → main | **Create a merge commit** | 커밋 해시 보존, 역머지 시 충돌 방지 |

> develop → main을 squash하면 커밋 해시가 달라져 main → develop 동기화 시 매번 충돌 발생.

### 배포 환경 매핑

| 브랜치 | 도메인 | 용도 |
|--------|--------|------|
| main | trip.idean.me | 프로덕션 릴리즈 |
| develop | dev.trip.idean.me | 마일스톤 통합 테스트 |
| feature/* | PR 프리뷰 URL | 피처 단위 프리뷰 |

### 릴리즈 프로세스

**개발 (마일스톤 진행 중)**:
1. feature 브랜치에서 작업 → develop PR → 머지
2. develop에 머지되면 dev.trip.idean.me에 자동 배포
3. 마일스톤의 모든 이슈가 develop에 머지될 때까지 반복

**릴리즈 (마일스톤 완료 시)**:
1. `CHANGELOG.md`에 새 버전 섹션 추가 (Keep a Changelog 형식)
2. `pyproject.toml`의 `version` 필드 범프
3. develop → main PR 생성 → 머지

**CI 자동 (main 머지 후)**:
4. `auto-tag.yml`: pyproject.toml 변경 감지 → annotated 태그 생성
5. `auto-release.yml`: 태그 push → CHANGELOG 추출 → GitHub Release 생성
6. `pypi-publish.yml`: 태그 push → 테스트 → PyPI 배포

**버전 범프 기준 (SemVer)**:
- MAJOR: 호환성 깨지는 변경 (API 스키마 변경, MCP 도구 삭제 등)
- MINOR: 기능 추가 (새 API, 새 MCP 도구, 새 페이지 등)
- PATCH: 버그 수정, 성능 개선, 문서 수정

**핫픽스 프로세스**:
1. develop에서 `hotfix/*` 브랜치 생성
2. 수정 + CHANGELOG + 버전 PATCH 범프
3. hotfix → develop PR → 머지 → dev 환경 확인
4. develop → main PR → 머지 → CI 자동 릴리즈
5. main 직접 머지 금지 — dev 환경 검증 필수

## 작업 규칙

### 데일리 파일 포맷
각 daily/*.md 파일은 다음 섹션을 포함해야 합니다:
1. **오늘의 요약** — 도시, 숙소, 이동, 예상 경비
2. **숙소** — 체크인/아웃, 가격, 상태
3. **이동** — 도시 간 이동 수단, 시간, 비용, 예약 여부
4. **일정** — 시간대별 일정 + **예약 필요 여부** (사전 예약 필수/권장/불필요)
5. **투어/관광 상세** — 예약처, 비용, 소요시간
6. **식사 추천** — 장소, 메뉴, 가격대, 예약 필요 여부
7. **메모** — 팁, 주의사항

### 예약 상태 표기
- `사전 예약 필수` — 매진 위험, 반드시 미리
- `사전 예약 권장` — 미리 하면 편리
- `현장 구매` — 현장에서 구매 가능
- `불필요` — 예약 불필요

### 예산 추적
- budget.md의 실지출 추적 섹션에 날짜별로 기록
- 결제수단 컬럼에 트레블월렛/현금/카드 구분

### iCal 연동
- Apple 캘린더 기준
- calendar/ 디렉토리에 .ics 파일 생성
- scripts/generate-ical.py로 마크다운에서 자동 생성

### PDF 추출
- scripts/generate-pdf.sh로 마크다운 → PDF 변환
- 인터넷 없는 환경 대비용
- 전체 일정 PDF + 데일리 개별 PDF

### 블로그 활용
- 모든 콘텐츠는 마크다운으로 관리
- 추후 블로그 포스팅 소재로 재활용 가능하도록 작성

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

## Recent Changes
- 001-ax-travel-planning: Added Python 3.14 + FastMCP, httpx, python-dotenv, pytes
