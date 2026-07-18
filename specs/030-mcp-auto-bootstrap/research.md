# Research — Spec 030 (MCP 자동 부트스트랩)

Phase 0 산출.

## Topic 1 — install.sh 1줄 진입점 형식

**Decision**: `curl -fsSL https://trip.idean.me/install | sh` 패턴. 트립플래너 도메인에서 직접 install 스크립트 서빙. Claude Code의 `claude mcp install` 명령은 별도 보조 진입점으로만 지원(Claude Code MCP 디렉토리 등록은 추후 별도 spec).

**Rationale**:
- `curl | sh`는 gh CLI·Homebrew·oh-my-zsh 등 검증된 패턴. 협력자 친숙도 높음
- trip.idean.me 도메인이 사용자 신뢰 영역 — 외부 CDN 의존 없음
- Claude Code의 native `claude mcp install`은 trip-planner를 MCP 디렉토리에 등재해야 동작 — 별도 작업으로 미루기

**Alternatives considered**:
- `npx @idean3885/trip-planner-bootstrap` — Node 의존성 요구. 비개발자 협력자에 부담
- 단순 `pip install trip-planner-mcp` + 수동 등록 — 사용자 노터치 위반

**Implications**:
- `install.sh`가 trip-planner Vercel 정적 라우트로 서빙 (`/install` 또는 `/install.sh`)
- 사용자 안내 메시지: OS 미지원·의존성 부족 시 명시 출력

## Topic 2 — OAuth listener 구현 라이브러리·포트

**Decision**: Node 표준 `http` 모듈로 직접 구현. 외부 lib 없음. 포트는 사용 가능한 랜덤 포트(localhost:0 → kernel 할당). 콜백 URL은 `http://localhost:<port>/oauth/callback` 동적.

**Rationale**:
- Node 표준 lib만 사용 — 신규 의존성 0 (Constitution II 정합)
- 랜덤 포트는 동시 install 시 충돌 회피 + Google OAuth는 localhost: prefix만 검증
- listener는 콜백 1회 수령 후 즉시 종료 (메모리·security minimize)

**Alternatives considered**:
- express/polka 사용 — 외부 의존성 추가 부담. 표준 lib로 충분
- 고정 포트(예: 8765) — 동시 install 시 충돌·포트 점유 충돌

**Implications**:
- Google OAuth client config에 `http://localhost` redirect URI 추가(prefix 매칭이라 모든 포트 허용)
- listener timeout 60초 (사용자가 브라우저 인증 마칠 시간)

## Topic 3 — PAT 로컬 저장 위치

**Decision**: macOS Keychain(`security` CLI) 우선. Linux는 `secret-tool`(libsecret), fallback `~/.config/trip-planner/credentials` (mode 0600). Windows는 본 spec 범위 밖.

**Rationale**:
- macOS Keychain은 OS 표준 + 사용자 본인 권한으로만 접근. 평문 노출 0
- `~/.claude/toolkits/ops-agent-vault/`의 키체인 사용 패턴 정합 (사내 ops-agent-vault 참조)
- Linux fallback file은 0600(소유자 r/w만)으로 권한 제한

**Alternatives considered**:
- 평문 env 변수 → shell history·process 목록 노출 risk
- 1Password CLI 통합 → 비개발자 의존성 추가

**Implications**:
- `keytar` 같은 Node 라이브러리 후보지만 native binary 의존성. `security` CLI 직접 호출이 단순
- AI client가 PAT 읽을 때 키체인 → 환경변수 자동 export (install 스크립트가 처리)

## Topic 4 — MCP 서버 자체 update verify

**Decision**: MCP 서버가 startup 시 PyPI JSON API(`https://pypi.org/pypi/trip-planner-mcp/json`) 1회 호출로 latest 버전 비교. 도구 호출 실패는 trip-planner API의 응답 헤더 `X-Trip-Planner-Min-MCP-Version`로 감지. AI client가 두 신호 모두 자연어로 변환.

**Rationale**:
- PyPI JSON API는 무료·공개·rate limit 충분
- startup 시 1회면 비용 무시 가능 (보통 분 단위 lifecycle)
- API 응답 헤더는 client·server 양방향 합의 가능한 표준 자리

**Alternatives considered**:
- GitHub Releases API — PyPI에 이미 publish하므로 PyPI가 직접
- 매 호출마다 verify — 비용·latency 증가. spec 본문 Q2 답(혼합 — 매번은 안 함)과 정합

**Implications**:
- MCP `bootstrap.py`가 startup 시 PyPI 호출 + 결과를 stderr에 안내 메시지
- trip-planner API response middleware에 `X-Trip-Planner-Min-MCP-Version` 헤더 추가
- AI client는 응답에 mismatch가 있으면 자연어 안내 (예: "trip-planner MCP를 업데이트해주세요")

## Topic 5 — 진단 메시지 + 이슈 자동 등록 권한 모델

**Decision**: 사용자 본인의 GitHub 토큰을 사용해 등록. trip-planner 레포가 public 전환된 후 적용. 사용자 토큰은 install 시점에 OAuth로 같이 받지 않고, 이슈 등록 동의 시점에 별도로 받음(`gh auth login` 또는 기존 `gh` CLI 활용). 또는 sentence to copy/paste 안내.

**Rationale**:
- 봇 계정 운영은 1인 개발 환경에 무리한 인프라
- 사용자 본인 토큰 사용 시 spam 책임 분산
- 협력자가 GitHub 계정 없는 케이스가 드물지만 가능 — 폴백은 진단 메시지 copy/paste 안내

**Alternatives considered**:
- trip-planner 봇 계정 + PAT 보관 → 운영 부담·rate limit·spam 책임
- anonymous 등록 → GitHub 정책상 불가

**Implications**:
- 진단 메시지 + 이슈 본문 자동 생성 (개인정보 마스킹: 이메일·PAT prefix·hostname 제외)
- `gh issue create` 명령으로 사용자 본인 권한 등록
- 사용자 GitHub 토큰 미설정 시 진단 메시지만 출력 + copy/paste 안내
