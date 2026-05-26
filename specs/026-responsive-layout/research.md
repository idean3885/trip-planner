# Research: 데스크탑·모바일 반응형 근본 대응

본 파일은 [plan.md](./plan.md) Phase 0 절의 결정·근거를 그대로 보존한다. 결정의 단일 정본은 plan.md이며, 본 파일은 검색·인용 편의를 위해 분리 저장.

## 결정 요약

| # | 주제 | 결정 |
|---|------|------|
| R1 | 토큰 SSOT 위치 | Tailwind v4 `@theme` 블록 + Style Dictionary 소스 이중 정의(이미 도입된 구조 그대로). |
| R2 | breakpoint 키 이름 | `mobile / tablet / desktop / wide` (Tailwind screens + CSS variables). 기본 `sm/md/lg/xl` 별칭 유지. |
| R3 | container max-width | `--container-narrow: 768`, `--container-content: 1280`, `--container-wide: 1440` 3종. |
| R4 | trip 상세 분할 비율 | `grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]` 본문 2/3 + 사이드 1/3 + 사이드 최소 280px. |
| R5 | CSS-only 분기 강제 | Tailwind responsive prefix / CSS container query / media query만. JS `matchMedia`·resize 리스너 금지. |
| R6 | 비주얼 회귀 도구 | 자동 도구 도입 안 함(Minimum Cost). 수동 체크리스트로 대체. 후속 이슈 고려. |
| R7 | 작업 단위 분할 | 5개 묶음(A 토큰 → B trip 상세 → C 목록+모달 → D Form+NavBar → E 회귀 점검). 자식 이슈 5개. |

상세 근거·기각 대안은 plan.md Phase 0 참조.
