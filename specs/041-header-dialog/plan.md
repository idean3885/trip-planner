# Implementation Plan: 여행 상세 헤더·일정변경·동행자/동기화 다이얼로그

**Branch**: `041-header-dialog` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/041-header-dialog/spec.md`

## Summary

여행 상세 헤더(page.tsx)와 부가 다이얼로그(TripDetailLayout·TripDetailExtras·InviteButton·MemberList)를 재편한다.
- 헤더를 `여행 목록 > 제목` 브레드크럼 한 줄로 압축.
- AddDayButton의 날짜 입력 min/max 제한을 제거하고 "일정 변경"으로 리네임 — 과거·미래 자유 추가로 기간 파생 확장(도메인 변경 없음).
- InviteButton(호스트/게스트 2버튼)을 단일 "동행자 초대" 다이얼로그로 — 멤버 목록 + 호스트/게스트 설명 + 역할별 링크 복사.
- "자세히" → "캘린더 동기화" 다이얼로그(동기화 전용, 중첩 평탄화). TripDetailExtras에서 멤버 분리.
- 모바일에서 두 다이얼로그를 풀시트로(데스크탑 중앙 다이얼로그 유지).
- 캘린더 동기화 버튼 우측 끝 정렬. 동행자 glossary 등재.

## Coverage Targets

- 헤더 브레드크럼 압축 + 일정 변경(날짜 min/max 제거·리네임) [why: header-schedule] [multi-step: 2]
- 동행자 단일 초대 다이얼로그(목록+설명+링크 복사) [why: invite-dialog] [multi-step: 2]
- 캘린더 동기화 다이얼로그 분리(라벨·동기화 전용·중첩 평탄화·우측 정렬) [why: sync-dialog] [multi-step: 2]
- 모바일 풀시트(두 다이얼로그 반응형 셸) [why: mobile-sheet]
- 동행자 glossary 등재 [why: glossary]

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16, React 19)  
**Primary Dependencies**: shadcn Dialog(vendored), Sonner(토스트), Prisma. 모바일 시트는 기존 Dialog 반응형 분기(신규 Drawer 의존성은 spec 042 정비와 조율 — 본 피처는 Dialog className 분기 우선)  
**Storage**: 변경 없음 (기간은 Day 파생, 명목 컬럼 없음 — spec 029)  
**Testing**: Vitest. 헤더·다이얼로그 구성 정적/렌더 검증 + 실기기(시트)  
**Project Type**: Web application  
**Constraints**: 권한(게스트 편집 불가)·초대 토큰·동기화 동작 불변. 색상 가드(spec 038) 준수. os=linux 실물 확인 불가(시트)  
**Scale/Scope**: page.tsx + 4~5개 컴포넌트 + glossary 문서

## Constitution Check

- II 무료 / III Mobile-First(시트 개선) / IV 동작 불변 / V 도메인 / VI 권한(게스트 가드 유지) / VII 시간: 부합. ✅ 위반 없음.

## Project Structure

```text
src/app/trips/[id]/page.tsx              # 브레드크럼 헤더, 일정 변경 배치, 동행자 초대/캘린더 동기화 버튼 우측 정렬
src/components/AddDayButton.tsx          # min/max 제거, "일정 변경" 리네임
src/components/InviteButton.tsx          # 단일 동행자 초대 다이얼로그(목록+설명+링크)
src/components/trip/TripDetailExtras.tsx # 멤버 분리 → 동기화 전용(평탄화) 또는 제거
src/components/trip/TripDetailLayout.tsx # 모바일 "자세히"→"캘린더 동기화", 동행자 다이얼로그 배선, 풀시트
src/components/ui/dialog.tsx             # 모바일 풀시트 className 분기(필요분)
docs/glossary.md                         # 동행자 등재
tests/**                                 # 구성·정적 검증 갱신/추가
```

**Structure Decision**: 신규 의존성 최소. 모바일 풀시트는 Dialog className 반응형 분기로 우선 구현(Drawer 도입은 spec 042 정비에서 검토). 기간 모델 변경 없음.

## Complexity Tracking

> 위반 없음 — 작성 불필요.
