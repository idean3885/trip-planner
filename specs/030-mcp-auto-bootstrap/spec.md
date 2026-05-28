# Feature Specification: MCP 자동 부트스트랩 — 노터치 설치·인증·업데이트

**Feature Branch**: `030-mcp-auto-bootstrap`
**Created**: 2026-05-28
**Status**: Draft
**Input**: User description: "MCP 자동 부트스트랩 — 협력자가 AI client에 자연어 요청만으로 사용자 노터치 설치·업데이트. 마일스톤 v3.0.0에서 spec 029(여행 모델 + 캘린더 뷰)와 동시 출시."

## Clarifications

### Session 2026-05-28

- Q: AI client 인증 흐름 → A: 브라우저 OAuth 1회 (gh CLI 패턴 — install 스크립트가 로컬 HTTP listener 띄워 redirect 수령 + PAT 자동 발급). 사용자 브라우저 1회 클릭 외 손대지 않음
- Q: 자동 업데이트 트리거 → A: 혼합 — MCP 서버 startup 1회 verify + 도구 호출 실패 시 version mismatch 감지 + 사용자 명시 요청도 동일 흐름. 매 호출마다 verify는 안 함
- Q: 부트스트랩 실패 시 폴백 → A: 혼합 — 1회 자동 재시도(일시 장애 회복) + 실패 시 진단 메시지(어디서 막혔는지·다음 행동) + 사용자 동의 시 이슈 자동 등록
- Q: 지원 AI client 범위 → A: 현행 default 유지 — Claude Code 우선·Cursor·Desktop best-effort·일반 MCP-호환 client는 표준 등록 명령만 지원

### 결정 1 — AI client 인증 흐름 ✅

install 스크립트가 OAuth 1회 흐름을 수행합니다. 로컬 HTTP listener를 띄워 콜백을 받고 자동으로 PAT을 발급·저장합니다. 사용자는 브라우저 1회 동의 외 손대지 않습니다. CI/CD·자동화 환경 대응은 본 spec 범위 밖(필요 시 후속 spec에서 PAT fallback 추가).

### 결정 2 — 자동 업데이트 트리거 ✅

다음 세 시점에서 trigger됩니다:

* MCP 서버 startup 시 1회 verify (자식 프로세스 spawn 직후)
* 도구 호출 응답이 version mismatch 또는 4xx auth 실패 시
* 사용자가 자연어로 "업데이트해줘" 요청 시

세 시점 모두 같은 update 흐름을 진입합니다. 매 도구 호출마다 verify는 하지 않습니다(비용·latency 회피).

### 결정 3 — 부트스트랩 실패 시 폴백 ✅

부트스트랩 실패는 다음 순서로 처리합니다:

1. **1회 자동 재시도** — 일시 장애(network·timeout) 회복
2. **재시도 실패 시 진단 메시지** — 어디서 막혔는지 + 다음 행동을 사용자 친화 문구로 출력. SC-005 정합(맥락 없는 에러 코드 0건)
3. **사용자 동의 시 이슈 자동 등록** — 진단 로그(개인 식별 정보 마스킹)를 모아 GitHub 이슈 자동 생성. 사용자 명시 동의 없이는 등록하지 않음

## Metatag Conventions *(normative, inherited from PR #204)*

본 피처의 tasks.md·plan.md는 네 종 메타태그를 따릅니다:

- `[artifact: <path>|<path>::<symbol>]` — 산출 파일 식별자
- `[why: <short-tag>]` — 추적 그룹 키
- `[multi-step: N]` — plan bullet의 다단 매핑 태스크 수
- `[migration-type: schema-only | data-migration]` — 마이그레이션 산출물 구분(본 피처는 DB 스키마 변경 없음 예상, 인증 토큰 모델 변경 시에만 사용)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 협력자 노터치 설치 (Priority: P1)

협력자가 자기 AI client(예: Claude Code)에 "trip-planner MCP 설치해줘"라고 자연어로 요청합니다. AI가 install 명령 자동 실행 → 사용자 브라우저 1회 인증(OAuth 또는 PAT 발급 페이지) → AI가 발급된 인증 정보 자동 등록 → MCP 등록 → 동작 검증 ping → 결과 안내. 사용자는 브라우저 1회 클릭 외 손대지 않습니다.

**Why this priority**: 현재 협력자가 MCP 설치 단계에서 막혀 도구를 못 쓰고 있는 핵심 문제를 직접 해소합니다. v3.0.0 도구 가치의 전제 조건입니다.

**Independent Test**: 새 macOS 사용자가 Claude Code에 자연어 요청 한 번으로 trip-planner MCP가 동작하는 상태에 도달하는지(`mcp__trip__list_trips` 등이 응답하는지) 확인합니다.

**Acceptance Scenarios**:

