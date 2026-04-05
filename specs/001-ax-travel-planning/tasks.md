# Tasks: AX 기반 여행 플래닝 + 웹앱 딜리버리

**Input**: Design documents from `/specs/001-ax-travel-planning/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/mcp-tools.md, quickstart.md
**Architecture**: [ADR-001](adr/001-fe-only-stateless-architecture.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Milestone 1: 인프라 구축 (Phase 1+2, 완료)

**Purpose**: 테스트 프레임워크 설정 + API 클라이언트 분리

- [x] T001 `tests/` 디렉토리 구조 생성 — `tests/__init__.py`, `tests/unit/__init__.py`, `tests/integration/__init__.py` 생성
- [x] T002 pytest 의존성 추가 — `mcp-servers/hotels_mcp_server/requirements.txt`에 `pytest`, `pytest-asyncio`, `pytest-httpx` 추가 및 설치
- [x] T003 [P] pytest 설정 파일 생성 — `pyproject.toml` 또는 `pytest.ini`에 테스트 경로, asyncio 모드 설정
- [x] T004 [P] 테스트용 API 응답 fixture 디렉토리 생성 — `tests/fixtures/` 하위에 `hotels_response.json`, `flights_response.json` 샘플 생성
- [x] T005 `make_rapidapi_request` 함수를 별도 모듈로 분리 — `mcp-servers/hotels_mcp_server/hotels_mcp/api_client.py` 생성. `hotels_server.py`에서 import하도록 변경. 기존 동작 유지.
- [x] T006 API 클라이언트 단위 테스트 작성 — `tests/unit/test_api_client.py`에 정상 응답, 에러 응답, 타임아웃 케이스 테스트
- [x] T007 기존 Hotels 도구 응답 파싱 단위 테스트 작성 — `tests/unit/test_hotels.py`에 `search_destinations`, `get_hotels`, `get_hotel_details` 응답 파싱·포맷팅 테스트. `tests/fixtures/hotels_response.json` 활용
- [x] T008 [P] 기존 Flights 도구 응답 파싱 단위 테스트 작성 — `tests/unit/test_flights.py`에 `search_flight_destinations`, `search_flights` 응답 파싱·포맷팅 테스트. `tests/fixtures/flights_response.json` 활용

**Checkpoint**: `pytest tests/unit/ -v` 통과, 기존 MCP 도구 동작 유지

---

## Milestone 2: 검색 CLI 개발 (Phase 3, US1)

**Goal**: 사용자가 여행 조건을 알려주면 AI가 숙소, 항공편, 관광지를 검색하고 후보를 추천 기준과 함께 제시한다

**Independent Test**: "바르셀로나 관광지 추천해줘"라고 요청하면 CLI 스크립트로 검색 후 후보가 추천 기준과 함께 제시된다

### Attractions CLI 스크립트 구현

- [x] T009 [US1] Attractions API 엔드포인트 검증 — 3개 엔드포인트 검증 완료 (searchLocation, searchAttractions, getAttractionDetails)
- [x] T010 [US1] `search_attraction_locations` CLI 스크립트 + MCP 도구 구현
- [x] T011 [US1] `search_attractions` CLI 스크립트 + MCP 도구 구현
- [x] T012 [US1] `get_attraction_details` CLI 스크립트 + MCP 도구 구현
- [x] T013 [US1] Attractions 단위 테스트 42개 작성 (전체 89개 통과)
- [x] T014 [US1] Attractions 통합 테스트 16개 작성

### E2E 검증 + 배포

- [x] T015 [US1] CLI + MCP E2E 검증, PyPI 배포 (v0.2.0), 1줄 설치, Claude Desktop 테스트 완료
- [x] T015a [US1] macOS 키체인 기반 API 키 관리 (v1.0.2) — `api_client.py`에 `_read_keychain()` 추가, `install.sh` 키체인 우선 저장, Claude Desktop env 블록에서 API 키 제거
- [x] T015b [US1] Claude Code 유저 스코프 MCP 등록 — `claude mcp add travel -s user` 로 글로벌 등록. #45 클로즈.

**Checkpoint**: US1 독립 검증 완료. (v1.0.2, #45 클로즈)
- MCP 도구 8개 (Hotels 3 + Flights 2 + Attractions 3) + CLI 스크립트 3개
- 한화(KRW) 기본 표시, 다중 플랫폼 예약 링크 (Booking.com, Agoda, Hotels.com, Google Hotels)
- PyPI 배포 (travel-planner-mcp v1.0.2), 1줄 설치, Claude Desktop 자동 설정
- macOS 키체인 API 키 관리 (키체인 → .env 폴백)
- Claude Code 유저 스코프 MCP 등록 (`~/.claude.json`)
- Claude 웹 검색(식당, 교통)으로 모든 여행 요소 검색·추천 가능

---

## Milestone 3: 일정 생성 + 웹앱 딜리버리 (Phase 4+5, US2+US3)

**Goal**: 확정된 여행 요소를 기반으로 일정을 생성하고, GitHub Pages(Next.js static export) 웹앱을 통해 동행자에게 모바일로 공유한다 (`travel.idean.me`)

**Independent Test**: 확정된 여행 정보로 일정을 생성하고, 웹앱 URL을 모바일에서 열면 추가 조작 없이 열람 가능하다

### 일정 생성 인프라 (완료)

- [x] T016 [US2] 여행 디렉토리 템플릿 생성 — `templates/trip-template/` 하위에 빈 템플릿 파일 생성. CLAUDE.md 데일리 파일 포맷 7개 섹션을 `daily/template.md`에 정의
- [x] T017 [US2] CLAUDE.md 데일리 파일 포맷 정합성 검증 스크립트 — `scripts/validate-daily.py` 생성. daily 파일이 7개 필수 섹션을 포함하는지 검증
- [x] T018 [P] [US2] 예산 추적 포맷 검증 — `scripts/validate-budget.py` 생성. `budget.md`의 날짜별 실지출 기록 포맷과 결제수단 구분이 올바른지 검증

### 웹앱 파이프라인 구축 (우선)

> 순서 변경: 웹앱 파이프라인을 먼저 구축하고, 기존 일정 초안을 샘플 데이터로 활용.
> T022~T024를 #49로 통합. 기존 GitHub Pages 작업(#34, #30, #33)은 대체됨.

- [x] T022 [US3] Next.js 프로젝트 초기화 + 마크다운 렌더링 + GitHub Pages 배포 (#49) — 루트에 Next.js 15 앱 생성. trips/ 마크다운을 빌드 시점에 정적 페이지로 렌더링 (remark + remark-gfm). GitHub Pages static export 배포. 커스텀 도메인 `travel.idean.me` 설정. AppPaaS 컨테이너 빌드 실패로 GitHub Pages로 전환 (ADR-001 Decision Log #6 참조)

### 모바일 반응형 + 멀티 여행 구조 + 디자인 개선

- [ ] T025 [US3] 모바일 반응형 + 멀티 여행 + 디자인/UX 전면 개선 (#32) — 범위 확장:
  - 멀티 여행 라우트: `/` 여행 목록 → `/trips/[slug]` 여행 상세 → `/trips/[slug]/day/[num]` 일별 상세
  - 모바일 테이블 가로 스크롤 (overflow-x-auto)
  - 마크다운 H1 중복 제거 (stripFirstH1)
  - 예약번호 마스킹 (maskSensitive)
  - 디자인: 깔끔한 흰 배경, 모바일 우선 (iPhone 13 Mini 375pt 기준)
  - 터치 타겟 44px 이상
  - 모바일 테이블 → 카드형 변환 (addTableLabels + CSS media query)
  - 구글맵 링크: CID 우선, search+국가 폴백 (DAY 1 샘플 적용 완료)
  - 외부 링크 새 탭 열기 (externalLinksNewTab)
- [ ] T026 [US3] 일정 수정 후 반영 검증 (#31) — 일정 수정 → 재배포 → 모바일에서 최신 일정 확인

### E2E 일정 생성 검증 (웹앱 구축 후)

> 일정이 확정되면 진행. 웹앱 파이프라인이 이미 있으므로 일정 생성 후 바로 웹에 반영 가능.
> 구글맵 링크는 이 단계에서 장소별로 CID/search URL 확인 후 삽입. 방법론은 메모리 참조.

- [ ] T019 [US2] 실제 여행 데이터로 1일차 일정 생성 테스트 (#27) — 일정 확정 후 진행
- [ ] T020 [US2] 기존 예약 데이터 유지 검증 (#29) — 일정 확정 후 진행
- [ ] T021 [US2] 전체 일정 요약(`itinerary.md`) 생성 검증 (#25) — 일정 확정 후 진행

**Checkpoint**: 웹앱 파이프라인 검증 → 일정 확정 후 데이터 채움 → 모바일 딜리버리 전체 흐름 확인

---

## Milestone 4: 통합 검증 (Phase 6)

**Purpose**: 전체 통합 검증 및 정리

- [x] T027 [P] `.gitignore` 점검 — `.env`, `.venv/`, `__pycache__/`, `.pytest_cache/` 등이 포함되어 있는지 확인
- [x] T028 [P] MCP 서버 `requirements.txt` 최종 정리 — 실제 사용 패키지만 포함, 버전 고정
- [ ] T029 전체 플래닝 사이클 E2E 검증 (SC-005) — 실제 여행 데이터(포르투갈&스페인 6/7~6/21, 15일, 5개 도시)로 US1→US2→US3 전체 사이클 수행. 검색→추천→확정→일정생성→웹앱공유까지 완료
- [ ] T030 quickstart.md 시나리오 전수 검증 — quickstart.md의 QS1~QS4 + Edge Case 시나리오 전체 수행. 실패 항목 수정

---

## Dependencies & Execution Order

### 마일스톤 간 의존관계

```
M1 (인프라 구축) ✅ 완료
  → M2 (검색 CLI + MCP + 배포) ✅ 완료 (v1.0.2, 키체인, #45 클로즈)
    → M3 (일정 생성 + 웹앱 딜리버리) ← 다음 착수
      → M4 (통합 검증)
```

### M2 내부 실행 순서

```
T009 (API 검증) → T010~T012 (CLI 구현, 병렬 가능) → T013~T014 (테스트) → T015 (E2E)
```

### M3 내부 실행 순서

```
T022 (웹앱 파이프라인) ✅ → T025 (반응형 + 멀티여행 + 디자인) 🔄 → T026 (재배포 검증)
  → T019~T021 (일정 생성 검증, 일정 확정 후)
```

---

## Implementation Strategy

### MVP First (M2 Only)

1. M1: 완료 ✅
2. M2: CLI 스크립트 구현 + 검증
3. **STOP and VALIDATE**: CLI 스크립트로 여행 요소 검색·추천이 동작하는지 확인
4. M2만으로도 Claude Code에서 여행 플래닝 보조 도구로 사용 가능

### Incremental Delivery

1. M1 완료 → 테스트 인프라 준비 ✅
2. M2 완료 → 검색 동작 확인 (MVP)
3. M3 완료 → 일정 생성 + 웹앱 딜리버리 확인
4. M4 완료 → 전체 E2E 검증

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Attractions API 엔드포인트는 T009에서 검증 후 T010~T012 구현 방향 결정
- 식당·교통 추천은 CLI/MCP가 아닌 Claude 웹 검색으로 수행 — 별도 구현 태스크 없음
- 자동 검증(pytest)은 CLI 스크립트 파싱·포맷팅 로직에 집중, Claude 추천 품질은 E2E에서 확인
- T022~T024는 #49로 통합, GitHub Pages static export로 배포 (`travel.idean.me`)
