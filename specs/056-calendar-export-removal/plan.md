# Implementation Plan: 외부 캘린더 내보내기 제품 노출 제거 (SSOT 단방향 정립)

**Branch**: `056-calendar-export-removal` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/056-calendar-export-removal/spec.md`

## Summary

여행 → 외부 캘린더 내보내기/자동 반영(export/sync)을 제품 표면에서 제거한다. 활동 CRUD·초안 확정 시 외부 캘린더로의 자동 반영을 끊고, 여행 상세의 동기화/연결 진입점을 가져오기 전용으로 재구성하며, 외부 캘린더 쓰기·연결·구독 공개 엔드포인트를 410 Gone으로 폐지한다. 가져오기(import)는 export 연결에 독립적이므로(Google=Auth.js 세션 OAuth, Apple=user-level `AppleCalendarCredential`) 회귀 없이 유지된다. 내보내기 코어 코드(`syncCalendar`/`syncActivities`/`syncAppleActivities`)와 데이터 모델은 삭제하지 않고 보존한다(호출처만 제거). 데이터 마이그레이션·테이블 삭제는 본 피처 범위 밖.

## Coverage Targets

- 활동 CRUD·초안 확정 시 외부 캘린더 자동 반영 호출 제거(8개 라우트의 `after(triggerCalendarAutoSync)`) [why: autosync-removal] [multi-step: 3]
- 여행 상세 캘린더 다이얼로그를 가져오기 전용으로 재구성(ProviderSection 제거 + import 게이트를 external-calendars로 재정의) [why: ui-importonly] [multi-step: 3]
- 가져오기 전용 안내 카피 + 기존 항목 직접 정리 안내 [why: copy-importonly]
- 외부 캘린더 쓰기·연결·구독 공개 엔드포인트 410 Gone 폐지 [why: api-gone] [multi-step: 4]
- 가져오기 회귀 가드 + 자동 반영 미발생 회귀 테스트 [why: regression-guard] [multi-step: 2]
- OpenAPI 문서·도구 표면에서 쓰기/동기화 폐지 반영 [why: docs-openapi]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16). Python 3.10+ (MCP — 본 피처 영향 없음: trip MCP는 외부 캘린더 쓰기 도구 미보유)
**Primary Dependencies**: Next.js 16 (App Router, Turbopack), React 19, Prisma 7 (Neon Postgres adapter), Auth.js v5, `@googleapis/calendar`, CalDAV 클라이언트(`src/lib/calendar/provider/apple-client.ts`). **신규 의존성 도입 없음**
**Storage**: Neon Postgres (Production `neondb` / Preview·Dev `neondb_dev`). **스키마 변경 없음** — export 추적 모델(`TripCalendarLink`/`TripCalendarEventMapping`/`MemberCalendarSubscription`/`GCalLink`/`GCalEventMapping`)은 보존, 신규 생성·갱신만 중단
**Testing**: Vitest (`npx vitest run`), Testing Library
**Target Platform**: Vercel (web), 모바일·데스크탑 브라우저
**Project Type**: web application (Next.js 풀스택 + Python MCP)
**Performance Goals**: UI 전용·호출 제거 위주 — 별도 성능 목표 없음. 활동 CRUD 응답에서 `after()` 백그라운드 작업이 사라져 부수효과 감소
**Constraints**: 코드·데이터 보존(표면만 분리), 가져오기 회귀 0건, API 폐지는 410 Gone 일관 처리
**Scale/Scope**: 8개 활동 CRUD/promote 라우트의 자동 sync 호출 제거, 4계열 export 엔드포인트 410 폐지, 캘린더 다이얼로그 1종 재구성, 안내 카피

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **V. Cross-Domain Integrity (단방향·단일 정본)**: ✅ **강화**. 외부 캘린더가 여행 데이터를 복제 소유하던 양방향 구조를 제거하고 trip-planner DB를 단일 정본으로 일원화한다. 외부 캘린더는 읽기(가져오기) 대상으로만 남아 단방향 참조 원칙에 부합한다.
- **VI. Role-Based Access Control**: ✅ 위반 없음. 멤버십 변화 시 외부 캘린더 권한 자동 변경(`reconcileMemberAcl`/`reconcileOwnerTransfer`/subscribe)을 더 이상 수행하지 않는다. 여행 내부 권한 매트릭스(편집·초대·삭제 등)는 불변. 새 행위 추가 없음(행위 제거).
- **VII. Calendar Time Model (부동 시간)**: ✅ 위반 없음. 시간 표시·저장 로직 변경 없음. 가져오기 경로의 부동 시간 처리(타임존 라벨)는 유지. 내보내기에서만 쓰이던 UTC 환산 경로는 호출되지 않으나 코드는 보존.
- **II. Minimum Cost**: ✅ 신규 의존성·과금 없음.
- **IV. Incremental Release**: ⚠️ 주의. 외부 캘린더 쓰기 API 폐지는 기존 기능 제거(breaking 성격). 가져오기는 깨지지 않도록 회귀 가드로 보호. 코드 보존으로 재도입 여지 확보.

위반 없음 — Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/056-calendar-export-removal/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (폐지 엔드포인트 계약)
├── checklists/
│   └── requirements.md  # spec 품질 체크리스트
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/api/
│   ├── trips/[id]/days/[dayId]/activities/route.ts            # 자동 sync 호출 제거
│   ├── trips/[id]/days/[dayId]/activities/[activityId]/route.ts # 자동 sync 호출 제거
│   ├── trips/[id]/days/batch-delete/route.ts                  # 자동 sync 호출 제거
│   ├── trips/[id]/activities/batch-delete/route.ts            # 자동 sync 호출 제거
│   ├── trips/[id]/drafts/[draftId]/promote/route.ts           # 자동 sync 호출 제거
│   ├── trips/[id]/drafts/promote-batch/route.ts               # 자동 sync 호출 제거
│   └── v2/trips/[id]/calendar/
│       ├── sync/route.ts                                       # 410 Gone
│       ├── route.ts                                            # 410 Gone (connect/disconnect/status)
│       ├── apple/connect/route.ts                              # 410 Gone
│       └── subscribe/route.ts                                  # 410 Gone
├── components/calendar-sync/
│   ├── CalendarSyncDialog.tsx                                  # 가져오기 전용 재구성 + 안내 카피
│   ├── CalendarSyncEntryCard.tsx                               # 라벨·카피 가져오기 전용
│   └── sections/
│       ├── ProviderSection.tsx                                 # export 연결 UI 제거(제품 표면에서 미렌더)
│       ├── ImportSection.tsx                                   # 유지(게이트 재정의 영향만)
│       └── DraftSection.tsx                                    # 유지
├── lib/calendar/
│   ├── auto-sync.ts                                            # 보존(호출처 제거로 미사용). 코어 코드 보존
│   └── service.ts                                              # syncCalendar 등 보존(미호출)
docs/
└── (OpenAPI 문서)                                              # 폐지 엔드포인트 반영
tests/
├── lib/calendar-auto-sync.test.ts                             # 제거(죽은 함수 단위 테스트)
├── api/activities.test.ts 등                                  # 자동 sync 미호출로 mock 정리
└── (신규) export 폐지·import 독립 회귀 가드
```

**Structure Decision**: 기존 Next.js 풀스택 구조 유지. 신규 디렉토리 없음. 변경은 (1) 라우트 핸들러 내 호출 제거/410 교체, (2) 캘린더 다이얼로그 컴포넌트 재구성, (3) 테스트 정리·추가, (4) OpenAPI 문서 반영으로 한정.

## Complexity Tracking

> Constitution Check 위반 없음 — 작성 불필요.
