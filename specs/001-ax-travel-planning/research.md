# Research: AX 기반 여행 플래닝 + 모바일 딜리버리

**Branch**: `001-ax-travel-planning` | **Date**: 2026-03-22
**Input**: [spec.md](spec.md), [constitution.md](../../.specify/memory/constitution.md)

---

## R1. 여행 요소 검색 API 커버리지

### Decision: Booking.com RapidAPI (booking-com15) 단일 API 유지

### Rationale
- 이미 Hotels, Flights MCP 도구 구현 완료 (검증됨)
- 동일 API에서 Attractions 엔드포인트 추가 가용 (단, 엔드포인트 경로는 구현 시 실제 호출로 검증 필요)
- 월 $8.99 단일 비용으로 Minimum Cost 원칙 충족

### Alternatives Considered
| 대안 | 평가 | 탈락 사유 |
|------|------|-----------|
| Google Places API | 식당 커버리지 우수 | 유료 ($17/1000건), Minimum Cost 위반 |
| Yelp Fusion API | 식당 리뷰 풍부 | 유럽 커버리지 약함, 추가 API 키 관리 |
| TripAdvisor API | 관광+식당 통합 | 유료, 승인 절차 복잡 |
| Foursquare API | 무료 티어 존재 | 커버리지 불안정, 추가 의존성 |

### API 엔드포인트 매핑

| 영역 | API 소스 | 엔드포인트 | 상태 |
|------|----------|-----------|------|
| 숙소 검색 | booking-com15 | `/api/v1/hotels/searchDestination` | 구현 완료 |
| 숙소 목록 | booking-com15 | `/api/v1/hotels/searchHotels` | 구현 완료 |
| 숙소 상세 | booking-com15 | `/api/v1/hotels/getHotelDetails` | 구현 완료 |
| 항공편 검색 | booking-com15 | `/api/v1/flights/searchDestination` | 구현 완료 |
| 항공편 목록 | booking-com15 | `/api/v1/flights/searchFlights` | 구현 완료 |
| 관광지 검색 | booking-com15 | `/api/v1/attraction/searchLocation` | 신규 — 검증 필요 |
| 관광지 목록 | booking-com15 | `/api/v1/attraction/searchAttractions` | 신규 — 검증 필요 |
| 관광지 상세 | booking-com15 | `/api/v1/attraction/getAttractionDetails` | 신규 — 검증 필요 |

> **Note**: Attractions 엔드포인트 경로는 API 문서에서 직접 확인하지 못함 (RapidAPI SPA 크롤링 불가). 구현 태스크에서 실제 API 호출로 검증하고, 실패 시 대안 엔드포인트를 탐색해야 함.

### 식당 추천 전략

| 단계 | 방법 | 목적 |
|------|------|------|
| 1. 딥 리서치 | Claude 웹 검색으로 현지 식당 후보 탐색 | 후보 리스트 확보 |
| 2. 운영 여부 확인 | 최신 리뷰(Google Maps, TripAdvisor 등) 크로스체크 | 폐업/휴업 필터링 |
| 3. 추천 제시 | 후보를 추천 기준(위치, 메뉴, 가격대, 리뷰)과 함께 정리 | 사용자 선택 지원 |

> 별도 API 비용 없이 Claude Desktop의 웹 검색 기능을 활용. Minimum Cost 원칙 충족.

### 도시 간 이동 전략

| 영역 | 방법 | 비고 |
|------|------|------|
| 도시 간 항공 | Flights API (구현 완료) | 실시간 검색 |
| 도시 간 기차/버스 | Claude 지식 + 웹 검색 | 주요 노선·소요시간·대략적 가격 안내. v1 한계 |

> **v2 고려사항**: Rome2Rio API (기차·버스·항공·페리 통합 검색, 240+ 국가) 도입 검토. 현재 API 비용 미확인.

---

## R2. 일정 생성 아키텍처

### Decision: Claude Desktop/Code가 마크다운 파일을 직접 생성

### Rationale
- AX-First 원칙: Claude가 MCP 도구로 데이터를 수집하고, 분석·요약하여 마크다운으로 출력
- 기존 `trips/` 디렉토리 구조(CLAUDE.md에 정의)를 그대로 활용
- 별도 생성 엔진 불필요 — Claude 자체가 생성 엔진
- 기존 예약 데이터가 마크다운에 있으면 Claude가 읽고 유지

### Alternatives Considered
| 대안 | 평가 | 탈락 사유 |
|------|------|-----------|
| Jinja2 템플릿 엔진 | 일관된 포맷 보장 | Claude가 직접 생성하면 불필요, 오버엔지니어링 |
| JSON → Markdown 변환기 | 프로그래밍적 생성 | 중간 데이터 포맷 관리 부담, AX-First 위반 |
| 데이터베이스 + 렌더러 | 구조화된 데이터 관리 | Minimum Cost 위반, v1 범위 초과 |

### 생성 플로우
```
사용자 요청 → Claude Desktop/Code
  → MCP 도구로 검색 (Hotels, Flights, Attractions)
  → Claude 웹 검색으로 식당·교통 리서치
  → Claude가 결과 분석·추천
  → 사용자 확정
  → Claude가 trips/{year}-{trip-name}/ 구조로 마크다운 생성
  → git push → GitHub Pages 배포
```

