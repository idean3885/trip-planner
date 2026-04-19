# Data Model: shadcn/ui Phase 2

**Feature**: `013-shadcn-phase2`
**Date**: 2026-04-19

## 요약

본 피처는 **UI 전용**이며 데이터 엔티티·스키마·마이그레이션을 도입하지 않는다. 기존 도메인 엔티티(여행·일자·활동·동행자)를 **시각적으로만** 재표현한다.

## 참조 엔티티 (기존 정의 그대로)

- `Trip` — 스펙 004 (fullstack-transition)
- `Day` — 스펙 004 + v2.4.4 #285(DAY 넘버링) 반영 상태
- `Activity` — 스펙 004/005/006
- `TripMember` (역할: OWNER/HOST/GUEST) — 헌법 V-VI Permission Matrix

## UI 계약 측 엔티티 (컴포넌트 레벨 시맨틱)

UI 레벨에서 **새로 도입하는 개념은 없다**. shadcn 컴포넌트가 제공하는 슬롯 규약(`<Card>`·`<CardHeader>`·`<CardContent>`·`<CardFooter>`·`<Field>`·`<Label>`)을 그대로 사용한다.

## 토큰 인벤토리

### 유지 (Phase 2 이후에도 정본에 남음)

| 토큰 이름 | 정의 위치 | 용도 |
|-----------|-----------|------|
| `--background`/`--foreground` | `:root` (shadcn 기본) | 전역 배경·전경 (semantic) |
| `--card`/`--card-foreground` | `:root` (shadcn 기본) | 카드 배경·전경 |
| `--muted`/`--muted-foreground` | `:root` (shadcn 기본) | 부차 정보 |
| `--primary`/`--primary-foreground` | `:root` (shadcn 기본, neutral) | 강조 — **디자이너 합류 전까지 neutral 유지** |
| `--secondary`/`--accent`/`--destructive` | `:root` (shadcn 기본) | 상태·강조 변형 |
| `--border`/`--input`/`--ring` | `:root` (shadcn 기본) | 경계·입력·포커스 |
| `--radius` (+ `--radius-sm`/`md`/`lg`/`xl`) | `:root` (shadcn 기본) | 모서리 체계 |

### 제거 대상 (Phase 2에서 삭제)

| 토큰/유틸리티 이름 | 현 정의 위치 | 대체 |
|--------------------|--------------|------|
| `--color-primary-{50..900}` | `design/tokens.json` + `@theme` | 디자이너 합류 전까지 참조 중단. 정본에서 삭제. |
| `--color-surface-{0..900}` | `design/tokens.json` + `@theme` | shadcn `--muted`/`--foreground`/`--card` 계열로 치환 |
| `--color-sky-{50..700}` | `design/tokens.json` + `@theme` | 사용처 0 확인 후 삭제 |
| `--shadow-card`/`--shadow-card-hover`/`--shadow-fab` | `design/tokens.json` + `@theme` | shadcn `<Card>` 내부 ring + shadow 체계로 흡수 |
| `--radius-card` | `design/tokens.json` + `@theme` | shadcn `--radius` + `radius-xl` 계층으로 치환 |
| `--max-width-content` | `@theme` | Tailwind utility `max-w-*` 또는 layout 상수로 치환 |

### 검증 (R-3)

- `design/tokens.json` → `@theme` 빌드 후 `git diff`로 정본 ↔ 산출물 결정성 확인
- `scripts/audit-tokens.ts`가 사용처 ↔ 정본 양방향 일치 검증

## 컴포넌트 Props 보존 계약

복합 컴포넌트 3종의 기존 Props 시그니처는 **변경 금지**:

- `ActivityCard` — 기존 Props 유지 (`activity`, `canEdit`, `onDelete` 등)
- `ActivityList` — 기존 Props 유지 (`tripId`, `dayId`, `activities`, `canEdit`)
- `DayEditor` — 기존 Props 유지

사유: 호출부(`src/app/trips/[id]/day/[dayId]/page.tsx` 등)의 코드를 건드리지 않기 위함. 내부 JSX만 재구성한다. 상세 계약은 [contracts/component-api.md](./contracts/component-api.md) 참조.

## 데이터 불변성 (헌법 V·VI 보호)

- `ActivityList`/`ActivityCard`의 `canEdit` 분기로 결정되는 편집 UI 노출 조건은 **로직 영역**이므로 Phase 2에서 수정하지 않는다.
- 서버 액션 호출(`createActivity`·`updateActivity`·`deleteActivity`·`reorderActivities`)의 시그니처는 보존된다.
- 본 피처는 권한 매트릭스에 행위를 추가하지 않는다.
