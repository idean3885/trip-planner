# Implementation Plan: 공유 캘린더 미연결 상태의 역할별 UI

**Branch**: `020-shared-calendar-not-linked` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-shared-calendar-not-linked/spec.md`

## Summary

v2.9.0 공유 캘린더 모델 위에서 **미연결 상태(= `TripCalendarLink` 부재)** 를 호스트·게스트에게 무해하게 전달하는 UI·API 정비. 현재는 `GET /api/trips/[id]/gcal/status`가 본인 per-user `GCalLink`로 폴백해 `linked:true`를 반환 → UI가 v2 액션 버튼을 그리고 실제 호출은 404. 이 폴백 제거 + 미연결 다이얼로그(설명 + "닫기"만) 도입으로 해결한다. 신규 DB 엔티티·마이그레이션·외부 의존성 없음.

## Coverage Targets

- status 라우트 레거시 `GCalLink` 폴백 제거 및 `linked:false` 응답 정본화 [why: status-fallback-removal] [multi-step: 2]
- 비-주인(호스트·게스트) 미연결 상태 다이얼로그 렌더(주인 트리거와 동일 위치·크기 + 내부 설명·닫기 버튼만) [why: non-owner-not-linked-dialog] [multi-step: 2]
- 주인 미연결 상태 단일 CTA("공유 캘린더 연결") 유지·정리 — 레거시 "업그레이드" 분기 제거 [why: owner-not-linked-cta]
- 역할 용어(`주인`/`호스트`/`게스트`) 정본 반영 — 본 피처 산출물 전 코드·문구 수준 정비 [why: role-terminology]
- 자동 검증(단위 테스트): status 라우트 `linked:false` + Panel 역할별 렌더 스냅샷 [why: test-coverage] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 (App Router, Turbopack), React 19, Prisma 7 (Neon Postgres adapter), Auth.js v5, Tailwind CSS v4, shadcn/ui (vendored Dialog·Button), lucide-react
**Storage**: Neon Postgres — **스키마 변경 없음**. 기존 `TripCalendarLink` / `GCalLink` 모델 참조만.
**Testing**: Vitest (`pnpm test`) — 기존 단위 테스트 수트에 추가.
**Target Platform**: Vercel Fluid Compute(서버), 모던 브라우저(클라이언트, 모바일 우선).
**Project Type**: web application (단일 Next.js 앱, `src/` 루트)
**Performance Goals**: `GET /gcal/status` p95 < 500ms 유지. DB 추가 조회 1건 이내(레거시 존재 여부).
**Constraints**: 무중단 릴리즈. 기존 v1 레거시 API(`/api/trips/[id]/gcal/*`) 경로 동작 유지(응답 포맷 변화 최소). 마이그레이션 파일 없음(Non-Goal).
**Scale/Scope**: 여행당 최대 공유 캘린더 1개, 동행자 1-5명. 실사용 여행 수 < 100(현 시점).

## Constitution Check

*GATE: Phase 0 이전 / Phase 1 이후 재검증 — Constitution v1.2.0.*

| 원칙 | 판정 | 근거 |
|---|---|---|
| I. AX-First | PASS | 본 피처는 UI 상태 표현. AI 생성 경로 없음 — 원칙 적용 대상 아님. |
| II. Minimum Cost | PASS | 신규 의존성·유료 서비스 도입 없음. 기존 Vercel/Neon 무료 티어 내. |
| III. Mobile-First Delivery | PASS (조건부) | shadcn Dialog 기반 — 기존 패턴 재사용. Phase 1 quickstart에서 모바일 확인 Evidence 추가. |
| IV. Incremental Release | PASS | v2.9.0 위 보강. 스키마·데이터 변경 없어 롤백 시 리스크 최소. |
| V. Cross-Domain Integrity | PASS | "동행 협업"(`TripMember.role` 조회) + "일정 편성"(`TripCalendarLink` 조회). 모두 **조회 전용** — 소유 변경 없음. 방향 위반 없음. |
| VI. Role-Based Access Control | PASS | 본 피처는 [Permission Matrix](../../.specify/memory/constitution.md#permission-matrix)의 기존 행위 권한을 **변경하지 않는다**. 역할별 UI 노출만 정비(신규 행위 없음). |

신규 gate 위반 없음 → Complexity Tracking 비움.

## Project Structure

### Documentation (this feature)

```text
specs/020-shared-calendar-not-linked/
├── plan.md              # 본 파일
├── research.md          # Phase 0 — 폴백 제거 결정·다이얼로그 패턴 선택 근거
├── data-model.md        # Phase 1 — 신규 엔티티 없음 명시. 기존 모델 참조 요약.
├── contracts/
│   └── gcal-status.md   # Phase 1 — GET /gcal/status 응답 스키마(변경분 포함)
├── quickstart.md        # Phase 1 — 재현·검증 시나리오 + Evidence
├── checklists/
│   └── requirements.md  # specify 검증 체크리스트(이미 존재)
└── tasks.md             # Phase 2 — /speckit.tasks 산출물(본 명령은 생성하지 않음)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/
│   │   └── trips/[id]/gcal/status/route.ts   # 레거시 폴백 제거 (본 피처 핵심)
│   └── trips/[id]/page.tsx                    # 렌더 진입점(기존 유지 — role prop 전달 확인)
├── components/
│   └── GCalLinkPanel.tsx                      # 비-주인 미연결 분기 추가·주인 분기 정리
└── types/
    └── gcal.ts                                # StatusResponse(변경 최소 — 기존 { linked:false, scopeGranted } 유지)

tests/
├── api/
│   └── gcal-status.test.ts                    # 신규 — linked:false 응답 단위 테스트
└── components/
    └── GCalLinkPanel.test.tsx                 # 신규 또는 확장 — 역할×상태 조합 렌더 테스트

docs/
└── glossary.md                                # 용어 정본(본 피처에서 신규 추가, 020 범위의 산출물)
```

**Structure Decision**: 단일 Next.js App Router 프로젝트(기존 v2.x 구조 승계). 본 피처는 신규 디렉토리 없이 기존 `src/app/api/trips/<id>/gcal/status/route.ts`·`src/components/GCalLinkPanel.tsx` 두 파일의 편집 + 테스트 2종 추가로 구성. `docs/glossary.md`는 본 피처에서 정본 문서로 도입되어 이후 모든 스펙이 참조한다.

## Phase Outputs

### Phase 0 — Research (output: `research.md`)

**질문 1**: status 응답 형식에 역할별 힌트(예: `ownerHasLinked: boolean`, `userCanLink: boolean`)를 둘지?
- **Decision**: 추가하지 않는다. 기본 `{ linked: boolean, scopeGranted?: boolean }` 유지. 이유: 역할 판단은 UI 컴포넌트가 이미 `role` prop으로 갖는다. 응답에 역할 의존 플래그를 넣으면 캐시·권한 표면이 넓어진다.
- **Alternatives**: (a) `{ linked: false, ownerHasLinked: false }` — 쓰임새 없음. (b) 별도 `/mystate` 엔드포인트 — 과도한 분화.

**질문 2**: 레거시 `GCalLink`가 남아있는지의 **감지 표시**를 status 응답에 포함할지?
- **Decision**: 포함하지 않는다. 레거시 판정·정리는 Non-Goal(별도 건). UI에서 분기하지 않으므로 응답에 필드 불필요.
- **Alternatives**: `{ legacy: true }` 힌트 — #394에서 시도 후 폐기(스펙 020 배경).

**질문 3**: 다이얼로그 트리거 버튼·Dialog 구조는 기존 컴포넌트를 공유할지 복제할지?
- **Decision**: **동일 DOM 구조, 내부 콘텐츠만 분기**. Dialog/DialogTrigger/DialogContent는 shadcn 공통. 주인은 CTA·설명·취소/연결, 비-주인은 설명·닫기만.
- **Alternatives**: 별도 컴포넌트 `GCalNotLinkedPanel.tsx` — 단일 파일 내 분기가 이미 정착되어 있어 중복 우려.

**질문 4**: 모바일 가시성 확인 방법?
- **Decision**: quickstart에 "Safari iPhone 13/Android Chrome(Pixel 6) 가로 스크롤 없이 다이얼로그 진입 가능" 항목 추가. DevTools device mode로 Evidence 남김.
- **Alternatives**: Playwright 브라우저 자동화 — 현 프로젝트 Playwright 부재(기존 E2E 없음). 과도한 비용.

### Phase 1 — Design & Contracts

**`data-model.md`**:
- 신규 엔티티 없음. 본 피처가 참조만 하는 기존 엔티티:
  - `TripCalendarLink`(여행당 1개) — **존재 유무**가 연결됨/미연결을 가른다.
  - `GCalLink`(per-user 레거시) — **참조하지 않는다**. 본 피처의 폴백 제거로 관심 대상에서 제외.
  - `TripMember.role` — UI 분기 소스.
- State Transitions:
  - 미연결(`TripCalendarLink` 없음) ↔ 연결됨(`TripCalendarLink` 있음). 본 피처는 전자의 UI만 정비.
  - 해제 후 미연결 = 생성 직후 미연결 (Clarification Session 2026-04-22).

**`contracts/gcal-status.md`** — `GET /api/trips/[id]/gcal/status`:
- Request: 세션 쿠키 인증. 경로 파라미터 `[id]`.
- Responses:
  - `401 unauthenticated` / `403 not_a_member` / `400 bad_trip_id` — 변경 없음.
  - `200 { linked: true, link: GCalLinkState, mySubscription?: ... }` — 변경 없음.
  - `200 { linked: false, scopeGranted: boolean }` — **정본화**. `TripCalendarLink`가 없으면 본인 per-user `GCalLink` 존재 여부와 무관하게 이 응답. `legacy` 필드는 없다.
- Consumer: `GCalLinkPanel.tsx`.
- Compatibility: 기존 클라이언트가 `linked:true` 분기만 쓰는 경우 영향 없음. `linked:false`만 받던 기존 코드는 동일 필드 구조이므로 무변화.

**`quickstart.md`** — 구현 후 검증:
- S1: 신혼여행(tripId=5) 호스트로 로그인 → 페이지 로드 → 캘린더 트리거 버튼 클릭 → 다이얼로그 안에 설명문 + "닫기" 버튼만. 콘솔/네트워크 탭에 `POST /api/v2/trips/5/calendar/{subscribe,sync}` 호출 없음.
- S2: 주인으로 로그인 → 동일 여행 진입 → "공유 캘린더 연결" CTA 클릭 → 동의 후 연결 완료 → 호스트 새로고침 → "내 구글 캘린더에 추가" 정상 노출.
- S3: 게스트 계정으로 진입 → 트리거 버튼 클릭 → 호스트와 동일한 설명 + "닫기" 다이얼로그 표시.
- Evidence: 위 3 시나리오의 스크린샷 + Vercel 서버 로그에서 `/calendar/{subscribe,sync}` 404 건수 = 0 (배포 후 24h).

### Phase 2 — Tasks (output: `tasks.md` by `/speckit.tasks`)

본 명령은 `tasks.md`를 생성하지 않는다. 다음 단계에서 `/speckit.tasks`가 Coverage Targets의 `[why]` 태그별로 태스크를 분할한다.

## Migration Strategy

본 피처는 **스키마·데이터 변경 없음**. 따라서 expand-and-contract 프레임 내 별도 마이그레이션 단계 없음.

| 단계 | 본 피처에서 | 참고 |
|---|---|---|
| Expand | — | spec 019 v2.9.0에서 이미 수행(TripCalendarLink 신규) |
| Dual read | — | 기존 status 폴백이 dual-read였음. 본 피처가 **폴백을 정식 해제**함으로써 dual-read를 사실상 종료. |
| Contract | 본 피처 완료 후 별도 | 레거시 `GCalLink` 테이블 자체 제거는 후속 릴리즈의 별도 PR. |

## Release Plan

- **유형**: PATCH — 신규 기능 추가 아닌 UI·응답 정합성 정정(사용자 혼란 제거).
- **브랜치**: `020-shared-calendar-not-linked` → develop PR → v2.9.1 마일스톤에 묶어 main 릴리즈.
- **Changes 단편**: `changes/<이슈번호>.fix.md` 1개 — What/Why 2줄 원칙.
- **롤백**: status 라우트 단일 파일 revert로 즉시 원복 가능(폴백 재도입). 컴포넌트도 단일 파일 revert.

## Complexity Tracking

해당 없음(Constitution 모든 원칙 PASS, 정당화 필요한 위반 없음).
