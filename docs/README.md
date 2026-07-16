# 개발 문서 (docs)

이 디렉터리는 프로젝트의 심화 문서를 담습니다. 외부 방문자는 루트 [README.md](../README.md)와 [랜딩](https://trip.idean.me)을 먼저 보세요.

구조가 궁금하면 먼저 볼 것은 하나입니다 — **[ARCHITECTURE.md](./ARCHITECTURE.md)**. 시스템 구성도·주요 흐름·도메인·데이터 스키마를 그림 위주로 한 문서에 모았습니다. 각 문서 상단에도 "대상 독자"가 명시돼 있으니 필요한 섹션만 골라 읽으면 됩니다.

## 코드·구조를 이해하려는 분

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 시스템 구성도·배포 토폴로지·도메인·주요 흐름
- [DOMAIN.md](./DOMAIN.md) — 바운디드 컨텍스트 · 데이터 소유권
- [ERD.md](./ERD.md) — 데이터 모델 다이어그램(Prisma 기준)
- [DEVELOPMENT.md](./DEVELOPMENT.md) — 로컬 세팅, 기술 스택, 개발 실행 절차

## 업무 프로세스·환경

- [WORKFLOW.md](./WORKFLOW.md) — 이슈·브랜치·릴리즈·마일스톤·디자이너 협업 업무 프로세스 정본
- [ENVIRONMENTS.md](./ENVIRONMENTS.md) — 환경 격리 원칙과 URL 도출 규칙(prod/dev/preview/local)
- [design-handoff.md](./design-handoff.md) — 디자이너 ↔ 개발자 핸드오프 절차
- [brand-image-prompts.md](./brand-image-prompts.md) — 브랜드 이미지(OG·Hero·기능·아이콘) 생성 프롬프트 정본

## 기술 스택 한눈에

| 계층 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16 (App Router · Turbopack), React 19, Tailwind CSS v4, shadcn/ui |
| 백엔드 | Next.js Server Components · Route Handlers, Auth.js v5 (next-auth 5 beta) |
| DB | Neon Postgres, Prisma 7 (TCP via `@prisma/adapter-pg`) |
| MCP 서버 | Python 3.10+, FastMCP, httpx |
| 테스트 | Vitest, Playwright, pytest |
| 배포·CI/CD | Vercel (웹), PyPI (MCP), GitHub Actions |

---

## 더 깊이 (필요할 때만)

- [../specs/](../specs/) — speckit 스펙(피처별 `spec`/`plan`/`tasks`)과 그 관리 방식 설명
- [adr/](./adr/) — 뒤집으면 비용이 큰 규범적 결정 기록(ADR)
- [audits/](./audits/) · [evidence/](./evidence/) · [research/](./research/) — 감사 리포트 · 검증 증적 · 리서치 원자료
- 변경 이력은 루트 [CHANGELOG.md](../CHANGELOG.md)에서 확인할 수 있습니다.
