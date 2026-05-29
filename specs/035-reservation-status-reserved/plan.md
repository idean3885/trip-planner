# Implementation Plan: 예약 완료 상태 추가 + 동기화 타임존 옵션 보강

**Branch**: `035-reservation-status-reserved` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/035-reservation-status-reserved/spec.md`

## Summary

`ReservationStatus` enum에 `RESERVED`("예약 완료")를 1값 추가하고(Postgres `ALTER TYPE ... ADD VALUE`, 비파괴 schema-only), 값을 노출·검증·표시하는 모든 표면(API 검증 배열, 일정 폼·카드·초안 라벨, OpenAPI enum, MCP 도구 문서, ICS·Google 캘린더 변환)에 빠짐없이 반영한다. 더불어 두 화면에 중복된 타임존 선택 목록을 공통 정본 모듈(`src/lib/timezones.ts`)로 모으고 스페인(Europe/Madrid)·포르투갈(Europe/Lisbon) 등 여행지 타임존을 보강한다. 신규 의존성 없음, 마이그레이션 1건.

## Coverage Targets

- 예약 상태에 RESERVED 값 추가(비파괴) + schema-only 마이그레이션 [why: reserved-enum] [multi-step: 2] [migration-type: schema-only]
- RESERVED 표면 정합 — API 검증·UI 라벨·OpenAPI·MCP·캘린더 변환 [why: reserved-surfaces] [multi-step: 3]
- 타임존 공통 정본 모듈 추출 + 여행지 타임존 보강 [why: timezone-common] [multi-step: 2]
- 단편 / 검증 / 회귀 테스트 [why: release-bookkeeping]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+. Python 3.10+ (MCP 문서 1파일).  
**Primary Dependencies**: Next.js 16, React 19, Prisma 7 (Neon Postgres adapter), shadcn/ui(vendored). **신규 의존성 없음**.  
**Storage**: Neon Postgres — 마이그레이션 1건(schema-only): `ALTER TYPE "ReservationStatus" ADD VALUE 'RESERVED'`. 비파괴 추가, 기존 4값·기존 행 영향 0. 과거 선례: `20260414053446_add_owner_role`(TripRole ADD VALUE).  
**Testing**: Vitest + Testing Library. RESERVED 표면 정합 + 타임존 정본 단위. 서브밋 전 `npx vitest run` 전체 1회.  
**Target Platform**: 웹앱(폼·카드·동기화) + API + MCP 문서.  
**Project Type**: Web application (Next.js 단일 프로젝트 + `mcp/`)  
**Constraints**: 기존 4값 회귀 0. 타임존 중복 배열 0(공통 정본). enum 추가는 비파괴.  
**Scale/Scope**: enum 값 1종 + 타임존 목록 보강. 표면 다수지만 라벨/배열 추가의 정형 작업.

## Constitution Check

- 헌법 V(크로스 도메인): 일정 편성 도메인 내부 enum 추가 — 위반 없음.
- 헌법 VI(권한): 예약 상태 편집은 기존 "일정/활동 편집"(OWNER·HOST) 권한 그대로 — 신규 행위 없음.
- 헌법 VII(부동 시간): 타임존은 표시 시각을 바꾸지 않는 라벨. 타임존 목록 보강은 라벨 선택지 확장일 뿐, 시간 모델 불변.
- 마이그레이션: expand 단독(비파괴 ADD VALUE). contract 불요. rollout phase=contract → migration 헤더 + quickstart Evidence 필수.

## 핵심 설계 결정

### D1. enum RESERVED 추가 + 마이그레이션
`prisma/schema.prisma`의 `ReservationStatus`에 `RESERVED` 추가. 마이그레이션 `prisma/migrations/20260530000000_add_reserved_status/migration.sql`에 `ALTER TYPE "ReservationStatus" ADD VALUE 'RESERVED';` + 헤더 `-- [migration-type: schema-only]`. Postgres enum ADD VALUE는 비파괴이며 기존 행/값에 영향 없다.

### D2. RESERVED 표면 정합 (누락 0)
값을 다루는 모든 지점에 RESERVED 반영:
- API 검증 배열: `drafts/[draftId]/promote`, `drafts/promote-batch`의 `RESERVATION_STATUSES`. (activity create/update는 검증 배열 없이 Prisma 타입 의존 — 수정 불요.)
- UI 라벨: `ActivityForm`(옵션 배열), `ActivityCard`(라벨 Record), `DraftSection`(옵션 배열). 라벨 통일 "예약 완료".
- OpenAPI: `src/lib/openapi.ts` 3곳 enum 배열.
- MCP: `mcp/trip_mcp/planner.py` 도구 문서 2줄.
- 캘린더 변환: `src/lib/calendar/ics.ts`·`src/lib/gcal/format.ts`의 라벨 Record.

### D3. 타임존 공통 정본 + 보강
타임존 목록이 `DraftSection`(활성)·`DraftListPanel`(미사용 orphan)에 중복. 공통 모듈 `src/lib/timezones.ts`에 `TIMEZONE_OPTIONS` 정본을 두고 `DraftSection`이 참조한다. 스페인(Europe/Madrid)·포르투갈(Europe/Lisbon) 포함 여행지 타임존 보강. 미사용 `DraftListPanel`은 정본 참조로 정리하거나 범위 외로 둔다(활성 경로만 보강해도 SC 충족).

## Project Structure

```text
src/
├── lib/
│   ├── timezones.ts                         # (신규) 타임존 정본 목록
│   ├── openapi.ts                           # reservationStatus enum 3곳 RESERVED
│   ├── calendar/ics.ts                      # RESERVATION_LABEL RESERVED
│   └── gcal/format.ts                       # RESERVATION_LABEL RESERVED
├── components/
│   ├── ActivityForm.tsx                     # 옵션 배열 RESERVED
│   ├── ActivityCard.tsx                     # 라벨 Record RESERVED
│   └── calendar-sync/sections/DraftSection.tsx  # 옵션 RESERVED + 타임존 정본 참조
├── app/api/trips/[id]/drafts/
│   ├── [draftId]/promote/route.ts           # RESERVATION_STATUSES RESERVED
│   └── promote-batch/route.ts               # RESERVATION_STATUSES RESERVED
prisma/
├── schema.prisma                            # enum RESERVED
└── migrations/20260530000000_add_reserved_status/migration.sql  # ALTER TYPE ADD VALUE
mcp/trip_mcp/planner.py                       # 도구 문서 RESERVED
```

**Structure Decision**: 단일 Next.js 프로젝트 + MCP. 신규는 타임존 정본 모듈(`src/lib/timezones.ts`)과 마이그레이션 1건. 나머지는 기존 배열/매핑에 값 추가.

## Complexity Tracking

위반 없음. enum 1값 추가 + 라벨 정합 + 타임존 정본 추출. 신규 추상·패키지 없음.
</content>
