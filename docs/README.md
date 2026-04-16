# Technical Documentation

Trip Planner 기술 문서 허브. 제품 소개는 [루트 README](../README.md) 참조.

## 아키텍처

| 문서 | 내용 |
|------|------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 구조, 인증 흐름, 데이터 접근 패턴, 도메인 결합도 |
| [DOMAIN.md](DOMAIN.md) | 기획 도메인 5개 + DDD 기술 도메인, 애그리거트, 이벤트 |
| [ERD.md](ERD.md) | DB 스키마 (Mermaid), 컬럼 코멘트, 설계 결정 |

## 개발

| 문서 | 내용 |
|------|------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | 기술 스택, 프로젝트 구조, 로컬 개발, 테스트, 배포 |

## 스펙 (기획 도메인 기준)

| 도메인 | 디렉토리 | 스펙 | 상태 |
|--------|---------|------|------|
| **여행 탐색** | [specs/travel-search/](../specs/travel-search/) | 001 여행 검색 MCP, 005 API 연동 | 완료 |
| **일정 편성** | [specs/itinerary/](../specs/itinerary/) | 006 구조화 활동 | 완료 |
| **예산 관리** | — | (미착수) | — |
| **동행 협업** | [specs/collaboration/](../specs/collaboration/) | 004 풀스택 전환, 007 OAuth CLI | 완료 |
| **일정 활용** | [specs/export/](../specs/export/) | 002 iCal 번들 | 부분 |

> 은퇴: [specs/_retired/](../specs/_retired/) | 인프라: [specs/_infra/](../specs/_infra/)

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
