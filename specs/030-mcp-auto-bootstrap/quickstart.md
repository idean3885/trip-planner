# Quickstart — Spec 030 (MCP 자동 부트스트랩)

## 시나리오 1 — 신규 협력자 설치 (US1)

1. 새 macOS 머신에서 Claude Code 실행
2. 자연어로 요청: "trip-planner MCP 설치해줘"
3. AI가 install 진입점 실행: `curl -fsSL https://trip.idean.me/install | sh`
4. install 스크립트 진행:
   - 의존성 확인 (Python·uv·Node)
   - trip-planner-mcp 다운로드
   - OAuth listener 띄움 + 브라우저 자동 열림
5. 사용자가 브라우저에서 Google 로그인 → 동의
6. listener가 콜백 수령 → PAT 자동 발급 + keychain 저장
7. Claude Code에 `claude mcp add -s user trip-planner ...` 자동 실행
8. 동작 검증 ping (`list_trips` 호출)
9. 완료 메시지: "trip-planner MCP가 준비됐어요"

**기대 결과**: SC-001 평균 3분 이내. 사용자 손대는 추가 단계 = 브라우저 1회 클릭 (SC-002).

## 시나리오 2 — 자연어 업데이트 (US2)

1. 협력자가 trip-planner-mcp v2.x 설치 상태에서 v3.0.0 release 후
2. 자연어 요청: "trip-planner MCP 업데이트해줘" 또는 자동 trigger
3. AI가 PyPI latest 버전 확인 → v3.0.0 발견
4. 업데이트 실행 + 변경 사항 요약 안내:
   - "v3.0.0부터 create_trip의 startDate/endDate가 사라졌습니다. 대신 create_day로 일정을 추가해주세요"
5. 재인증 필요 시 OAuth 흐름 재진입
6. 동작 검증 ping

## 시나리오 3 — PAT 만료 자동 복구 (US3)

1. 사용자가 PAT을 웹에서 폐기 (또는 만료)
2. AI가 trip-planner 도구 호출 → 401 응답
3. AI: "PAT이 만료됐어요. 재발급할까요?" 안내
4. 사용자 동의 → OAuth 흐름 재진입
5. 새 PAT keychain 갱신 → 도구 호출 재시도

## 시나리오 4 — 부트스트랩 실패 폴백 (FR-012)

1. install 진행 중 네트워크 timeout
2. 1회 자동 재시도
3. 재시도 실패 → 진단 메시지 출력:
   ```
   설치 실패: PyPI 다운로드 timeout
   다음을 시도해주세요:
     1. 인터넷 연결 확인
     2. 다시 시도: curl -fsSL https://trip.idean.me/install | sh
     3. 진단 정보를 첨부한 GitHub 이슈를 자동 등록할까요? (y/n)
   ```
4. 사용자 `y` → `gh issue create`로 사용자 본인 권한 등록 (개인정보 마스킹)

## 시나리오 5 — install 진입점 1줄 (FR-001)

```bash
$ curl -fsSL https://trip.idean.me/install | sh
[1/5] 의존성 확인...
[2/5] trip-planner-mcp 다운로드...
[3/5] 인증 — 브라우저가 열립니다...
[4/5] Claude Code에 등록...
[5/5] 동작 검증...
✓ 설치 완료
```

### Evidence

#### 자동 검증

```bash
# Bash 스크립트 정적 분석
shellcheck install.sh scripts/bootstrap/verify-install.sh

# Node listener 단위 테스트
node --test scripts/bootstrap/oauth-listener.test.mjs

# Python MCP startup verify
cd mcp && uv run pytest tests/test_bootstrap_verify.py

# OAuth 콜백 API route 통합 테스트
pnpm vitest run tests/integration/oauth-callback.test.ts

# 표준 종료 코드 enum 정합
shellcheck install.sh -e SC2034
```

#### 수동 검증

* 시나리오 1: 새 macOS VM에서 1줄 curl 진입 → 평균 3분 이내 완료. 사용자 단계 = 브라우저 1회 클릭
* 시나리오 2: v2.x 설치 상태에서 자연어 업데이트 요청 → 자동 갱신
* 시나리오 3: PAT 폐기 후 도구 호출 → AI가 401 감지 + 재발급 안내
* 시나리오 4: 네트워크 차단 환경(`sudo ifconfig en0 down`)에서 install → 진단 메시지·재시도·이슈 등록 옵션 노출
* 시나리오 5: stdout에 단계별 진행. stderr는 진단 로그(PAT 평문 없음 확인)

## 회귀 방지

* OAuth 콜백 listener의 포트 충돌 시 다음 사용 가능 포트로 재시도
* PyPI rate limit 시 verify 실패는 silent (정상 동작 유지)
* keychain 저장 실패 시 file fallback(`~/.config/trip-planner/credentials`, 0600)으로 graceful degrade
