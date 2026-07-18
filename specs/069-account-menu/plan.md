# Implementation Plan: 헤더 계정 메뉴 통합

**Branch**: `069-account-menu` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)

## Summary
`AuthButton`을 shadcn `DropdownMenu`(base-ui, 포털·글래스·z-50) 기반 단일 계정 메뉴로 전환한다. 트리거는 이니셜 원형 버튼(뷰포트 분기 제거). 메뉴: 이메일 라벨(상단) → 설정(→/settings) → 구분선 → 로그아웃(signOut). 트립 ☰와는 분리(컴포넌트만 공유). 포털 기반이라 이전 커스텀 ☰의 z-index 문제도 없음. 데이터/스키마 변경 없음. 시각은 실기기 정본.

## Coverage Targets
- 헤더 계정 항목을 단일 계정 메뉴로 통합 + 뷰포트 분기 제거 [why: account-menu] [multi-step: 2]

## Technical Context
**Language**: TS 5.x, Node 20+. **Deps**: Next 16, React 19, next-auth, @base-ui/react/menu(vendored DropdownMenu), lucide-react. 신규 없음.
**Storage**: N/A. **Testing**: Vitest + Testing Library. 시각은 실기기.
**Constraints**: 웹/모바일 단일 반응형(뷰포트 분기 금지). 색은 :root 토큰.

## Constitution Check
I~VII 위반 없음(표시 계층, 권한·시간·스키마 불변). III Mobile-First: 뷰포트 분기 제거로 오히려 원칙 부합.

## Project Structure
```text
src/components/AuthButton.tsx        # 계정 메뉴로 전환
tests/components/account-menu.test.tsx
```
**Structure Decision**: AuthButton 단일 컴포넌트 교체. 드롭다운은 기존 ui/dropdown-menu 재사용.

## Design Decisions
- **트리거**: 이니셜(name||email 첫 글자) 원형 버튼(`size-9 rounded-full border`). 이미지 아바타는 외부 도메인 설정 필요 + 브랜드 정합 실기기 판단이라 이니셜로 시작.
- **메뉴 셸**: `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`(align=end)/`DropdownMenuLabel`(이메일)/`DropdownMenuItem`(설정=Link render, 로그아웃=onClick signOut)/`DropdownMenuSeparator`.
- **분리**: TripActionsMenu는 그대로. 계정 메뉴는 AuthButton에만.

## Out of Scope
트립 ☰ 변경, 아바타 이미지, 대문 개선(별도).

## Complexity Tracking
없음.
