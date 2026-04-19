# Contract: 레거시 커스텀 유틸리티 제거 (013 Phase 2)

**Feature**: `013-shadcn-phase2`
**Scope**: 정본(`design/tokens.json`)·빌드 산출물(`globals.css` `@theme`)·사용처(`src/**`)의 3계층에서 레거시 유틸리티를 삭제하고, 재유입을 구조적으로 차단한다.

## 제거 대상 목록

### 토큰 정본 (`design/tokens.json`)

| 토큰 경로 | 제거 후 대체 |
|-----------|--------------|
| `color.primary.{50..900}` | 사용처에서 shadcn semantic 토큰(`--primary`·`--foreground` 등)으로 치환 후 정본 삭제 |
| `color.surface.{0..900}` | 사용처에서 `--muted`·`--foreground`·`--card` 등으로 치환 후 삭제 |
| `color.sky.{50..700}` | 사용처 0 확인 후 삭제 (hover/focus 포인트가 있다면 `--accent`로 흡수) |
| `radius.card` | `--radius` + `--radius-xl` 계층으로 치환 후 삭제 |
| `shadow.card`/`shadow.card-hover`/`shadow.fab` | shadcn `<Card>` 기본 ring + shadow로 흡수 후 삭제 |
| `maxWidth.content` | Tailwind 유틸리티 `max-w-md`/`max-w-lg` 또는 layout 상수로 치환 후 삭제 |

### Tailwind 유틸리티 클래스 (`src/**`에서 제거)

| 클래스 | 치환 가이드 |
|--------|-------------|
| `rounded-card` | `rounded-xl` (= shadcn 기본) 또는 `<Card>` 내부 흡수 |
| `shadow-card`/`shadow-card-hover` | `<Card>`의 기본 ring + shadow로 대체 |
| `shadow-fab` | 해당 FAB 사용처 확인 후 shadcn `<Button size="icon">` + 커스텀 shadow로 대체 |
| `bg-primary-{50..900}` | `bg-primary`/`bg-muted`/`bg-accent` 등 semantic으로 치환. 단 `--primary`는 neutral이므로 파랑을 기대하는 곳은 **의도된 중성화** 처리 |
| `text-primary-{50..900}` | `text-foreground`/`text-muted-foreground`/`text-primary` 등으로 치환 |
| `bg-surface-{0..900}` | `bg-background`/`bg-card`/`bg-muted` 등으로 치환 |
| `text-surface-{0..900}` | `text-foreground`/`text-muted-foreground` 등으로 치환 |
| `border-surface-*` | `border-border` 또는 `ring-*` 로 치환 |
| `text-heading-lg`/`text-heading-md`/`text-heading-sm` | Tailwind 기본 `text-*` + `font-semibold`/`font-bold`/`tracking-tight` 조합 |
| `text-body-lg`/`text-body-md`/`text-body-sm` | Tailwind 기본 `text-*` |
| `max-w-content` | `max-w-md`/`max-w-lg` 등 |

## 의도된 예외 (제거 범위 제외)

다음 경로는 검증 스크립트에서 exclude:

- `changes/*.md` — 과거 릴리즈 단편(불변 기록)
- `specs/011-*/**`, `specs/012-*/**` — 이전 피처 스펙 내 코드 예시
- `docs/audits/**` — 감사 보고서
- 본 스펙 디렉토리(`specs/013-shadcn-phase2/**`) — 제거 설명 자체가 이름 언급을 포함

## 검증 스크립트 계약 (`scripts/check-legacy-utilities.sh`)

### 입력

- 리포 루트에서 실행. 인자 없음.

### 동작

1. 검색 대상 정규식을 빌드:
   ```
   rounded-card\b
   shadow-card\b|shadow-card-hover\b|shadow-fab\b
   bg-(primary|surface|sky)-[0-9]{2,3}\b
   text-(primary|surface|sky)-[0-9]{2,3}\b
   border-(primary|surface|sky)-[0-9]{2,3}\b
   (text|font)-(heading|body)-(lg|md|sm|xs)\b
   max-w-content\b
   --color-(primary|surface|sky)-[0-9]{2,3}\b
   --shadow-(card|card-hover|fab)\b
   --radius-card\b
   --max-width-content\b
   ```
2. `src/`·`styles/` 디렉토리에서 ripgrep으로 검색.
3. 결과가 0건이면 성공(exit 0).
4. 1건 이상이면 실패(exit 2) + 위반 위치 출력.

### 출력 형식 (실패 시)

```
FAIL: <위반 개수>건의 레거시 유틸리티 사용이 발견되었습니다.
  <파일>:<줄>: <매칭 텍스트>
  ...
→ 계약 문서: specs/013-shadcn-phase2/contracts/legacy-removal.md
→ 치환 가이드: 위 문서의 "Tailwind 유틸리티 클래스" 표 참조.
```

### CI 통합

- `.github/workflows/ci.yml`에 step 추가: `- run: bash scripts/check-legacy-utilities.sh`
- v2.4.4의 #286 CI 게이트 패턴(lint/typecheck/test)과 동일 계층으로 블로킹.
- 정리 PR(`legacy-cleanup`)에서 스크립트 도입 + 위반 0건 달성을 동시 커밋.

## 토큰 정합성 스크립트 (`scripts/audit-tokens.ts`)

### 입력/동작

- 리포 루트에서 실행(`pnpm run audit:tokens` 권장).
- `design/tokens.json`에서 활성 토큰 이름 추출.
- `src/app/globals.css`의 `BEGIN:tokens ~ END:tokens` 블록에서 `--*: *;` 추출.
- 두 집합의 양방향 diff를 계산.
- `src/**`에서 해당 이름(유틸리티 형태 포함) 사용 횟수 집계.

### 실패 조건

- 정본에 있으나 `@theme`에 없는 토큰 발견(빌드 누락)
- `@theme`에 있으나 정본에 없는 토큰 발견(수동 편집 흔적)
- `@theme`에 있으나 사용처 0회(고아 토큰) — 단 미래 예약 토큰 allowlist 존재 시 제외

### 산출물

- 성공: 요약 표 stdout 출력 후 exit 0.
- 실패: 위반 목록 stderr + exit 2.

## 검증 체크리스트 (PR 게이트)

- [ ] `design/tokens.json` diff가 제거 대상 목록과 일대일 대응
- [ ] `globals.css` `@theme` diff가 `pnpm run tokens:build` 출력과 일치
- [ ] `bash scripts/check-legacy-utilities.sh` 0건 통과
- [ ] `pnpm run audit:tokens` 고아·그림자 토큰 0건
- [ ] CI 단계에 레거시 검증 step 포함 확인
- [ ] 의도된 예외 경로가 스크립트 exclude에 반영
