# Technical Documentation

Trip Planner 기술 문서 허브. 제품 소개는 [루트 README](../README.md) 참조.

## 아키텍처

| 문서 | 내용 |
|------|------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 구조, 인증 흐름, 데이터 접근 패턴, 도메인 결합도 |
| [DOMAIN.md](DOMAIN.md) | DDD 기술 도메인, 애그리거트, 이벤트 |
| [ERD.md](ERD.md) | DB 스키마 (Mermaid), 컬럼 코멘트, 설계 결정 |

## 개발

| 문서 | 내용 |
|------|------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | 기술 스택, 프로젝트 구조, 로컬 개발, 테스트, 배포 |

## 협업·프로세스

AI 에이전트 1차 참조 가이드. 사람·에이전트가 같은 흐름으로 동작하도록 정본을 집중했다.

| 문서 | 내용 |
|------|------|
| [WORKFLOW.md](WORKFLOW.md) | 업무 프로세스 단일 정본 — 팀 구성·이슈 흐름·릴리즈·디자이너 협업·AI 에이전트·마일스톤·핫픽스 |
| [design-handoff.md](design-handoff.md) | 디자이너 핸드오프 상세 — 도구 셋업·산출물 형식·개발자 처리 절차·검토 체크포인트 |

## 스펙 (기획 도메인)

기획 도메인 정의, 관계, 크로스 도메인 헌법은 [specs/README.md](../specs/README.md) 참조.

## 기술 스택

| 계층 | 기술 |
|------|------|
| 프론트엔드 | Next.js 15 (App Router), Tailwind CSS v3 |
| 백엔드 | Next.js API Routes, Auth.js v5 |
| DB | Neon Postgres, Prisma 7 (TCP) |
| MCP 서버 | Python 3.10+, FastMCP, httpx |
| 테스트 | Vitest (SWC + vmThreads), React Testing Library, pytest |
| 배포 | Vercel (웹), PyPI (MCP) |
| CI/CD | GitHub Actions (auto-tag, auto-release, PyPI publish) |
