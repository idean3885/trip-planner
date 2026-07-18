# Implementation Plan: 대문 정보위계·카피 정리

**Branch**: `070-landing-refine` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)

## Summary
대문 카피·타이포 위계 정리. (1) 하단 CTA(`BottomCta`)의 "Google 계정으로 로그인…" 서브텍스트 제거. (2) 섹션 제목 3곳(`FeatureHighlights`·`DemoShowcase`·`BottomCta` h2)을 킥커 스타일(`text-muted-foreground text-xs uppercase`)에서 `text-foreground text-xl sm:text-2xl font-semibold tracking-tight`로 상향(Hero h1 30~36 > 섹션 20~24 > 카드 16 > 본문 14 4단 위계). (3) `GcalTestingNotice`를 최종 CTA 앞→뒤(`LandingPage` 하단)로 이동, 정보 유지. (4) `FeatureHighlights` 제목을 Hero 킥커와 다른 문구로. 데이터/스키마 변경 없음. 시각은 실기기 정본.

## Coverage Targets
- 하단 CTA 서브텍스트 제거 + Features 제목 문구 중복 정리 [why: landing-copy] [multi-step: 2]
- 섹션 제목 타이포 위계 상향 (Features·Demo·CTA) [why: heading-scale] [multi-step: 3]
- 경고 배너를 최종 CTA 뒤로 이동 [why: notice-position]

## Technical Context
**Language**: TS 5.x. **Deps**: Next 16, React 19, Tailwind v4. 신규 없음. **Storage**: N/A.
**Testing**: Vitest(소스 레벨). 시각·여백은 실기기.
**Constraints**: 색·타이포 :root/유틸 경유. 로그인 사용자엔 BottomCta 미노출(현행 유지).

## Constitution Check
I~VII 위반 없음(대문 표시·카피, 데이터·권한·시간 불변).

## Project Structure
```text
src/components/landing/BottomCta.tsx        # 서브텍스트 제거 + h2 위계
src/components/landing/FeatureHighlights.tsx # h2 위계 + 문구 변경
src/components/landing/DemoShowcase.tsx     # h2 위계
src/components/landing/LandingPage.tsx      # GcalTestingNotice 를 CTA 뒤로
tests/components/landing-refine.test.tsx
```
**Structure Decision**: 대문 컴포넌트 국한.

## Design Decisions
- **섹션 제목 스케일**: `text-foreground text-xl font-semibold tracking-tight sm:text-2xl`. Hero 킥커(text-xs)는 h1 위 보조 라벨이라 그대로 둔다(정상 용법).
- **CTA 서브텍스트**: 삭제(Hero CTA와 대칭). 제목 "시작해 볼까요" + 버튼만.
- **Features 제목**: "계획부터 현장까지, 이렇게 돕습니다" → "여행 준비를 이렇게 돕습니다"(Hero 킥커와 각도 분리).
- **배너 이동**: `LandingPage`에서 `GcalTestingNotice`를 `BottomCta` 뒤로. 항상 노출 유지(로그인 여부 무관).

## Out of Scope
계정 메뉴(완료), 트립 상세, 다크 모드.

## Complexity Tracking
없음.
