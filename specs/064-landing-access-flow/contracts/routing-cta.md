# Contract: 진입 라우팅 · 상태별 CTA

본 피처가 노출하는 UI·라우팅 계약. 데이터 API 변경은 없다.

## 라우팅 계약

| 진입 | 세션 | 결과 | 근거 |
|------|------|------|------|
| `GET /` | 로그아웃 | 대문 렌더 | FR-001 (기존 유지) |
| `GET /` | 로그인 | 대문 렌더 (리다이렉트 없음) | FR-001 (변경) |
| 로고 클릭 (`href="/"`) | 로그인/로그아웃 | 대문 이동 | FR-002 |
| 로그인 완료, `callbackUrl` 없음 | — | `/trips` 이동 | FR-003 |
| 로그인 완료, `callbackUrl` 있음 | — | `callbackUrl` 이동 | FR-003 (기존 유지) |
| 로그인 사용자, `/auth/*` 진입 | 로그인 | `/trips` 이동 | FR-004 (기존 미들웨어 유지) |
| `GET /trips` | 로그아웃 | `/auth/signin?callbackUrl=/trips` 유도 | FR-005 (기존 유지) |
| `GET /trips` | 로그인 | 여행 목록 렌더 (대문으로 되돌리지 않음) | FR-008 |

## CTA 계약 (대문 Hero · BottomCta)

| 위치 | 세션 | 라벨 | href |
|------|------|------|------|
| Hero 주 CTA | 로그아웃 | `시작하기` | `/auth/signin?callbackUrl=/trips` |
| Hero 주 CTA | 로그인 | `여행 목록으로` | `/trips` |
| BottomCta 주 CTA | 로그아웃 | `시작하기` | `/auth/signin?callbackUrl=/trips` |
| BottomCta 주 CTA | 로그인 | `여행 목록으로` | `/trips` |

- BottomCta 본문·헤딩은 로그아웃(신규 유입 톤)과 로그인(이어가기 톤)으로 분기한다. 로그인 상태에서 "1초 로그인" 류 로그아웃 전제 문구는 노출하지 않는다.
- 보조 링크(GitHub·프로젝트 소개)는 두 상태 공통 유지.

## 컴포넌트 시맨틱 계약

- 통합 소개 섹션의 최상위 헤딩은 `h2` 1개, 각 카드 제목은 `h3`로 통일한다.
- 이동 CTA는 앵커(`<a>`, `Link` 렌더)로, 로그아웃 동작만 실제 `<button>`으로 유지한다.
