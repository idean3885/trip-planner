# Implementation Plan: 캘린더 provider 추상화

**Branch**: `024-calendar-provider-abstraction` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)
**Issue**: [#416](https://github.com/idean3885/trip-planner/issues/416)

## Summary

v2.8.0~v2.10.0의 Google Calendar 직접 의존을 `CalendarProvider` 인터페이스 뒤로 격리한다. DB는 `provider` 컬럼 추가(expand-only, 기본값 GOOGLE)와 `(tripId, calendarId)` 제약 유지로 자연스럽게 "여행당 1 link, 캘린더는 공유 가능" 모델을 그대로 둔다. 라우트(`/api/v2/trips/[id]/calendar*`)는 응답 스키마 무변경 + 내부 호출만 인터페이스 위임으로 교체. 사용자 가시 변경 0이 성공 기준이며 후속 #417 Apple 구현체가 같은 인터페이스를 만족하면 라우트·UI·DB 추가 변경 없이 동작.

## Coverage Targets

- `CalendarProvider` 인터페이스 정의 + Google 구현체 분리 [why: provider-interface] [multi-step: 3]
- DB expand: `trip_calendar_links.provider` 컬럼 + `gcal_links.provider` 컬럼 추가 (NOT NULL DEFAULT 'GOOGLE', schema-only) [why: db-expand]
- v2 라우트 4종(`POST/DELETE/GET /api/v2/trips/[id]/calendar`, `POST /api/v2/trips/[id]/calendar/sync`, `POST/DELETE /api/v2/trips/[id]/calendar/subscribe`)을 인터페이스 위임으로 교체 [why: route-delegation] [multi-step: 4]
- 멤버 ACL 라이프사이클 자동 동기화(트립 멤버 가입·탈퇴·역할 변경·오너 이관) 위임 + retain 판정 도입 [why: acl-retain] [multi-step: 2]
- 에러 분류 정규화: `auth_invalid`·`precondition_failed`·`revoked`·`transient_failure`·`unregistered_user`·`already_linked` 6종 vocabulary 도입 + Google 구현체에서 실제 에러를 매핑 [why: error-vocab] [multi-step: 2]
- v1 호환 어댑터(`/api/trips/[id]/gcal/*` 410 Gone 유지, 단 status 라우트는 #410 fix와 동일) 검증 + 회귀 테스트 [why: v1-compat]
- capability 노출 (`autoMemberAcl`, `supportsCalendarCreation`, `supportsCalendarSelection`) [why: capability]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16, React 19, Prisma 7)
**Primary Dependencies**: Next.js App Router, Auth.js v5, Prisma 7 (Neon Postgres adapter), `@googleapis/calendar`. **신규 의존성 없음** — 본 피처는 순수 리팩토링 + 마이그레이션.
**Storage**: Neon Postgres. Production `neondb`, Preview/Development `neondb_dev` (#318). 스키마 변경: `trip_calendar_links`, `gcal_links` 두 테이블에 `provider` 컬럼 추가(schema-only).
**Testing**: Vitest + React Testing Library (기존 단위·컴포넌트 테스트). 회귀 테스트는 v2 라우트 응답 스키마 + 라우트 핸들러의 인터페이스 위임 호출 관찰.
**Target Platform**: Vercel (sin1, Fluid Compute). dev: `dev.trip.idean.me`, prod: `trip.idean.me`.
**Project Type**: Web service (Next.js App Router single project).
**Performance Goals**: v2 라우트 응답 시간 회귀 0 (베이스라인 대비 ±10% 이내). 인터페이스 위임 오버헤드는 무시 가능 수준이어야 한다 (메서드 호출 1단 추가).
**Constraints**: 무중단 배포(Vercel atomic deploy), v1·v2 응답 스키마 무변경(MCP 호환), 사용자 가시 회귀 0.
**Scale/Scope**: 사용자 수 ≪100, 여행 수 수백 이내. capability·retain 판정 추가가 트래픽 부담 0.

## Constitution Check

본 피처는 헌법 V(Cross-Domain Integrity)·VI(RBAC) 영역과 깊게 결합. 사전 체크:

- **V. Cross-Domain Integrity**: 캘린더 컨텍스트가 여행 컨텍스트의 활동·멤버 정보를 읽는 기존 의존은 그대로. 추상화 도입은 캘린더 컨텍스트 내부 리팩토링이라 컨텍스트 간 새 의존 추가 없음. ✓
- **VI. RBAC**: 라우트 핸들러의 `OWNER`/`HOST`/`GUEST` 권한 분기는 인터페이스 위임 후에도 라우트 계층에서 그대로 수행(인터페이스 메서드 자체는 권한 검증 안 함, 라우트가 검증 후 호출). 권한 모델 변경 없음. ✓
- **무중단**: expand-and-contract 패턴([ADR-0005](../../docs/adr/0005-expand-and-contract-pattern.md)) 준수. 본 피처는 expand+migrate까지. 옛 직접 호출 제거(contract)는 별도 후속 회차. ✓
- **용어 정책 (ADR-0001)**: 본 피처가 도입하는 사용자 가시 신규 한국어 용어 없음. provider 식별자(`GOOGLE`/`APPLE`)는 코드 식별자라 한국어 매핑 불필요. ✓
- **라이브러리 우선 (ADR-0002)**: 신규 의존성 없음. 기존 `@googleapis/calendar` 그대로 + 인터페이스 추상화는 자체 코드. ✓

## Architecture

### CalendarProvider 인터페이스 (TypeScript 시그니처)

```typescript
// src/lib/calendar/provider/types.ts
export type ProviderId = "GOOGLE" | "APPLE";

export type CalendarErrorCode =
  | "auth_invalid"
  | "precondition_failed"
  | "revoked"
  | "transient_failure"
  | "unregistered_user"
  | "already_linked";

export interface ProviderCapabilities {
  /** 멤버 ACL을 서버가 자동 부여 가능한가. Google: "auto", Apple(잠정): "manual". */
  autoMemberAcl: "auto" | "manual" | "unsupported";
  /** 새 캘린더 생성 지원 여부 (MKCALENDAR 또는 calendars.insert). */
  supportsCalendarCreation: boolean;
  /** 기존 캘린더 목록에서 선택 지원 여부. */
  supportsCalendarSelection: boolean;
}

export interface CalendarRef {
  calendarId: string;       // 외부 캘린더 ID (provider 발급)
  displayName: string | null;
  components: ("VEVENT" | "VTODO")[]; // VEVENT 미보유 시 UI 자동 필터
}

export interface ExternalEventRef {
  externalEventId: string;  // Google: eventId, Apple: VEVENT URL의 마지막 segment 또는 UID
  etag: string | null;
}

export interface CalendarProvider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  // 인증 상태
  hasValidAuth(userId: string): Promise<boolean>;
  getReauthUrl(userId: string, returnTo: string): Promise<string | null>;

  // 캘린더 관리
  listCalendars(userId: string): Promise<CalendarRef[]>;
  createCalendar(userId: string, name: string): Promise<CalendarRef>;

  // 이벤트 sync
  putEvent(userId: string, calendarId: string, ics: string): Promise<ExternalEventRef>;
  updateEvent(userId: string, ref: ExternalEventRef, ics: string): Promise<ExternalEventRef>;
  deleteEvent(userId: string, ref: ExternalEventRef): Promise<void>;

  // 멤버 ACL (capability에 따라 동작)
  upsertMemberAcl(args: { userId: string; calendarId: string; memberEmail: string; role: "writer" | "reader" }): Promise<void>;
  /** retainIfStillNeeded: true면 구현체가 "다른 link에 같은 캘린더+멤버가 활성인지" 확인 후 보류 결정. */
  revokeMemberAcl(args: { userId: string; calendarId: string; memberEmail: string; retainIfStillNeeded: boolean }): Promise<{ revoked: boolean; retainedReason?: string }>;

  // 에러 분류
  classifyError(err: unknown): CalendarErrorCode | null;
}
```

### Provider 등록·선택

```typescript
// src/lib/calendar/provider/registry.ts
export function getProvider(id: ProviderId): CalendarProvider {
  switch (id) {
    case "GOOGLE": return googleProvider;
    case "APPLE":  throw new Error("Apple is not implemented yet (#417)");
  }
}
```

라우트 핸들러는 link row의 `provider` 컬럼을 읽어 `getProvider(link.provider)` 호출.

### Retain 판정 위치

`revokeMemberAcl` 구현체 안에서 `prisma.tripCalendarLink.findFirst({ where: { calendarId, ownerId, NOT: { tripId: currentTripId }, subscriptions: { some: { userId, status: "ADDED" } } } })`로 다른 활성 공유 여부 확인. 본 판정을 인터페이스 메서드의 책임으로 둠으로써 호출자(라우트)는 단순히 `retainIfStillNeeded: true` 플래그만 전달.

### DB Migration

`schema-only` 단일 migration:
```sql
-- [migration-type: schema-only]
ALTER TABLE trip_calendar_links ADD COLUMN provider TEXT NOT NULL DEFAULT 'GOOGLE';
ALTER TABLE gcal_links            ADD COLUMN provider TEXT NOT NULL DEFAULT 'GOOGLE';

-- (tripId, provider) 조합 unique는 별도. tripId 단독 unique는 trip_calendar_links에 이미 존재하므로
-- 1 link/trip 보장은 그대로. provider는 정보성 + 호출 분기용.

-- calendarId는 unique 아님 (여러 trip이 같은 외부 캘린더 공유 허용 — FR-010)
```

데이터 변형 없음. 기존 row는 default 'GOOGLE'로 채워져 옛 코드가 그대로 동작.

### 라우트 위임 구조

```
src/app/api/v2/trips/[id]/calendar/route.ts (POST/DELETE/GET)
src/app/api/v2/trips/[id]/calendar/sync/route.ts (POST)
src/app/api/v2/trips/[id]/calendar/subscribe/route.ts (POST/DELETE)

  ↓ 호출

src/lib/calendar/service.ts          # 라우트 ↔ provider 사이의 얇은 layer
                                     # - 권한 검증 후 link row 로드
                                     # - getProvider(link.provider) 호출
                                     # - 응답 normalize → 기존 v2 응답 스키마 그대로

  ↓ 호출

src/lib/calendar/provider/google.ts  # CalendarProvider 구현체
src/lib/calendar/provider/types.ts   # 인터페이스
src/lib/calendar/provider/registry.ts
```

기존 `src/lib/gcal/*` 코드는 google provider 구현체 안으로 이관(파일 이동 + import 경로 갱신). 함수 본체는 거의 그대로.

### 에러 vocabulary 정규화

`classifyError(err: unknown): CalendarErrorCode | null` 메서드가 provider 고유 에러를 6종 vocabulary로 매핑. Google 구현체:
- 401 / `invalid_grant` / `consent_required` → `auth_invalid` 또는 `revoked`
- 412 → `precondition_failed`
- 403 + Testing 모드 미등록 → `unregistered_user` (spec 021 정책)
- 5xx / 네트워크 오류 → `transient_failure`
- 그 외 → `null` (호출자가 일반 에러로 처리)

라우트는 vocabulary 코드만으로 사용자 메시지·UI 분기를 결정 → provider 무관 동일 톤.

## Project Structure

### Documentation (this feature)

```
specs/024-calendar-provider-abstraction/
├── spec.md              # 완료
├── plan.md              # 본 문서
├── tasks.md             # 다음 단계 (/speckit.tasks)
└── quickstart.md        # 검증 시나리오 (Evidence 포함)
```

### Source Code (repository root)

```
src/
├── lib/
│   ├── calendar/                     # 신규 디렉토리
│   │   ├── provider/
│   │   │   ├── types.ts              # CalendarProvider 인터페이스
│   │   │   ├── registry.ts           # getProvider(id)
│   │   │   └── google.ts             # Google 구현체 (기존 src/lib/gcal/* 이관)
│   │   └── service.ts                # 라우트 ↔ provider 사이 layer
│   └── gcal/                          # 기존 코드 — 본 피처 expand 단계에서는 retain
│                                      # contract 후속 회차에서 제거
├── app/api/v2/trips/[id]/calendar/
│   ├── route.ts                      # 위임으로 교체 (응답 스키마 무변경)
│   ├── sync/route.ts                 # 위임
│   └── subscribe/route.ts            # 위임
└── app/api/trips/[id]/gcal/status/
    └── route.ts                      # 410 Gone 유지 (#410, spec 022 결정)

prisma/
└── migrations/
    └── 20260427xxxx_add_provider_column/
        └── migration.sql              # [migration-type: schema-only]

tests/
├── unit/calendar/                     # 신규 — provider 인터페이스 단위 테스트
└── integration/calendar/              # 신규 — 라우트 위임 회귀 테스트
```

**Structure Decision**: 단일 Next.js 프로젝트 그대로. 신규 디렉토리는 `src/lib/calendar/`. 기존 `src/lib/gcal/`은 expand 단계에서 retain (contract 후속).

## Complexity Tracking

> Constitution Check 통과 — 별도 정당화 불필요.

본 피처는 추상화 도입 자체가 복잡도 추가이므로, 그 이득(후속 #417 추가 비용 절감 + 에러 톤 일관)이 비용을 정당화하는지가 핵심. 관찰 지표:
- #417 머지 시 라우트·UI·DB 변경 라인 수 (목표: 0)
- 사용자 가시 회귀 보고 (목표: 0)

두 지표가 빨간 신호를 보내면 본 피처 자체의 가치 재검토.
