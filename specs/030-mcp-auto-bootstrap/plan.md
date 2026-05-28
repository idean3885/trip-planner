# Implementation Plan: MCP 자동 부트스트랩 — 노터치 설치·인증·업데이트

**Branch**: `030-mcp-auto-bootstrap` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-mcp-auto-bootstrap/spec.md`

## Summary

협력자가 AI client(Claude Code 우선, Claude Desktop·Cursor best-effort)에 자연어로 "trip-planner MCP 설치/업데이트해줘" 요청 시 사용자 노터치(브라우저 1회 인증 제외)로 install·PAT 발급·MCP 등록·동작 검증이 완료되는 자동 부트스트랩 흐름을 도입합니다. install 스크립트가 로컬 HTTP listener를 띄워 OAuth 콜백을 받고(`gh auth login` 패턴), MCP 서버는 startup 시 1회 + 호출 실패 시 + 사용자 명시 요청 시 세 시점에서 자동 update를 trigger합니다. 부트스트랩 실패는 1회 자동 재시도 → 진단 메시지 → 사용자 동의 시 GitHub 이슈 자동 등록 순으로 처리합니다. spec 029(여행 모델 + 캘린더 뷰)와 v3.0.0 마일스톤 묶음으로 동시 출시합니다.

## Coverage Targets

- 1줄 install 진입점 — 협력자가 1줄 curl 또는 `claude mcp add` 한 줄로 시작 가능 [why: install-entry] [multi-step: 2]
- OAuth 1회 인증 흐름 — 로컬 HTTP listener + 브라우저 콜백 + PAT 자동 발급·저장 [why: oauth-listener] [multi-step: 3]
- MCP 등록 자동 트리거 — `claude mcp add -s user` 등 client별 등록 명령 자동 호출 [why: mcp-register]
- 설치 직후 동작 검증 ping — MCP 도구 1건 호출 결과로 install 성공·실패 판정 [why: install-verify]
- 자동 update 트리거 — startup verify + 호출 실패 감지 + 명시 요청 세 시점 동일 흐름 [why: auto-update-trigger] [multi-step: 3]
- MAJOR breaking 변경 시 사용자 안내 — v3.0.0 같은 release에서 변경 사항 요약 [why: breaking-notice]
- PAT 만료·권한 회수 자동 감지 — 401 응답 감지 + 자동 재발급 흐름 진입 [why: pat-recovery] [multi-step: 2]
- 부트스트랩 실패 폴백 — 1회 자동 재시도 + 진단 메시지 + 동의 시 이슈 자동 등록 [why: bootstrap-fallback] [multi-step: 3]
- 표준 종료 코드 — 0=성공/1=일반/2=인증 필요/3=의존성 부족 [why: standard-exit-codes]
- PAT 평문 비노출 — stdout·stderr 어디에도 비밀번호·PAT 평문 출력 안 함 [why: secret-redaction]

## Technical Context

**Language/Version**: Bash (install 스크립트), Node.js 20+ (로컬 HTTP listener 후보), Python 3.10+ (MCP 서버)
**Primary Dependencies**: trip-planner-mcp (PyPI), FastMCP, httpx, `claude` CLI (Claude Code), curl/openssl (Bash). 로컬 listener는 Node native `http` 모듈 또는 Bash + ncat 후보 — Phase 0 research에서 결정.
**Storage**: PAT 로컬 저장 위치 — Phase 0 research에서 결정 (macOS Keychain `trip-planner` 우선, fallback `~/.config/trip-planner/credentials`)
**Testing**: shellcheck (Bash), pytest (MCP), Node test runner(로컬 listener). 통합 검증은 quickstart 시나리오 수동.
**Target Platform**: macOS 우선, Linux best-effort, Windows ad-hoc. AI client는 Claude Code 우선.
**Project Type**: shell script + Python MCP server + Node helper
**Performance Goals**: SC-001 새 협력자 install 평균 3분 이내 (브라우저 인증 포함). SC-002 사용자 추가 키 입력·파일 편집 단계 = 0.
**Constraints**: 1줄 curl 진입(메모 [feedback_capsule]). PAT·비밀번호 stdout/stderr 평문 비노출(FR-014). 표준 종료 코드(FR-015).
**Scale/Scope**: 협력자 1~10명. 1인 + 동행자 2~5명 / trip-planner 사용자. install·update는 사용자별 1회/주기.

## Constitution Check

| 원칙 | 평가 | 비고 |
|------|------|------|
| I. AX-First | ✅ 통과 | 자연어 요청 1회로 install/update 완결 — AX 핵심 |
| II. Minimum Cost | ✅ 통과 | 신규 유료 의존성 0. PyPI·GitHub Releases 기존 채널 재사용 |
| III. Mobile-First Delivery | ✅ 해당 없음 | 부트스트랩은 협력자 CLI 환경. 모바일 직접 사용 시나리오 없음 |
| IV. Incremental Release | ✅ 통과 | v3.0.0 출시 시 1단계 도입. 후속은 별도 spec(CI/CD PAT fallback 등) |
| V. Cross-Domain Integrity | ✅ 통과 | PAT는 사용자 인증 도메인. MCP는 일정 편성/탐색 도메인 호출. 단방향 |
| VI. Role-Based Access Control | ✅ 통과 | PAT는 사용자 본인 권한만 위임. 기존 Token 모델 RBAC 정합 |

**Gate 결과**: 통과.

## Project Structure

### Documentation (this feature)

```text
specs/030-mcp-auto-bootstrap/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── install-cli.md           # 1줄 install 진입점·종료 코드·환경 변수
│   ├── oauth-listener.md         # 로컬 HTTP listener 콜백 프로토콜
│   └── mcp-version-handshake.md  # MCP 서버 startup verify + 호출 실패 감지 응답 코드
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code

