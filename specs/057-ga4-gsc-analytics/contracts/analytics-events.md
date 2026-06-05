# Contract: 분석 이벤트 + 환경 설정 + 검색 노출

**Feature**: 057-ga4-gsc-analytics | **Date**: 2026-06-05

## 분석 이벤트 계약

| 이벤트명 | 발생 시점 | 파라미터 | 비고 |
|----------|-----------|----------|------|
| (page_view) | 모든 페이지 방문 | 자동 | `GoogleAnalytics` 자동 수집 |
| `trip_created` | 여행 생성 성공 | (없음/식별 불요) | 콘텐츠 PII 미포함 |
| `calendar_import` | 외부 캘린더 가져오기 실행 성공 | `{ provider: "GOOGLE"|"APPLE" }` | 메타만, PII 없음 |

> 가입(`sign_in`)은 서버 액션 로그인 구조라 클라이언트 이벤트가 부정확하다. 정밀 가입 집계는 서버 측 작업(후속). 로그인 사용자 활동은 page_view + `user_id` 연결로 파악한다.

- 전송 헬퍼 `track(name, params?)`는 측정 ID 미설정 시 no-op.
- `user_id`는 로그인 시 내부 식별자로 set, PII 금지.

## 환경 설정 계약

| 키 | 노출 | 형식 | 미설정 동작 |
|----|------|------|-------------|
| `NEXT_PUBLIC_GA_ID` | 클라이언트 | `G-XXXXXXX` | 분석 비활성(태그 미렌더, track no-op) |
| 검색 소유 확인값 | 서버 메타 | 문자열 | 소유 확인 메타 미출력 |

`.env.example`에 두 키를 주석과 함께 추가한다(값은 비움).

## 검색 노출 계약

### `/robots.txt` (robots.ts 산출)
```
User-agent: *
Allow: /
Disallow: /trips
Disallow: /settings
Disallow: /day
Sitemap: <origin>/sitemap.xml
```

### `/sitemap.xml` (sitemap.ts 산출)
- 포함: `/`, `/about`, `/docs`
- 제외: 로그인 뒤 경로 전부

### 색인 메타
- 공개 페이지: 색인 허용(기본)
- 앱 본체(인증 영역): `<meta name="robots" content="noindex">` (레이아웃 metadata `robots.index=false`)
- 소유 확인: 루트 `metadata.verification`(env 있을 때만)

## 비목표

- 동의(consent) 배너 UI — 후속
- 서버 측 Measurement Protocol(정밀 가입 추적) — 후속
- 동적 sitemap(공개 trip 없음) — 불필요
