# Implementation Plan: Google Calendar 연동 (웹 접근자를 위한 1순위 캘린더 연결)

**Branch**: `018-gcal-integration` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/018-gcal-integration/spec.md`

## Summary

구글 로그인된 사용자가 여행 상세에서 버튼 한 번으로 본인 구글 캘린더에 여행 활동을 export하고, 동일 여행의 재반영에서 중복·덮어쓰기 없이 갱신·삭제를 처리한다. 공유 여행에서는 각 멤버가 자기 계정으로만 실행하여 타 멤버 캘린더를 자동으로 건드리지 않는다. iCal 경로(`che-ical-mcp`)는 변경 없이 공존한다.

기술적으로는 (1) Auth.js v5의 **scope 증분 동의(incremental authorization)** 로 기존 로그인 세션을 깨지 않고 `https://www.googleapis.com/auth/calendar.events` 권한을 추가 확보하고, (2) Google Calendar v3 호출은 **공식 SDK `@googleapis/calendar`** + **`google-auth-library`**(OAuth2Client)로 수행하며, (3) Prisma 스키마에 `GCalLink` / `GCalEventMapping` 테이블을 추가해 연결 상태·이벤트 매핑·ETag를 영속화한다. 사용자가 GCal에서 직접 수정한 이벤트는 **서버 측 ETag와 매핑된 ETag가 어긋나면 덮어쓰지 않고 건너뛰기**로 식별한다. SDK 채택 근거는 ADR-0002 및 research R2 참조.

## Coverage Targets

- 권한 scope 증분 동의 플로우(`authorization URL` 빌더 + callback 흡수 + 세션 무손실) [why: gcal-auth] [multi-step: 3]
- GCal 데이터 모델(`GCalLink`, `GCalEventMapping`) + 마이그레이션 [why: gcal-data] [multi-step: 2]
- 캘린더 선택(새 캘린더 자동 생성 vs 기본 캘린더) UI·서버 [why: gcal-calendar-choice]
- 활동 → 이벤트 포맷터(`[여행명] 카테고리기호 활동제목` + 설명란 구성) [why: gcal-event-format]
- export/재반영 엔진(생성·갱신·삭제 + ETag 비교) [why: gcal-sync] [multi-step: 3]
- 연결 해제 + 이벤트 삭제(사용자 수정분 건너뛰기 집계) [why: gcal-unlink]
- 공유 여행 본인 한정 실행(서버에서 토큰 주체 강제) [why: gcal-per-member]
- 여행 상세 UI 진입점(#150 해소: 스크롤 없이 보이는 위치) [why: gcal-ui-entry]
- 연동 상태 표시(연결 여부·캘린더명·마지막 반영·실패/건너뜀) [why: gcal-status-ui]
- 실패·부분 성공 처리(서버 응답 + UI 재시도) [why: gcal-error] [multi-step: 2]
- iCal 경로 무회귀 회귀 테스트 [why: gcal-ical-regression]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16, React 19)
**Primary Dependencies**:
- Next.js 16 (App Router · Turbopack), Auth.js v5 (`next-auth@5`)
- Prisma 7.x + `@prisma/adapter-pg` (TCP, Vercel sin1 Fluid Compute)
- Tailwind v4 + shadcn/ui(vendored) + Radix Primitives(필요분)
- **신규 의존성(서버 전용)**:
  - `@googleapis/calendar` v14.x — Google Calendar v3 공식 단일 API 패키지 (타입 안전 래퍼, Google 유지)
  - `google-auth-library` v10.x — OAuth2Client(access_token 갱신·동시성·Retry-After 처리)
  - 선정 근거는 research.md R2의 "라이브러리 평가 표" 및 ADR-0002 참조. ADR-0002 원칙(라이브러리 우선 + "Minimum Cost = 금전·인프라 비용")을 따름.
