# Implementation Plan: Google Calendar 공유 플로우 재설계

**Branch**: `019-gcal-shared-flow` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/019-gcal-shared-flow/spec.md`
**Research**: [docs/research/v290-gcal-share-poc.md](../../docs/research/v290-gcal-share-poc.md) (PoC Phase 0 결과)

## Summary

v2.8.0의 per-user `GCalLink` 모델을 per-trip 공유 캘린더 모델로 전환한다. 오너가 캘린더 1개를 생성·보유하고, 서버가 멤버 변경(가입·역할 변경·탈퇴)마다 `acl.insert`/`acl.patch`/`acl.delete`로 권한을 자동 관리한다. 멤버 본인의 외부 캘린더 UI 등록은 명시 버튼 기반 옵트인(`calendarList.insert`)으로 유지해 "안 쓸 자유"를 보장한다. 스키마는 **expand-and-contract** 2단 마이그레이션(본 릴리즈 expand + 후속 릴리즈 contract)으로 무중단 전환한다. v2.8.0 사용자는 기존 오너 DEDICATED 캘린더를 승격 재사용, 다른 멤버의 DEDICATED는 앱 내 연결 해제만 수행한다(외부 캘린더 자체는 유지 — 사용자 정돈 여지).

## Coverage Targets

<!-- validate-plan-tasks-cov.sh 대상. 각 bullet에 [why] 필수, 다단이면 [multi-step: N]. -->

- DB 스키마 변경 — 신규 per-trip 테이블(TripCalendarLink, MemberCalendarSubscription) expand + v2.8.0 GCalLink 백필 + 멤버 DEDICATED 자동 unlink (expand-and-contract 원칙) [why: schema-migration] [multi-step: 4]
- 오너 연결 API 재작성 (per-trip 링크 생성 + 현재 멤버 전원 ACL 자동 부여) [why: owner-link] [multi-step: 3]
- 멤버 라이프사이클 ACL 자동 동기화 (가입/역할 변경/탈퇴 훅) [why: member-lifecycle] [multi-step: 3]
- 멤버 수동 subscribe 엔드포인트 (본인 토큰으로 calendarList.insert/delete + scope 없으면 consent 유도) [why: member-subscribe] [multi-step: 2]
- 이벤트 sync 엔진 이관 (오너 토큰 1개로 공유 캘린더에 쓰기, per-link→per-trip 매핑) [why: sync-engine] [multi-step: 2]
- 트립 페이지 UI 재설계 (오너/호스트/게스트 역할별 상태 + 멤버 subscribe 버튼) [why: ui-states] [multi-step: 2]
- 레거시 API(v1 per-user gcal 라우트) 호환 레이어 (expand 기간 병존) [why: legacy-compat]
- 통합 테스트 + 교차검증 + quickstart 증거 [why: verify] [multi-step: 2]
- contract 예약 표식(후속 릴리즈에서 구 GCalLink 제거 대상 명시 — 본 릴리즈 범위 밖이나 계획 필요) [why: contract-reserve]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16 App Router · Turbopack) + Python 3.10+ (MCP는 본 피처 범위 밖)
**Primary Dependencies**: `@googleapis/calendar`, `google-auth-library`, Auth.js v5, Prisma 7.x, `@prisma/adapter-pg`, React 19, Tailwind v4, shadcn/ui (vendored), `class-variance-authority`, `lucide-react` — **신규 런타임 의존성 도입 없음**
**Storage**: Neon Postgres via Prisma `@prisma/adapter-pg` TCP (Production=`neondb`, Preview/Dev=`neondb_dev`, #318 분리)
**Testing**: Vitest (단위·통합), Playwright는 본 피처에서 신규 도입 안 함(기존 수동 quickstart 증거로 대체)
**Target Platform**: Vercel Fluid Compute (Node.js 24) · 웹 브라우저(모바일·데스크톱 동일 디자인)
**Project Type**: Web (Next.js 풀스택 모노레포, `src/` 중심)
**Performance Goals**: 오너 연결 응답 5초 이내(SC-002), 멤버 subscribe 10초 이내(SC-003)
**Constraints**: v2.8.0 사용자 무중단 마이그레이션, prod DB 직접 변경 금지(`prisma migrate deploy`만 허용)
**Scale/Scope**: 개인 사용자 중심, 트립당 멤버 ≤ 10명 가정, ACL ≤ 6,000/캘린더 제한은 실질 무관

## Constitution Check

> `validate-constitution.sh` 휴리스틱 경고 대상 (차단 없음). 본 피처의 판단:

- **V. 기존 표면 유지**: 기존 `/api/trips/[id]/gcal/*` 경로는 레거시 호환 레이어로 한 릴리즈 이상 병존 후 contract. 외부 클라이언트(MCP 도구) 영향도 확인 필요.
- **VI. 데이터 정본**: 공유 캘린더의 정본은 여전히 DB. 외부 캘린더는 파생. 이벤트 ETag/If-Match 전략은 v2.8.0(spec 018)에서 이어받음.
- **Minimum Cost (ADR-0002)**: 신규 라이브러리 0, 기존 스택 재활용.
- **헌법 V/VI 위반 없음** — Complexity Tracking 항목 비워둠.

## Project Structure

### Documentation (this feature)

```text
specs/019-gcal-shared-flow/
├── plan.md              # This file
├── spec.md              # WHAT/WHY (커밋 완료)
├── data-model.md        # (작성 예정) 신규 엔터티 스키마 + expand-contract 타임라인
├── quickstart.md        # (작성 예정) 검증 evidence + 수동 테스트 절차
├── contracts/
│   └── gcal-v2-api.yaml # 신규 per-trip API 계약 (OpenAPI)
└── tasks.md             # /speckit.tasks 단계에서 생성
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── trips/[id]/page.tsx                         # UI 재설계 (오너/호스트/게스트 역할별)
│   ├── api/trips/[id]/gcal/link/route.ts           # 레거시 유지 → contract에서 제거
│   ├── api/trips/[id]/gcal/sync/route.ts           # 레거시 유지
│   ├── api/trips/[id]/gcal/status/route.ts         # 레거시 유지(응답 포맷 확장)
│   ├── api/v2/trips/[id]/calendar/route.ts         # 신규: 오너 연결/해제
│   ├── api/v2/trips/[id]/calendar/subscribe/route.ts  # 신규: 멤버 수동 subscribe
│   └── api/v2/trips/[id]/calendar/sync/route.ts    # 신규: 공유 캘린더 sync
├── components/
│   ├── TripCalendarPanel.tsx                       # 기존 GCalLinkPanel 대체 (역할별 뷰)
│   └── MemberSubscribeButton.tsx                   # 신규
├── lib/
│   ├── gcal/client.ts                              # 유지 (단일 OAuth2 클라이언트 헬퍼)
│   ├── gcal/errors.ts                              # 유지
│   ├── gcal/format.ts                              # 유지 (이벤트 렌더링)
│   ├── gcal/auth.ts                                # 유지 (scope 헬퍼)
│   ├── gcal/sync.ts                                # 일부 수정 (per-link → per-trip)
│   ├── gcal/acl.ts                                 # 신규: acl.insert/patch/delete 래퍼
│   └── gcal/migrate.ts                             # 신규: v2.8.0→v2.9.0 데이터 이관
├── types/
│   └── gcal.ts                                     # 확장 (v2 계약 타입 추가)

prisma/
├── schema.prisma                                   # expand (신규 모델) + 레거시 모델 주석
└── migrations/
    ├── YYYYMMDD_add_trip_calendar_link/
    │   ├── migration.sql
    │   └── migration-type  ← "schema-only"
    ├── YYYYMMDD_add_member_subscription/
    │   ├── migration.sql
    │   └── migration-type  ← "schema-only"
    └── YYYYMMDD_backfill_v28_gcal_links/
        ├── migration.sql
        └── migration-type  ← "data-migration"

docs/
├── research/v290-gcal-share-poc.md                 # (이미 완료) PoC 증거
└── adr/v290-per-trip-shared-calendar.md            # 신규 ADR — 멤버별 → 트립별 모델 결정 근거
```

**Structure Decision**: 단일 Next.js App Router 프로젝트(기존 `src/` 구조 유지). 신규 API는 `/api/v2/trips/[id]/calendar/*`로 두어 레거시 `/api/trips/[id]/gcal/*`와 병존. 한 릴리즈 이상 관찰 후 별도 contract 릴리즈에서 레거시 경로 제거.

## 마이그레이션 전략 (expand-and-contract)

| 단계 | 본 릴리즈 v2.9.0 | 후속 릴리즈 v2.9.x 또는 v2.10.x |
|---|---|---|
| **Expand** | 신규 모델(`TripCalendarLink`, `MemberCalendarSubscription`) 추가 · 기존 `GCalLink`/`GCalEventMapping`은 그대로 유지 | — |
| **Migrate** | v2.8.0 데이터 백필 → 멤버 DEDICATED 자동 unlink → 신규 UI·API만 노출 | — |
| **Dual read** | 레거시 GET API는 신규 데이터 기준으로 응답 포맷 생성(없으면 기존 GCalLink 조회) | — |
| **Contract** | — | 레거시 API/모델 제거. 신규 `TripCalendarLink`만 정본 |

근거: `feedback_root_cause_over_patch` + `project_expand_contract_pattern` 메모리.

## Complexity Tracking

> 헌법 위반 없음 — 비어둠.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (없음) | | |