1. **Given** 협력자가 trip-planner 계정만 있고 MCP는 미설치 상태, **When** Claude Code에 "trip-planner MCP 설치해줘" 요청, **Then** AI가 install 실행 + 브라우저 1회 인증 안내 + 인증 후 MCP 등록 + 동작 검증을 자동 완료하고 협력자에게 완료 메시지를 출력합니다.
2. **Given** 협력자가 install 단계에서 브라우저 인증을 마침, **When** AI가 후속 단계 진행, **Then** 사용자에게 추가 입력을 요구하지 않고 등록·검증까지 완료됩니다.
3. **Given** 인증이 실패하거나 사용자가 브라우저를 닫음, **When** AI가 그것을 감지, **Then** 결정 3의 폴백 흐름(1회 자동 재시도 → 진단 메시지 → 동의 시 이슈 등록)이 실행됩니다.

---

### User Story 2 - 자연어 업데이트 (Priority: P2)

협력자가 "trip-planner MCP 업데이트해줘"라고 요청하면 AI가 최신 버전 자동 감지 + 업데이트 + 재인증(필요 시) + 동작 검증을 사용자 노터치로 완료합니다.

**Why this priority**: 설치 후에도 v3.0.0 같은 MAJOR breaking 직후 협력자가 자동으로 따라올 수 있어야 도구가 유지됩니다. P1 설치가 없으면 의미가 없으므로 P2.

**Independent Test**: 이전 버전이 설치된 상태에서 협력자가 업데이트 요청 한 번으로 최신 버전으로 갱신되고 인증·등록 상태가 유지되는지 확인합니다.

**Acceptance Scenarios**:

1. **Given** 협력자가 trip-planner-mcp v2.x를 사용 중, **When** v3.0.0 release 후 "trip-planner MCP 업데이트해줘" 요청, **Then** AI가 v3.0.0으로 자동 갱신하고 호환 안 되는 호출(예: `create_trip`의 startDate)을 사용자에게 안내합니다.
2. **Given** 업데이트 후 PAT 재인증이 필요한 경우, **When** AI가 감지, **Then** 사용자에게 브라우저 1회 인증을 요청하고 새 PAT을 자동 적용합니다.

---

### User Story 3 - 자동 진단·복구 (Priority: P3)

PAT 만료·권한 회수·인증 실패 같은 사후 장애를 AI가 자동 감지해 협력자에게 알리고 복구 흐름(재발급 / 재등록)으로 진입합니다.

**Why this priority**: 일상 운영 중 발생하는 장애를 사용자가 진단·해결할 능력이 없다고 가정. AI가 항상 옆에 있다는 전제에서 진단·복구도 노터치여야 합니다. P1·P2 없이는 의미가 작아 P3.

**Independent Test**: PAT을 의도적으로 폐기한 상태에서 협력자가 MCP 도구를 호출하면 AI가 401 감지 → 자동 재발급 흐름 진입을 확인합니다.

**Acceptance Scenarios**:

1. **Given** 협력자의 PAT이 만료된 상태, **When** AI가 trip-planner MCP 도구 호출, **Then** 401 응답을 감지하고 "PAT이 만료되었어요. 재발급할까요?" 같은 안내 후 사용자 동의 시 자동 재발급 흐름 진입.

---

### Edge Cases

* 협력자가 trip-planner 웹 계정이 아직 없는 경우 — install 흐름이 OAuth 회원가입(Google)을 먼저 안내한 후 후속 단계 진행.
* 협력자 환경이 Python·uv 미설치 상태 — install 스크립트가 자체 진단 + 의존성 안내(또는 호환 가능한 단일 바이너리 배포).
* 협력자가 회사 PC라 방화벽으로 trip.idean.me 접근 제한 — 진단 메시지 + 화이트리스트 안내.
* 다중 AI client(Claude Code + Cursor 동시 사용) — 같은 PAT 공유 가능, 또는 client별 별도 PAT 발급(현행 다중 토큰 정책 정합).
* 협력자가 자기 머신이 아닌 공용 PC에서 설치 시도 — PAT 공유 위험. 설치 스크립트가 "공용 PC 감지 시 경고" 휴리스틱 없이도 사용자에게 1회 알림.

## Requirements *(mandatory)*

### Functional Requirements

#### 설치 (User Story 1)

* **FR-001**: 협력자가 AI client에 자연어로 설치 요청 시 AI가 단일 명령(예: 1줄 curl 또는 `npm`·`uv` 한 줄)으로 install 흐름을 시작할 수 있는 진입점이 공개돼 있어야 합니다.
* **FR-002**: install 스크립트는 PAT 자동 발급 흐름(웹 인증 1회 → 토큰 자동 수령 → 로컬 저장)을 포함해야 합니다.
* **FR-003**: install 스크립트는 MCP 클라이언트 등록(`claude mcp add` 같은 명령)을 자동 수행해야 합니다.
* **FR-004**: install 완료 직후 동작 검증 ping(예: 도구 1건 호출)을 수행하고 성공·실패를 협력자에게 출력해야 합니다.
* **FR-005**: 사용자 인증 흐름은 브라우저 OAuth 1회입니다. install 스크립트가 로컬 HTTP listener를 띄워 콜백을 받고, 사용자가 브라우저에서 1회 동의를 마치면 PAT을 자동 발급해 로컬에 저장합니다(`gh auth login` 패턴). CI/CD 환경 대응은 본 spec 범위 밖.

