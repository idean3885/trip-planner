# Implementation Plan: 외부 캘린더 가져오기 — 선택 + 시간·타임존 일괄 + 미저장 미리보기

**Branch**: `033-calendar-sync-selection` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/033-calendar-sync-selection/spec.md`

## Summary

기존 가져오기 흐름(`import → ActivityDraft(PENDING) → 1건씩 개별 promote`)을 선택 기반으로 개선한다. `DraftSection`을 재설계해 가져온 draft 목록에 체크박스(전체/부분 선택)를 붙이고, 상단에 확정 버튼과 일괄 설정(시간 미정 일괄 시작·타임존 일괄)을 sticky 로 고정한다. 시간·타임존 보정은 클라이언트 미리보기 상태에서만 적용(미저장)하고, 확정 시 선택된 draft 를 보정값과 함께 일괄 승격(promote-batch)해 정식 `Activity` 로 저장한다. 좁은 화면(≤375px)에서 항목이 가로로 넘치지 않게 줄바꿈 레이아웃으로 구성한다. `ActivityDraft` 인프라를 재사용하므로 스키마 변경은 없다.

## Coverage Targets

- DraftSection 체크박스 + 전체 선택 토글(진입 시 전체 선택) [why: draft-selection] [multi-step: 2]
- 상단 sticky 확정 버튼 + 일괄 설정 영역 레이아웃(목록만 스크롤) [why: sticky-header]
- 시간 미정 일괄 시작 + 타임존 일괄(클라 미리보기 보정, 시각 숫자 유지) [why: batch-time-tz] [multi-step: 2]
- 미리보기 항목 개별 수정 [why: per-item-edit]
- 선택분 일괄 확정 API(promote-batch) + 선택분만 저장 [why: batch-promote] [multi-step: 2]
- 카테고리·예약상태 등 기타 설정 기본값(셀렉트 첫 값) [why: default-settings]
- 좁은 화면(≤375px) 가로 스크롤 방지 항목 레이아웃 [why: mobile-no-hscroll]
- 단편 / 검증 / 회귀 테스트 [why: release-bookkeeping]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Next.js 16 (App Router · Turbopack), React 19, Prisma 7 (Neon Postgres adapter), Tailwind CSS v4(`@theme`), shadcn/ui(vendored — `Select`/`Dialog`/`Button` 재사용), lucide-react. **신규 의존성 없음**. 체크박스는 기본 `<input type="checkbox">` + Tailwind 스타일(shadcn Checkbox 미vendoring).  
**Storage**: Neon Postgres — **스키마 변경 없음**. 기존 `ActivityDraft`(PENDING) / `Activity` / `Day` / `ImportRun` 재사용. 일괄 승격은 기존 `promoteDraft`(`src/lib/calendar-import/promotion.ts`)를 loop 호출.  
**Testing**: Vitest + Testing Library. DraftSection 상호작용(선택·일괄 보정·확정), promote-batch 라우트 단위. 서브밋 전 `npx vitest run` 전체 1회.  
**Target Platform**: 브라우저 — 데스크탑·모바일. 좁은 화면(≤375px, 아이폰 13 미니) 가로 스크롤 0 목표.  
**Project Type**: Web application (Next.js 단일 프로젝트)  
**Performance Goals**: 일괄 보정은 클라이언트 상태 변경(네트워크 0). 확정만 네트워크 1회(일괄).  
**Constraints**: 스키마 변경 0. 신규 의존성 0. 가져온 시점 정식 일정 저장 0(확정 전까지 미저장).  
**Scale/Scope**: 한 여행 import 후보 ≤ 수십 건 가정 — 클라 상태·DOM 부담 미미.

## Constitution Check

UI + 기존 서비스 재사용 변경. 헌법 V(마이그레이션) 해당 없음(스키마 변경 0). VI(데이터 정본)는 기존 `promoteDraft`·`Activity` 경로를 재사용하므로 정본 위반 없음. rollout phase=contract → quickstart Evidence 필수.

## 핵심 설계 결정

### D1. ActivityDraft 재사용 + 클라이언트 보정(미저장)
`import` 시 `ActivityDraft`(PENDING)가 DB에 생성되는 현 구조는 staging 으로 유지한다. 사용자 관점의 "저장"은 정식 `Activity` 확정이며, draft 는 그 전의 미리보기다. 시간·타임존·기타 보정값은 DraftSection 의 **클라이언트 상태**로만 들고 있다가(즉시 DB 반영 안 함), 확정 시 일괄 승격 요청에 실어 보낸다. 이로써 "가져온 시점 미저장"(정식 일정 미생성)을 만족한다.

### D2. DraftSection 재설계 — 선택 + sticky 헤더
- 각 draft 카드에 체크박스. 진입 시 전체 선택. 상단에 "전체 선택" 토글 + 선택 수 표시.
- 다이얼로그 안에서 헤더 영역(확정 버튼 + 시간 미정 일괄 시작 + 타임존 일괄)을 `sticky top-0`, draft 목록만 스크롤. 확정 버튼은 헤더 최상단, 그 바로 아래 일괄 설정.

### D3. 일괄 시간·타임존 보정
- **시간 미정 일괄 시작**: `isAllDay`(또는 시간 미지정) draft 의 `startTime` 을 해당 날짜 + 일괄 시각으로 클라 보정. 시간이 있는 draft 는 불변.
- **타임존 일괄**: 시간이 있는 draft 의 표시 시각 숫자(floating, `getUTCHours` 기준)를 유지한 채 `startTimezone`/`endTimezone` 만 교체. `startTime` UTC 값은 건드리지 않는다(#232 floating-time 관행).
- 각 일괄은 독립 적용. 개별 수정은 해당 draft 보정값만 덮어쓴다.

### D4. 일괄 확정 API (promote-batch)
신규 라우트 `POST /api/trips/[id]/drafts/promote-batch` 추가. body 는 선택 draft 별 최종 보정값 배열(`{ draftId, category, reservationStatus, startTime, startTimezone, endTimezone }`). 서버는 기존 `promoteDraft` 를 항목별로 호출(트랜잭션 단위는 항목별 유지, 부분 성공 허용)하고 `{ promoted: [...], failed: [...] }` 반환. 기존 단건 `promote` 라우트는 유지(개별 동선 호환).

### D5. 기타 설정 기본값
카테고리·예약상태 셀렉트는 첫 값(`SIGHTSEEING` / `NOT_NEEDED`)을 기본 선택해 사용자 입력을 "어떤 항목을 들여올지 + 시간/타임존 일괄"로 좁힌다. 대상 캘린더(import 소스)도 첫 항목 기본 선택.

### D6. 좁은 화면 가로 스크롤 방지
draft 항목을 한 줄 고정이 아닌 `flex-wrap`/2줄 구성으로 바꿔, 체크박스·시각·제목·수정 버튼이 ≤375px 폭 안에서 줄바꿈되게 한다. 제목은 `truncate`/`break-words`. 다이얼로그 컨테이너는 가로 `overflow-x` 가 생기지 않도록 `min-w-0` + 폭 제약.

## Project Structure

### Documentation (this feature)

```text
specs/033-calendar-sync-selection/
├── plan.md
├── spec.md
├── tasks.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── trips/[id]/drafts/
│           └── promote-batch/route.ts   # (신규) 선택 draft 일괄 승격
├── components/
│   └── calendar-sync/
│       ├── DraftSection.tsx              # 체크박스·전체선택·sticky 헤더·일괄 보정·일괄 확정·모바일 레이아웃
│       └── CalendarSyncDialog.tsx        # DraftSection 배치/스크롤 컨테이너 정합
└── lib/
    └── calendar-import/
        ├── promotion.ts                  # promoteDraft 재사용 (일괄 호출 대상)
        └── batch-promote.ts              # (신규, 선택) 일괄 승격 서비스 래퍼
```

**Structure Decision**: 단일 Next.js 프로젝트. 신규는 promote-batch 라우트(+선택적 서비스 래퍼) 1종과 DraftSection 재작성. 나머지는 기존 import/draft/promotion 인프라 재사용. 스키마·의존성 변경 없음.

## Complexity Tracking

위반 없음. 신규 추상·패키지 없음. 가장 복잡한 부분(클라 미리보기 보정 + 일괄 확정)은 기존 `promoteDraft` 를 재사용해 서버 로직 신규를 최소화한다.
