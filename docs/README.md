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