**Storage**: Neon Postgres (Prisma ORM). Production `neondb` / Preview·Dev `neondb_dev` (#318)
**Testing**: Vitest(jsdom, vmThreads, React Testing Library). 기존 테스트 구조 승계 (`tests/api/**`, `tests/components/**`, `tests/lib/**`)
**Target Platform**: Vercel Fluid Compute (Node.js 런타임). 모바일 웹 포함 반응형
**Project Type**: web-service (풀스택 Next.js App Router)
**Performance Goals**: 여행 활동 30개 기준, "올리기" 시작부터 완료까지 p95 < 10s (권한 동의 제외). UI 진입 후 60초 내 완료 가능(스펙 SC-001)
**Constraints**:
- Google OAuth scope는 `openid email profile` + `https://www.googleapis.com/auth/calendar.events`(이벤트 RW)에 한정. 캘린더 메타데이터는 읽지 않음.
- 기존 iCal 경로(`che-ical-mcp`) 불변.
- 여행 정본은 DB. GCal은 보조 표현. 충돌 시 DB 우선.
- 사용자가 GCal에서 수정한 이벤트는 덮어쓰지 않음(ETag 불일치 감지).
**Scale/Scope**: 개인 사용 규모. 여행당 수십 이벤트, 사용자당 여행 수십 개. Google Calendar API 무료 한도(일 100만 요청/계정) 내에서 문제없음.

## Constitution Check

*GATE: Phase 0 전 통과. Phase 1 후 재검증.*

- **I. AX-First**: 본 피처는 사용자 트리거 기반이지만, export되는 여행 자체가 AI 에이전트로 구성된 산출물이므로 AX 원칙 위배 아님. "자동 지속 sync"가 아닌 것은 예측 가능성을 우선(Clarifications 1). ✅
- **II. Minimum Cost**: Google Calendar API 무료 한도 내. googleapis SDK를 도입하지 않고 `fetch` 기반으로 구현해 의존성·번들 증가 0. ✅
- **III. Mobile-First**: "구글 캘린더에 올리기" 진입점과 상태 표시는 모바일 뷰포트 기준으로 설계. shadcn `Button` + `Badge` 로 기존 디자인 시스템 재사용. ✅
- **IV. Incremental Release**: v2.8.0 마일스톤에 P1→P2→P3 순 단계 릴리스. P1만 배포해도 #305/#150 해소 가능(스펙 US1 Independent Test). ✅
- **V. Cross-Domain Integrity**: 신규 도메인 **"캘린더 연동(Calendar Sync)"**. 기존 도메인과의 관계는:
  - `Trip`/`Day`/`Activity`(일정 편성 소유) — 읽기 전용 조회
  - `TripMember`(동행 협업 소유) — 권한 확인용 읽기
  - `Account`(인증 소유) — 토큰·scope 상태 조회
  - 역방향 참조 없음. 기존 도메인 데이터를 변경하지 않음. ✅
- **VI. Role-Based Access Control**: 새 행위 "**GCal 연동 실행/해제(본인 계정 한정)**"는 여행 조회 권한을 가진 모든 역할(OWNER/HOST/GUEST)에게 허용되며, 타 멤버의 GCal 조작은 **구조적으로 불가능**(서버가 실행 주체의 토큰만 사용). Permission Matrix 개정 불필요 — "여행 조회" 권한의 파생으로 본인 자원 조작이기 때문. Constitution Check 노트: 각 요청은 세션 사용자의 토큰으로만 Google API를 호출하며, 다른 멤버의 `Account.access_token`에 절대 접근하지 않는다(코드 레벨에서 `userId !== session.userId` 토큰 조회 금지). ✅

**Gate Result**: PASS. Phase 0 진행.

## Project Structure

### Documentation (this feature)

```text
specs/018-gcal-integration/
├── plan.md              # 이 파일
├── spec.md              # 기능 명세
├── research.md          # Phase 0 산출
├── data-model.md        # Phase 1 산출
├── quickstart.md        # Phase 1 산출 (Evidence 포함)
├── contracts/
│   └── gcal-api.yaml    # OpenAPI 3 (신규 엔드포인트)
├── checklists/
│   └── requirements.md  # 품질 체크리스트
└── tasks.md             # /speckit.tasks 산출물 (본 플랜에서 생성하지 않음)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts    # (기존) Auth.js. scope 증분 동의 설정 반영
│   │   └── trips/[id]/gcal/
│   │       ├── link/route.ts               # POST/DELETE: 연결·해제
│   │       ├── sync/route.ts               # PATCH: 재반영
│   │       └── status/route.ts             # GET: 현재 상태
│   └── trips/[id]/
│       └── page.tsx                        # (기존) GCal 패널 embed
├── components/
│   ├── GCalLinkPanel.tsx                   # 진입점 + 상태 표시
│   └── GCalCalendarChoice.tsx              # 새 캘린더 vs 기본 캘린더 토글
├── lib/
│   └── gcal/
│       ├── client.ts                       # fetch 기반 REST 클라이언트 + 토큰 갱신
│       ├── format.ts                       # Activity → Google Event 변환
│       ├── sync.ts                         # 생성/갱신/삭제 diff 엔진
│       ├── auth.ts                         # incremental authorization URL 빌더
│       └── errors.ts                       # 도메인 오류 타입
└── types/gcal.ts                           # 공통 타입 (Event, Link, Mapping)

prisma/
├── schema.prisma                            # GCalLink, GCalEventMapping 추가
└── migrations/<ts>_add_gcal_integration/
    └── migration.sql                        # [migration-type: schema-only]

tests/
├── api/
│   ├── gcal-link.test.ts
│   ├── gcal-sync.test.ts
│   └── gcal-status.test.ts
├── lib/gcal/
│   ├── format.test.ts
│   ├── sync.test.ts                         # diff 알고리즘, ETag 기반 건너뛰기
│   ├── client.test.ts                       # 토큰 갱신, 에러 분류
│   └── auth.test.ts
└── components/
    ├── GCalLinkPanel.test.tsx
    └── GCalCalendarChoice.test.tsx
```

**Structure Decision**: 풀스택 Next.js App Router 단일 레포. 신규 API 라우트·컴포넌트는 기존 관례(`api/trips/[id]/**`, `components/`, `lib/`)를 그대로 따른다. MCP 서버(`mcp/`)는 변경하지 않는다(스펙 FR-011).

## Complexity Tracking

본 피처에서 Constitution 게이트에 걸리는 복잡도 도입 없음. 추가 의존성 없음. 기존 도메인 개념(여행·멤버·인증)을 조합해 캘린더 연동 도메인만 신설.

## Phase 0 요약 → `research.md`

해결 과제:
1. Auth.js v5에서 **이미 로그인된 사용자에게 scope를 추가 요청**하는 방식(incremental authorization)
2. Google Calendar REST v3 호출 전략(SDK 미도입 근거 + 엔드포인트 선택 + 오류 분류)
3. ETag 기반 사용자 수정 감지(if-match / 응답 etag 비교)
4. 새 캘린더 자동 생성 시 `calendarId` 회수·저장
5. 공유 여행에서 토큰 사용 주체 강제 방법(서버 측 `session.userId = Account.userId` 경계)
6. 부분 실패 시 사용자 재시도 UX 패턴(`partial-success` 구조)

## Phase 1 요약 → `data-model.md`, `contracts/`, `quickstart.md`

- **data-model.md**: `GCalLink`, `GCalEventMapping` 테이블 필드·관계·상태 전이. `Account.scope`는 Auth.js가 이미 관리하므로 별도 엔티티 추가 없이 참조.
- **contracts/gcal-api.yaml**: 신규 엔드포인트 4종(`POST /api/trips/{id}/gcal/link`, `PATCH /api/trips/{id}/gcal/sync`, `DELETE /api/trips/{id}/gcal/link`, `GET /api/trips/{id}/gcal/status`) OpenAPI 정의.
- **quickstart.md**: 자동(Vitest 전수) + 수동(실제 Google 계정으로 end-to-end) Evidence 규약. `### Evidence` 섹션 포함.

## Agent Context Update

마지막 단계: `.specify/scripts/bash/update-agent-context.sh claude` 실행 → `CLAUDE.md`의 Active Technologies 블록에 본 피처의 기술 맥락(018) 1줄 추가.
