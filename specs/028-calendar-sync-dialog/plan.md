# Implementation Plan: 캘린더 동기화 UI 통합

**Branch**: `028-calendar-sync-dialog` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)
**Related**: Epic #535, Milestone v2.16.0 (#38)

## Summary

trip 상세 SidePanel에 분산되어 있던 캘린더 관련 패널 5종(`CalendarProviderChoice`, `GCalLinkPanel`, `AppleEntryCard`, `CalendarImportPanel`, `DraftListPanel`)을 단일 진입 카드 `CalendarSyncEntryCard` + 단일 다이얼로그 `CalendarSyncDialog`로 통합. 다이얼로그 내부에서 섹션이 사용자 권한·trip 캘린더 상태에 따라 동적으로 자라며, 모든 도메인 호출은 v2.15.x 엔드포인트 그대로 재사용.

## Coverage Targets

- SidePanel 진입 카드 단일화 `CalendarSyncEntryCard` 도입 + 기존 5종 패널 SidePanel 직접 노출 제거 [why: entry-card] [multi-step: 2]
- 통합 다이얼로그 `CalendarSyncDialog` 컨테이너 + 섹션 라우팅 컴포넌트 [why: dialog-shell] [multi-step: 2]
- 섹션 1 — provider 선택·연결 상태(`CalendarProviderChoice` + `GCalLinkPanel` + `AppleEntryCard` 기능 흡수) [why: section-link] [multi-step: 2]
- 섹션 2 — 외부 캘린더에서 가져오기(`CalendarImportPanel` 흡수, scope 진단 분기 포함) [why: section-import]
- 섹션 3 — draft 목록·승격·refresh·삭제(`DraftListPanel` 흡수) [why: section-drafts]
- 권한별 분기(OWNER·HOST·GUEST UI 조건) [why: rbac-dialog]
- 모바일(<768px) 다이얼로그 레이아웃 회귀 [why: mobile-regression]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (Next.js 16).
**Primary Dependencies**: Next.js 16 (App Router), React 19, shadcn/ui `Dialog`/`Button`/`Select`/`DropdownMenu`, Tailwind CSS v4. **신규 의존성 도입 없음**.
**Storage**: 변경 없음. UI-only 피처.
**Testing**: Vitest + Testing Library, dev.trip.idean.me 수동 검증.
**Target Platform**: 데스크탑·모바일 브라우저(Chromium·Safari·Firefox).
**Project Type**: Web application (Next.js App Router).
**Performance Goals**: 다이얼로그 첫 렌더 < 100ms 가독 표시. Vercel Function 호출은 spec 027 엔드포인트 재사용.
**Constraints**: 도메인·API·DB schema 변경 0건. 새 라우트 추가 0건. spec 026 반응형 토큰 위에서 동작.
**Scale/Scope**: 5개 기존 패널 → 1 진입 카드 + 1 다이얼로그(3 섹션).

## Constitution Check

| 원칙 | 평가 |
|------|------|
| I. AX-First | ✅ UI 통합. AI 흐름 영향 없음. |
| II. Minimum Cost | ✅ 신규 라이브러리·서비스 0. |
| III. Mobile-First | ✅ FR-007·SC-003에 모바일 회귀 검증 강제. |
| IV. Incremental Release | ✅ US1→US2→US3 점진 머지 가능. |
| V. Cross-Domain Integrity | ✅ 도메인 변경 없음. |
| VI. RBAC | ✅ 매트릭스 변경 없음. UI 조건 분기만. |

**Gate 통과** — Phase 0 진입.

## Phase 0: Research

### 1. 다이얼로그 폭·섹션 layout

**Decision**: max-width 데스크탑 `sm:max-w-2xl`, 모바일 `max-w-[95vw]`. 섹션은 세로 스택, `border-t` 구분.
**Rationale**: 3섹션이 들어가는데 모바일 폭(<768px)에서 세로 스택이 강제. 데스크탑은 너무 좁으면 import 캘린더 목록·draft 목록 가독성 손상.
**Alternatives considered**: 탭 — depth 0 정책 위반. 기각.

