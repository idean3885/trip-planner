# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
