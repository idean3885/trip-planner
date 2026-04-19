# Technical Documentation

Trip Planner 기술 문서 허브. 제품 소개는 [루트 README](../README.md) 참조.

## 아키텍처

| 문서 | 내용 |
|------|------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 구조, 인증 흐름, 데이터 접근 패턴, 도메인 결합도 |
| [DOMAIN.md](DOMAIN.md) | DDD 기술 도메인, 애그리거트, 이벤트 |
| [ERD.md](ERD.md) | DB 스키마 (Mermaid), 컬럼 코멘트, 설계 결정 |

## 운영·환경

| 문서 | 내용 |
|------|------|
| [ENVIRONMENTS.md](ENVIRONMENTS.md) | prod/dev/preview/local 3-layer URL 도출, 환경 변수 의존 최소화 원칙 |

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

현재 유효한 스펙 정본은 [specs/README.md](../specs/README.md). 본 디렉토리의 [spec.md](spec.md)는 v1 오리지널 기획(2025년 마크다운 딜리버리 시절)으로, 맥락 보존 목적의 역사 문서다.

## 감사·증거·연구

| 디렉토리 | 내용 |
|----------|------|
| [audits/](audits/README.md) | speckit drift·마이그레이션·정합성 감사 리포트 |
| [evidence/](evidence/README.md) | 피처별 quickstart Evidence — 스크린샷·로그·비교표 |
| [research/](research/README.md) | 스펙·플랜 결정의 근거 원자료(벤더 비교·벤치마크 등) |

## 기술 스택

| 계층 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui (vendored) |
| 백엔드 | Next.js Route Handlers, Auth.js v5 |
| DB | Neon Postgres, Prisma 7 (TCP via `@prisma/adapter-pg`) |
| MCP 서버 | Python 3.10+, FastMCP, httpx |
| 테스트 | Vitest (SWC + vmThreads), @testing-library/react, pytest |
| 배포 | Vercel (웹), PyPI (MCP) |
| CI/CD | GitHub Actions (lint/typecheck/test 게이트, auto-tag, auto-release, PyPI publish, drift 주간 감사) |
