# Research: 일정 구조화

**Feature**: 006-structured-activity
**Date**: 2026-04-15

## R1: Activity 모델 설계 — 단일 테이블 vs 다형성

### Decision
단일 Activity 테이블 + category enum으로 처리한다.

### Rationale
- 숙소/이동/관광 등 필드가 대부분 동일(시간, 장소, 비용, 메모)
- 카테고리별 고유 필드(체크인/아웃, 편명 등)는 메모 또는 JSON metadata 필드로 수용
- 별도 테이블(Accommodation, Transport) 분리 시 JOIN 복잡도 증가, MCP 도구 수 폭증
- Prisma는 테이블 상속을 지원하지 않아 다형성 구현이 부자연스러움

### Alternatives considered
- **다중 테이블 (Accommodation, Transport, Sightseeing)**: 필드 정밀도 높지만 CRUD 도구가 카테고리별로 필요, 복잡도 과도
- **JSON 블롭 필드**: 유연하지만 쿼리/정렬 불가, 타입 안전성 없음

---

## R2: 카테고리 구현 — enum vs 별도 테이블

### Decision
Prisma enum (ActivityCategory)을 사용한다.

### Rationale
- 고정 목록(관광/식사/이동/숙소/쇼핑/기타) 6개
- 사용자 정의 카테고리는 Out of Scope (후속 버전)
- enum이 가장 단순하고 타입 안전

### Alternatives considered
- **Category 테이블**: 사용자 정의 필요 시 확장성 좋지만 현재 과잉
- **문자열 필드**: 유연하지만 오타/불일치 위험

---

## R3: 시간 필드 — DateTime vs Time-only

### Decision
startTime/endTime을 String ("HH:mm" 형식)으로 저장한다. nullable.

### Rationale
- 활동 시간은 "현지 시간"이며, 날짜는 이미 Day.date에 있음
- PostgreSQL의 TIME 타입은 Prisma에서 네이티브 지원이 제한적
- "10:00" 같은 문자열이 가장 직관적이고 타임존 혼동 없음
- 시간 미지정 활동(종일/자유)은 null로 처리

### Alternatives considered
- **DateTime**: 날짜 중복, 타임존 처리 복잡
- **Int (분 단위)**: 600 = 10:00 — 연산 편리하지만 표시 변환 필요

---

## R4: 마크다운 → Activity 변환 전략

### Decision
MCP 도구(convert_markdown_to_activities)로 AI 변환을 수행한다. 웹 UI에서 "구조화 변환" 버튼은 이 도구를 프롬프트하는 안내만 제공한다.

### Rationale
- 마크다운 파싱으로 시간/장소/카테고리를 정확히 추출하는 것은 비현실적
- Claude가 마크다운을 읽고 구조화 JSON으로 변환하는 것이 가장 정확
- 웹에서 직접 AI API를 호출하면 비용 발생 (헌법 II 위반)
- MCP 도구로 제공하면 사용자가 Claude Desktop에서 "3일차 마크다운을 활동으로 변환해줘"로 실행

### Alternatives considered
- **서버 사이드 AI 변환**: 웹 버튼 클릭 → 서버에서 Claude API 호출 → 비용 발생, 헌법 II 위반
- **정규식 파서**: 마크다운 형식이 비정형이라 신뢰성 낮음

---

## R5: 활동 순서 관리 — sortOrder vs 시간순 자동

### Decision
sortOrder(Int) 필드를 유지하되, 시간이 있으면 시간순 자동 정렬을 기본으로 한다.

### Rationale
- 대부분의 활동은 시간이 있으므로 시간순이 자연스러움
- 시간 미지정 활동은 sortOrder로 수동 위치 지정
- 드래그&드롭은 sortOrder를 업데이트하는 방식

### Alternatives considered
- **시간순 전용**: 시간 없는 활동의 순서를 지정할 수 없음
- **sortOrder 전용**: 시간이 있는데도 수동 정렬해야 함

---

## R6: 비용 필드 — 별도 컬럼 vs JSON

### Decision
cost(Decimal) + currency(String, 기본 EUR) 두 컬럼을 Activity에 추가한다.

### Rationale
- 비용 합산/필터가 가능해야 후속 예산 기능의 토대
- Decimal이 금액 표현에 적합 (부동소수점 오류 방지)
- 통화는 여행 단위로 대체로 동일하지만 활동 단위로 다를 수 있음 (면세점 등)

### Alternatives considered
- **JSON metadata에 포함**: 쿼리 불가, 합산 불가
- **별도 Budget 테이블**: 현재 스코프 초과
