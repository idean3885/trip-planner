# Tasks: v2.0.0 AX + API MCP

**Input**: Design documents from `/specs/005-ax-api-mcp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1~US5)

---

## Phase 1: Setup

**Purpose**: 브랜치 준비 및 의존성 확인

- [ ] T001 main 최신화 후 005-ax-api-mcp 브랜치에서 작업 시작
- [ ] T002 [P] Node.js 의존성 확인 (npm install)
- [ ] T003 [P] Python 가상환경 확인 (.venv 활성화, pip install -e ".[dev]")

---

## Phase 2: Foundational (US2 + US5 기반)

**Purpose**: PAT 인증 인프라 + 디렉토리 구조 정리. 모든 유저 스토리의 전제 조건.

**⚠️ CRITICAL**: 이 페이즈가 완료되어야 US1, US3, US4 작업 가능

### PAT 데이터 모델 + 인증 미들웨어

- [ ] T004 PersonalAccessToken 모델 추가 in prisma/schema.prisma (data-model.md 참조: id, userId, name, tokenHash, tokenPrefix, expiresAt, lastUsedAt, createdAt)
- [ ] T005 Prisma 마이그레이션 생성 및 적용 (npx prisma migrate dev --name add-personal-access-token)
- [ ] T006 auth-helpers.ts 확장: Bearer 토큰 인식 + DB 조회 + userId 컨텍스트 설정 in src/lib/auth-helpers.ts (contracts/api.md 인증 방식 참조)

### 디렉토리 구조 정리 (US5 충족)

- [ ] T007 mcp/trip_mcp/ 디렉토리 생성 + __init__.py
- [ ] T008 src/travel_mcp/ → mcp/trip_mcp/ 이동: server.py, api_client.py → rapidapi.py 리네임
- [ ] T009 [P] src/feedback_mcp/ 삭제
- [ ] T010 [P] mcp-servers/hotels_mcp_server/ 삭제
- [ ] T011 pyproject.toml 업데이트: packages.find where=["mcp"], 엔트리포인트 trip_mcp.server:main, version 2.0.0, feedback 엔트리포인트 제거
- [ ] T012 tests/ 경로 업데이트: pythonpath에서 src → mcp 변경, 기존 테스트 import 경로 수정

**Checkpoint**: PAT 인증 + 디렉토리 구조 완료. 기존 검색 도구 8개가 mcp/trip_mcp/ 에서 정상 동작 확인.

---

## Phase 3: US2 — 외부 클라이언트 인증 (Priority: P2)

**Goal**: 웹사이트에서 PAT를 생성/관리하고, 토큰으로 API 호출이 가능

**Independent Test**: 설정 페이지에서 토큰 생성 → curl로 Authorization: Bearer 헤더와 함께 GET /api/trips 호출 → 200 응답 확인

- [ ] T013 [P] [US2] POST /api/tokens 구현 (토큰 생성: SHA-256 해시, prefix tp_ 생성, 원문 1회 노출) in src/app/api/tokens/route.ts (contracts/api.md 참조)
- [ ] T014 [P] [US2] GET /api/tokens 구현 (본인 토큰 목록: prefix, name, lastUsedAt만 노출) in src/app/api/tokens/route.ts
- [ ] T015 [US2] DELETE /api/tokens/[id] 구현 (본인 토큰만 삭제, 즉시 무효화) in src/app/api/tokens/[id]/route.ts
- [ ] T016 [US2] 설정 페이지 UI 구현 (토큰 목록, 생성 폼, 삭제 버튼, 생성 시 원문 복사) in src/app/settings/page.tsx
- [ ] T017 [US2] 기존 API 라우트에서 PAT 인증 E2E 검증: curl -H "Authorization: Bearer <pat>" GET /api/trips → 200

**Checkpoint**: PAT 생성/삭제/인증이 모두 동작. 웹 세션 + PAT 인증 병행 확인.

---

## Phase 4: US1 — 자연어로 일정 수정 (Priority: P1) 🎯 MVP

**Goal**: MCP 도구로 여행 일정을 조회/생성/수정/삭제하고 웹에서 즉시 확인

**Independent Test**: Claude Desktop에서 "내 여행 목록 보여줘" → list_trips → 결과 표시. "3일차에 벨렘탑 추가" → create_day 또는 update_day → trip.idean.me에서 즉시 확인.

- [ ] T018 [P] [US1] PAT 기반 HTTP 클라이언트 구현 (키체인에서 PAT 읽기, Authorization 헤더, 에러 핸들링) in mcp/trip_mcp/web_client.py (contracts/mcp-tools.md 환경변수 참조)
- [ ] T019 [P] [US1] 검색 도구 모듈 분리: server.py에서 검색 도구를 search.py로 추출 in mcp/trip_mcp/search.py
- [ ] T020 [US1] CRUD MCP 도구 구현: list_trips, get_trip, create_day, update_day, delete_day, list_members in mcp/trip_mcp/planner.py (contracts/mcp-tools.md 참조)
- [ ] T021 [US1] 통합 서버 엔트리포인트: search + planner 도구 모두 등록 in mcp/trip_mcp/server.py
- [ ] T022 [US1] 기존 검색 도구 8개 동작 검증 (pytest tests/unit/ 통과)
- [ ] T023 [US1] CRUD 도구 E2E 검증: list_trips → get_trip → update_day → 웹 반영 확인

**Checkpoint**: trip-mcp가 검색 8개 + CRUD 6개 = 14개 도구를 제공. 웹 즉시 반영 확인.

---

## Phase 5: US4 — API 문서 제공 (Priority: P4)

**Goal**: 모든 API 엔드포인트가 기계 판독 가능한 형식으로 문서화

**Independent Test**: /api/openapi 접근 시 OpenAPI JSON 반환. /docs 페이지에서 엔드포인트 목록 확인.

- [ ] T024 [P] [US4] OpenAPI 3.0 스펙 정의 (trips, days, members, tokens, auth 전체) in src/lib/openapi.ts
- [ ] T025 [P] [US4] GET /api/openapi 엔드포인트 구현 (JSON 응답) in src/app/api/openapi/route.ts
- [ ] T026 [US4] API 문서 뷰어 페이지 구현 (Scalar 또는 swagger-ui-react) in src/app/docs/page.tsx
- [ ] T027 [US4] 문서 완전성 검증: 실제 API 라우트와 OpenAPI 스펙 엔드포인트 1:1 대응 확인

**Checkpoint**: 모든 API가 문서화되고, /docs에서 인터랙티브하게 확인 가능.

---

## Phase 6: US3 — 1줄 설치 (Priority: P3)

**Goal**: 비개발자가 설치 명령 1줄로 검색 + 일정 관리 MCP를 모두 설치

**Independent Test**: 새 환경에서 curl 설치 명령 실행 → Claude Desktop에서 검색 + 일정 조회 가능.

- [ ] T028 [US3] install.sh 전면 개편: RapidAPI 키 설정 유지, PAT 설정 추가 (웹 생성 안내 → 입력 → 키체인 저장), feedback 서버 제거 (v1 마이그레이션), 단일 MCP 등록 in scripts/install.sh
- [ ] T029 [P] [US3] manifest.json 업데이트: 버전 2.0.0, 엔트리포인트 mcp/trip_mcp/server.py, user_config에 PAT 추가 in manifest.json
- [ ] T030 [P] [US3] .mcp.json 업데이트: 통합 서버 설정 (trip-planner-mcp + PAT 환경변수) in .mcp.json
- [ ] T031 [P] [US3] claude_desktop_config.example.json 업데이트: 통합 서버 예시 in claude_desktop_config.example.json
- [ ] T032 [US3] 설치 E2E 검증: 클린 환경에서 install.sh 실행 → MCP 서버 기동 → 도구 14개 확인

**Checkpoint**: 1줄 설치로 검색+일정 관리 모두 동작. v1→v2 마이그레이션 확인.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 버전 범프, 패키징, 문서, 최종 검증

- [ ] T033 [P] pyproject.toml description 업데이트 (피드백 관련 문구 제거, CRUD 기능 추가 반영)
- [ ] T034 [P] README.md 업데이트: v2.0.0 변경 사항, 새 설치 방법, 도구 목록
- [ ] T035 quickstart.md 검증: 개발자 셋업 가이드 전수 확인 (specs/005-ax-api-mcp/quickstart.md)
- [ ] T036 Vercel 프리뷰 배포 + 프로덕션 배포 확인
- [ ] T037 PyPI 배포: trip-planner-mcp 2.0.0 (mcp/ 기반)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 후 — **모든 US의 전제 조건**
- **US2 (Phase 3)**: Foundational 완료 후 — PAT API/UI
- **US1 (Phase 4)**: US2 완료 후 — MCP가 PAT로 API 호출하므로 US2 필수
- **US4 (Phase 5)**: Foundational 완료 후 — US2와 병렬 가능하나 PAT 문서 포함 위해 US2 후 권장
- **US3 (Phase 6)**: US1 + US5 완료 후 — 설치 스크립트가 최종 구조를 반영
- **Polish (Phase 7)**: 모든 US 완료 후

### User Story Dependencies

```
Phase 2 (Foundational, US5 충족)
    ↓
