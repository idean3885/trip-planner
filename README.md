# 우리의 여행 ✈️

대화로 만드는 여행 플래너. 일정·숙소·활동을 한곳에 모아 동행자와 함께 모바일에서 바로 열어 씁니다.

**[trip.idean.me](https://trip.idean.me)** 에 접속하면 프로젝트 랜딩을 먼저 만나고, Google 로그인 한 번으로 바로 쓸 수 있습니다.

## 이 프로젝트는

- **AX(AI Experience) 중심** — 자연어로 "바르셀로나 6월 4박"이라고 말하면 AI가 숙소·항공·활동을 찾아 일정에 꽂아 넣습니다. Claude Desktop·Claude Code에서 MCP 도구 20종을 호출합니다.
- **동행자 협업** — 초대 링크 하나로 OWNER/HOST/GUEST 역할 기반 권한을 부여해 여러 명이 같은 일정을 함께 다듬습니다.
- **풀스택 1인 프로젝트** — Next.js 웹앱, Python MCP 서버, Neon Postgres, GitHub Actions, Vercel까지 단일 레포에서 직접 운영하는 포트폴리오 프로젝트입니다.

## 어디로 가시나요

### 써보고 싶은 분 (외부 방문자)

위 링크 한 개로 충분합니다 — 랜딩에서 시작 CTA를 누르면 Google 로그인 → 여행 생성으로 바로 이어집니다.

- 프로젝트 전반 소개는 랜딩 하단의 **프로젝트 소개** 링크(About 페이지)에서 더 자세히 읽을 수 있습니다
- AI 에이전트까지 쓰고 싶다면 아래 **빠른 시작**의 한 줄 curl을 보세요

### 코드를 보고 싶은 분 (기여자·개발자)

- **[docs/README.md](docs/README.md)** — 개발 문서 엔트리(독자별 목차)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 시스템 아키텍처
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — 개발 환경 세팅 절차
- [docs/DOMAIN.md](docs/DOMAIN.md) — 도메인 모델
- [docs/ERD.md](docs/ERD.md) — 데이터 스키마

### 운영·감사 관점 (릴리즈·감사)

- [CHANGELOG.md](CHANGELOG.md) — 변경 이력(towncrier 기반)
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — 이슈·브랜치·릴리즈 프로세스 정본
- [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) — 배포 환경 매핑
- [SECURITY.md](SECURITY.md) — 보안 정책

## 빠른 시작

```bash
# AI 에이전트(MCP) 설치 — 맥북 1줄
curl -sSL https://raw.githubusercontent.com/idean3885/trip-planner/main/scripts/install.sh | bash
```

설치 중 브라우저가 열리면 Google 로그인만 하세요. 토큰이 자동 저장됩니다. 이후 Claude에게 자연어로 요청하면 됩니다 — 예) *"포르투 6월 10일 리스본행 항공편 찾아줘"*, *"3일차 벨렘탑 09:00~11:00 추가해줘"*.

웹에서만 쓰고 싶다면 위 "써보고 싶은 분" 섹션의 링크로 바로 들어가면 됩니다.

### 구글 캘린더 연동 제약 (현재 심사 전 단계)

본 앱은 아직 앱 심사 전 단계라, **개발자가 직접 허용한 Google 계정**(최대 100명)만 구글 캘린더 연동을 사용할 수 있습니다. 앱 내 일정 조회·편집은 누구나 정상 이용 가능하며, 연동만 등록 사용자에게 한정됩니다.

연동 등록을 원하시면 [공개 토론 채널의 Q&A](https://github.com/idean3885/trip-planner/discussions/new?category=q-a)에 가입 Google 이메일을 남겨 주세요. 자세한 사유는 [ADR 0004](docs/adr/0004-gcal-testing-mode-cost.md) 참고.

## 링크

| | |
|---|---|
| 랜딩·웹앱 | [trip.idean.me](https://trip.idean.me) |
| 저장소 | [github.com/idean3885/trip-planner](https://github.com/idean3885/trip-planner) |
| 개발 문서 | [docs/README.md](docs/README.md) |
| 변경 이력 | [CHANGELOG.md](CHANGELOG.md) |
| 업무 프로세스 | [docs/WORKFLOW.md](docs/WORKFLOW.md) |

---

**License**: MIT · **Author**: idean3885
