# Tasks: AX 기반 여행 플래닝 + 모바일 딜리버리

**Input**: Design documents from `/specs/001-ax-travel-planning/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/mcp-tools.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (프로젝트 초기화)

**Purpose**: 테스트 프레임워크 설정 및 프로젝트 구조 정비

- [ ] T001 `tests/` 디렉토리 구조 생성 — `tests/__init__.py`, `tests/unit/__init__.py`, `tests/integration/__init__.py` 생성
- [ ] T002 pytest 의존성 추가 — `mcp-servers/hotels_mcp_server/requirements.txt`에 `pytest`, `pytest-asyncio`, `pytest-httpx` 추가 및 설치
- [ ] T003 [P] pytest 설정 파일 생성 — `pyproject.toml` 또는 `pytest.ini`에 테스트 경로, asyncio 모드 설정
- [ ] T004 [P] 테스트용 API 응답 fixture 디렉토리 생성 — `tests/fixtures/` 하위에 `hotels_response.json`, `flights_response.json` 샘플 생성

**Checkpoint**: 프로젝트 구조 정비 완료, `pytest` 실행 가능

---

## Phase 2: Foundational (공통 인프라)

**Purpose**: MCP 서버 리팩토링 — API 요청 함수 테스트 가능하게 분리

**⚠️ CRITICAL**: US1 구현 전에 완료 필요

- [ ] T005 `make_rapidapi_request` 함수를 별도 모듈로 분리 — `mcp-servers/hotels_mcp_server/hotels_mcp/api_client.py` 생성. `hotels_server.py`에서 import하도록 변경. 기존 동작 유지.
- [ ] T006 API 클라이언트 단위 테스트 작성 — `tests/unit/test_api_client.py`에 정상 응답, 에러 응답, 타임아웃 케이스 테스트
- [ ] T007 기존 Hotels 도구 응답 파싱 단위 테스트 작성 — `tests/unit/test_hotels.py`에 `search_destinations`, `get_hotels`, `get_hotel_details` 응답 파싱·포맷팅 테스트. `tests/fixtures/hotels_response.json` 활용
- [ ] T008 [P] 기존 Flights 도구 응답 파싱 단위 테스트 작성 — `tests/unit/test_flights.py`에 `search_flight_destinations`, `search_flights` 응답 파싱·포맷팅 테스트. `tests/fixtures/flights_response.json` 활용

**Checkpoint**: `pytest tests/unit/ -v` 통과, 기존 MCP 도구 동작 유지

---

## Phase 3: User Story 1 — 여행 요소 검색·추천 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 여행 조건을 알려주면 AI가 숙소, 항공편, 관광지를 검색하고 후보를 추천 기준과 함께 제시한다

**Independent Test**: "마드리드 6/11~12 숙소 추천해줘" 또는 "바르셀로나 관광지 추천해줘"라고 요청하면 후보가 추천 기준과 함께 제시된다

### Attractions MCP 도구 구현

- [ ] T009 [US1] Attractions API 엔드포인트 검증 — `mcp-servers/hotels_mcp_server/hotels_mcp/hotels_server.py`에서 booking-com15 API의 `/api/v1/attraction/searchLocation` 엔드포인트를 실제 호출하여 응답 구조 확인. 실패 시 대안 엔드포인트 탐색. 검증 결과를 `specs/001-ax-travel-planning/contracts/mcp-tools.md`에 반영
- [ ] T010 [US1] `search_attraction_locations` MCP 도구 구현 — `mcp-servers/hotels_mcp_server/hotels_mcp/hotels_server.py`에 관광지 위치 검색 도구 추가. T009에서 확인된 엔드포인트·응답 구조 사용
- [ ] T011 [US1] `search_attractions` MCP 도구 구현 — `mcp-servers/hotels_mcp_server/hotels_mcp/hotels_server.py`에 관광지 목록 검색 도구 추가. 이름, 가격, 소요시간, 리뷰, 예약필요여부 포맷팅
- [ ] T012 [US1] `get_attraction_details` MCP 도구 구현 — `mcp-servers/hotels_mcp_server/hotels_mcp/hotels_server.py`에 관광지 상세 조회 도구 추가. 설명, 포함사항, 취소정책 등 포맷팅
- [ ] T013 [US1] Attractions 도구 단위 테스트 작성 — `tests/unit/test_attractions.py`에 3개 도구의 응답 파싱·포맷팅 테스트. `tests/fixtures/attractions_response.json` 생성·활용
- [ ] T014 [US1] Attractions 도구 통합 테스트 — `tests/integration/test_attractions_api.py`에 실제 API 호출 테스트 (바르셀로나 관광지 검색). `@pytest.mark.integration` 마킹

### Claude Desktop 검증

- [ ] T015 [US1] Claude Desktop에서 US1 E2E 검증 — quickstart.md QS1 시나리오 수행. 숙소 검색 + 관광지 검색 + 식당 추천(웹 검색) 각각 테스트. 결과 스크린샷 또는 로그 기록

**Checkpoint**: US1 독립 검증 완료. MCP 도구(Hotels + Flights + Attractions) + Claude 웹 검색(식당, 교통)으로 모든 여행 요소 검색·추천 가능

---

## Phase 4: User Story 2 — 일정 생성 (Priority: P1)

**Goal**: 확정된 여행 요소를 기반으로 일별 일정과 전체 요약을 마크다운으로 생성한다

**Independent Test**: 확정된 여행 정보를 전달하면 일별 일정과 전체 요약이 CLAUDE.md 포맷대로 생성된다

### 일정 생성 인프라

- [ ] T016 [US2] 여행 디렉토리 템플릿 생성 — `templates/trip-template/` 하위에 빈 템플릿 파일 생성: `overview.md`, `itinerary.md`, `accommodations.md`, `transport.md`, `budget.md`, `payments.md`, `reservations.md`, `packing.md`, `shopping.md`, `tips.md`. CLAUDE.md 데일리 파일 포맷 7개 섹션을 `daily/template.md`에 정의
- [ ] T017 [US2] CLAUDE.md 데일리 파일 포맷 정합성 검증 스크립트 — `scripts/validate-daily.py` 생성. daily 파일이 7개 필수 섹션(오늘의 요약, 숙소, 이동, 일정, 투어/관광 상세, 식사 추천, 메모)을 포함하는지 검증. 예약 상태 표기(🔴🟡🟢⚪✅)가 올바른지 검증
- [ ] T018 [P] [US2] 예산 추적 포맷 검증 — `scripts/validate-budget.py` 생성. `budget.md`의 날짜별 실지출 기록 포맷과 결제수단 구분(트레블월렛/현금/카드)이 올바른지 검증

### E2E 일정 생성 검증

- [ ] T019 [US2] 실제 여행 데이터로 1일차 일정 생성 테스트 — Claude Desktop에서 "6/7 리스본 도착일 일정 만들어줘"를 수행. `trips/2026-honeymoon-portugal-spain/daily/day01-0607-lisbon.md` 생성 확인. CLAUDE.md 포맷 준수 여부를 `scripts/validate-daily.py`로 자동 검증
- [ ] T020 [US2] 기존 예약 데이터 유지 검증 — 예약 완료 숙소 데이터가 있는 상태에서 일정 생성 요청. 기존 `✅ 예약 완료` 항목이 유지되고 미확정 부분만 새로 채워지는지 확인
- [ ] T021 [US2] 전체 일정 요약(`itinerary.md`) 생성 검증 — Claude Desktop에서 전체 요약 생성 요청. 여행 루트·기간·숙소 한눈에 보기, 일별 목차(daily 파일 링크) 포함 확인

**Checkpoint**: US2 독립 검증 완료. 일별 일정 + 전체 요약이 CLAUDE.md 포맷대로 생성되고, 기존 예약 데이터가 유지됨

---

## Phase 5: User Story 3 — 일정 공유 (Priority: P1)

**Goal**: 생성된 일정을 GitHub Pages를 통해 동행자에게 모바일로 공유한다

**Independent Test**: 공유된 URL을 모바일 브라우저에서 열면 추가 조작 없이 열람 가능하다

### GitHub Pages 설정

- [ ] T022 [US3] `_config.yml` 생성 — 레포 루트에 Jekyll 설정 파일 생성. `theme: minima`, `baseurl: "/travel-planner"`, `title: "Travel Planner"`, `include: [trips]`
- [ ] T023 [US3] GitHub Pages 활성화 — GitHub 레포 Settings > Pages에서 소스를 main 브랜치로 설정. 배포 확인
- [ ] T024 [US3] trips 디렉토리 Jekyll 호환 확인 — 마크다운 파일이 GitHub Pages에서 정상 렌더링되는지 확인. 필요 시 front matter(`---\nlayout: default\n---`) 추가

### 모바일 최적화

- [ ] T025 [US3] 모바일 반응형 검증 — 생성된 일정을 모바일 브라우저(iOS Safari, Android Chrome)에서 열어 확인. 줌/가로스크롤 없이 열람 가능한지 테스트. 문제 발견 시 마크다운 포맷 조정 (테이블→리스트 등)
- [ ] T026 [US3] 일정 수정 후 반영 검증 — 일정 수정 → `git push` → GitHub Pages 재배포 → 모바일에서 새로고침하여 최신 일정 확인

**Checkpoint**: US3 독립 검증 완료. 동행자가 모바일에서 URL로 일정 열람 가능, 수정 시 반영 확인

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 전체 통합 검증 및 정리

- [ ] T027 [P] `.gitignore` 점검 — `.env`, `.venv/`, `__pycache__/`, `.pytest_cache/` 등이 포함되어 있는지 확인. 시크릿 노출 방지
- [ ] T028 [P] MCP 서버 `requirements.txt` 최종 정리 — 실제 사용 패키지만 포함, 버전 고정
- [ ] T029 전체 플래닝 사이클 E2E 검증 (SC-005) — 실제 여행 데이터(포르투갈&스페인 6/7~6/21, 15일, 5개 도시)로 US1→US2→US3 전체 사이클 수행. 검색→추천→확정→일정생성→공유까지 완료
- [ ] T030 quickstart.md 시나리오 전수 검증 — quickstart.md의 QS1~QS4 + Edge Case 시나리오 전체 수행. 실패 항목 수정

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — 즉시 시작 가능
- **Foundational (Phase 2)**: Phase 1 완료 후 시작 — 모든 US를 BLOCK
- **US1 (Phase 3)**: Phase 2 완료 후 시작 — Attractions 도구 구현이 핵심
- **US2 (Phase 4)**: Phase 2 완료 후 시작 — US1과 병렬 가능하나, US1의 검색 결과를 일정에 반영하므로 US1 이후 권장
- **US3 (Phase 5)**: Phase 4 완료 후 시작 — 공유할 일정이 있어야 함
- **Polish (Phase 6)**: Phase 3~5 완료 후 시작

### 권장 실행 순서

```
Phase 1 (Setup)
  → Phase 2 (Foundational)
    → Phase 3 (US1: 검색·추천)
      → Phase 4 (US2: 일정 생성)
        → Phase 5 (US3: 일정 공유)
          → Phase 6 (Polish)