```text
install.sh                       # 1줄 진입점 (curl | bash). 의존성·OS 진단·다운로드·MCP 등록 단계 분기
scripts/
├── bootstrap/
│   ├── oauth-listener.mjs       # Node 로컬 HTTP listener (콜백 수령 + PAT 발급 API 호출)
│   └── verify-install.sh        # 동작 검증 ping (MCP 도구 1건 호출)
mcp/trip_mcp/
├── bootstrap.py                  # startup verify (PyPI latest 비교) + 호출 실패 시 update hint
└── exit_codes.py                 # 표준 종료 코드 enum
src/app/api/
└── tokens/
    └── oauth-callback/route.ts   # OAuth 콜백 처리 (사용자 동의 후 PAT 자동 발급)
docs/
└── mcp-bootstrap.md              # 사용자 가이드 (협력자 안내용)
```

**Structure Decision**: install·등록은 Bash + Node helper. MCP 서버 자체 update verify는 Python. OAuth 콜백 처리는 Next.js API route(웹 도메인 인증 흐름 정합).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Node 로컬 HTTP listener | OAuth 1회 콜백 수령 + PAT 자동 발급에 표준 패턴(gh CLI). 단순 curl로는 콜백 수령 불가 | Bash + nc로 listener 만들기 — OS 호환성·a11y·신뢰성 약함 |
| 사용자 동의 시 GitHub 이슈 등록 | 부트스트랩 실패 진단 자동화 — 사용자가 진단 못 함 가정 | 수동 안내만은 사용자 노터치 위반 |

## Phase 0 — Research

`research.md`로 합쳐 작성.

### Topic 1 — install.sh 1줄 진입점 형식

**Unknowns**: 협력자가 어떤 1줄 명령으로 시작할지. `curl -fsSL https://trip.idean.me/install.sh | bash`? `npx @idean3885/trip-planner-bootstrap`? `claude mcp install trip-planner`?

**Tasks**:
- curl | bash 패턴의 보안 vs 편의 균형 (gh CLI·Homebrew·oh-my-zsh 패턴 참조)
- Claude Code의 native MCP install 명령(`claude mcp install`)이 publish된 MCP 디렉토리 지원하는지 조사
- 사용자 안내 메시지 분기 (의존성 부족·OS 미지원 등)

### Topic 2 — OAuth listener 구현 라이브러리·포트

**Unknowns**: Node 표준 `http` 모듈 vs `express` vs `polka`. 사용 포트(고정 vs 랜덤). 콜백 URL whitelist.

**Tasks**:
- gh CLI(go) · GitHub CLI Action(Node) · Heroku CLI 패턴 비교
- localhost:포트 callback 등록 (Google OAuth client config에 등록 필요)
- 동시 install 시도 시 포트 충돌 처리

