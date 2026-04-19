# Contract: Component API — 012-shadcn-design-system

**Scope**: `src/components/ui/`의 vendored shadcn 컴포넌트 + 마이그레이션 대상 폼 6종의 외부 프롭 계약.

## 1. shadcn vendored 컴포넌트 (초기 11종)

### 공통 규약

- 모든 컴포넌트는 React 19 서버/클라이언트 컴포넌트 혼재 환경에서 동작. 대화형(Dialog, DropdownMenu, Select, Tabs, Toast)만 `"use client"`.
- `className` prop은 항상 마지막 우선순위로 override 가능. 내부 기본 클래스는 `cn(...)`로 병합.
- variants는 `cva`로 정의하며 `VariantProps<typeof xxxVariants>`를 props 타입에 노출.
- 모든 props는 해당 HTML element의 기본 attribute를 spread 수용(`...props`).

### 컴포넌트 목록 및 최소 props

| 컴포넌트 | variant | size | 기타 주요 props | 파일 |
|----------|---------|------|-----------------|------|
| `Button` | default·destructive·outline·secondary·ghost·link | default·sm·lg·icon | `asChild`(Radix Slot) | `button.tsx` |
| `Input` | — | — | 기본 input 속성 전체 | `input.tsx` |
| `Label` | — | — | `htmlFor`, children | `label.tsx` |
| `Form` | — | — | `useFormField` 훅 + `FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormDescription`/`FormMessage` 조합 | `form.tsx` |
| `Card` | — | — | `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` 하위 조합 | `card.tsx` |
| `Dialog` | — | — | `Dialog`/`DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription`/`DialogFooter`/`DialogClose` | `dialog.tsx` |
| `DropdownMenu` | — | — | 전 하위 셋 포함(`DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuSeparator` 등) | `dropdown-menu.tsx` |
| `Select` | — | — | `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` | `select.tsx` |
| `Tabs` | — | — | `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` | `tabs.tsx` |
| `Toast` | — | — | sonner 기반. `<Toaster />` 루트 배치 + `toast()` 함수 호출 | `toast.tsx` |
| `Skeleton` | — | — | `className`으로 크기 지정 | `skeleton.tsx` |

### 접근성 계약

- Radix primitives의 기본 접근성(키보드 내비, 포커스 트랩, ARIA 속성)을 보존. 커스터마이징 시 `aria-*`를 수동으로 덮어쓰지 않는다.
- `Dialog`·`DropdownMenu`·`Select`는 Esc 키로 닫히고 열기 직전 요소로 포커스 복귀(spec US2 Acceptance #2 충족).

### vendoring 정책

- shadcn CLI(`npx shadcn@latest add <component>`)로 추가한 파일은 **직접 편집 가능**. 단, 편집 시 상단에 `// Customized from shadcn 2026-MM-DD — {사유}` 주석을 남긴다.
- 추후 shadcn 업데이트 시 자동 덮어쓰기 방지를 위해 CLI의 overwrite 프롬프트에서 항상 "keep existing"을 선택.

## 2. 마이그레이션 대상 폼 6종

### 보존 계약 (Spec US2, plan R-6)

각 컴포넌트는 마이그레이션 전후로 **외부 인터페이스가 동일**해야 한다.

| 컴포넌트 | 보존 항목 |
|----------|----------|
| `ActivityForm` | Server Action import·호출, `formData` key(name·startTime·endTime·location·category 등), `onSuccess`/`onCancel` callback props |
| `AuthButton` | `onClick` 핸들러 경로(NextAuth `signIn`/`signOut`), displayed provider 로직 |
| `DeleteTripButton` | Server Action import·호출, 확인 단계(Dialog), 성공 후 redirect 경로 |
| `LeaveTripButton` | Server Action import·호출, 확인 단계(Dialog) |
| `InviteButton` | Server Action import·호출, 토큰 생성·복사 동작, 생성 성공 시 표시 UI |
| `TodayButton` | `onClick` 핸들러(스크롤·포커스 대상), 접근성 속성(keyboard shortcut if any) |

### 내부 교체 계약

- 기존 자체 작성 버튼/입력/다이얼로그 마크업 → `src/components/ui/*` vendored 컴포넌트로 교체.
- 기존 Tailwind 인라인 클래스는 variants(`variant`, `size`)로 수렴. variants로 표현 불가한 커스텀은 `className` prop으로 전달(최소화).
- 기존 `useState`/`useEffect` 등 상태·사이드이펙트 로직은 그대로 유지.

### 호환성 검증

- 마이그레이션 PR 머지 전에 `pnpm test`(vitest) + `pnpm build`(Next)가 둘 다 통과해야 함.
- 각 폼의 주요 플로우(생성·수정·삭제·초대·오늘 이동·로그인)를 수동으로 한 번씩 실행(quickstart.md의 Evidence 체크리스트).

## 3. Preview Catalog 경로

**Location**: `src/app/_dev/components/page.tsx` (또는 `(dev)/components/page.tsx`, plan R-4에 따라 tasks 단계 확정).
**Access**: 개발 환경 전용. 프로덕션에서는 `notFound()`.

### DOM 구조

```tsx
<main className="mx-auto max-w-4xl space-y-10 p-8">
  <h1>Components Preview</h1>
  <section>
    <h2>Button</h2>
    {/* 각 variant × size 조합 렌더 */}
  </section>
  <section>
    <h2>Form 예시 (ActivityForm, AuthButton, …)</h2>
    {/* 마이그레이션된 6종 삽입, 실제 Server Action은 호출 안 되도록 더미 */}
  </section>
  {/* Card, Dialog, DropdownMenu, Select, Tabs, Toast, Skeleton 각 섹션 */}
</main>
```

### 계약 조건

- 실 Server Action 호출 없이 시각·인터랙션만 확인할 수 있어야 함(더미 onSubmit).
- 프로덕션 빌드 시 `notFound()`로 404. 사이트맵·검색엔진 노출 금지.
- 디자이너 검수 시 스크린샷 촬영 기준 경로 역할.

## 4. Breakage 기준 (계약 위반 = 회귀)

- vendored 컴포넌트가 React 19 서버 컴포넌트 규약 위반(예: 이벤트 핸들러를 직접 서버 컴포넌트에 내림) → 빌드 실패
- 폼 6종 중 하나라도 Server Action 시그니처 변경 → Spec US2 Acceptance Scenario 실패, 헌법 V(Cross-Domain Integrity) 위배
- 마이그레이션 중 키보드 내비 또는 포커스 트랩 손상 → Spec FR-005/SC-003 실패
- 미리보기 경로가 프로덕션에서 200 응답 → Spec 정책 위반(dev 전용 원칙)
