# Research: v2.0.0 AX + API MCP

## R-001: PAT 인증 설계

**Decision**: SHA-256 해시 저장 + 생성 시 1회 원문 노출 + prefix 기반 식별

**Rationale**: GitHub, GitLab, Vercel 등 주요 플랫폼의 PAT 구현과 동일한 패턴. 토큰 원문을 DB에 저장하지 않으므로 DB 유출 시에도 토큰이 노출되지 않음.

**Alternatives considered**:
- 토큰 원문 저장: 간단하지만 보안 위험
- JWT 기반: 상태 비저장이지만 만료 전 무효화 불가, DB 조회 없이 권한 확인 가능하나 이 프로젝트 규모에서는 오버엔지니어링
- API Key (단순 랜덤 문자열 + 해시): 선택한 방식과 동일, PAT라는 이름이 사용자에게 더 친숙

## R-002: MCP 서버 통합 전략

**Decision**: 하나의 FastMCP 서버에 search + planner 도구를 모두 등록

**Rationale**: 사용자가 MCP 서버 1개만 설치하면 검색과 일정 관리가 모두 가능. Claude Desktop에서 도구 전환 없이 "호텔 검색 → 일정에 추가" 워크플로우가 자연스러움.

**Alternatives considered**:
- 분리 서버 (travel + planner): 역할 명확하지만 설치 복잡, 비개발자 허들 증가
- 웹 API를 MCP 없이 직접 호출: Claude Desktop이 HTTP 도구를 기본 제공하지 않으므로 불가

## R-003: 디렉토리 구조 분리

**Decision**: `src/` = Next.js 전용, `mcp/` = Python MCP 전용

**Rationale**: Vercel은 Next.js 빌드 시 `src/` 디렉토리를 참조. Python 코드가 섞여 있으면 빌드 경고 또는 혼란 유발. 물리적 분리로 "배포 대상 vs 로컬 실행 대상"이 디렉토리만으로 즉시 파악 가능.

**Alternatives considered**:
- 별도 레포: 가장 깔끔하지만 1인 개발에서 멀티 레포 관리 부담
- `packages/` 모노레포: Next.js + Python은 빌드 시스템이 달라 모노레포 도구(turborepo 등)의 이점이 없음

## R-004: API 문서화 방식

**Decision**: OpenAPI 3.0 수동 스펙 + 뷰어 페이지

**Rationale**: 자동 생성 도구(next-swagger-doc 등)는 Next.js App Router와 호환성 문제가 있거나 유지보수 중단 상태. 수동 스펙 + Scalar 뷰어가 가장 안정적이고 커스터마이징 가능.

**Alternatives considered**:
- next-swagger-doc: Pages Router 기반, App Router 미지원
- swagger-jsdoc: JSDoc 주석 기반, 타입 안전성 없음
- tRPC: 기존 REST API Routes와 병행하면 이중 관리

## R-005: PyPI 패키지 전략

**Decision**: 기존 이름 `trip-planner-mcp` 유지, 메이저 버전 2.0.0

**Rationale**: `uvx trip-planner-mcp` 설치 명령이 이미 배포되어 있음. 이름 변경 시 기존 사용자가 새 패키지를 찾을 수 없음. 메이저 버전 범프로 브레이킹 체인지 표시.

**Alternatives considered**:
- `trip-mcp`로 이름 변경: 간결하지만 기존 설치자 호환 깨짐
- 새 패키지 + 기존 패키지 deprecate: 관리 포인트 2배

## R-006: auth-helpers 확장 방식

**Decision**: 기존 `getSession()` 함수에 Bearer 토큰 분기 추가

**Rationale**: 모든 API 라우트가 `getSession()`을 사용하므로 이 함수 하나만 수정하면 전체 API가 PAT 인증을 지원. 기존 세션 인증 로직은 그대로 유지.

**Alternatives considered**:
- Next.js middleware에서 PAT 처리: middleware는 Edge Runtime 제약으로 Prisma 직접 사용 불가
- 별도 미들웨어 함수: 기존 코드에 새 함수 호출을 추가해야 하므로 변경 범위 확대
