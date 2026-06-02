---
description: "Quickstart & Evidence for spec 055 — Figma 디자인 토큰 전면 정합"
---

# Quickstart: Figma 디자인 토큰 전면 정합

## US1 — 색 전수 → 시스템 팔레트 통일

### Evidence

- 자동 테스트: `tokens-presence` 테스트가 디자인 등장 프리미티브 팔레트(white·gray 5단계·black·blue 2·green 3·pink)와 재매핑된 시맨틱 토큰의 존재·값을 검사.
- 수동 체크리스트:
  - [ ] 여행 상세·목록·설정 배경 #FFFFFF, 본문 텍스트 #121212
  - [ ] 테두리 #D9D9D9, muted 텍스트 #616161
  - [ ] 포커스 링 #17A1FA
  - [ ] 무채색(회색 oklch) 잔재 없음

## US2 — 캘린더 셀/헤더 상태색 재배선

### Evidence

- 자동 테스트: CalendarView 렌더에서 요일 헤더(토=파랑/일=초록/평일=그레이), 여행주말 날짜=초록, 선택 셀=연녹 배경, 오늘=테두리, 기간밖=그레이 클래스/토큰 적용을 검증.
- 수동 체크리스트:
  - [ ] 토요일 헤더 파랑, 일요일 헤더 초록, 평일 헤더 그레이
  - [ ] 여행기간 주말 날짜 초록 텍스트
  - [ ] 선택 날짜 연녹(#F0FFD7) 배경
  - [ ] 오늘 날짜 테두리 박스
  - [ ] 기간 밖 날짜 그레이

## US3 — 타이포·radius·동행 배너

### Evidence

- 자동 테스트: 폰트 변수(`--font-sans`/`--font-heading`)가 Inter로 연결됨을 확인, 동행 배너 색 토큰 적용 렌더 검증.
- 수동 체크리스트:
  - [ ] 헤딩·본문 Inter 적용
  - [ ] 카드·버튼 모서리 라운드(8px 기준)
  - [ ] 동행 배너 연녹 배경 + #2F2F2F 텍스트

## US4 — 토큰 하네스 정합

### Evidence

- 자동 테스트: `npm run tokens:build` 후 `:root`/`@theme` 산출물과 정본 일치, `audit-tokens` 불일치 0, `tokens-presence` 통과.
- 수동 체크리스트:
  - [ ] tokens.json `_allowlist` 설명이 색 정본 위치(:root)와 일치
  - [ ] audit-tokens 통과(정본↔산출물 0 불일치)

## 공통 — 회귀 & 검증

### Evidence

- 자동 테스트: 기존 기능(활동·동기화·예약 상태) 동작 불변. `npx vitest run` 전체 통과, `npx eslint .` 0 errors, `tsc --noEmit`, 커버리지 100%.
- 수동 체크리스트:
  - [ ] 라이트 전용 유지(다크 토글 없음)
  - [ ] 활동 카테고리 칩(이동/숙소) 색 불변
  - [ ] 실기기 — 캘린더 헤더·셀 색이 디자인과 일치
