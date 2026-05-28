# Tasks — Spec 030 (MCP 자동 부트스트랩)

Phase 2 산출. plan Coverage Targets bullet의 `[why]` 태그를 모든 태스크에 부착해 자동 검증과 연결합니다.

v3.0.0 release(spec 029 contract와 동시)에 모두 implement됩니다.

## install·등록·검증 흐름

- [ ] T001 install.sh 1줄 진입점 — OS·의존성 진단·다운로드·OAuth listener trigger 단계 분기 [artifact: install.sh] [why: install-entry]
- [ ] T002 trip.idean.me 정적 라우트 `/install` 서빙 — Vercel rewrite 또는 public 폴더 [artifact: vercel.json|public/install.sh] [why: install-entry]
- [ ] T003 Node OAuth listener — localhost:0 바인딩 + 콜백 수령 + PAT 발급 API 호출 + keychain 저장 [artifact: scripts/bootstrap/oauth-listener.mjs] [why: oauth-listener]
- [ ] T004 OAuth listener 단위 테스트 — 콜백 1회 수령·state mismatch·timeout 케이스 [artifact: scripts/bootstrap/oauth-listener.test.mjs] [why: oauth-listener]
- [ ] T005 OAuth 콜백 API route — `/oauth/authorize` GET + `/oauth/callback` redirect 처리 [artifact: src/app/api/tokens/oauth-callback/route.ts] [why: oauth-listener]
- [ ] T006 PAT 자동 발급 — `/api/tokens` POST 흐름 재사용 + device name 자동 설정 [artifact: src/app/api/tokens/route.ts] [why: oauth-listener]
- [ ] T007 MCP client 등록 명령 — Claude Code(`claude mcp add -s user`) + Cursor·Desktop fallback [artifact: install.sh] [why: mcp-register]
- [ ] T008 동작 검증 ping — `list_trips` MCP 도구 1건 호출 + 응답 검증 [artifact: scripts/bootstrap/verify-install.sh] [why: install-verify]

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
