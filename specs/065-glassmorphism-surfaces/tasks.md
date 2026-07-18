# Tasks: 글래스모피즘 표면 디자인 적용 (크롬+컨테이너)

**Feature**: `065-glassmorphism-surfaces` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description [artifact: ...] [why: ...]`

- **[P]**: 병렬 가능(다른 파일, 미완료 의존 없음)
- **[Story]**: US1~US2 (Setup·Foundational·Polish은 라벨 없음)
- 각 산출 태스크는 `[artifact:]`와 `[why:]`를 부착해 plan Coverage Targets와 매핑

## Phase 1: Setup

- [x] T001 대상 표면 파일 현황 점검 (`src/app/globals.css`, `src/app/layout.tsx`, `src/components/Footer.tsx`, `src/components/ui/{card,dialog,dropdown-menu,select}.tsx`, 컨테이너 카드 콜사이트)

## Phase 2: Foundational — 글래스 토큰·유틸

- [x] T002 글래스 토큰을 `globals.css :root`에 신설 — `--glass-bg`/`--glass-overlay`/`--glass-border`/`--glass-blur` + 폴백 `--glass-bg-fallback`/`--glass-overlay-fallback` (하드코딩 금지, 토큰 정본) [artifact: src/app/globals.css] [why: glass-tokens]
- [x] T003 `.glass-surface`/`.glass-overlay` 유틸 클래스 + `@supports not (backdrop-filter)` 폴백 블록 작성 (background·backdrop-filter blur+saturate·border 전부 토큰 경유) [artifact: src/app/globals.css] [why: glass-tokens]

## Phase 3: US1 — 크롬·오버레이 유리 표면 (P1)

**목표**: 헤더·푸터·다이얼로그·드롭다운·셀렉트 표면을 글래스로. **독립 테스트**: 각 표면이 글래스 유틸 클래스를 갖고 토큰이 `:root`에 존재.

- [x] T004 [US1] 헤더를 글래스 바로 전환 — `layout.tsx` 헤더에 `.glass-surface` + rounded·padding·ring 부여(sticky 미승격) [artifact: src/app/layout.tsx] [why: glass-chrome]
- [x] T005 [US1] 푸터 표면 글래스 — `Footer.tsx`에 `.glass-surface` 적용(기존 border-t 톤 유지) [artifact: src/components/Footer.tsx] [why: glass-chrome]
- [x] T006 [US1] `DialogContent` 배경을 `.glass-overlay`로 전환(기존 `bg-background` 대체) [artifact: src/components/ui/dialog.tsx] [why: glass-overlay]
- [x] T007 [US1] `DropdownMenuContent` 배경을 `.glass-overlay`로 전환(기존 `bg-popover` 대체) [artifact: src/components/ui/dropdown-menu.tsx] [why: glass-overlay]
- [x] T008 [US1] `SelectContent` 배경을 `.glass-overlay`로 전환(기존 `bg-popover` 대체) [artifact: src/components/ui/select.tsx] [why: glass-overlay]
- [x] T009 [P] [US1] 크롬·오버레이 글래스 회귀 테스트 — 헤더·푸터·Dialog·Dropdown·Select 표면의 글래스 클래스 부착 + globals.css 토큰 존재 검증 [artifact: tests/components/glass-surfaces.test.tsx] [why: glass-chrome]

## Phase 4: US2 — 컨테이너 카드 유리 패널 (P2)

**목표**: `Card` 글래스 opt-in 변형 + 단일 인스턴스 컨테이너 콜사이트 적용, 콘텐츠 카드 불투명 유지. **독립 테스트**: `glass` prop on/off 별 클래스 분기.

- [x] T010 [US2] `Card`에 `glass` opt-in prop 추가(기본 false=기존 `bg-card`, true=`.glass-surface`) [artifact: src/components/ui/card.tsx] [why: glass-container]
- [x] T011 [US2] 단일 인스턴스 컨테이너 카드에 `glass` 적용 — 멤버·빈 상태·캘린더 연동 패널 [artifact: src/components/MemberList.tsx|src/components/trip/EmptyTripsGuide.tsx|src/components/calendar/CalendarProviderChoice.tsx|src/components/calendar/AppleEntryCard.tsx] [why: glass-container]
- [x] T012 [P] [US2] Card 글래스 변형 테스트 — `glass` prop on→`glass-surface` 부착, off→불투명 `bg-card` 유지, 콘텐츠 카드(ActivityCard) 불투명 회귀 검증 [artifact: tests/components/glass-card.test.tsx] [why: glass-container]

## Phase 5: Polish & Cross-Cutting

- [x] T013 색상 가드 확인 — 글래스 값 전량 `:root` 토큰 경유, 하드코딩 색 0건 (lint/color-guard)
- [x] T014 quickstart Evidence 자동 테스트 전량 통과 확인 (`npx vitest run`) 및 회귀 없음
- [ ] T015 towncrier 단편 작성 (release 단계에서 소비되므로 미체크 유지) [artifact: changes/924.feat.md] [why: glass-tokens]

## Dependencies

- Setup(T001) → Foundational(T002·T003) → US1·US2.
- 토큰·유틸(T002·T003)이 모든 표면 적용의 선행.
- US1(크롬·오버레이)과 US2(컨테이너 카드)는 토큰 완료 후 독립 진행 가능.
- Polish(T013~T015)는 전 US 완료 후.

## Parallel Opportunities

- T009·T012 테스트는 각 구현 완료 후 병렬(다른 파일).
- US1의 오버레이 3종(T006·T007·T008)은 서로 다른 파일 — 병렬 가능.

## MVP Scope

US1(크롬·오버레이 글래스)만으로 앱 전반이 글래스 디자인으로 읽히는 최소 배포 단위. US2(컨테이너 카드)는 증분.
