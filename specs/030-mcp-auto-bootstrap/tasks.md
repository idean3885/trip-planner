# Tasks — Spec 030 (MCP 자동 부트스트랩)

Phase 2 산출. plan Coverage Targets bullet의 `[why]` 태그를 모든 태스크에 부착해 자동 검증과 연결합니다.

v3.0.0 release(spec 029 contract와 동시)에 모두 implement됩니다.

## install·등록·검증 흐름

- [x] T001 install.sh 1줄 진입점 — 런타임 진단(Node·런타임·uv) + 패키지 설치(uv tool install) + listener spawn + Keychain/파일 저장 + claude mcp add + ping. 표준 종료 코드(0/1/2/3/4) [artifact: scripts/bootstrap/install-v3.sh] [why: install-entry]
- [x] T002 trip.idean.me 정적 라우트 — `/install` (install-v3.sh) + `/install/oauth-listener` (listener mjs). Next route handler 가 파일을 그대로 응답하며 stale-while-revalidate 캐시 [artifact: src/app/install/route.ts] [why: install-entry]
- [x] T003 Node OAuth listener — localhost:0 바인딩 + 32 hex state nonce + 콜백 fragment → /token POST 변환 + state 검증 + 표준 종료 코드 [artifact: scripts/bootstrap/oauth-listener.mjs] [why: oauth-listener]
- [x] T004 OAuth listener 단위 테스트 — 콜백 수령·state mismatch·invalid token·timeout 4 경로 [artifact: tests/bootstrap/oauth-listener.test.ts] [why: oauth-listener]
- [x] T005 Bootstrap 페이지 — `/bootstrap?port=&state=` Server Component. 세션 미인증 시 /auth/signin redirect, 인증 시 PAT 자동 발급 + localhost listener fragment redirect (서버 로그·referrer 미노출) [artifact: src/app/bootstrap/page.tsx] [why: oauth-listener]
- [x] T006 PAT 자동 발급 — 기존 `createPAT` 헬퍼 재사용. device label 은 User-Agent 에서 macOS/Windows/Linux 분기 + 발급 일자 (별도 라우트 신설 없이 Bootstrap 페이지 안에서 직접 발급) [artifact: src/app/bootstrap/page.tsx::deviceLabelFromHeaders] [why: oauth-listener]
- [x] T007 MCP client 등록 — install-v3.sh 가 `claude mcp add -s user trip --env TRIP_API_TOKEN ...` 실행. Cursor·Desktop fallback 은 spec 030 patch (T007-cont) [artifact: scripts/bootstrap/install-v3.sh] [why: mcp-register]
- [x] T008 동작 검증 ping — install-v3.sh 가 `uvx trip-planner-mcp --verify` 호출 (별도 verify-install.sh 신설 대신 main 패키지 entry 활용). 실패 시 stderr 안내 + exit 1 [artifact: scripts/bootstrap/install-v3.sh] [why: install-verify]

## 자동 update 흐름

- [ ] T010 MCP startup verify — PyPI JSON API 호출 + latest 비교 + stderr 안내 [artifact: mcp/trip_mcp/bootstrap.py] [why: auto-update-trigger]
- [ ] T011 API response 헤더 추가 — `X-Trip-Planner-Min-MCP-Version` middleware [artifact: src/middleware.ts] [why: auto-update-trigger]
- [ ] T012 MCP client 응답 헤더 감지 + `_meta.upgrade_required` 첨부 [artifact: mcp/trip_mcp/client.py] [why: auto-update-trigger]
- [ ] T013 MAJOR breaking 응답 안내 — 4xx + 사용자 안내 메시지 [artifact: src/app/api/v2/trips/route.ts] [why: breaking-notice]
- [ ] T014 자연어 update 진입점 — install.sh 재실행과 같은 흐름 진입 [artifact: install.sh] [why: auto-update-trigger]

## 진단·복구

- [ ] T020 PAT 만료 감지 + 자동 재발급 진입점 — 401 응답 시 OAuth listener 재실행 [artifact: scripts/bootstrap/reauth.sh] [why: pat-recovery]
- [ ] T021 재인증 흐름 단위 테스트 — 401 mock + OAuth listener re-trigger [artifact: tests/integration/reauth.test.ts] [why: pat-recovery]

## 폴백·진단

- [ ] T030 1회 자동 재시도 + 진단 메시지 생성 [artifact: install.sh] [why: bootstrap-fallback]
- [ ] T031 진단 메시지 형식 — "어디서 막혔는지·다음 행동" 한국어 [artifact: install.sh] [why: bootstrap-fallback]
- [ ] T032 사용자 동의 시 GitHub 이슈 자동 등록 — gh CLI + 개인정보 마스킹 [artifact: scripts/bootstrap/report-issue.sh] [why: bootstrap-fallback]

## 안전·관측

- [ ] T040 표준 종료 코드 정의 — 0=성공/1=일반/2=인증/3=의존성/4=OS/5=권한 [artifact: install.sh|mcp/trip_mcp/exit_codes.py] [why: standard-exit-codes]
- [ ] T041 PAT 평문 비노출 검증 — stdout·stderr·로그에 평문 출력 없음 [artifact: install.sh|scripts/bootstrap/*] [why: secret-redaction]
- [ ] T042 keychain·파일 저장 wrapper — macOS Keychain 우선, Linux secret-tool fallback, file 0600 [artifact: scripts/bootstrap/credentials.sh] [why: secret-redaction]

## 문서·릴리즈

- [ ] T050 docs/mcp-bootstrap.md — 협력자 사용자 가이드 [artifact: docs/mcp-bootstrap.md] [why: install-entry]
- [ ] T051 quickstart Evidence 명령 실행 [artifact: specs/030-mcp-auto-bootstrap/quickstart.md] [why: install-entry]