Phase 3 (US2: PAT)
    ↓
Phase 4 (US1: trip-mcp) ← US2 필수 (PAT 인증)
    ↓
Phase 5 (US4: API docs) ← US2 후 권장
    ↓
Phase 6 (US3: install.sh) ← US1, US4 완료 후
    ↓
Phase 7 (Polish)
```

### Parallel Opportunities

- Phase 2 내: T009, T010 병렬 (독립 삭제)
- Phase 3 내: T013, T014 병렬 (같은 파일이지만 독립 함수)
- Phase 4 내: T018, T019 병렬 (다른 파일)
- Phase 5 내: T024, T025 병렬 (다른 파일)
- Phase 6 내: T029, T030, T031 병렬 (다른 파일)

---

## Implementation Strategy

### MVP First (US2 + US1)

1. Phase 1 + Phase 2 완료 → 기반 준비
2. Phase 3 (US2) 완료 → PAT 인증 동작
3. Phase 4 (US1) 완료 → **MVP: MCP로 일정 CRUD 가능**
4. **STOP and VALIDATE**: Claude Desktop에서 E2E 테스트

### Incremental Delivery

1. Setup + Foundational → 디렉토리 정리 + PAT 모델
2. US2 → PAT 생성/인증 → 배포
3. US1 → trip-mcp 통합 → 배포 (MVP!)
4. US4 → API 문서 → 배포
5. US3 → 설치 스크립트 → 배포
6. Polish → v2.0.0 릴리스

---

## Notes

- US5 (코드 구조 분리)는 Phase 2 (Foundational)에서 충족: 디렉토리 이동 + 삭제가 모든 US의 전제
- 테스트 태스크는 별도 분리하지 않음 — 각 US의 마지막 태스크가 E2E 검증
- 커밋은 /devex:flow를 통해 이슈 단위로 진행