```

### Within Each User Story

- T009(API 검증) → T010~T012(도구 구현) → T013~T014(테스트) → T015(E2E)
- T016~T018(인프라) → T019~T021(E2E 검증)
- T022~T024(Pages 설정) → T025~T026(모바일 검증)

### Parallel Opportunities

```bash
# Phase 1: Setup 내 병렬
T003 (pytest 설정) | T004 (fixture 디렉토리)

# Phase 2: Foundational 내
T007 (Hotels 테스트) | T008 (Flights 테스트)  # T005, T006 완료 후

# Phase 4: US2 내 병렬
T017 (daily 검증) | T018 (budget 검증)

# Phase 6: Polish 내 병렬
T027 (.gitignore) | T028 (requirements.txt)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료
3. Phase 3: US1 완료
4. **STOP and VALIDATE**: MCP 도구로 여행 요소 검색·추천이 동작하는지 확인
5. US1만으로도 Claude Desktop에서 여행 플래닝 보조 도구로 사용 가능

### Incremental Delivery

1. Setup + Foundational → 테스트 인프라 준비
2. US1 완료 → 검색·추천 동작 확인 (MVP)
3. US2 완료 → 마크다운 일정 생성 확인
4. US3 완료 → 모바일 공유 확인
5. Polish → 전체 E2E 검증

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Attractions API 엔드포인트는 T009에서 검증 후 T010~T012 구현 방향 결정
- 식당·교통 추천은 MCP 도구가 아닌 Claude 웹 검색으로 수행 — 별도 구현 태스크 없음
- 자동 검증(pytest)은 MCP 도구 파싱·포맷팅 로직에 집중, Claude 추천 품질은 E2E에서 확인