---

## R3. 모바일 딜리버리 방식

### Decision: GitHub Pages Project Site + Jekyll 기본 테마

### Rationale
- 무료 호스팅 (Minimum Cost)
- 마크다운 자동 렌더링 (Jekyll 내장)
- 모바일 반응형 기본 지원
- `git push`만으로 배포 완료 — 개발자 병목 최소화
- 동행자는 URL만 공유받아 모바일 브라우저에서 열람
- 기존 블로그(User Site)와 병행 가능 — Project Site는 `/travel-planner` 경로로 분리

### URL 구조
- **베이스**: `https://idean3885.github.io/travel-planner/`
- **일정 예시**: `https://idean3885.github.io/travel-planner/trips/2026-honeymoon-portugal-spain/itinerary`

### Alternatives Considered
| 대안 | 평가 | 탈락 사유 |
|------|------|-----------|
| GitHub 레포 마크다운 뷰어 | 가장 간단 | 모바일에서 테이블 가로스크롤 발생, 링크 탐색 불편 |
| Notion 공유 페이지 | 모바일 UX 우수 | 데이터 이중 관리, 자동화 복잡 |
| Google Docs | 공유 편리 | 마크다운 비호환, 수동 변환 필요 |
| Vercel/Netlify 정적 사이트 | 유연한 커스터마이징 | 추가 설정·빌드 필요, Minimum Cost 원칙상 GitHub Pages로 충분 |

### 모바일 최적화 전략
- 테이블 대신 리스트/카드 형태 사용 (가로스크롤 방지)
- 숙소/관광지 링크는 모바일 탭 가능한 형태로
- 일별 일정은 개별 페이지로 분리 (긴 스크롤 방지)
- Jekyll 기본 테마 `minima`의 반응형 레이아웃 활용

---

## R4. MCP 서버 구조

### Decision: 기존 단일 MCP 서버에 Attractions 도구 추가

### Rationale
- 이미 `hotels_mcp_server`가 Hotels + Flights를 통합 관리 중
- 동일한 RapidAPI 키와 호스트 사용 — 별도 서버 불필요
- FastMCP 기반으로 도구 추가만으로 확장 가능
- 서버 이름을 `travel`로 이미 설정되어 있음

### Alternatives Considered
| 대안 | 평가 | 탈락 사유 |
|------|------|-----------|
| 영역별 MCP 서버 분리 | 관심사 분리 | 1인 개발에 과도한 분리, 관리 부담 증가 |
| MCP 서버 없이 직접 API 호출 | 단순화 | Claude Desktop에서 MCP 도구가 더 자연스러운 통합 제공 |

---

## R5. 테스트 전략

### Decision: pytest 자동 검증 + 실제 여행 데이터 E2E 검증

### Rationale
- MCP 도구의 입출력을 자동화 테스트로 검증 (API 응답 파싱, 포맷팅 로직)
- 실제 API 호출은 모킹으로 대체하여 비용 절감
- SC-005 "실제 여행 데이터로 전체 플래닝 사이클 완료"는 출발 전 E2E 검증으로 수행

### 테스트 계층
| 계층 | 대상 | 방법 |
|------|------|------|
| 단위 테스트 | API 응답 파싱, 포맷팅 로직 | pytest + 모킹된 API 응답 |
| 통합 테스트 | MCP 도구 호출 → 결과 포맷 | pytest + 실제 API 호출 (선별적) |
| E2E 검증 | 전체 플래닝 사이클 | 실제 여행 데이터로 Claude Desktop에서 수행 |

---

## R6. GitHub Pages 설정

### Decision: Project Site로 `trips/` 디렉토리를 GitHub Pages 소스로 사용

### Rationale
- 별도 빌드 없이 마크다운을 Jekyll이 자동 변환
- `_config.yml` 최소 설정만 필요
- 기존 `trips/` 구조를 변경 없이 활용
- Project Site로 기존 블로그(User Site)와 독립 운영

### 구성
```yaml
# _config.yml (repository root)
theme: minima
title: "Travel Planner"
baseurl: "/travel-planner"
include:
  - trips
```

---

## 해소된 NEEDS CLARIFICATION 항목

| 항목 | 해소 내용 |
|------|-----------|
| Language/Version | Python 3.14 (기존 MCP 서버 venv 기준) |
| Primary Dependencies | FastMCP, httpx, python-dotenv, pytest |
| Storage | 마크다운 파일 (`trips/` 디렉토리) |
| Testing | pytest 자동 검증 + 실제 여행 E2E |
| Target Platform | Claude Desktop/Code (MCP) + GitHub Pages Project Site (딜리버리) |
| Project Type | MCP 서버 (도구 제공) + 정적 사이트 (딜리버리) |
| Performance Goals | API 응답 30초 이내 (기존 timeout 설정) |
| Constraints | Booking.com API 월 250건 (Basic), 추가 비용 없음 |
| Scale/Scope | 1건 여행 (15일, 5개 도시), 사용자 1+동행자 2~5명 |
