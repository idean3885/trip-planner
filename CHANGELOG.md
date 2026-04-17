# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-04-17

### Added
- **speckit 하네스 도입**: 이슈 #181 + 12개 하위 이슈(#205~#216). 스펙 산출물 간 정합성 자동 검증으로 #191 유형(plan 항목 tasks 미매핑 → 데이터 마이그레이션 누락)의 재발을 구조적으로 차단.
  - 4종 메타태그(`[artifact]`, `[why]`, `[multi-step]`, `[migration-type]`)를 검증 근간으로 고정
  - 검증기 7종 + CI 워크플로우 2종 추가: `validate-metatag-format.sh`, `validate-plan-tasks-cov.sh`, `validate-drift.sh`, `validate-quickstart-ev.sh`, `validate-migration-meta.sh`, `validate-constitution.sh`, `merge-tasks-to-issues.sh` + `speckit-gate.yml`, `drift-audit.yml`
  - 신규 템플릿 2종(`implement-template.md`, `quickstart-template.md`) + 기존 템플릿(`spec-template.md`, `plan-template.md`, `tasks-template.md`) 메타태그 가이드 추가
  - 기존 `enforce-speckit.sh`의 `-maxdepth 1` 버그 수정(카테고리 하위 구조 탐색 정상화)
  - **3단계 롤아웃 완료**: `expand` → `migrate` → `contract`. 현재 `contract` 모드에서 speckit-gate CI가 실제 차단 역할 수행.
  - **migration-type 사이드카 방식**: `prisma/migrations/<dir>/migration-type` 파일로 레거시 마이그레이션을 Prisma checksum 손상 없이 분류 (10개 소급 적용).

