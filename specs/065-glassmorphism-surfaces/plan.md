# Implementation Plan: 글래스모피즘 표면 디자인 적용 (크롬+컨테이너)

**Branch**: `065-glassmorphism-surfaces` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/065-glassmorphism-surfaces/spec.md`

## Summary

기존 톤·팔레트·브랜드 이미지를 유지한 채, 크롬·오버레이·컨테이너 카드 표면을 글래스(반투명+`backdrop-filter` 블러+미세 테두리)로 전환한다. 글래스 값은 `globals.css :root`에 신규 토큰으로 정의하고, `.glass-surface`/`.glass-overlay` 두 유틸 클래스로만 적용한다. `body`에 `fixed`로 깔린 파스텔 캔버스가 표면 뒤로 배어 나온다. `Card`에는 글래스 opt-in prop을 추가해 단일 인스턴스 컨테이너 카드에만 켜고, 스크롤 목록의 콘텐츠 카드·캘린더 표면은 불투명을 유지한다. `@supports` 폴백으로 미지원 브라우저에서 불투명 배경을 제공한다. 데이터 스키마 변경 없음.

## Coverage Targets

- 글래스 토큰(`:root`) + `.glass-surface`/`.glass-overlay` 유틸 + `@supports` 폴백 신설 [why: glass-tokens] [multi-step: 2]
- 크롬 표면(헤더·푸터) 글래스 적용 [why: glass-chrome] [multi-step: 2]
- 오버레이(다이얼로그·드롭다운·셀렉트) 글래스 적용 [why: glass-overlay] [multi-step: 3]
- 컨테이너 카드 글래스 변형 신설 + 콜사이트 적용 [why: glass-container] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS v4(`@theme` CSS-first), shadcn/ui(vendored Card·Dialog·DropdownMenu·Select). 신규 의존성 없음.
**Storage**: N/A — 영속 데이터 스키마·마이그레이션 변경 없음. UI 표면 전용.
**Testing**: Vitest + Testing Library (글래스 클래스 부착·불투명 유지·토큰 존재 회귀 가드). 시각·성능·블러 체감은 실기기 정본.
**Target Platform**: 웹(데스크탑·모바일 단일 반응형)
**Project Type**: Web application (Next.js 풀스택 단일 런타임)
**Performance Goals**: 동시 렌더 블러 표면 수를 크롬·오버레이·소수 컨테이너로 억제. 스크롤 목록 콘텐츠 카드 불투명 유지로 블러 스택 회피.
**Constraints**: 색은 `src/app/globals.css`의 `:root` 정본(하드코딩 hex/rgba 금지, 색상 가드). 웹/모바일 단일 반응형. 톤·브랜드 이미지·문구 불변.
**Scale/Scope**: 토큰·유틸(globals.css) + 크롬 2종(layout 헤더·Footer) + 오버레이 3종(dialog·dropdown·select) + Card 변형 1종 + 컨테이너 콜사이트 소수.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. AX-First**: 표면 시각 처리만 바꾼다. AX 흐름(MCP·AI 계획)에 영향 없음. ✅
- **II. Minimum Cost**: 신규 의존성·인프라·비용 0. 기존 컴포넌트·토큰만 확장. ✅
- **III. Mobile-First Delivery**: 단일 반응형 유지, 뷰포트 분기 없음. 글래스 표면을 크롬·오버레이·소수 컨테이너로 한정해 모바일 스크롤 성능 보호. ✅
- **IV. Incremental Release**: US1(크롬·오버레이)만으로 독립 배포 가능한 MVP. US2(컨테이너 카드)는 증분. ✅
- **V. Cross-Domain Integrity**: 도메인 데이터 접근 없음. 표면 스타일 수준. ✅
- **VI. Role-Based Access Control**: 권한 매트릭스 변경 없음. ✅
- **VII. Calendar Time Model**: 캘린더 시각 표시 로직·시간 모델 미변경. 캘린더 셀 표면은 불투명 유지. ✅

위반 없음. Complexity Tracking 불필요.

## Project Structure

### Documentation (this feature)

```text
specs/065-glassmorphism-surfaces/
├── plan.md              # 본 파일
├── research.md          # Phase 0 산출
├── data-model.md        # Phase 1 산출 (스키마 무변경 명시)
├── quickstart.md        # Phase 1 산출 (Evidence)
├── checklists/
│   └── requirements.md  # spec 품질 체크리스트
└── tasks.md             # Phase 2 산출 (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── globals.css                    # 글래스 토큰(:root) + .glass-surface/.glass-overlay + @supports 폴백
│   └── layout.tsx                     # 헤더 글래스 바
├── components/
│   ├── Footer.tsx                     # 푸터 글래스
│   └── ui/
│       ├── card.tsx                   # glass opt-in prop 신설(기본 불투명)
│       ├── dialog.tsx                 # DialogContent → glass-overlay
│       ├── dropdown-menu.tsx          # DropdownMenuContent → glass-overlay
│       └── select.tsx                 # SelectContent → glass-overlay
└── components/ (컨테이너 카드 콜사이트 — glass prop 적용)
    ├── MemberList.tsx
    ├── trip/EmptyTripsGuide.tsx
    ├── calendar/CalendarProviderChoice.tsx
    └── calendar/AppleEntryCard.tsx

tests/
└── 글래스 클래스 부착·불투명 유지·토큰 존재 회귀 테스트
```

**Structure Decision**: 기존 Next.js App Router 단일 프로젝트 구조 유지. 표면 원시 컴포넌트(`ui/*`)·앱 셸(layout·Footer)·소수 컨테이너 콜사이트에 국한.

## Design Decisions

- **두 단계 불투명도**: 캔버스 위에 놓이는 표면(카드·헤더·푸터)은 `--glass-bg`(더 투명), 임의 콘텐츠 위에 뜨는 오버레이(다이얼로그·드롭다운·셀렉트)는 `--glass-overlay`(더 불투명)로 대비를 보존한다.
- **유틸 2종**: `.glass-surface`, `.glass-overlay`. 둘 다 `background-color`·`backdrop-filter: blur() saturate()`·`border-color`를 토큰 경유로 설정. `.trip-cal`과 동일하게 최상위 CSS로 작성(토큰 정본 유지).
- **Card는 opt-in**: `card.tsx`에 `glass` prop(기본 false) 추가. true일 때 `bg-card` 대신 `glass-surface`. 콘텐츠 카드(ActivityCard 등)는 prop을 켜지 않아 불투명 유지 → 스크롤 블러 스택 회피.
- **헤더 sticky 미승격**: 헤더는 표면 처리만 한다. sticky 승격은 여행 상세 모바일 주간 달력(`sticky top-0 z-20`, `TripDetailLayout.tsx`)과 offset 충돌 위험이 있어 본 피처 범위 밖. 헤더는 `body`의 fixed 캔버스를 블러하는 유리 바로 렌더한다.
- **캔버스 유지**: `body { background: var(--app-canvas) fixed }` 그대로. 글래스가 이 고정 그라데이션을 블러하므로 스크롤 위치와 무관하게 일정한 배경이 배어 나온다.

## Out of Scope

- 캘린더 셀·주간/월간 캘린더 래퍼 표면(성능·대비, 시간 모델 표면 안정성).
- 스크롤 목록 콘텐츠 카드(활동 카드·여행 목록 행·활동 리스트·랜딩 쇼케이스).
- 헤더 sticky 승격(별도 이슈 검토 — offset 재설계 필요).
- 다크 모드(라이트 전용 디자인 시스템 유지).

## Complexity Tracking

위반 없음 — 해당 없음.
