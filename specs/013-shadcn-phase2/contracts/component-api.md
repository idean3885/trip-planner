# Contract: 복합 컴포넌트 Props 보존 (013 Phase 2)

**Feature**: `013-shadcn-phase2`
**Scope**: 스타일 재작성 시 Props·이벤트·로직 불변 보장

## 원칙

Phase 2는 "**외곽 재구성**" 범위다. 내부 서버 액션 호출·폼 상태·핸들러·propagation은 **모두 보존**한다. 본 문서는 각 복합 컴포넌트의 현행 Props 시그니처를 고정하고, 허용된 변경 영역만을 열거한다.

## 1. ActivityCard

### 보존 대상 (변경 금지)

- Props 시그니처 — 현 파일(`src/components/ActivityCard.tsx`)의 interface 그대로.
- `onDelete`/`onEdit` 등 상위로 올라가는 콜백 이름·시그니처.
- `canEdit` 분기 결과(편집 버튼 렌더 여부).
- 접근성 속성의 **의미적 구조** (`aria-label` 키, 역할 속성).

### 허용된 변경

- 최외곽 래퍼 요소(`<div>` → `<Card>`).
- `className` 값 전체 재작성.
- `CardHeader`/`CardContent`/`CardFooter` 슬롯으로의 JSX 재배치(동일 자식 요소를 다른 슬롯으로 이동).
- 내부 레이아웃 유틸리티(`flex`/`gap`/`items-*`).

## 2. ActivityList

### 보존 대상

- Props 시그니처 — `tripId`, `dayId`, `activities`, `canEdit`.
- `activities` 배열 순서 표현(정렬은 상위 책임).
- 드래그·순서 변경 핸들러(구현되어 있다면).
- 빈 상태(`activities.length === 0`) 표시 로직.

### 허용된 변경

- 리스트 컨테이너 요소 재작성(`<ul>`/`<div>` → `<div className="space-y-*">`).
- 각 항목 래퍼(`<li>` 또는 `<div>` → `<Card size="sm">`).
- 호버·포커스·액티브 시각 규칙.

## 3. DayEditor

### 보존 대상

- Props 시그니처.
- 저장/취소 이벤트 핸들러 및 서버 액션 호출.
- 폼 상태(`useState`/`useTransition` 등).
- 검증 로직(입력 → 에러 메시지 파생).

### 허용된 변경

- 최외곽 카드 → shadcn `<Card>`.
- 폼 필드 래퍼 → shadcn `<Field>` + `<Label>`.
- 버튼 → shadcn `<Button>` (Phase 1에서 이미 전환됐다면 재확인만).

## 리뷰 게이트

각 PR description에 다음 형식을 필수 첨부:

```
## 로직 보존 증거
- 로직 영역 diff: 0 lines changed
- `git diff origin/develop -- src/components/<컴포넌트>.tsx | grep -v "^[+-][[:space:]]*className"` 실행 결과 첨부
- 서버 액션 호출부(`src/app/actions/**` 참조) 변경 없음 확인
```

위 게이트가 빈칸/누락이면 리뷰 재요청.

## 미리보기 카탈로그 (`/_dev/components`)

### 카탈로그 샘플 데이터

```ts
// 참조: /_dev/components 카탈로그에서 사용할 mock
export const sampleActivity = {
  id: 1,
  dayId: 1,
  category: "attraction",
  title: "샘플 관광지",
  startTime: "2026-05-01T09:00:00.000Z",
  endTime: "2026-05-01T11:00:00.000Z",
  startTimezone: "Asia/Tokyo",
  endTimezone: "Asia/Tokyo",
  location: "도쿄 · 아사쿠사",
  memo: "입장료 1,000엔",
  cost: "1000",
  currency: "JPY",
  reservationStatus: "ON_SITE" as const,
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const sampleMembers = [
  { id: 1, role: "OWNER" as const, userId: "u1", name: "여행 주인", email: "owner@example.com" },
  { id: 2, role: "HOST" as const, userId: "u2", name: "동행 호스트", email: "host@example.com" },
];
```

위 상수를 카탈로그 페이지에서 직접 import. 실 DB 쿼리 금지.
