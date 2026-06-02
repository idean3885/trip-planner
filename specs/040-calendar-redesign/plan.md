# Implementation Plan: 여행 상세 캘린더 재설계

**Branch**: `040-calendar-redesign` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/040-calendar-redesign/spec.md`

## Summary

여행 상세 캘린더(CalendarView·ui/calendar·TripDetailLayout·SwipeCarousel·DayActivitiesPane)를 재정비한다. 핵심:
- `ui/calendar`의 `day` 셀을 `flex-1`로 두고 desktopFull에서 `--cell-size` 상한을 풀어 가로 100%·세로 자동(정사각)으로 만든다(가로 grow).
- 셀 폭이 넓으면 일정명, 좁으면 도트로 표시한다(mobile 판별 재사용).
- 월↔주 전환에 데스크탑 스크롤 제스처 경로를 추가한다(기존 스와이프·버튼 유지).
- GSAP 스크롤 멈춤 트리거를 sticky.offsetTop → 뷰포트 높이(vh) 기준으로 바꾸고 되돌림을 없앤다.
- 일정 패널/캐러셀 슬라이드 높이를 선택일 분량에 맞춰 빈 스크롤을 없앤다.
- 일정 셀 렌더 일관화 + 월간 뷰 구분선·배경·막대를 디자인 토큰으로(색상 가드 통과).

## Coverage Targets

- 가로 grow 동적 캘린더 (ui/calendar day flex-1 + desktopFull cell-size 상한 해제, 세로 자동) [why: cal-grow] [multi-step: 2]
- 셀 일정 표현 일정명/도트 분기 (CalendarView 셀 렌더, mobile 판별 재사용) [why: cell-content] [multi-step: 2]
- 월↔주 전환 데스크탑 스크롤 경로 추가 (기존 스와이프·버튼 유지) [why: month-week]
- 경계 스크롤 멈춤 vh 트리거 교체 (GSAP snapTo, 되돌림 제거) [why: scroll-stop]
- 빈 일정 스크롤 제거 (패널·슬라이드 높이 선택일 분량 기준) [why: empty-scroll]
- 일정 셀 일관화 + 월간 토큰 정비 (셀 렌더 + 구분선·배경·막대 토큰화) [why: cell-token] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16, React 19)  
**Primary Dependencies**: react-day-picker 10, embla-carousel-react, @gsap/react·gsap(ScrollTrigger), Tailwind v4 토큰. 신규 의존성 없음(모바일 판별 훅은 spec 041/042와 공유 — 본 피처에서 필요시 최소 도입)  
**Storage**: 변경 없음 (UI 전용)  
**Testing**: Vitest. 시각/인터랙션은 정적·구성 검증 + 실기기(사후)  
**Project Type**: Web application  
**Constraints**: floating-time·일정 CRUD·윈도우 로딩 동작 불변. 색상 하드코딩 금지(spec 038 가드). os=linux 로컬 실물 확인 불가  
**Scale/Scope**: 5개 컴포넌트 파일 + 관련 테스트

## Constitution Check

- II 무료 / III Mobile-First(개선) / IV 기존 동작 불변 / V 도메인 / VI 권한 / VII 시간모델: 영향 없음 또는 부합. ✅ 위반 없음.
- spec 038 색상 가드 준수 — 월간 토큰화(FR-007)가 이를 직접 만족.

## Project Structure

```text
src/components/ui/calendar.tsx          # day 셀 flex-1, --cell-size 상한 해제(가로 grow), 토큰 정비
src/components/trip/CalendarView.tsx    # 셀 일정명/도트 분기, 데스크탑 스크롤 월↔주, 셀 일관화
src/components/trip/TripDetailLayout.tsx # GSAP vh 트리거, 데스크탑 월↔주 배선, 패널 높이
src/components/trip/SwipeCarousel.tsx   # 슬라이드 높이 선택일 분량(빈 스크롤 제거)
src/components/trip/DayActivitiesPane.tsx # 빈 상태 높이
tests/components/trip/*.test.tsx        # 구성·정적 검증 갱신/추가
```

**Structure Decision**: 신규 파일 없음. 5개 컴포넌트 수정. 모바일 판별은 기존 패턴(matchMedia·Tailwind 분기) 재사용, 신규 use-mobile 훅은 spec 042 정비에서 다룬다.

## Complexity Tracking

> 위반 없음 — 작성 불필요.
