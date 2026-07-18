# Implementation Plan: 글래스 캘린더 재설계 + 글래스 카드 테두리 버그 수정

**Branch**: `067-glass-calendar-redesign` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

## Summary

글래스 카드 테두리 아티팩트(backdrop-filter + overflow:hidden + border-radius clip 충돌)를 글래스 카드에서 overflow 클립을 걷어 해소한다. 캘린더는 솔리드 필·검은 밑줄을 걷고 글래스 톤으로 재설계한다: 선택 = 반투명 글래스 틴트 + 얇은 브랜드 링, 오늘 = 얇은 브랜드 블루 링, 여행 기간 = 반투명 밴드(시작·끝 둥글게). 셀 종횡비를 낮춰 월 그리드를 콤팩트하게 만들고 하단 잉여 공간을 줄인다. 신규 캘린더 글래스 토큰은 `:root`에 정의(하드코딩 금지). 요일 색 코딩·팔레트·브랜드 이미지는 유지. 스키마 변경 없음. 시각은 실기기 검증 정본.

## Coverage Targets

- 글래스 카드 테두리 렌더링 버그 수정(overflow 클립 충돌 해소) [why: card-artifact]
- 캘린더 글래스 재설계(분리배경 제거·선택/오늘 링·기간 밴드) [why: cal-glass] [multi-step: 3]
- 캘린더 셀 사이즈 축소 + 하단 빈 영역 감소 [why: cal-size]
- 앱 셸 헤더 정리 — 대문에서 헤더 바 숨김(Hero 중복·공간 낭비 제거) [why: chrome-header]

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20+
**Primary Dependencies**: Next.js 16, React 19, Tailwind v4, shadcn/ui(vendored calendar/card), react-day-picker. 신규 의존성 없음.
**Storage**: N/A — 스키마 변경 없음.
**Testing**: Vitest + Testing Library (스타일 클래스·토큰 회귀 가드). 시각·대비·아티팩트는 실기기 정본.
**Target Platform**: 웹(단일 반응형)
**Performance Goals**: 캘린더는 표면 소수라 성능 영향 낮음.
**Constraints**: 색은 `globals.css :root` 정본. 요일 색 코딩·팔레트 유지. 부동 시간 모델 미변경.
**Scale/Scope**: card.tsx 1 + globals.css(토큰·.trip-cal) + CalendarView.tsx(주간 렌더러·월 modifier) + calendar.tsx(셀 종횡비·range 클래스).

## Constitution Check

- I AX-First ✅ / II Minimum Cost ✅(신규 의존성 0) / III Mobile-First ✅ / IV Incremental ✅(US1 카드버그·US2 글래스·US3 사이즈 독립) / V Cross-Domain ✅ / VI RBAC ✅ / VII Calendar Time Model ✅(표시 톤만, 시간 로직·부동시간 불변).

위반 없음.

## Project Structure

```text
specs/067-glass-calendar-redesign/ … plan/spec/tasks/quickstart/data-model/checklists
src/
├── components/ui/card.tsx        # 글래스 카드 overflow 클립 제거(아티팩트 수정)
├── app/globals.css               # 캘린더 글래스 토큰(:root) + .trip-cal 재설계(월 뷰)
├── components/trip/CalendarView.tsx # 주간 렌더러 + 월 range modifier 글래스화
└── components/ui/calendar.tsx     # 셀 종횡비 축소 + range data-클래스
tests/components/glass-calendar.test.tsx
```

**Structure Decision**: 기존 구조 유지. 캘린더 표시 계층 + 글래스 카드 원시 컴포넌트에 국한.

## Design Decisions

- **카드 아티팩트**: 글래스 카드에서 `overflow-hidden`을 제거한다(비글래스는 유지). Chrome이 필터 전에 overflow를 잘라 생기던 모서리·세로 엣지 아티팩트를 근본 제거. `border-radius`는 backdrop-filter를 overflow 없이도 클립하므로 유리 라운딩은 유지된다. 카드 내부 이미지는 자체 `rounded-*`로 라운딩.
- **신규 토큰(`:root`)**: `--cal-range-band`(반투명 브랜드 틴트), `--cal-selected-glass`(선택 프로스트 틴트), `--cal-ring`(브랜드 블루 링). 기존 `--cal-*`는 텍스트 색 코딩용으로 유지.
- **선택/오늘/기간**: `.trip-cal`(월, react-day-picker)과 CalendarView 주간 렌더러 양쪽에 동일 규칙 적용. 선택=틴트+링, 오늘=링, 기간=밴드(주 첫/끝·기간 시작/끝 둥글게). `after:bg-primary` 밑줄 제거.
- **사이즈**: calendar.tsx 셀 `aspect-square` → 낮은 종횡비(가로>세로)로 교체해 세로 축소.
- **우선순위**: 선택 > 오늘 > 기간(겹칠 때).

## Out of Scope
- 다크 모드, 캘린더 시간/부동시간 로직, 요일 색 코딩 변경.

## Complexity Tracking
위반 없음.