### Changed
- **PR 머지 정책**: 전 방향 `Create a merge commit` 고정(#218). Squash and merge off.
- **CLAUDE.md**: "작업 규칙"에 speckit 하네스 메타태그·검증기·rollout phase 섹션 추가

## [2.2.7] - 2026-04-17

### Changed
- **URL 도출 전략 재설계**: 환경별 외부 env(AUTH_URL 등) 의존 제거. `src/lib/app-url.ts` 헬퍼 + Auth.js `trustHost: true`로 각 환경이 자기 요청 origin만 보고 동작. "dev가 prod 참조, local이 dev 참조" 교차 참조를 구조적으로 차단. 문서: `docs/ENVIRONMENTS.md`. (#194)
- **설정 페이지 PAT 발급 UX 재정비**: 자동 발급(install.sh)을 기본 시각으로 설명하고 수동 발급 폼은 `<details>` 접힘 "수동 발급 (고급)" 영역으로 이동. 설치 가이드·API 문서 링크 추가. 웹 전용 유저도 self-serve 가능하게 유지. `POST /api/tokens` deprecated 표기 해제(공식 경로로 유지). (#199, 디스커션 #187 후속)

### Added
- **여행 멤버 목록 UI**: 여행 상세 페이지에 동행자 섹션 추가 — 아바타/이름/역할 배지(주인·호스트·게스트). OWNER → HOST → GUEST 순 정렬 후 joined_at 오름차순. (#193, 디스커션 #186)

### Fixed
- **여행 삭제/양도 전면 불가 상태 복구**: `POST /api/trips`가 생성자를 `HOST`로 기록해 OWNER가 존재하지 않던 문제 수정. 생성자는 이제 OWNER로 등록되며, 기존 여행은 마이그레이션으로 `tripMember.userId == trip.createdBy` 조건에서 OWNER로 승격됨. 홈 목록의 "호스트" 표시도 정상적으로 "내 여행"으로 복구됨. (#191, 디스커션 #188)
- **여행 삭제 UI 노출**: 여행 상세 페이지에 OWNER 전용 "여행 삭제" 버튼 추가. 확인 다이얼로그 포함. (#191)
- **여행 나가기 UI 노출**: HOST/GUEST 대상 "여행 나가기" 버튼 추가 — 초대 → 합류 → 나가기 플로우 완결. OWNER는 양도 후 탈퇴 필요 (API가 차단). (#191)
- **초대 링크 상대경로 생성**: dev 환경에서 invite URL이 `/invite/...` 상대경로로 생성되어 외부 앱 붙여넣기 시 `file://`로 해석되던 문제 수정. 위 URL 도출 재설계로 재발 불가. (#194, 디스커션 #185 Case 1 실제 원인)

## [2.2.6] - 2026-04-17

### Fixed
- **초대 링크 비로그인 플로우**: 비로그인 유저가 `/invite/{token}` 접근 시 middleware가 `callbackUrl`을 보존하지 않아 로그인 후 홈으로 이탈하던 문제 수정. 이제 로그인 완료 후 원래 초대 링크로 복귀하여 TripMember가 정상 생성됨. (#189, 디스커션 #185)

## [2.2.5] - 2026-04-17

### Fixed
- **Activity 시간 필드**: VarChar → Timestamptz 전환, 프로덕션 DB 정합성 수습 (#178)
- **auto-release**: CHANGELOG 특수문자 셸 확장 오류 수정 (--notes-file 방식)

### Added
- **IANA timezone 컬럼**: start_timezone, end_timezone으로 시간대 표시 지원 (#178)
- **docs/ARCHITECTURE.md**: 시스템 구조, 인증 흐름, 도메인 결합도 문서
- **docs/DOMAIN.md**: DDD 기술 도메인, 애그리거트, 이벤트 설계
- **docs/ERD.md**: 전체 DB 스키마 Mermaid ERD + 컬럼 코멘트
- **docs/README.md**: 기술 문서 허브 (포트폴리오/개발자용)
- **specs/README.md**: 기획 도메인 5개 정의 + 크로스 도메인 규칙
- **헌법 v1.2.0**: Cross-Domain Integrity(V) + Role-Based Access Control(VI) 원칙 추가

### Changed
- **specs/ 재구성**: 기획 도메인 기준 디렉토리 (travel-search, itinerary, collaboration, export)
- **기획/기술 영역 분리**: specs/ = 기획 원천, docs/ = 기술 원천, 헌법 = 원칙 원천

## [2.2.4] - 2026-04-16

### Fixed
- **MCP memo 줄바꿈**: CLI에서 `\n` 리터럴이 그대로 저장되던 문제 수정 (#169)
- **예약상태 라벨**: "불필요" → "예약 불필요"로 문구 보완 (#169)

### Changed
- **시간대 표기 지원**: Activity startTime/endTime VarChar(5→12) 확장, `13:00 KST` 형식 가능 (#169)
- **vitest SWC 전환**: `@vitejs/plugin-react` → `@vitejs/plugin-react-swc` (transform 12% 개선) (#170)
- **vitest vmThreads**: `pool: "vmThreads"` 적용으로 environment 18% 개선 (#170)

## [2.2.3] - 2026-04-16

### Fixed
- **PR 머지 전략**: develop → main은 merge commit 필수 (squash 시 역머지 충돌 문제 해결)

### Changed
- **CLAUDE.md + DEVELOPMENT.md**: PR 머지 전략 테이블 추가 (squash vs merge commit 사용 구분)

## [2.2.2] - 2026-04-16

### Fixed
- **핫픽스 프로세스**: main 직접 머지 금지, develop 경유 필수로 규칙 정립
- **speckit 하네스**: develop 브랜치 소스 편집 차단 추가 (enforce-speckit.sh, enforce-submit.sh)

### Changed
- **CLAUDE.md**: 핫픽스 규칙 + 브랜치 다이어그램에 hotfix 반영
- **docs/DEVELOPMENT.md**: 핫픽스 프로세스 섹션 추가

## [2.2.1] - 2026-04-16

### Fixed
- **PyPI 배포 실패**: rapidapi 테스트에서 삭제된 `get_client` 함수를 참조하던 테스트 수정

## [2.2.0] - 2026-04-16

### Added
- **OAuth CLI 인증**: install.sh에서 브라우저 Google 로그인 1회로 PAT 자동 발급·저장 (#128)
- **MCP 런타임 재인증**: 토큰 만료(401) 시 브라우저 자동 재인증 + 요청 재시도 (#129)
- **PAT 미설정 초기 인증**: MCP 첫 호출 시 토큰 없어도 브라우저 인증으로 자동 발급
- **auto-release.yml**: 태그 push 시 CHANGELOG 기반 GitHub Release 자동 생성
- **Git Flow Lite 전략**: main(production) + develop(dev) + feature 브랜치 전략 도입 (#148)
- **dev.trip.idean.me**: develop 브랜치 전용 알파 배포 도메인

### Changed
- **auto-tag.yml**: lightweight → annotated 태그 전환
- **install.sh**: 수동 PAT 입력 → 브라우저 OAuth 우선 (수동은 폴백)
- **token-helpers.ts**: createPAT 공유 헬퍼 추출, /api/tokens 리팩터
- **web_client.py**: asyncio.Lock 기반 동시 재인증 방지, 키체인 자동 갱신

## [2.1.0] - 2026-04-16

### Added
- **Activity 데이터 모델**: ActivityCategory/ReservationStatus enum + Activity 테이블 (#124)
- **Activity CRUD API**: GET/POST/PATCH/PUT/DELETE 엔드포인트 5개 (#127)
- **MCP 도구 확장**: create/update/delete/reorder_activity, get_day_content, clear_day_content — 14→20개 (#127, #134)
- **ActivityCard 컴포넌트**: 카테고리/시간/장소/비용/예약상태 카드 뷰 (#127)
- **ActivityForm 컴포넌트**: 구조화 입력 폼, 현지 시각 자동 세팅, 필수 필드 표시 (#125)
- **ActivityList 컴포넌트**: CRUD + 순서 변경(▲▼) 클라이언트 상태 관리 (#125)
- **memo URL 자동 링크**: 메모 내 URL을 클릭 가능한 링크로 렌더링 (새 창) (#125)
- **마크다운 변환 지원**: get_day_content + clear_day_content MCP 도구, 변환 안내 배너 (#134)
- **테스트 인프라**: Vitest + React Testing Library + Playwright E2E — 61케이스 (#141)
- **alpha 환경**: alpha.trip.idean.me 프리뷰 도메인 구성 (#127)
- **OpenAPI v2.1.0**: Activity 스키마 + 5개 엔드포인트 문서화 (#127)
- **GET /days/{dayId} API**: 단일 일자 상세 조회 (활동 포함) (#134)

### Changed
- **일자 상세 페이지**: DayEditor 제거 → ActivityList + 읽기 전용 메모 (#125)
- **get_trip MCP**: 일자별 활동 수 표시 (#127)

### Fixed
- **라우트 충돌**: `[id]`/`[slug]` 동적 라우트 통합 — dev 서버 크래시 해소 (#127)
- **인증 리다이렉트**: 로그인 상태에서 /auth/signin 접근 시 홈으로 (#127)
- **AUTH_URL Preview 스코프**: 프리뷰 배포 인증 정상화 (#127)

## [2.0.1] - 2026-04-14

### Fixed
- PAT 인증 수정 + UI 개선

## [2.0.0] - 2026-04-14

### Added
- Next.js 15 웹앱 (App Router, SSR)
- Auth.js v5 Google OAuth + PAT 인증
- Neon Postgres + Prisma 7
- MCP 14개 도구 (검색 8 + CRUD 6)
- OpenAPI 3.0 + Scalar 문서 뷰어
- 여행/일자/멤버 CRUD API
- 초대 링크 (JWT) + 소유권 이전
- macOS 키체인 통합 설치 스크립트
