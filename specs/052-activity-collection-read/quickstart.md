---
description: "Quickstart & Evidence for spec 052 — 활동 컬렉션 읽기 REST 표현 정비"
---

# Quickstart: 활동 컬렉션 읽기 REST 표현 정비

## US1 — 트립의 활동을 식별자와 함께 읽기

### Evidence

- 자동 테스트: 트립 GET을 `?include=activities`로 호출하면 days[].activities[]에 각 활동의
  식별자와 필드(분류·제목·시작/종료 시각·시작/종료 시간대·장소·메모·비용/통화·예약상태·정렬순서)가
  표현으로 반환됨을 단위/통합 검증. 미지정 시 기존 `_count.activities`(개수)만 반환됨을 함께 검증.
- 수동 체크리스트:
  - [ ] `GET /api/trips/{id}?include=activities` → 활동 배열·식별자 포함
  - [ ] `GET /api/trips/{id}` (미지정) → 개수만(하위호환)
  - [ ] 반환된 식별자로 활동 수정/삭제 호출이 가능

## US2 — 활동 읽기를 API 문서에서 발견

### Evidence

- 자동 테스트: 정적 — OpenAPI 정의에 일자 단건 GET 응답(activities 배열)과 트립 `include`
  파라미터·확장 응답 스키마/예시가 존재함을 확인(문서 객체 단위 검증).
- 수동 체크리스트:
  - [ ] /docs 에서 일자 단건 GET 응답 스키마(activities) 노출 확인
  - [ ] /docs 에서 트립 GET `include` 파라미터·확장 응답 예시 노출 확인

## 공통 — 엣지 & 회귀

### Evidence

- 자동 테스트: 빈 일자 → 빈 목록(오류 아님), 비멤버 → 거부, 없는 trip/day → not-found.
  `npx vitest run` 전체 통과, `npx eslint .` 0 errors, `tsc --noEmit`, 커버리지 100%.
- 수동 체크리스트:
  - [ ] 기존 트립 GET 소비처(웹앱) 동작 불변(기본 응답 형태 유지)
