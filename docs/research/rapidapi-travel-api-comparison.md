# RapidAPI 여행 API 비교 조사

> **대상 독자**: 리서치(조사 스냅샷) — 여행 API 채택 결정의 원자료를 확인하려는 분.

> 조사일: 2026-03-19 | 이슈: #1

## 종합 비교 표

| API | 제공자 | Host | 유형 | 무료 tier | 커버리지 | 강점 |
|-----|--------|------|------|-----------|---------|------|
| **booking-com15** | DataCrawler | booking-com15.p.rapidapi.com | 비공식 스크래퍼 | 500회/월 | 호텔+항공+렌터카+택시+어트랙션 | 가장 종합적 |
| **booking** | apidojo | booking.p.rapidapi.com | 비공식 스크래퍼 | 500회/월 | 호텔 위주 | 안정적인 호텔 데이터 |
| **hotels4** | apidojo | hotels4.p.rapidapi.com | 비공식 스크래퍼 | 500회/월 | 호텔 (Hotels.com) | Hotels.com 데이터 |
| **hotels-com-provider** | tipsters | - | 비공식 스크래퍼 | 미확인 | 호텔 | 사진+리뷰 포함 |
| **agoda-com** | ntd119 | agoda-com.p.rapidapi.com | 비공식 스크래퍼 | 500회/월 추정 | 호텔+항공 (Agoda) | 아시아 숙소 |
| **tripadvisor16** | DataCrawler | tripadvisor16.p.rapidapi.com | 비공식 스크래퍼 | 500회/월 | 호텔+항공+레스토랑+어트랙션 | 리뷰+레스토랑 |
| **skyscanner50** | DataCrawler | skyscanner50.p.rapidapi.com | 비공식 스크래퍼 | 500회/월 | 항공 특화 | 항공편 비교 |
| **Xotelo** | 독립 | xotelo.com/api.html | 무료 독립 API | 완전 무료 | 호텔 가격 비교 | 무료, 간단 |
| **Expedia Rapid** | Expedia (공식) | - | 공식 파트너 API | 파트너 전용 | 호텔+항공+렌터카 | 70만+ 숙소, 신뢰성 |
| **Amadeus** | Amadeus (공식) | - | 공식 Self-Service | 월 무료 쿼터 | 항공 GDS | 실시간 항공 데이터 |

---

## 상세 분석

### 1. booking-com15 (DataCrawler) — 현재 사용 중

**Host:** `booking-com15.p.rapidapi.com`

Booking.com 데이터를 스크래핑하는 비공식 API. 호텔, 항공, 렌터카, 택시, 어트랙션 5개 카테고리를 단일 API로 커버하는 가장 포괄적인 제품.

**확인된 엔드포인트:**

| 카테고리 | 엔드포인트 경로 | 현재 구현 |
|---------|--------------|-----------|
| Hotels | `/api/v1/hotels/searchDestination` | ✅ 구현됨 |
| Hotels | `/api/v1/hotels/searchHotels` | ✅ 구현됨 |
| Hotels | `/api/v1/hotels/getHotelDetails` | ❌ |
| Hotels | `/api/v1/hotels/getRoomList` | ❌ |
| Hotels | `/api/v1/hotels/getHotelReviews` | ❌ |
| Hotels | `/api/v1/hotels/getHotelFacilities` | ❌ |
| Hotels | `/api/v1/hotels/getStaticMap` | ❌ |
| Flights | `/api/v1/flights/searchFlights` | ❌ |
| Flights | `/api/v1/flights/getFlightDetails` | ❌ |
| Flights | `/api/v1/flights/getSeatMap` | ❌ |
| Car Rental | `/api/v1/cars/searchCarRentals` | ❌ |
| Car Rental | `/api/v1/cars/vehicleDetails` | ❌ |
| Car Rental | `/api/v1/cars/bookingSummary` | ❌ |
| Taxi | `/api/v1/taxi/searchTaxi` | ❌ |
| Attractions | `/api/v1/attraction/searchAttractions` | ❌ |
| Meta | `/api/v1/meta/getExchangeRates` | ❌ |
| Meta | `/api/v1/meta/getLanguages` | ❌ |
| Meta | `/api/v1/meta/getCurrency` | ❌ |

**가격:** Free 500회/월, PRO/ULTRA/MEGA 유료 (동적 로딩으로 정확한 금액 미확인)