### Topic 3 — PAT 로컬 저장 위치

**Unknowns**: macOS Keychain vs file. 권한·접근성·동기화 영향.

**Tasks**:
- macOS Keychain 표준 (security CLI · keytar Node) 정리
- Linux fallback (`secret-tool` · file 0600 권한)
- AI client가 환경 변수로 PAT 읽는 경우 — keychain → env 자동 export

### Topic 4 — MCP 서버 자체 update verify

**Unknowns**: startup verify를 어떻게 (PyPI JSON API? GitHub Releases API? trip-planner 자체 endpoint?). 호출 실패 감지(401·405 등)를 표준 응답 코드로 어떻게.

**Tasks**:
- PyPI `https://pypi.org/pypi/trip-planner-mcp/json` 호출 비용·latency
- MCP 프로토콜에 version mismatch 표준 응답 있는지 (없음 — 자체 컨벤션 필요)
- AI client가 응답 코드를 자연어로 변환할 진입점

### Topic 5 — 진단 메시지 + 이슈 자동 등록 권한 모델

**Unknowns**: 사용자 동의 시 이슈 등록 시 어느 GitHub 계정으로 등록할지. 사용자 본인 토큰 vs trip-planner 봇 계정 vs anonymous(public 레포).

**Tasks**:
- trip-planner 레포 public 전환 여부 확인 (Constitution Constraints: "public 전환 예정")
- 봇 계정 운영 비용 vs 사용자 토큰 권한
- 개인정보 마스킹(이메일·PAT prefix·머신 hostname) 룰

**Output**: `specs/030-mcp-auto-bootstrap/research.md`

## Phase 1 — Design & Contracts

### data-model.md

본 spec은 DB 스키마 변경이 거의 없습니다. 기존 `Token` 모델(`/api/tokens` POST) 재사용. 이슈 등록 시 사용자 동의 plain consent 기록(메타데이터 수준)만 필요.

| 엔티티 | 변경 |
|--------|------|
| `Token` | 변경 없음 — OAuth 콜백에서 자동 발급 시 같은 모델 사용 |
| `BootstrapSession` (선택) | install/update 실행 단위 로깅용. DB가 아닌 로컬 파일에 둘 수도 (Phase 0 research에서 결정) |

### contracts/

* `install-cli.md` — 1줄 진입점·환경 변수·종료 코드(0/1/2/3)·stdout/stderr 출력 형식
* `oauth-listener.md` — 로컬 HTTP listener의 콜백 URL·포트·timeout·콜백 응답 형식
* `mcp-version-handshake.md` — MCP 서버 startup verify 응답·도구 호출 실패 응답에 version 메타

### quickstart.md

협력자가 새 macOS에서 1줄 install로 시작해 trip-planner MCP 동작에 도달하는 시나리오 + update·재인증 시나리오 + Evidence(자동·수동) 명시.

### Agent context update

`.specify/scripts/bash/update-agent-context.sh claude` 실행.

## Phase 2 — Tasks (out of scope)

`/speckit.tasks` 또는 직접 작성으로 메타태그 4종 부착된 tasks.md 생성. 본 plan은 Coverage Targets bullet 별 [why]·[multi-step] 매핑 기반 제공.

## Dependencies & Risks

* spec 029(여행 모델)의 MCP `create_trip`/`update_trip` breaking이 spec 030의 자동 update 흐름으로 사용자에게 안내돼야 함. v3.0.0 동시 출시 정합 핵심
* OAuth 콜백 listener의 포트 충돌·콜백 URL whitelist는 Google OAuth client config 변경 필요(인프라 영향)
* trip-planner 레포 public 전환 시 이슈 자동 등록의 privacy 처리(개인정보 마스킹) risk
* macOS Keychain 외 OS에서 PAT 저장 fallback의 보안 risk — file 0600 권한·읽기 권한 명시

## Notes

* 1줄 curl 패턴은 메모 [feedback_capsule]("비개발자 캡슐화·1줄 설치·JSON 편집 불가") 정합
* Claude Code MCP 등록은 메모 [feedback_mcp_registration](`claude mcp add -s user`) 정합
* 본 spec의 release 시점은 v3.0.0 한 번. expand-and-contract 분해는 spec 029가 담당
