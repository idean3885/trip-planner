---
description: "Task list for spec 041 — 여행 상세 헤더·일정변경·동행자/동기화 다이얼로그"
---

# Tasks: 여행 상세 헤더·일정변경·동행자/동기화 다이얼로그

**Input**: Design documents from `/specs/041-header-dialog/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US1 — 헤더 브레드크럼 + 일정 변경 (Priority: P1)

- [x] T001 [US1] 상세 페이지(`src/app/trips/[id]/page.tsx`) 헤더를 `여행 목록 > 제목` 브레드크럼 한 줄로 압축(큰 제목·별도 뒤로 링크 제거), 여백 축소 [artifact: src/app/trips::TripDetailPage] [why: header-schedule]
- [x] T002 [US1] AddDayButton 날짜 입력 min/max 제한 제거 + "일정 변경" 리네임, 날짜 표시 옆 배치 [artifact: src/components/AddDayButton.tsx] [why: header-schedule]

## Phase 2: US2 — 동행자 단일 초대 다이얼로그 (Priority: P1)

- [x] T003 [US2] InviteButton을 단일 "동행자 초대" 다이얼로그로 재작성(기능 설명 + 호스트/게스트 차이 + 역할별 링크 복사) [artifact: src/components/InviteButton.tsx] [why: invite-dialog]
- [x] T004 [US2] 동행자 다이얼로그에 멤버 목록 포함(MemberList 재사용) + 단일 초대 렌더 테스트 [artifact: tests/components/invite-dialog.test.tsx] [why: invite-dialog]

## Phase 3: US3 — 캘린더 동기화 다이얼로그 분리 (Priority: P2)

- [x] T005 [US3] TripDetailLayout "자세히"→"캘린더 동기화" 라벨 + 동기화 전용 다이얼로그(동행자 분리), 버튼 우측 정렬 [artifact: src/components/trip/TripDetailLayout.tsx] [why: sync-dialog]
- [ ] T006 [US3] TripDetailExtras 멤버 분리 → 동기화 전용 평탄화(또는 제거 후 직접 배치) [artifact: src/components/trip/TripDetailExtras.tsx] [why: sync-dialog]

## Phase 4: US4 — 모바일 풀시트 (Priority: P2)

- [x] T007 [US4] 동행자·캘린더 동기화 다이얼로그를 모바일 풀사이즈 시트로(데스크탑 중앙 유지) [artifact: src/components/ui/dialog.tsx] [why: mobile-sheet]

## Phase 5: US? — 용어

- [x] T008 동행자 용어 glossary 등재(호스트/게스트 상위어) [artifact: docs/glossary.md] [why: glossary]

## Phase 6: 검증 & 릴리즈

- [x] T009 전체 lint(색상 가드)·typecheck·vitest 통과 확인 [artifact: specs/041-header-dialog/quickstart.md] [why: sync-dialog]
- [ ] T010 towncrier 단편 작성 (changes/705.feat.md — What/이유, 합쇼체) [artifact: changes/705.feat.md] [why: header-schedule]

## Dependencies

- T003 → T004 (다이얼로그 후 테스트)
- T005·T006 같은 묶음(동기화 분리)
- T009 마지막, T010 미체크 유지(release 소비)
- T006 미체크(삭제 태스크) — TripDetailExtras를 제거(동기화 전용이 되어 syncCard 직접 사용). 산출물 부재가 정상이라 drift 오탐 방지로 미체크. 삭제는 실제 완료됨.

## Notes

- T010 미체크 유지(towncrier).
- 모바일 시트·다이얼로그 시각은 dev 반영 후 실기기 검증.
- 기간 모델 변경 없음 — "일정 변경"은 날짜 자유 추가(서버 기간 자동 확장).