---

### 2. booking (apidojo) — 유저가 공유한 링크

**Host:** `booking.p.rapidapi.com`

apidojo 제공 Booking.com 비공식 API. GET 엔드포인트만 제공.

**확인된 엔드포인트:**
- `properties/list-by-map` — 지도 기반 호텔 검색
- `properties/get-facilities` — 시설 정보
- `properties/get-static-map` — 정적 지도
- `properties/get-featured-reviews` — 주요 리뷰
- `properties/get-description` — 숙소 설명

**booking-com15 vs booking(apidojo):**

| 항목 | booking-com15 (DataCrawler) | booking (apidojo) |
|------|----------------------------|-------------------|
| 커버리지 | 호텔+항공+렌터카+택시+어트랙션 | 주로 호텔 |
| 엔드포인트 수 | ~20+ | ~10 |
| 안정성 | 활발한 업데이트 | 오래됨, 간헐적 이슈 |
| 추천 용도 | 종합 여행 플래너 | 호텔 전용 앱 |

---

### 3. Hotels.com APIs

**hotels4 (apidojo):** Hotels.com 라이브 데이터, 500회/월 무료, 호텔 검색/객실/시설/정책.

**hotels-com-provider (tipsters):** 호텔 검색, 가격, 사진, 리뷰.

→ Hotels.com 데이터 특화. 범용 여행 플래너보다는 특수 용도 적합.

---

### 4. Agoda APIs

**agoda-com (ntd119):** 비공식 스크래퍼, 호텔+항공, 500회/월 추정. 아시아 숙소 강세.

**공식 Agoda API:** 파트너 전용, 일반 개발자 접근 불가.

→ 포르투갈/스페인 여행에는 Booking.com이 더 적합. 동남아 여행 시 고려.

---

### 5. 기타

**tripadvisor16 (DataCrawler):** 레스토랑+어트랙션 리뷰 강점. 500회/월 무료. DataCrawler 동일 패턴.

**skyscanner50 (DataCrawler):** 항공편 특화. 500회/월 무료.

**Xotelo:** 완전 무료 호텔 가격 비교 API. TripAdvisor 기반.

---

## 권장 구성

### 이 프로젝트 (포르투갈&스페인 신혼여행)

| 순위 | API | 용도 | 사유 |
|------|-----|------|------|
| 1순위 | **booking-com15** (유지) | 호텔+항공+렌터카+택시+어트랙션 | 이미 사용 중, 가장 포괄적, 단일 API로 5개 카테고리 |
| 2순위 | **tripadvisor16** (신규) | 레스토랑+어트랙션 리뷰 | 맛집/관광지 추천 데이터 보강, 동일 DataCrawler 패턴 |
| 보조 | **Xotelo** (선택) | 호텔 가격 비교 | 무료, OTA 간 가격 비교 시 |

### 비용
- 개인 여행 플래너는 **Free tier (월 500회)로 충분**
- 여러 DataCrawler API를 구독하면 **각각 500회 무료**이므로 병렬 활용 가능
- 유료 플랜은 실제 서비스 출시 후 필요 시 업그레이드

### 주의사항
- 모든 RapidAPI 비공식 스크래퍼 API는 **원본 사이트 정책 변경 시 중단 가능**
- **실제 예약 처리 불가** (데이터 조회/표시만 가능)
- 상업적 서비스 시 Expedia Rapid API 또는 공식 파트너십 검토 필요

---

## References

- [booking-com15 (DataCrawler)](https://rapidapi.com/DataCrawler/api/booking-com15)
- [booking (apidojo)](https://rapidapi.com/apidojo/api/booking)
- [hotels4 (apidojo)](https://rapidapi.com/apidojo/api/hotels4)
- [hotels-com-provider (tipsters)](https://rapidapi.com/tipsters/api/hotels-com-provider)
- [agoda-com (ntd119)](https://rapidapi.com/ntd119/api/agoda-com)
- [tripadvisor16 (DataCrawler)](https://rapidapi.com/DataCrawler/api/tripadvisor16)
- [skyscanner50 (DataCrawler)](https://rapidapi.com/DataCrawler/api/skyscanner50)
- [Xotelo Free Hotel Prices API](https://xotelo.com/)
- [Hotels MCP Server (GitHub)](https://github.com/esakrissa/hotels_mcp_server)
