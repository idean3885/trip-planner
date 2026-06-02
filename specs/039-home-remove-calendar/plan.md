# Implementation Plan: 로그인 후 홈 캘린더 제거

**Branch**: `039-home-remove-calendar` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/039-home-remove-calendar/spec.md`

## Summary

`src/app/trips/page.tsx`에서 통합 월 캘린더(`TripsCalendar`)와 그 전용 데이터 조회(allDays·datesByTripId·calendarTrips)를 제거하고, 2분할 grid를 단일 컬럼 카드 목록으로 바꾼다. 홈 전용이던 `TripsCalendar` 컴포넌트는 dead code로 삭제한다. spec 031 2분할을 검증하던 테스트(list-grid.test.ts)는 단일 컬럼·캘린더 부재로 갱신한다.

## Coverage Targets

- 홈 캘린더 제거 + 1열 세로 목록 전환 (page.tsx의 TripsCalendar·캘린더 데이터 제거, grid 단순화) [why: home-remove-cal] [multi-step: 2]
- dead 컴포넌트·테스트 정리 (TripsCalendar.tsx 삭제, list-grid.test.ts 갱신) [why: dead-cleanup] [multi-step: 2]

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16, React 19)  
**Primary Dependencies**: Next.js App Router, Prisma (목록 조회). 신규 의존성 없음  
**Storage**: Neon Postgres (조회만, 스키마 변경 없음)  
**Testing**: Vitest (list-grid.test.ts 갱신)  
**Project Type**: Web application  
**Constraints**: 카드 목록 내용·기간·역할 표기 유지. 캘린더만 제거  
**Scale/Scope**: 1개 페이지 + 1개 컴포넌트 삭제 + 1개 테스트 갱신

## Constitution Check

- II. Minimum Cost / III. Mobile-First / IV. Incremental / V. Cross-Domain / VI. RBAC / VII. Time: 영향 없음 (조회 전용 UI 축소). ✅ 위반 없음.

## Project Structure

```text
src/app/trips/page.tsx               # TripsCalendar·캘린더 데이터 제거, 단일 컬럼 목록
src/components/trip/TripsCalendar.tsx # 삭제 (홈 전용 dead code)
tests/app/trips/list-grid.test.ts    # 캘린더 2분할 검증 → 단일 컬럼·캘린더 부재 검증으로 갱신
```

**Structure Decision**: 신규 파일 없음. 페이지 1개 수정 + 컴포넌트 1개 삭제 + 테스트 1개 갱신.

## Complexity Tracking

> 위반 없음 — 작성 불필요.
