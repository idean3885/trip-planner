# 개발 문서 (docs)

이 디렉터리는 프로젝트의 심화 문서를 담습니다. 외부 방문자는 루트 [README.md](../README.md)와 [랜딩](https://trip.idean.me)을 먼저 보세요.

문서는 **독자 그룹 3층**으로 묶여 있습니다. 각 문서 상단에도 "대상 독자"가 명시돼 있으므로 필요한 섹션만 골라 읽으면 됩니다.

## 기여자·개발자 — 코드·아키텍처·도메인을 이해하려는 분

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 시스템 전반 구성요소(웹/MCP/DB/배포)와 흐름
- [DEVELOPMENT.md](./DEVELOPMENT.md) — 로컬 세팅, 기술 스택, 개발 실행 절차
- [DOMAIN.md](./DOMAIN.md) — DDD 바운디드 컨텍스트 · 데이터 소유권
- [ERD.md](./ERD.md) — 데이터 모델 다이어그램(Prisma 기준)
- [design-handoff.md](./design-handoff.md) — 디자이너 ↔ 개발자 핸드오프 절차

## 운영·감사 — 배포·감사·증적을 확인하려는 분

- [ENVIRONMENTS.md](./ENVIRONMENTS.md) — 환경 격리 원칙과 URL 도출 규칙(prod/dev/preview/local)
- [audits/](./audits/) — 감사 기록(drift 리포트, 릴리즈 스냅샷 등)
- [evidence/](./evidence/) — speckit Evidence(수동 검증 증적)
- [research/](./research/) — 리서치 스냅샷(기술 비교·조사 원자료)

## 공통 — 양쪽 모두 참조

- [WORKFLOW.md](./WORKFLOW.md) — 이슈·브랜치·릴리즈·마일스톤·디자이너 협업 업무 프로세스 정본

## 기술 스택 한눈에

| 계층 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16 (App Router · Turbopack), React 19, Tailwind CSS v4, shadcn/ui |
| 백엔드 | Next.js Server Components · Route Handlers, Auth.js v5 |
| DB | Neon Postgres, Prisma 7 (TCP via `@prisma/adapter-pg`) |
| MCP 서버 | Python 3.10+, FastMCP, httpx |
| 테스트 | Vitest, Playwright, pytest |
| 배포·CI/CD | Vercel (웹), PyPI (MCP), GitHub Actions |

---

## 참고

- 스펙(피처별 spec/plan/tasks)은 이 디렉터리가 아닌 저장소 루트의 [`specs/`](../specs/) 아래에 있습니다.
- v1 시절의 통합 스펙 스냅샷은 [audits/2026-04-v1-spec-snapshot.md](./audits/2026-04-v1-spec-snapshot.md)에 역사적 기록으로 보존됩니다.
- 변경 이력은 루트 [CHANGELOG.md](../CHANGELOG.md)에서 확인할 수 있습니다.
