---
description: "Plan for spec 048 — 활동 상세·편집 UX 정비"
---

# Plan: 활동 상세·편집 UX 정비

## Coverage Targets

- 카드 탭 → 상세(읽기전용) → 편집 2단계 인터랙션 [why: detail-2step] [multi-step: 2]
- 활동 폼 레이아웃 정비(비용·통화·예약 위로 + 메모 최소 높이 + 장소 라벨/도움말) [why: form-layout]
- 상세·카드 링크 팝업 표시 [why: link-popup]

## Technical Context

- 프런트: Next.js 16, React 19, Tailwind v4, shadcn/ui.
- `ActivityList`는 `editingId`로 카드↔편집 폼을 전환한다. **`viewingId`(상세) 상태를
  추가**해 카드 탭 → 상세 → 편집의 3상태(카드/상세/편집)로 만든다. 우선순위
  editing > viewing > card.
- `ActivityForm`에 **`readOnly` 모드**를 추가한다. readOnly면 입력을 비활성화하고
  메모를 텍스트(링크 인식)로 렌더하며, 푸터를 "편집"(→편집 전환)·"닫기"로 바꾼다.
  편집·상세가 같은 레이아웃을 공유한다.
- 레이아웃 정비: 입력 순서를 유형/제목 → 시작/종료 → 장소 → **비용·통화·예약** →
  메모로 바꾼다(비용 grid 를 메모 위로). 메모 `rows` 를 늘려 최소 높이 확보. 장소
  입력에 `Label`("장소")+도움말(지도·캘린더 위치 연동) 부여.
- `ActivityCard` 본문 탭을 `onEdit`(편집 직행) → `onView`(상세)로 바꾼다. 푸터의
  "편집" 버튼은 그대로 편집 진입.
- 링크 팝업: `Linkify` 를 공용 모듈로 추출하고 링크 클릭을 `window.open(...,
  "popup")` + `preventDefault`/`stopPropagation`(상위 카드 탭 비전파)으로 바꾼다.
  카드·상세 메모 모두 같은 `Linkify` 를 쓴다.
- **데이터 스키마 변경 없음.**

## Risks

- readOnly 모드와 편집 모드가 한 컴포넌트를 공유하므로 입력 비활성/활성 분기 회귀 주의.
- 팝업은 브라우저 차단 정책 의존 — 차단 시 동작은 운영 환경 확인.
