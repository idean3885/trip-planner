# Implementation Plan: Apple iCloud CalDAV Provider

**Branch**: `025-apple-caldav-provider` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)
**Issue**: [#417](https://github.com/idean3885/trip-planner/issues/417)

## Summary

#416 추상화 위에 `appleProvider`를 얹어 Apple iCloud CalDAV를 두 번째 정식 provider로 도입한다. POC #345 측정 결과 + 의사결정 5건 + 추가 발견 3건을 그대로 구현한다. 신규 의존성 `tsdav` 2.x · 신규 env `APPLE_PASSWORD_ENCRYPTION_KEY` · 신규 테이블 `apple_calendar_credentials` · 신규 위자드 UI(`/trips/{id}/calendar/connect-apple` 모달). Google 사용자 흐름·응답·UI는 한 줄도 변경하지 않는다.

## Coverage Targets

- `tsdav` 2.x 채택 + Apple CalDAV 클라이언트 wrapper 도입 [why: caldav-client] [multi-step: 2]
- DB expand: `AppleCalendarCredential` 신규 테이블 + `TripCalendarEventMapping.etag` 컬럼 활용 [why: db-credential] [multi-step: 2]
- AES-256-GCM 암호화 모듈 + env 키 검증 [why: crypto]
- `appleProvider` 객체 — `CalendarProvider` 인터페이스의 모든 메서드 구현 [why: provider-impl] [multi-step: 4]
- 위자드 UI(`AppleConnectWizard`) Step 1~7 가이드 + 검증 진입 [why: wizard-ui] [multi-step: 3]
- service.ts 분기: capability `manual` 시 멤버 ACL 자동 호출 skip + manual 안내 텍스트 응답 포함 [why: manual-acl]
- sync.ts batch → provider 인터페이스 putEvent/updateEvent/deleteEvent 위임 (Google·Apple 공통 호출 경로) [why: sync-delegate] [multi-step: 2]
- 회귀: Google 사용자의 connect/sync/subscribe 응답 schema-equivalent [why: google-no-regress]
- 에러 vocabulary 매핑 (`appleProvider.classifyError`) + UI 배너 안내 [why: apple-error-vocab]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16 App Router, React 19, Prisma 7).
**Primary Dependencies (신규)**: `tsdav@^2.1.8` (Apple CalDAV 클라이언트). 그 외는 기존 (Auth.js v5, Tailwind v4, shadcn/ui).
**Crypto**: Node 표준 `crypto` (AES-256-GCM). 별도 패키지 도입 없음.
**Storage**: Neon Postgres. Production `neondb`, Preview/Dev `neondb_dev` (#318). 신규 테이블 1종 + 기존 컬럼 활용.
**Testing**: Vitest + React Testing Library. `tsdav` 호출은 mock으로 격리(실 iCloud 호출은 dev 수동 검증으로만).
**Target Platform**: Vercel sin1 (Fluid Compute 기본 Node.js 24 LTS). dev: dev.trip.idean.me, prod: trip.idean.me.
**Project Type**: Web service (Next.js App Router single project).
**Performance Goals**: PROPFIND 검증 <2s, MKCALENDAR <2s, PUT/DELETE <2s (POC 측정 일관). UI 위자드 4단계 사용자 입력 시간 제외 시 서버 처리 90초 이내(SC-001).
**Constraints**: 무중단 배포, Google 사용자 회귀 0, 비밀번호 평문 미노출.
**Scale/Scope**: 사용자 수 ≪100 (1인 운영). Apple 사용자가 일부일 것으로 가정.

## Constitution Check

- **V. Cross-Domain Integrity**: Apple provider도 캘린더 컨텍스트 내부 추가. 컨텍스트 간 새 의존 0. ✓
- **VI. RBAC**: Apple link도 OWNER만 connect/disconnect, OWNER/HOST sync, 멤버 subscribe — 기존 RBAC 모델 그대로. ✓
- **무중단 (ADR-0005)**: expand-only — 새 테이블 추가, 기존 컬럼 영향 0. ✓
- **용어 정책 (ADR-0001)**: "앱 암호"·"위자드"는 일반 IT 용어. UI 텍스트는 "Apple 캘린더", "앱 전용 암호" 한국어 노출. glossary 추가 0. ✓
- **라이브러리 우선 (ADR-0002)**: `tsdav`는 정식 2.x 버전 + npm 다운로드 활발 + POC 검증. 자체 CalDAV 클라이언트 작성 대비 비용 1/10. ✓

## Architecture

### tsdav wrapper 표면적

```typescript
// src/lib/calendar/provider/apple-client.ts
import { createDAVClient, type DAVClient, type DAVCalendar, type DAVObject } from "tsdav";

export async function createAppleClient(args: {
  appleId: string;
  appPassword: string;
}): Promise<DAVClient> {
  return createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username: args.appleId, password: args.appPassword },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}
```

본 wrapper는 단일 진입점. 라우트·service·provider는 직접 tsdav를 import하지 않는다(향후 라이브러리 변경 시 단일 지점 교체).

### 신규 테이블

```sql
-- [migration-type: schema-only]
CREATE TABLE apple_calendar_credentials (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  apple_id           TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,  -- base64(AES-256-GCM ciphertext + auth tag)
  iv                 TEXT NOT NULL,  -- base64(12바이트)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_validated_at  TIMESTAMPTZ,
  last_error         TEXT
);
```

1 user 1 row. 다중 Apple ID 비범위. ON DELETE CASCADE로 user 삭제 시 자동 정리.

### 암호화 모듈

```typescript
// src/lib/calendar/provider/apple-crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.APPLE_PASSWORD_ENCRYPTION_KEY ?? "", "base64");

export function encryptPassword(plaintext: string): { ciphertext: string; iv: string } {
  if (KEY.length !== 32) throw new Error("APPLE_PASSWORD_ENCRYPTION_KEY must be 32 bytes (base64)");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([enc, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptPassword(ciphertextB64: string, ivB64: string): string {
  const buf = Buffer.from(ciphertextB64, "base64");
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(0, buf.length - 16);
  const iv = Buffer.from(ivB64, "base64");
  const decipher = createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
```

env 키 길이 검증은 모듈 진입점에서 한 번만. 모듈 비교 검증은 단위 테스트로 round-trip.

### appleProvider 구현체 골격

```typescript
// src/lib/calendar/provider/apple.ts
export const appleProvider: CalendarProvider = {
  id: "APPLE",
  capabilities: {
    autoMemberAcl: "manual",
    supportsCalendarCreation: true,
    supportsCalendarSelection: true,
  },

  async hasValidAuth(userId) {
    const cred = await prisma.appleCalendarCredential.findUnique({ where: { userId } });
    if (!cred) return false;
    // lastValidatedAt이 7일 이내면 trust, 초과면 PROPFIND 재검증
    if (cred.lastValidatedAt && Date.now() - cred.lastValidatedAt.getTime() < 7 * 24 * 3600 * 1000) {
      return true;
    }
    return validateCredentials(cred); // PROPFIND 호출
  },

  async getReauthUrl(_userId, returnTo) {
    // Apple은 OAuth 미제공이라 위자드 진입 URL을 반환
    return `/trips${returnTo}?apple_reauth=1`; // 실제 URL은 라우트 결정
  },

  async listCalendars(userId) {
    const client = await loadClient(userId);
    const calendars = await client.fetchCalendars();
    return calendars
      .filter((c) => c.components?.includes("VEVENT")) // VTODO 자동 필터(POC 추가 발견 B)
      .map((c) => ({
        calendarId: c.url,
        displayName: c.displayName ?? null,
        components: (c.components ?? []) as ("VEVENT" | "VTODO")[],
      }));
  },

  async createCalendar(userId, name) {
    const client = await loadClient(userId);
    const created = await client.makeCalendar({ url: deriveNewCalendarUrl(client, name), props: { displayname: name } });
    return { calendarId: created.url, displayName: name, components: ["VEVENT"] };
  },

  async putEvent(userId, calendarId, ics) {
    const client = await loadClient(userId);
    const filename = randomUUID() + ".ics";
    const res = await client.createCalendarObject({ calendar: { url: calendarId } as DAVCalendar, filename, iCalString: ics });
    return { externalEventId: res.url, etag: res.etag ?? null };
  },

  async updateEvent(userId, ref, ics) {
    const client = await loadClient(userId);
    const res = await client.updateCalendarObject({
      calendarObject: { url: ref.externalEventId, etag: ref.etag ?? "", data: ics } as DAVObject,
    });
    return { externalEventId: ref.externalEventId, etag: res.etag ?? null };
  },

  async deleteEvent(userId, ref) {
    const client = await loadClient(userId);
    await client.deleteCalendarObject({
      calendarObject: { url: ref.externalEventId, etag: ref.etag ?? "" } as DAVObject,
    });
  },

  async upsertMemberAcl() {
    // capability "manual" — no-op. 호출되어선 안 되지만 안전망.
    return;
  },

  async revokeMemberAcl() {
    return { revoked: false, retainedReason: "Apple은 capability manual — 사용자가 직접 회수" };
  },

  classifyError(err) {
    const status = extractStatus(err);
    if (status === 401) return "auth_invalid";
    if (status === 412) return "precondition_failed";
    if ((status && status >= 500) || isNetworkError(err)) return "transient_failure";
    return null;
  },
};
```

### service.ts 분기 (capability manual)

`connectCalendar` 분기:
- Google(auto): 기존 흐름 (members ACL 자동 부여)
- Apple(manual): ACL 호출 skip + 응답 body에 `manualAclGuidance` 텍스트 포함. members 배열은 빈 상태.

`reconcileMemberAcl` / `reconcileOwnerTransfer`은 이미 #416에서 `provider.capabilities.autoMemberAcl !== "auto"` 분기 처리됨 → Apple 케이스 자동 skip.

### sync.ts 분해 (provider 메서드 위임)

기존 `src/lib/gcal/sync.ts::syncActivities`는 calendar_v3.Schema$Event를 직접 사용. provider 인터페이스 위임으로 변환:

```typescript
// src/lib/calendar/sync-engine.ts (신규)
export async function syncActivitiesViaProvider(
  provider: CalendarProvider,
  userId: string,
  ctx: { tripCalendarLinkId: number; calendarId: string; trip: Trip; tripUrl: string },
): Promise<SyncResult> {
  const activities = await fetchTripActivities(ctx.trip.id);
  const mappings = await prisma.tripCalendarEventMapping.findMany({ where: { tripCalendarLinkId: ctx.tripCalendarLinkId } });
  // ... Activity → ICS 변환 (formatActivityAsIcs)
  // ... mappings 기반 create/update 분기 → provider.putEvent/updateEvent
  // ... mapping 잔여는 provider.deleteEvent
  // 412 처리는 try/catch + provider.classifyError === "precondition_failed" 분기
}
```

기존 `src/lib/gcal/sync.ts`는 호환 어댑터로 유지(syncActivitiesViaProvider 호출). 인터페이스의 ics 인자(string)에 맞춰 `formatActivityAsIcs`를 신설(ics-rfc5545 형식). Google은 `client.calendar.events.import({ calendarId, requestBody: { iCalUID, ... } })`로 ICS 받아 변환 — 또는 인터페이스를 추가 변경해 `CalendarEventInput`(공통 객체) 사용. **plan 결정**: 본 회차는 `string` 그대로 + ICS 형식 사용. Google 구현체는 ICS → calendar_v3.Schema$Event 변환을 내부 처리.

### 위자드 UI

```
src/app/trips/[id]/calendar/connect-apple/
├── page.tsx                        # 또는 modal로 노출 (route 결정 후)
└── components/
    ├── AppleConnectWizard.tsx      # 4단계 stepper
    ├── Step1Prerequisites.tsx      # 2FA 안내
    ├── Step2GuideLink.tsx          # appleid.apple.com 외부 링크 + 가이드 임베드
    ├── Step3CredentialsInput.tsx   # Apple ID + 16자리 암호 입력 + 검증
    └── Step4Result.tsx             # 캘린더 자동 생성 결과 + 첫 sync 트리거
```

### 신규 라우트

```
POST /api/v2/trips/[id]/calendar/apple/connect
  Body: { appleId, appPassword }
  Response: ConsentRequired (검증 실패) | TripCalendarLinkResponse (성공)

POST /api/v2/calendar/apple/validate
  Body: { appleId, appPassword }
  Response: { valid: true } | { valid: false, error: "auth_invalid" | "transient_failure" }

GET /api/v2/calendar/apple/calendars
  (인증된 사용자의 VEVENT 캘린더 목록 — "기존 선택" 옵션용)
  Response: { calendars: CalendarRef[] }
```

`/api/v2/trips/[id]/calendar` POST는 그대로 두고 Apple은 `/calendar/apple/connect` 별도. 본 회차는 양 라우트 병존, 후속 회차에서 통합 가능.

## Project Structure

### Documentation (this feature)

```
specs/025-apple-caldav-provider/
├── spec.md              # 완료
├── plan.md              # 본 문서
├── tasks.md             # 다음 단계
└── quickstart.md        # Evidence
```

### Source Code (repository root)

```
src/
├── lib/
│   ├── calendar/
│   │   ├── provider/
│   │   │   ├── apple.ts             # 신규 — appleProvider 구현체
│   │   │   ├── apple-client.ts      # 신규 — tsdav wrapper
│   │   │   ├── apple-crypto.ts      # 신규 — AES-256-GCM
│   │   │   ├── google.ts            # 기존
│   │   │   ├── registry.ts          # 수정 — APPLE 케이스에서 appleProvider 반환
│   │   │   └── types.ts             # 기존
│   │   ├── service.ts               # 수정 — capability manual 분기 추가
│   │   ├── sync-engine.ts           # 신규 — provider 위임 sync
│   │   └── ics.ts                   # 신규 — Activity ↔ ICS VEVENT 변환
│   ├── gcal/                         # 기존 — sync.ts는 sync-engine 호출하는 어댑터로 단순화
│   └── ...
├── app/
│   ├── api/v2/
│   │   ├── calendar/apple/
│   │   │   ├── validate/route.ts    # 신규
│   │   │   └── calendars/route.ts   # 신규
│   │   └── trips/[id]/calendar/
│   │       └── apple/
│   │           └── connect/route.ts # 신규
│   └── trips/[id]/calendar/
│       └── connect-apple/page.tsx   # 신규 — 위자드
└── components/calendar/
    ├── AppleConnectWizard.tsx       # 신규
    ├── Step1Prerequisites.tsx
    ├── Step2GuideLink.tsx
    ├── Step3CredentialsInput.tsx
    └── Step4Result.tsx

prisma/
├── schema.prisma                     # 수정 — AppleCalendarCredential 모델 추가
└── migrations/
    └── 20260427xxxx_add_apple_credentials/migration.sql  # [migration-type: schema-only]

tests/
├── unit/calendar/
│   ├── apple-classify-error.test.ts
│   ├── apple-capability.test.ts
│   ├── apple-crypto-roundtrip.test.ts
│   └── service-manual-acl-branch.test.ts
└── integration/calendar/
    └── apple-wizard-validate.test.ts
```

**Structure Decision**: 단일 Next.js 프로젝트. provider 디렉토리 하위에 Apple 모듈 3종(.ts) + 위자드 UI는 별도 page + 컴포넌트. ICS 변환은 별도 모듈로 분리해 Google 구현체와 공유 가능.

## Risk & Mitigation

### R1 — tsdav 미공식 동작 의존
**Risk**: MKCALENDAR가 iCloud 미공식. 향후 Apple 변경 시 자동 생성 실패.
**Mitigation**: FR-005의 "기존 선택" 폴백을 1차 안전망. 실패율 모니터링은 lastError 컬럼 + 수동 dev 검증.

### R2 — Apple ID 비밀번호 변경 시 silent failure
**Risk**: 사용자가 Apple ID 비번 변경 후 trip-planner를 잊고 둠 → 다음 sync에서 401 → 사용자가 못 봄.
**Mitigation**: 401 즉시 UI 배너(SC-002). 추가로 lastError 컬럼이 `auth_invalid`인 link는 trip 페이지에 영구 노출.

### R3 — 위자드 사용성 (16자리 암호 입력)
**Risk**: 사용자가 가이드 6단계를 완수 못 하고 이탈.
**Mitigation**: 각 Step에 캡쳐 + appleid.apple.com 직접 링크 + 30초 스크린캐스트. Step 7 캡쳐는 본 피처 구현 후 추가.

### R4 — 암호화 키 분실
**Risk**: `APPLE_PASSWORD_ENCRYPTION_KEY` 분실/유출 시 모든 credential 복호화 불가 또는 노출.
**Mitigation**: dev/preview/production 별도 키. Vercel env에만 저장. 키 회전 시 전체 재암호화 스크립트(별도 후속 — 본 피처는 키 1개 운영 가정).

## Complexity Tracking

> Constitution Check 통과 — 별도 정당화 불필요.

본 피처는 신규 라이브러리 1종 + 신규 테이블 1종 + 신규 UI 1종(위자드) 추가로 복잡도 증가. 그 이득(Apple 사용자 확장 + 무심사 경로)이 비용을 정당화하는지 관찰:
- Apple 첫 연결 성공률 (목표: 5건 dev 측정 중 5건 성공)
- Google 사용자 회귀 보고 (목표: 0)
- 401 알림 도달률 (목표: 100% — UI 배너 노출 보장)
