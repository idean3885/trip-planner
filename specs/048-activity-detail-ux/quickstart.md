---
description: "Quickstart & Evidence for spec 048 — 활동 상세·편집 UX 정비"
---

# Quickstart: 활동 상세·편집 UX 정비

## US1 — 카드 탭 → 상세 → 편집 2단계

### Evidence

- 자동 테스트: 카드 탭 시 읽기 전용 상세(입력 disabled) 렌더, "편집" 클릭 시 입력
  활성화, "닫기" 시 카드 복귀 검증.
- 수동 체크리스트:
  - [ ] 카드 탭 → 상세(읽기 전용)
  - [ ] 편집 버튼 → 입력 활성
  - [ ] 닫기 → 카드 복귀
- 스크린샷: 후속

## US2 — 폼 레이아웃 정비

### Evidence

- 자동 테스트: 정적 — 비용·통화·예약 grid 가 메모 textarea 앞에 위치, 메모 rows 상향,
  장소 Label 존재 확인.
- 수동 체크리스트:
  - [ ] 비용·통화·예약이 메모 위
  - [ ] 메모 최소 높이 확보
  - [ ] 장소 라벨/도움말
- 스크린샷: 후속

## US3 — 상세 내 링크 팝업

### Evidence

- 자동 테스트: Linkify 가 a[target=_blank] 대신 window.open 호출 + 클릭 전파 차단
  (stopPropagation) 검증.
- 수동 체크리스트:
  - [ ] 링크 클릭 → 팝업
  - [ ] 카드 탭으로 전파 안 됨
- 스크린샷: 후속

## 공통 — 회귀

### Evidence

- 자동 테스트: `npx vitest run` 전체 통과, `npx eslint .` 0 errors, `tsc --noEmit`.
- 수동 체크리스트:
  - [ ] 기존 활동 추가·수정·삭제·정렬 동작 불변
