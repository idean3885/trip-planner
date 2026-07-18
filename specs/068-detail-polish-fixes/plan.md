# Implementation Plan: 여행 상세 마감 배치

**Branch**: `068-detail-polish-fixes` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

## Summary
여행 상세 dev 검증 피드백 배치. (1) 브레드크럼 '여행 목록' href `/`→`/trips`. (2) 카드 테두리를 `ring`(바깥 box-shadow, overflow-hidden 조상에 잘림)에서 `border`(박스모델)로 교체 — 좌/우/상단 클립 근본 해소. `.glass-surface`/`.glass-overlay`의 `border-color` 강제 제거로 border 유틸이 적용되게 함. (3) 캘린더 래퍼를 흰 글래스 박스에서 투명+`backdrop-blur`로 바꿔 캔버스 블렌딩(sticky 마스킹 유지, 상단 섹션과 통일). (4) 셀 종횡비 추가 축소. (5) 일정 표시 연결 바→점(dot). (6) 여행 기간 밴드 시작·끝만 라운딩, 가운데 연속. 색은 `:root` 토큰. 스키마 변경 없음. 시각은 실기기 정본.

## Coverage Targets
- 브레드크럼 '여행 목록' 링크 `/trips` 수정 [why: breadcrumb-fix]
- 카드 테두리 ring→border 근본 수정 + glass-surface border-color 제거 [why: card-border] [multi-step: 2]
- 캘린더 래퍼 투명+blur 블렌딩 + 셀 종횡비 축소 [why: calendar-blend] [multi-step: 2]
- 일정 표시 dot + 여행 기간 밴드 끝만 라운딩 [why: activity-dot] [multi-step: 2]

## Technical Context
**Language**: TS 5.x, Node 20+. **Deps**: Next 16, React 19, Tailwind v4, shadcn/ui(vendored), react-day-picker. 신규 없음.
**Storage**: N/A. **Testing**: Vitest(소스 레벨 회귀). 시각은 실기기. **Platform**: 웹 단일 반응형.
**Constraints**: 색은 `globals.css :root` 정본(하드코딩 금지). 부동 시간 모델 불변.

## Constitution Check
I~VII 위반 없음(표시·라우팅 수준, 시간 로직·권한·스키마 불변).

## Project Structure
```text
src/app/trips/[id]/page.tsx          # 브레드크럼 href
src/components/ui/card.tsx            # ring→border
src/app/globals.css                  # glass-surface border-color 제거 + 기간 밴드 라운딩 규칙
src/components/trip/TripDetailLayout.tsx # 캘린더 래퍼 투명+blur
src/components/ui/calendar.tsx        # 셀 종횡비 축소
src/components/trip/CalendarView.tsx  # 활동 표시 dot + 기간 밴드
src/components/SiteHeader.tsx, src/components/Footer.tsx # ring→border 정합
tests/components/detail-polish.test.tsx
```
**Structure Decision**: 표시 계층 국한.

## Design Decisions
- **테두리**: 전 카드 `ring-1 ring-foreground/15`→`border border-foreground/10`. `.glass-surface`/`.glass-overlay`에서 `border-color` 제거(유틸 우선). 헤더·푸터도 border로 정합. 오버레이(다이얼로그 등)는 body portal 이라 클립 없음 — ring 유지 가능하나 일관성 위해 border 로 통일 검토.
- **캘린더 래퍼**: `glass-surface ring shadow` 제거 → `backdrop-blur-md`(투명 bg)로 블렌딩. sticky 유지, 뒤 콘텐츠 블러 마스킹.
- **일정 dot**: `after:` 가로 바 → 중앙 정렬 `size-1 rounded-full` 점. 주간·월·SingleTrip 세 경로 일괄.
- **기간 밴드**: `.cal-range` 배경 유지하되 라운딩을 주 행의 첫/끝 칸에만(가운데 연속). 셀 간 gap 0 전제로 이음새 제거.

## Out of Scope
대문 개선(별도), 다크 모드.

## Complexity Tracking
없음.