#### 업데이트 (User Story 2)

* **FR-006**: 협력자가 AI client에 자연어로 업데이트 요청 시 AI가 최신 버전을 감지하고 자동 갱신을 수행할 수 있어야 합니다.
* **FR-007**: 업데이트 trigger는 세 시점입니다 — (1) MCP 서버 startup 시 1회 verify, (2) 도구 호출 응답이 version mismatch 또는 4xx auth 실패 시, (3) 사용자 자연어 명시 요청 시. 세 trigger 모두 같은 update 흐름을 진입합니다. 매 호출마다 verify는 하지 않습니다.
* **FR-008**: MAJOR breaking 변경(예: v3.0.0의 `create_trip` 시그니처 변경)이 있을 때 업데이트 흐름은 사용자에게 변경 사항 요약을 안내합니다.
* **FR-009**: 업데이트 후 동작 검증 ping을 수행합니다.

#### 진단·복구 (User Story 3)

* **FR-010**: PAT 만료·권한 회수·인증 실패를 AI client가 감지할 수 있도록 MCP 도구 응답에 표준 에러 코드가 명시돼야 합니다.
* **FR-011**: 인증 실패 감지 시 AI가 자동 재발급 흐름으로 진입할 수 있는 진입점이 제공돼야 합니다.
* **FR-012**: 부트스트랩 실패 시 폴백은 (1) 1회 자동 재시도 → (2) 재시도 실패 시 사용자 친화 진단 메시지(어디서 막혔는지·다음 행동) → (3) 사용자 명시 동의 시 진단 로그(개인 식별 정보 마스킹) 모아 GitHub 이슈 자동 등록 순으로 동작합니다.

#### 안전·관측

* **FR-013**: PAT 발급·만료·재발급 이벤트가 사용자 본인의 설정 화면(`/settings`)에서 조회 가능해야 합니다(현행 `Token` 모델 재사용).
* **FR-014**: 부트스트랩 명령은 stdout에 사용자 친화 메시지를 출력하고, stderr에 진단용 상세 로그를 출력합니다. 어느 한쪽에도 PAT·비밀번호 평문이 노출되지 않습니다.
* **FR-015**: install 명령은 일관된 종료 코드를 사용하여 AI client가 성공/실패를 명확하게 판단할 수 있어야 합니다(0=성공, 1=일반 실패, 2=인증 필요, 3=의존성 부족 등).

### Key Entities

* **Personal Access Token(PAT)** — 협력자별·디바이스별 인증 토큰. 발급·만료·폐기 이벤트가 있습니다.
* **MCP 등록 항목** — AI client에 등록된 trip-planner MCP 서버 명세(명령, env, 자격). 자동 부트스트랩이 관리합니다.
* **부트스트랩 세션** — install/update 실행 한 단위. 진단·로깅용으로 추적되며 사용자 본인이 조회 가능.

## Success Criteria *(mandatory)*

### Measurable Outcomes

* **SC-001**: 새 협력자가 자기 AI client에 자연어 요청 한 번으로 trip-planner MCP 동작 상태에 도달하는 데 평균 3분 이내. (브라우저 인증 1회 포함)
* **SC-002**: 사용자가 install·update 도중 손대는 추가 단계(키 입력·파일 편집 등) 수 = 0. (브라우저 1회 클릭은 제외)
* **SC-003**: PAT 만료 사후 장애 발생 시 협력자가 자연어 1회 요청으로 복구 가능한 비율 ≥ 95%.
* **SC-004**: v3.0.0 release 후 1주 안에 활성 협력자 100%가 자동 업데이트로 신 버전 전환 완료.
* **SC-005**: 부트스트랩 실패 시 사용자에게 노출되는 메시지가 "다음에 무엇을 하라"는 행동 지시를 100% 포함합니다(맥락 없는 에러 코드 0건).

## Assumptions

* **마일스톤 v3.0.0 묶음** — spec 029(여행 모델 + 캘린더 뷰) + spec 030(본 부트스트랩) 두 spec이 v3.0.0 MAJOR 범프에 동시 출시됩니다.
* 지원 AI client default는 Claude Code 우선, Claude Desktop·Cursor 검증 best-effort, 일반 MCP-호환 client는 표준 등록 명령만 지원합니다. clarify 단계에서 재확인 가능.
* trip-planner 웹 OAuth 흐름(Auth.js · Google)은 변경하지 않습니다. PAT 발급 페이지는 현행 `/settings` 흐름 재사용.
* 협력자 환경은 macOS 우선, Linux best-effort, Windows ad-hoc(향후 별도 spec). curl·shell 한 줄 진입 가능 환경 가정.
* install·update 명령의 배포 채널은 PyPI(`trip-planner-mcp`) + GitHub Releases(install.sh)로 정해진 현행 흐름 재사용.
* 메모 [feedback_capsule] "비개발자 캡슐화 = 1줄 curl 설치, JSON 편집 불가" 정합.
* 메모 [feedback_mcp_registration] "Claude Code MCP 등록은 `claude mcp add -s user`" 정합.
