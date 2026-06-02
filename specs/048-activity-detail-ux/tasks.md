---
description: "Task list for spec 048 — 활동 상세·편집 UX 정비"
---

# Tasks: 활동 상세·편집 UX 정비

**Input**: Design documents from `/specs/048-activity-detail-ux/`
**Prerequisites**: plan.md, spec.md, quickstart.md

## Phase 1: US1 — 카드 탭 → 상세 → 편집 2단계 (Priority: P1)

- [x] T001 [US1] ActivityList 에 상세(viewingId) 상태 추가 — 카드/상세/편집 3상태 전환(editing>viewing>card) [artifact: src/components/ActivityList.tsx] [why: detail-2step]
- [x] T002 [US1] ActivityCard 본문 탭을 상세(onView)로 — 편집 직행 제거, 푸터 편집 버튼 유지 [artifact: src/components/ActivityCard.tsx] [why: detail-2step]
- [x] T003 [US1] ActivityForm readOnly 상세 모드 — 입력 비활성 + 메모 텍스트(링크) + 푸터 편집/닫기 [artifact: src/components/ActivityForm.tsx] [why: detail-2step]

## Phase 2: US2 — 폼 레이아웃 정비 (Priority: P1)

- [x] T004 [US2] ActivityForm 레이아웃 — 비용·통화·예약을 메모 위로, 메모 최소 높이, 장소 라벨/도움말 [artifact: src/components/ActivityForm.tsx] [why: form-layout]

## Phase 3: US3 — 상세 내 링크 팝업 (Priority: P2)

- [x] T005 [US3] Linkify 공용 추출 + 링크 클릭 window.open 팝업(상위 탭 비전파) [artifact: src/components/Linkify.tsx] [why: link-popup]

## Phase 4: 검증 & 릴리즈

- [x] T006 [US1] 2단계 인터랙션 단위테스트(탭→상세 읽기전용, 편집 버튼→활성) [artifact: tests/components/activity-detail-2step.test.tsx] [why: detail-2step]
- [ ] T007 towncrier 단편 작성(changes/712.feat·713.fix·714.feat) [artifact: changes/712.feat.md] [why: form-layout]

## Dependencies

- T001 → T002 → T003 (상태 → 카드 진입 → 상세 폼)
- T004 는 T003 과 같은 파일(레이아웃은 상세·편집 공통)
- T005 독립(Linkify 추출 후 카드·상세에서 사용)
- T006 마지막, T007 미체크 유지(release 소비)

## Notes

- T007 미체크 유지(towncrier 단편 — release build 소비, drift 오탐 방지).
- 장소/메모는 통합하지 않고 유지(장소가 캘린더·지도 연동에 실제 쓰임 — spec 결론).
