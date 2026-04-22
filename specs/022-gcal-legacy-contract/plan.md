# Implementation Plan: 레거시 per-user 캘린더 모델 contract 정리 (expand 매핑 단계)

**Branch**: `022-gcal-legacy-contract` | **Date**: 2026-04-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-gcal-legacy-contract/spec.md`

## Summary

v2.9.0 expand-and-contract의 C 단계 중 **매핑 expand**만 수행한다. 신규 `TripCalendarEventMapping` 테이블을 도입해 기존 `gcal_event_mappings` 데이터를 복사한 뒤, sync/unlink 경로의 bridge 로직을 제거하고 신규 테이블만 사용하도록 전환한다. 레거시 API 라우트는 410 Gone 응답으로 교체(파일·내용 단순화), Prisma 모델·구 테이블은 **남긴다**(후속 v2.11.0+에서 완전 contract). Vercel 배포의 구·신 인스턴스 병존 과도 구간에서 5xx가 발생하지 않도록 하는 것이 본 피처의 핵심 제약.

## Coverage Targets

- 신규 Prisma 모델 `TripCalendarEventMapping` 추가 + 스키마 마이그레이션 [why: new-mapping-schema] [multi-step: 2]
- 기존 매핑 데이터 복사 + 무손실 검증 쿼리 [why: mapping-backfill] [multi-step: 2]
- sync/unlink 경로에서 bridge `GCalLink` 로직 제거 및 신규 매핑으로 전환 [why: sync-rewrite] [multi-step: 2]
- 레거시 API 라우트(link/sync/status)를 410 Gone 응답으로 단순화 [why: legacy-api-gone] [multi-step: 2]
- 자동 회귀 테스트 — 신규 매핑 CRUD 단위 + sync 라우트 회귀 [why: test-coverage] [multi-step: 2]
- 릴리즈 노트에 후속 v2.11.0+ 삭제 예고 명시 [why: release-note]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 App Router, Prisma 7 (Neon Postgres adapter), `@googleapis/calendar`, Auth.js v5. 본 피처에서 **신규 의존성 없음**.
**Storage**: Neon Postgres — **신규 테이블 1종 추가**, 기존 테이블 2종 유지. Prisma migration 1건.
**Testing**: Vitest (`pnpm test`) — 기존 수트에 신규 매핑 단위 테스트 + sync 통합 테스트 확장.
**Target Platform**: Vercel Fluid Compute.
**Project Type**: web application (단일 Next.js 앱, `src/` 루트).
**Performance Goals**: 기존 sync p95 유지. 신규 매핑 조회는 기존과 동일한 인덱스 구조.
**Constraints**: **무중단 배포**. 구·신 인스턴스 병존 과도 구간에서 구 인스턴스가 신규 테이블을 모르는 상태로 구 테이블에 쓰더라도 사용자 에러 0. `prisma migrate deploy`만 허용.
**Scale/Scope**: 기존 매핑 레코드 < 수천 건 규모(실사용 여행 수 × 평균 활동 수). 단일 트랜잭션 복사 가능.

## Constitution Check

*GATE: Phase 0 이전 / Phase 1 이후 재검증 — Constitution v1.2.0.*

| 원칙 | 판정 | 근거 |
|---|---|---|
| I. AX-First | PASS | 내부 데이터 정리, 사용자 AX 경로 변경 없음. |
| II. Minimum Cost | PASS | 신규 테이블 1종 추가, 유료 서비스·신규 의존성 없음. |
| III. Mobile-First Delivery | PASS | UI 변경 없음. |
| IV. Incremental Release | PASS | expand-and-contract 패턴 그 자체. v2.10.0 expand → v2.11.0+ contract로 점진 진행. |
| V. Cross-Domain Integrity | PASS | 이벤트 매핑 소유권을 "동행 협업"(per-user) → "일정 편성"(trip 공유) 축으로 **정리**. 도메인 경계 회복 방향. |
| VI. Role-Based Access Control | PASS | Permission Matrix 변경 없음. |

신규 gate 위반 없음 → Complexity Tracking 공란.

## Project Structure

### Documentation (this feature)

```text
specs/022-gcal-legacy-contract/
├── plan.md               # 본 파일
├── research.md           # Phase 0 — 무중단 보장 전략·이관 SQL·배포 과도 구간 분석
├── data-model.md         # Phase 1 — 신규 TripCalendarEventMapping + 레거시 유지 상태
├── contracts/
│   └── legacy-api-gone.md   # 410 Gone 응답 형식
├── quickstart.md         # Phase 1 — 재현·검증 시나리오
├── checklists/
│   └── requirements.md   # specify 검증
└── tasks.md              # /speckit.tasks 산출물
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                        # TripCalendarEventMapping 모델 신규 + 기존 모델 유지
└── migrations/
    └── 2026042X_expand_mapping/migration.sql  # [migration-type: data-migration]

