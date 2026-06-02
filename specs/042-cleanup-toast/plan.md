# Implementation Plan: 토스트 인터랙션 보강 + 훅/라이브러리 정비

**Branch**: `042-cleanup-toast` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/042-cleanup-toast/spec.md`

## Summary

마일스톤 마무리 정비. (1) ActivityList의 일정 추가·수정·삭제 성공 토스트를 추가(Sonner, 기존 실패 토스트에 성공 보강). (2) 미사용 스와이프 컴포넌트 MobileSwipeShell과 그 전용 의존성 react-swipeable를 제거해 스와이프를 embla 단일로 모은다. (3) 커스텀 훅 현황 점검(커스텀 훅 디렉토리 없음 확인) 기록.

## Coverage Targets

- 일정 추가·수정·삭제 성공 토스트 보강 (ActivityList) [why: toast] [multi-step: 2]
- 미사용 스와이프 정리 (MobileSwipeShell + 테스트 + react-swipeable 의존성 제거) [why: swipe-cleanup] [multi-step: 2]
- 커스텀 훅 인벤토리 점검 기록 [why: hook-inventory]

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16, React 19)  
**Primary Dependencies**: Sonner(토스트, 기존), embla-carousel-react(스와이프 단일화 대상). react-swipeable 제거  
**Storage**: 변경 없음  
**Testing**: Vitest. 성공 토스트 호출 검증 + 제거 후 회귀  
**Project Type**: Web application  
**Constraints**: 기존 동작 불변. 색상 가드(spec 038) 준수  
**Scale/Scope**: ActivityList 1개 + MobileSwipeShell 제거 + package.json

## Constitution Check

- II 무료(의존성 1개 제거) / III / IV 동작 불변 / V / VI / VII: 부합. ✅ 위반 없음.

## Project Structure

```text
src/components/ActivityList.tsx              # 추가·수정·삭제 성공 토스트
src/components/trip/MobileSwipeShell.tsx     # 제거(미사용 dead code)
tests/components/trip/MobileSwipeShell.test.tsx # 제거
package.json                                  # react-swipeable 의존성 제거
specs/042-cleanup-toast/hook-inventory.md    # 훅 점검 기록
```

**Structure Decision**: 신규 파일은 점검 기록 1개. 스와이프는 embla(SwipeCarousel) 단일로. 커스텀 훅은 없음(점검 기록).

## Complexity Tracking

> 위반 없음 — 작성 불필요.
