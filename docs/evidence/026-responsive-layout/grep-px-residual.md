# 잔존 임의 px grep 결과 — spec 026

**일시**: 2026-05-26
**대상 명령**: `git grep -nE 'max-w-\[[0-9]+(px|rem)\]|min-w-\[[0-9]+(px|rem)\]|grid-cols-\[[0-9]+px' src/app src/components`

## 결과

| 파일 | 라인 | 패턴 | 사유 |
|------|------|------|------|
| `src/components/ui/dropdown-menu.tsx` | 138 | `min-w-[96px]` | shadcn vendored UI 컴포넌트 원본. 본 피처는 vendored 원본을 손대지 않는 정책(spec 012). 토큰 일원화 대상 외 — 예외로 보존. |

## 의사결정

- vendored shadcn 컴포넌트(`src/components/ui/*`)는 upstream 동기 가능성을 위해 본 피처 토큰 일원화에서 제외한다.
- 페이지·도메인 컴포넌트(`src/app/**`, `src/components/[A-Z]*.tsx`)는 잔존 px **0건**.

## 결론

spec 026 FR-008 ("토큰 미참조 임의 px 잔존 0") — **작업 대상 범위 내 0건**, vendored 1건은 예외 사유 명시로 통과.
