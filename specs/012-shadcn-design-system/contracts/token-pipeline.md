# Contract: Token Build Pipeline — 012-shadcn-design-system

**Scope**: `design/tokens.json` → `src/app/globals.css`의 `@theme` 블록 생성 파이프라인의 계약.

## 1. 입력 계약

- **파일**: `design/tokens.json` (필수). 누락 시 빌드 실패.
- **형식**: W3C DTCG Community Group spec 호환(`$value` + `$type` 페어).
- **필수 카테고리 (현 단계, PR4 v2.4.3)**: `color`(primary·surface 팔레트 최소), `radius`, `shadow`. 누락 시 `scripts/build-tokens.ts`가 exit 1.
- **후속 확장 카테고리**: `spacing`, `fontFamily`, `fontSize`, `lineHeight`, `color.background`·`color.foreground`·`color.border`·`color.ring` 등 shadcn alias는 디자이너 합류 + 브랜드 타이포 도입 후 별도 PR에서 추가. 추가 시 `REQUIRED_CATEGORIES` 및 본 계약을 함께 갱신.
- **shadcn 필수 alias**: `color.background`, `color.foreground`, `color.border`, `color.ring`, `color.primary-foreground`, `color.accent`, `color.accent-foreground`, `color.destructive`, `color.destructive-foreground`, `color.muted`, `color.muted-foreground`, `color.popover`, `color.popover-foreground`, `color.card`, `color.card-foreground` — 모두 `{color.*}` alias 또는 명시 값 허용.

## 2. 변환 계약 (scripts/build-tokens.ts)

### Entry Point

`package.json`의 `"scripts"`에 `"tokens:build": "tsx scripts/build-tokens.ts"` 등록. 로컬·CI 어디서든 `pnpm run tokens:build`로 실행.

### 처리 단계

1. `design/tokens.json` 로드. JSON 파싱 실패 시 exit 1.
2. 자체 DTCG flatten으로 CSS 변수 목록 생성(Style Dictionary 미사용 — 입력이 단순 팔레트/dimension 수준이라 외부 라이브러리 대비 자체 구현이 충분. alias 또는 transform 요구가 생기면 Style Dictionary 도입을 재평가).
3. `src/app/globals.css`를 읽어 `/* BEGIN:tokens */` ~ `/* END:tokens */` sentinel 사이를 **정확히 교체**. sentinel 부재 시 exit 1(수동 삽입 요구).
4. sentinel 외부(수동 정의 + `.prose` 규칙 + `@plugin` 등)는 1바이트도 수정하지 않음.
5. 변환 결과 bytes 수·생성 변수 개수를 stdout에 요약 출력. 입력 변화 없으면 `idempotent` 로그 출력 + write 생략.

### 멱등성

- 입력이 동일하면 출력도 동일해야 함. 반복 실행 시 git diff 없음.
- 생성 섹션 내 키 순서는 alphabetical 고정.

### 오류 시나리오

| 조건 | 동작 |
|------|------|
| `design/tokens.json` 누락 | stderr에 경로 안내, exit 1 |
| JSON 파싱 실패 | stderr에 line/column, exit 1 |
| 필수 카테고리 누락 | stderr에 누락 카테고리명, exit 1 |
| shadcn 필수 alias 누락 | stderr에 누락 키, exit 1 |
| sentinel 부재 | stderr에 삽입 방법 안내, exit 1 |
| 순환 참조 | Style Dictionary가 원래 exit 1 |

## 3. 출력 계약

- **파일**: `src/app/globals.css`의 `@theme` 블록 내부.
- **형식**: CSS 변수 선언 라인(`--key: value;`) 1줄당 1개.
- **주석**: 생성 블록 최상단에 `/* Auto-generated from design/tokens.json by scripts/build-tokens.ts. Edit tokens.json, not here. */`.

## 4. CI 게이트 (본 피처 범위 외, 후속 고려)

- 향후 GitHub Actions에서 `pnpm run tokens:build && git diff --exit-code src/app/globals.css`로 drift 차단 가능. 본 피처는 스크립트만 제공하고 CI 통합은 운영 6개월 후 재평가.

## 5. Breakage 기준 (계약 위반 = 회귀)

- `design/tokens.json`을 편집했는데 `pnpm run tokens:build` 없이 커밋 → CSS가 구 값 → Spec FR-008 실패
- 스크립트가 sentinel 밖을 건드림 → 수동 정의 소실, Spec FR-015 실패(빌드 파이프라인 영향)
- shadcn 필수 alias 누락으로 컴포넌트 렌더 깨짐 → Spec FR-003 실패(신규 컴포넌트 "별도 수정 없이 렌더" 불성립)