src/
├── app/api/
│   ├── trips/<id>/gcal/
│   │   ├── link/route.ts              # 410 Gone으로 단순화
│   │   ├── sync/route.ts              # 410 Gone으로 단순화
│   │   └── status/route.ts            # 410 Gone으로 단순화
│   └── v2/trips/<id>/calendar/sync/route.ts   # bridge GCalLink 제거, 신규 매핑 사용
└── lib/gcal/
    └── sync.ts                         # prisma.tripCalendarEventMapping 기반으로 재작성

tests/
├── api/v2-gcal-sync.test.ts            # 신규 — 공유 모델 sync가 새 매핑으로 동작
└── api/gcal-legacy-gone.test.ts        # 신규 — 레거시 라우트 410 검증
```

**Structure Decision**: 단일 Next.js App Router. Prisma 마이그레이션 1건 + 코드 편집 약 5개 파일 + 테스트 2종 추가.

## Phase Outputs

### Phase 0 — Research (output: `research.md`)

**Q1. 무중단 배포 순서 보장 방법은?**

- **Decision**: 본 단일 PR에 다음 순서로 변경 묶음.
  1. Prisma migration (신규 테이블 + backfill) — 배포 시점에 `prisma migrate deploy` 실행
  2. 신규 매핑만 읽고 쓰는 코드 배포
  3. 구 인스턴스가 잠시 남아도 **구 테이블은 그대로 존재**하므로 구 인스턴스의 기존 쓰기는 실패하지 않음
  4. 구 인스턴스가 완전히 대체된 시점부터 구 테이블에 신규 쓰기 0 → 관찰 기간 후 v2.11.0+에서 drop
- **Rationale**: 구 테이블을 drop하지 않는 것이 무중단의 핵심. 코드가 신규 테이블만 쓰므로 신규 데이터는 신규 테이블로 간다.

**Q2. 매핑 복사 SQL 형식은?**

- **Decision**: 단일 SQL `INSERT ... SELECT`로 `gcal_event_mappings` 레코드 전부를 `trip_calendar_event_mappings`로 복사. 조인 조건:
  ```
  gcal_event_mappings gem
    JOIN gcal_links gl ON gem.link_id = gl.id
    JOIN trip_calendar_links tcl ON tcl.calendar_id = gl.calendar_id AND tcl.trip_id = gl.trip_id
  ```
  기존 bridge 로직이 `calendar_id + trip_id` 일치 기준으로 bridgeLink를 생성·재사용해 왔으므로 조인이 결정적.
- **Rationale**: 단일 쿼리 복사로 트랜잭션 안에 완료. 수천 건 규모라 성능 영향 없음.
- **Alternatives**: 런타임 지연 복사 — 구·신 경로가 공존하는 기간이 길어져 오히려 복잡.

**Q3. 레거시 API 라우트 410 응답 형식은?**

- **Decision**: 본문 JSON `{ error: "gone", message: "This endpoint has been retired. See spec 022." }`. 모든 메소드에서 동일. Next.js Route Handler에서 `NextResponse.json(..., { status: 410 })`.
- **Rationale**: 의미 분명한 종료 응답 + 로깅·알림 추적 가능.

**Q4. 구 코드 경로 정리 범위는?**

- **Decision**: 활성 호출 경로만 제거.
  - `src/lib/gcal/sync.ts`: `prisma.gCalEventMapping` 전량 → `prisma.tripCalendarEventMapping`으로 전환. 함수 시그니처 최소 변경(linkId: number → tripCalendarLinkId: number).
  - `src/app/api/v2/trips/<id>/calendar/sync/route.ts`: bridge GCalLink 생성 로직 삭제. `TripCalendarLink.id`를 직접 매핑 외래키로 전달.
  - 레거시 API 라우트 3종: 파일 내용을 410 핸들러로 교체. 파일 자체는 남김(FR-005).
- **Rationale**: 구 테이블·구 Prisma 모델을 남기되 쓰기가 일어나지 않으면 후속 contract에서 안전하게 drop 가능.

**Q5. 기존 테스트 회귀 대비?**

- **Decision**: `tests/lib/gcal/*`에 prisma mock 설정이 있다면 새 모델명으로 갱신. `tests/api/gcal-status.test.ts`(spec 020)가 이미 per-user 링크 폴백 0건 케이스를 다루므로 그대로 유지.
- **Rationale**: 기존 테스트의 모델 참조를 최소 변경으로 유지.

### Phase 1 — Design & Contracts

**`data-model.md`**:
- 신규 `TripCalendarEventMapping`:
  - `id`, `tripCalendarLinkId` (FK → TripCalendarLink), `activityId` (FK → Activity), `googleEventId`, `syncedEtag`, `lastSyncedAt`, timestamps
  - `@@unique([tripCalendarLinkId, activityId])`
- 기존 `GCalLink`, `GCalEventMapping`: 스키마·테이블 그대로 유지. 코드 활성 경로에서 참조 제거(읽기·쓰기 0).
- State Transitions: 신규 매핑 단일 소스. 사용자 경험 무변화.

**`contracts/legacy-api-gone.md`** — `/api/trips/<id>/gcal/{link,sync,status}`:
- Request: 메소드 무관. 쿼리/바디 무관.
- Response: `410 { error: "gone", message: "..." }`.
- Consumer: 내부·외부 공개 호출자 없음(전제). 응답 자체가 감시 목적.

**`quickstart.md`** — 재현·검증:
- S1: dev에서 공유 캘린더 연결된 여행의 기존 매핑 레코드 수 기록 → 마이그레이션 실행 → `trip_calendar_event_mappings` 레코드 수 동일 확인.
- S2: dev에서 주인 "다시 반영하기" 실행 → 새 이벤트가 신규 테이블에만 기록되는지 DB 쿼리로 확인.
- S3: 레거시 라우트 curl → 410 응답 확인.
- S4: 배포 과도 구간 시뮬레이션 — 구 버전 코드를 유지한 클라이언트가 API를 호출해도 사용자 에러 없음.
- Evidence: 자동 테스트 2종(sync 회귀 + 410 응답) + dev 확인 체크리스트.

### Phase 2 — Tasks (output: `tasks.md` by `/speckit.tasks`)

본 명령은 `tasks.md`를 생성하지 않는다.

## Migration Strategy

| 단계 | 본 피처 작업 | 후속 |
|---|---|---|
| Expand 스키마 | v2.10.0: `TripCalendarEventMapping` 테이블 신설 + 데이터 복사 | — |
| Dual write | 불필요. 구 테이블 쓰기는 즉시 중단(코드 전환과 동시) | — |
| Contract 스키마 | v2.11.0+: `gcal_event_mappings`·`gcal_links` 테이블 drop | 별도 spec |
| Contract 코드 | v2.11.0+: 레거시 Prisma 모델·API 라우트 파일 제거 | 별도 spec |

## Release Plan

- **유형**: MINOR — 내부 정리. 외부 사용자 가시 변화 없음.
- **마일스톤**: **v2.10.0** (spec 023과 공동).
- **브랜치**: `022-gcal-legacy-contract` → develop PR.
- **Changes 단편**: `changes/402.feat.md`.
- **롤백 전략**: 마이그레이션 rollback SQL 포함(신규 테이블 drop). 구 테이블·코드 참조가 남아 있으므로 구 배포로 revert 시 기능 복구 가능.

## Complexity Tracking

해당 없음.
