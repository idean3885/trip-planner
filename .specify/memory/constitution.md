<!--
Sync Impact Report
- Version change: 1.0.1 → 1.1.0
- Modified principles:
  - II. Minimum Cost: "GitHub, GitHub Pages" → "Vercel Hobby, Neon 무료 티어, GitHub" (인프라 전환 반영)
  - IV. Incremental Release: v1 완료 상태 반영, v2 진행 중 명시
- Modified constraints:
  - 기술 스택: v1/v2 분리, Next.js/Vercel/Neon/Prisma/Auth.js 추가
  - 데이터 관리: 마크다운 → DB 전환 반영
  - v1 제약 → v1→v2 전환 상태로 갱신
- Added sections: none
- Removed sections: none
- Renamed: "Travel Planner" → "Trip Planner"
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (no changes needed)
  - .specify/templates/spec-template.md ✅ (no changes needed)
  - .specify/templates/tasks-template.md ✅ (no changes needed)
- Follow-up TODOs: none
-->

# Trip Planner Constitution

## Core Principles

### I. AX-First

모든 기능은 AI Experience를 핵심으로 설계한다. 사용자가 자연어로 여행 조건을 제시하면 AI가 검색·분석·생성을 수행한다. AI가 중간에서 데이터를 가공하고, 사용자는 결과를 확인·피드백하는 구조를 기본으로 한다.

- 플래닝 워크플로우는 반드시 AI 에이전트를 통해 수행한다.
- API 호출 결과는 AI가 분석·요약하여 사용자에게 제공한다.
- 사용자가 직접 API를 호출하거나 데이터를 가공할 필요가 없어야 한다.

### II. Minimum Cost

추가 비용을 최소화한다. 기존 구독 및 API 비용 외의 추가 비용은 발생하지 않아야 한다.

- 별도 AI API 과금이 필요한 기능은 도입하지 않는다.
- 무료 인프라(Vercel Hobby, Neon 무료 티어, GitHub 등)를 우선 활용한다.
- 유료 서비스 도입 시 반드시 비용 대비 효과를 명시하고 승인을 받는다.

### III. Mobile-First Delivery

모든 산출물은 모바일에서 잘 보여야 한다. 비개발자 동행자가 모바일 브라우저에서 불편 없이 열람할 수 있는 것이 기준이다.

- 마크다운 일정은 웹 렌더링 기준 모바일 반응형을 확인한다.
- 테이블은 모바일에서 가로 스크롤 또는 축소 없이 읽을 수 있도록 설계한다.
- 링크(숙소, 항공, 지도 등)는 모바일에서 탭하여 바로 이동 가능해야 한다.

### IV. Incremental Release

점진적으로 릴리즈한다. v1은 최소 기능(플래닝 + 마크다운 딜리버리)으로 빠르게 완성하고, v2에서 웹앱을 도입한다.

- 각 릴리즈는 독립적으로 사용 가능한 완성된 산출물을 제공한다.
- v1(MCP 플래닝 + 마크다운 딜리버리) 완료. v2(풀스택 웹앱) 진행 중.
- 기능 추가 시 기존 기능이 깨지지 않아야 한다.

## Constraints

- **타겟 사용자**: 개발자 1명(개발/운영) + 비개발자 동행자 2~5명(열람/사용)
- **기술 스택 (v1)**: Python, Booking.com RapidAPI (booking-com15), Claude Desktop/Code, MCP
- **기술 스택 (v2)**: Next.js (SSR), Vercel, Neon Postgres, Prisma, Auth.js — v1 도구와 공존
- **데이터 관리**: 데이터베이스 기반 (Neon Postgres). 기존 마크다운(`trips/`)은 레거시로 보존
- **레포 공개**: public 전환 예정 — 시크릿 정리 후 전환, 포트폴리오 활용
- **v1→v2 전환**: v1의 개발자 병목(Claude 실행 + push 담당)을 v2 웹앱으로 해소 중

## Development Workflow

- spec-kit 프로세스를 따른다: constitution → specify → plan → tasks → implement
- 1인 개발 — 코드 리뷰 대신 AI 리뷰 + 셀프 검증
- 커밋은 기능 단위로, 의미 있는 메시지와 함께
- 블로그 시리즈로 의사결정 과정을 기록하며 진행
- API 키 등 시크릿은 절대 커밋하지 않는다

## Governance

이 헌법은 프로젝트의 모든 설계·구현 결정에 우선한다. 헌법에 위배되는 기능 추가나 아키텍처 변경은 헌법 개정 후 진행한다.

- **개정 절차**: 변경 사유 명시 → 영향 범위 확인 → 버전 업데이트 → 의존 템플릿 동기화
- **버전 정책**: MAJOR.MINOR.PATCH (원칙 삭제/재정의 = MAJOR, 원칙 추가/확장 = MINOR, 문구 수정 = PATCH)
- **준수 확인**: 각 specify/plan/tasks 단계에서 헌법 원칙 위반 여부를 검증한다

**Version**: 1.1.0 | **Ratified**: 2026-03-22 | **Last Amended**: 2026-04-14
