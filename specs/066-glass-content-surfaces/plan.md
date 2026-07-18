# Implementation Plan: 글래스모피즘 확장 — 여행 상세 콘텐츠 + 카드 테두리 선명화

**Branch**: `066-glass-content-surfaces` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/066-glass-content-surfaces/spec.md`

## Summary

spec 065가 성능 우려로 불투명 유지했던 여행 상세 콘텐츠(활동 카드·주간 달력 래퍼)까지 글래스를 확장한다. `ActivityCard`에 기존 `Card`의 `glass` prop을 켜고, 여행 상세 주간 달력 래퍼(`TripDetailLayout` 모바일 sticky 래퍼)의 `bg-card`를 `.glass-surface`로 바꾼다. 값은 spec 065에서 만든 `:root` 글래스 토큰·유틸을 그대로 재사용한다. 더불어 카드 테두리(`ring-foreground/10`) 대비를 높여 세로 변에서 흐려 보이던 인상을 없앤다. 데이터 스키마 변경 없음. 스크롤 다수 카드 블러의 성능은 실기기 검증하고, 필요 시 `--glass-blur`를 낮춰 보정한다.

## Coverage Targets

- 여행 상세 콘텐츠 표면 글래스 확장 (활동 카드 + 주간 달력 래퍼) [why: glass-content] [multi-step: 2]
- 카드 테두리 네 변 선명화 (ring 대비 상향) [why: border-crisp]

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 16, React 19, Tailwind CSS v4, shadcn/ui(vendored Card). 신규 의존성 없음. spec 065 글래스 토큰·유틸 재사용.
**Storage**: N/A — 스키마·마이그레이션 변경 없음.
**Testing**: Vitest + Testing Library (글래스 클래스 부착·테두리 대비 회귀 가드). 스크롤 성능은 실기기 정본.
**Target Platform**: 웹(데스크탑·모바일 단일 반응형)
**Project Type**: Web application
**Performance Goals**: 활동 카드 블러가 스크롤 중 겹칠 때 프레임 저하 없을 것. 실기기 검증 후 필요 시 블러 반경 하향.
**Constraints**: 색은 `globals.css :root` 정본(하드코딩 금지). 기존 글래스 토큰·유틸 재사용. 톤·이미지 불변.
**Scale/Scope**: ActivityCard 1종 + 주간 달력 래퍼 1곳 + Card 테두리 토큰 1건.

## Constitution Check

- **I. AX-First**: 표면 시각 처리만. ✅
- **II. Minimum Cost**: 신규 의존성·토큰 0(기존 재사용). ✅
- **III. Mobile-First Delivery**: 단일 반응형. 성능은 실기기 검증 + 블러 하향 보정 경로 확보. ✅
- **IV. Incremental Release**: US1(콘텐츠 글래스)만으로 배포 가능. US2(테두리)는 증분. ✅
- **V. Cross-Domain Integrity**: 도메인 데이터 무관. ✅
- **VI. RBAC**: 권한 변경 없음. ✅
- **VII. Calendar Time Model**: 달력 시각 로직 미변경. 래퍼 표면만 반투명(셀 텍스트 가독성 유지). ✅

위반 없음.

## Project Structure

```text
specs/066-glass-content-surfaces/
├── plan.md · research 생략(065 결정 승계) · data-model.md · quickstart.md · tasks.md
└── checklists/requirements.md

src/
├── components/ActivityCard.tsx        # Card glass prop on
├── components/trip/TripDetailLayout.tsx # 모바일 주간 달력 래퍼 bg-card → glass-surface
└── components/ui/card.tsx             # ring 대비 상향(네 변 선명)

tests/components/glass-content.test.tsx # 글래스 클래스·테두리 대비 회귀
```

**Structure Decision**: 기존 구조 유지. 콘텐츠 표면 2곳 + Card 테두리 토큰만.

## Design Decisions

- **기존 토큰 재사용**: spec 065의 `--glass-bg`/`--glass-blur` 및 `.glass-surface` 유틸을 그대로 쓴다. 신규 토큰·유틸 없음.
- **ActivityCard**: `<Card size="sm">` → `<Card size="sm" glass>`. 컴포넌트 하나만 바꾸면 모든 활동 카드에 전파.
- **주간 달력 래퍼**: `TripDetailLayout` 모바일 sticky 래퍼의 `bg-card`를 `.glass-surface`로 교체. 달력 셀 자체(텍스트·선택 상태)는 그대로 — 래퍼 배경만 반투명.
- **테두리 선명화**: `card.tsx`의 `ring-foreground/10`을 `ring-foreground/15`로 높인다. 세로 변에서 대비가 약해 흐려 보이던 인상을 완화. 전 카드 공통.
- **성능 보정 경로**: 실기기에서 스크롤 저하가 확인되면 `--glass-blur`를 낮춘다(값 1곳 수정으로 전 표면 반영). 본 피처는 확장 + 검증 훅까지.

## Out of Scope

- 여행 목록(`/trips`) 카드, 랜딩 쇼케이스 카드(별도 판단).
- 달력 셀 내부 상태색·시간 모델.
- 다크 모드.

## Complexity Tracking

위반 없음.