### 2. 섹션 표시 조건

**Decision**:
- 섹션 1 (provider 선택·연결 상태): **항상 표시**.
- 섹션 2 (외부 캘린더에서 가져오기): trip 캘린더가 연결된 상태(`linked=true`) + 권한 ≥ HOST 일 때 표시.
- 섹션 3 (draft 목록): PENDING draft 1건 이상이면 표시. 0건 + 권한 ≥ HOST 면 빈 상태 안내. GUEST는 PENDING 1건 이상일 때 읽기 모드.

**Rationale**: 사용자 인지 비용 최소 — 액션이 가능한 섹션만 점진 노출. draft 0건 + GUEST면 노이즈 제거.

### 3. v2.15.1 진단 분기 흡수

**Decision**: 섹션 2 안에 v2.15.1 진단 분기(scope 부족·미연결·필터됨·응답 0건) 그대로 inline. "Google 다시 연결" 버튼·`/settings/calendars` 진입 동일 흡수.

### 4. OAuth 재동의 redirect 복귀

**Decision**: 다이얼로그 open state를 URL query param(`?calsync=open`)로 표현. 페이지 로드 시 param 감지하면 자동 다이얼로그 오픈.
**Rationale**: "Google 다시 연결" → OAuth 동의 → 페이지 복귀 시 사용자가 카드를 다시 클릭하는 마찰 제거.

### 5. 기존 5개 패널 처리

**Decision**:
- 5개 모두 다이얼로그 섹션 안에 inline 재구성.
- 원본 파일은 v2.16.0에서 deprecated 표시 + 후속 contract에서 제거(expand-and-contract).

**Rationale**: v2.16.0은 expand(통합)만 — 원본 삭제는 v2.16.x patch로 분리해 회귀 표면 작게.

### 6. 모바일 다이얼로그 닫기

**Decision**: shadcn `Dialog` 기본 X 버튼·ESC·outside click 닫기 유지. drawer 전환 X.
**Rationale**: 입력 폼이 많아 drawer 전환 시 인지 비용 증가. outside click 닫기 시 입력 손실 보호는 후속 회차 검토.

## Phase 1: Design & Contracts

### 컴포넌트 트리

```text
src/components/calendar-sync/
├── CalendarSyncEntryCard.tsx        # SidePanel 진입 카드
├── CalendarSyncDialog.tsx           # 다이얼로그 컨테이너 (client)
├── sections/
│   ├── ProviderSection.tsx          # 섹션 1
│   ├── ImportSection.tsx            # 섹션 2
│   └── DraftSection.tsx             # 섹션 3
├── PromoteForm.tsx                  # draft 승격 폼 (섹션 3 inline)
└── hooks/
    ├── useCalendarLinkStatus.ts
    ├── useExternalCalendars.ts
    └── useDrafts.ts
```

### SidePanel 변경

```tsx
// 변경 후
<aside>
  <CalendarSyncEntryCard tripId={tripId} role={role} calendarLinked={hasCalendarLink} />
  <MemberList tripId={tripId} />
</aside>
```

### data-model.md

신규 entity 없음. 별도 문서 생략(spec.md Key Entities에 기존 entity 참조 명시).

### contracts/

신규 API 없음. v2.15.x 엔드포인트 그대로 재사용. contracts/ 디렉토리 생략.

### quickstart.md

각 US별 Evidence 시나리오 — Vitest 컴포넌트 + dev 환경 수동 검증.

## Constitution Re-Check (Post-Design)

| 원칙 | 평가 |
|------|------|
| I·II·III·IV·V·VI | ✅ |

**Re-check 통과** — Phase 2(`/speckit.tasks`) 진입 가능.
