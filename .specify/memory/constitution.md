<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0
- Modified principles: none
- Added principles:
  - V. Cross-Domain Integrity: 도메인 간 단방향 참조, 원천 소유권, 명시적 계약
  - VI. Role-Based Access Control: 역할 기반 권한 매트릭스, 7개 행위 정의
- Added sections:
  - Domain Ownership 테이블
  - Permission Matrix 테이블
  - Prohibited Cross-Domain Access 목록
- Removed sections: none
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (Constitution Check에서 V, VI 자동 검증)
  - .specify/templates/spec-template.md ✅ (FR 작성 시 권한 매트릭스 참조)
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

### V. Cross-Domain Integrity

도메인 간 경계를 보호한다. 각 도메인은 자신의 데이터만 소유하고, 다른 도메인의 데이터를 직접 변경하지 않는다. 도메인 정의는 [specs/README.md](../../specs/README.md) 참조.

- 도메인 간 참조는 단방향만 허용한다. 역방향 참조는 금지한다.
- 데이터는 하나의 도메인만 원천 소유한다. 다른 도메인은 조회만 가능하다.
- 도메인 간 통신은 명시적 계약(이벤트 또는 API)으로만 수행한다.

#### Domain Ownership

| 데이터 | 원천 도메인 | 참조 도메인 |
|--------|-----------|-----------|
| Trip, Day, Activity | 일정 편성 | 여행 탐색, 동행 협업, 일정 활용 |
| TripMember, 초대 | 동행 협업 | 일정 편성 (권한 확인) |
| 검색 결과 (숙소, 항공편) | 여행 탐색 | 일정 편성 (활동으로 전환) |
| 비용 집계 | 예산 관리 | (독립) |

#### Prohibited Cross-Domain Access

- 동행 협업이 Activity를 직접 생성/수정해서는 안 된다 (일정 편성 소유).
- 예산 관리가 Activity의 cost를 직접 변경해서는 안 된다 (일정 편성 소유).
- 일정 활용이 Day/Activity를 변경해서는 안 된다 (읽기 전용).
- 여행 탐색이 TripMember를 참조해서는 안 된다 (동행 협업 소유).

### VI. Role-Based Access Control

모든 행위는 역할(OWNER/HOST/GUEST) 기반 권한 검증을 거쳐야 한다. 권한 없는 행위는 시스템이 차단해야 한다.

- 새로운 행위를 추가할 때 반드시 권한 매트릭스에 먼저 등록한다.
- 권한 매트릭스에 없는 행위는 구현하지 않는다.
- 권한 검증은 API 계층에서 수행하며, 프론트엔드 비활성화는 보조 수단이다.

#### Permission Matrix

| 행위 | OWNER | HOST | GUEST |
|------|-------|------|-------|
| 여행 조회 | O | O | O |
| 일정/활동 편집 | O | O | X |
| 멤버 초대 | O | O | X |
| 멤버 제거 | O (호스트 포함) | O (게스트만) | X |
| 호스트 승격/강등 | O | X | X |
| 여행 삭제 | O | X | X |
| 주인 양도 | O (→HOST) | X | X |

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
- **준수 확인**: 각 specify/plan/tasks 단계에서 헌법 원칙 위반 여부를 검증한다. 특히 V(크로스 도메인)와 VI(권한)은 스펙의 FR 작성 시 필수 검증 대상이다.

**Version**: 1.2.0 | **Ratified**: 2026-03-22 | **Last Amended**: 2026-04-17
