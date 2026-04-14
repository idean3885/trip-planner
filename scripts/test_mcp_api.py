#!/usr/bin/env python3
"""
Travel MCP 서버 API 테스트 스크립트 (이슈 #5)
MCP 프레임워크 없이 RapidAPI 엔드포인트를 직접 호출하여 검증합니다.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

# Load .env from project root
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "booking-com15.p.rapidapi.com")

if not RAPIDAPI_KEY:
    print("ERROR: RAPIDAPI_KEY not found. Check .env file.")
    sys.exit(1)

HEADERS = {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
}
BASE_URL = f"https://{RAPIDAPI_HOST}"

# Test results tracking
results = []


def record(test_name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append((test_name, status, detail))
    icon = "✅" if passed else "❌"
    print(f"  {icon} {test_name}: {detail[:120]}")


async def api_get(endpoint: str, params: dict, retries: int = 3) -> dict:
    for attempt in range(retries):
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{BASE_URL}{endpoint}",
                headers=HEADERS,
                params=params,
                timeout=30.0,
            )
            if resp.status_code == 403:
                body = resp.json()
                msg = body.get("message", "Forbidden")
                if "not subscribed" in msg.lower():
                    raise Exception(
                        f"API 구독 필요: https://rapidapi.com/DataCrawler/api/booking-com15 에서 "
                        f"무료 플랜을 구독하세요. (key={RAPIDAPI_KEY[:20]}...)"
                    )
                raise Exception(f"403 Forbidden: {msg}")
            if resp.status_code == 429:
                wait = 5 * (attempt + 1)
                print(f"  [rate limit] {wait}초 대기 후 재시도 ({attempt+1}/{retries})...")
                await asyncio.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
    raise Exception(f"Rate limit 초과: {retries}회 재시도 실패")


# ──────────────────────────────────────────────
# 1. 회귀 테스트: search_destinations
# ──────────────────────────────────────────────
async def test_search_destinations():
    print("\n== 1. search_destinations 회귀 테스트 ==")
    for city in ["Madrid", "Porto", "Barcelona"]:
        await asyncio.sleep(1)
        try:
            data = await api_get("/api/v1/hotels/searchDestination", {"query": city})
            items = data.get("data", [])
            if items and len(items) > 0:
                first = items[0]
                record(
                    f"search_destinations({city})",
                    True,
                    f"Found {len(items)} results. First: {first.get('name')} (city_ufi={first.get('city_ufi')})",
                )
            else:
                record(f"search_destinations({city})", False, "No results returned")
        except Exception as e:
            record(f"search_destinations({city})", False, str(e))


# ──────────────────────────────────────────────
# 2. 회귀 테스트: get_hotels
# ──────────────────────────────────────────────
async def test_get_hotels():
    print("\n== 2. get_hotels 회귀 테스트 ==")
    # First get Madrid dest_id
    try:
        dest_data = await api_get("/api/v1/hotels/searchDestination", {"query": "Madrid"})
        dest_id = dest_data["data"][0].get("dest_id", dest_data["data"][0].get("city_ufi"))
        if not dest_id:
            record("get_hotels(Madrid)", False, "Could not find dest_id for Madrid")
            return

        data = await api_get("/api/v1/hotels/searchHotels", {
            "dest_id": dest_id,
            "search_type": "CITY",
            "arrival_date": "2026-06-11",
            "departure_date": "2026-06-12",
            "adults": "2",
        })
        hotels = data.get("data", {}).get("hotels", [])
        if hotels:
            first_name = hotels[0].get("property", {}).get("name", "Unknown")
            record("get_hotels(Madrid, 6/11-12)", True, f"Found {len(hotels)} hotels. First: {first_name}")
        else:
            record("get_hotels(Madrid, 6/11-12)", False, "No hotels returned")
    except Exception as e:
        record("get_hotels(Madrid)", False, str(e))


# ──────────────────────────────────────────────
# 3. 호텔 상세: get_hotel_details
# ──────────────────────────────────────────────
HOTEL_TESTS = [
    ("마드리드: Mercure Lope de Vega", "Mercure Madrid Centro Lope de Vega", "2026-06-11", "2026-06-12"),
    ("세비야: Hotel Rey Alfonso X", "Hotel Rey Alfonso X", "2026-06-12", "2026-06-14"),
    ("그라나다: Hotel Palacio de Santa Inés", "Hotel Palacio de Santa Inés", "2026-06-14", "2026-06-15"),
    ("바르셀로나: Eric Vökel BCN Suites", "Eric Vökel BCN Suites", "2026-06-15", "2026-06-20"),
]


async def find_hotel_id(hotel_name: str, city: str, checkin: str, checkout: str) -> Optional[str]:
    """Search for a hotel by name in a city and return its hotel_id."""
    # Extract city name from the test label
    dest_data = await api_get("/api/v1/hotels/searchDestination", {"query": city})
    items = dest_data.get("data", [])
    if not items:
        return None

    dest_id = items[0].get("dest_id", items[0].get("city_ufi"))
    hotels_data = await api_get("/api/v1/hotels/searchHotels", {
        "dest_id": dest_id,
        "search_type": "CITY",
        "arrival_date": checkin,
        "departure_date": checkout,
        "adults": "2",
    })

    hotels = hotels_data.get("data", {}).get("hotels", [])
    # Try to find matching hotel by name (partial match)
    search_lower = hotel_name.lower()
    for h in hotels:
        prop = h.get("property", {})
        name = prop.get("name", "").lower()
        if search_lower in name or name in search_lower:
            return str(prop.get("id", ""))

    # If not found, return first hotel as fallback for testing
    if hotels:
        return str(hotels[0].get("property", {}).get("id", ""))
    return None


async def test_hotel_details():
    print("\n== 3. get_hotel_details 테스트 ==")
    cities = ["Madrid", "Sevilla", "Granada", "Barcelona"]

    for i, (label, hotel_name, checkin, checkout) in enumerate(HOTEL_TESTS):
        city = cities[i]
        try:
            hotel_id = await find_hotel_id(hotel_name, city, checkin, checkout)
            if not hotel_id:
                record(f"get_hotel_details({label})", False, "Hotel ID not found via search")
                continue

            data = await api_get("/api/v1/hotels/getHotelDetails", {
                "hotel_id": hotel_id,
                "arrival_date": checkin,
                "departure_date": checkout,
                "adults": "2",
                "currency_code": "EUR",
            })

            detail = data.get("data", {})
            if not detail:
                record(f"get_hotel_details({label})", False, "No data returned")
                continue

            name = detail.get("hotel_name", "?")
            score = detail.get("review_score")
            if not score:
                wifi = detail.get("wifi_review_score", {})
                score = wifi.get("rating") if isinstance(wifi, dict) else None
            score = score if score else "N/A"
            review_count = detail.get("review_nr", "N/A")
            facilities = detail.get("facilities_block", {}).get("facilities", [])
            price_info = detail.get("composite_price_breakdown", {})
            gross = price_info.get("gross_amount_per_night", {})

            has_review = score != "N/A" and score is not None
            has_facilities = len(facilities) > 0
            has_price = bool(gross)

            checks = []
            if has_review:
                checks.append(f"rating={score}")
            else:
                checks.append("rating=MISSING")
            if has_facilities:
                checks.append(f"facilities={len(facilities)}")
            else:
                checks.append("facilities=MISSING")
            if has_price:
                checks.append(f"price={gross.get('currency','?')}{gross.get('value','?')}/night")
            else:
                checks.append("price=MISSING")

            all_ok = has_review and has_facilities and has_price
            record(
                f"get_hotel_details({label})",
                all_ok,
                f"{name} | {', '.join(checks)}",
            )
        except Exception as e:
            record(f"get_hotel_details({label})", False, str(e))


# ──────────────────────────────────────────────
# 4. 항공편: search_flight_destinations
# ──────────────────────────────────────────────
async def test_flight_destinations():
    print("\n== 4. search_flight_destinations 테스트 ==")
    airport_ids = {}
    for city in ["Porto", "Madrid", "Granada", "Barcelona"]:
        try:
            data = await api_get("/api/v1/flights/searchDestination", {"query": city})
            items = data.get("data", [])
            if items:
                # Find airport type
                airport = None
                for item in items:
                    if item.get("type") == "AIRPORT":
                        airport = item
                        break
                if not airport:
                    airport = items[0]

                aid = airport.get("id", "N/A")
                airport_ids[city] = aid
                record(
                    f"search_flight_destinations({city})",
                    True,
                    f"{airport.get('name')} | ID={aid} | IATA={airport.get('code', 'N/A')}",
                )
            else:
                record(f"search_flight_destinations({city})", False, "No results")
        except Exception as e:
            record(f"search_flight_destinations({city})", False, str(e))

    return airport_ids


# ──────────────────────────────────────────────
# 5. 항공편: search_flights
# ──────────────────────────────────────────────
async def test_search_flights(airport_ids: dict):
    print("\n== 5. search_flights 테스트 ==")
    routes = [
        ("Porto", "Madrid", "2026-06-11"),
        ("Granada", "Barcelona", "2026-06-15"),
    ]

    for from_city, to_city, date in routes:
        from_id = airport_ids.get(from_city)
        to_id = airport_ids.get(to_city)

        if not from_id or not to_id:
            record(f"search_flights({from_city}→{to_city})", False, f"Missing airport IDs: {from_id}, {to_id}")
            continue

        try:
            data = await api_get("/api/v1/flights/searchFlights", {
                "fromId": from_id,
                "toId": to_id,
                "departDate": date,
                "adults": "2",
                "cabinClass": "ECONOMY",
                "currency_code": "EUR",
            })

            flight_data = data.get("data", {})
            flights = flight_data.get("flightOffers", flight_data.get("flights", []))

            if flights:
                first = flights[0]
                price = first.get("priceBreakdown", {}).get("total", {})
                price_str = f"{price.get('currencyCode', '?')}{price.get('units', '?')}" if price else "N/A"

                segments = first.get("segments", [])
                baggage = first.get("baggagePolicy", {})

                has_price = bool(price)
                has_time = len(segments) > 0
                has_baggage = bool(baggage)

                checks = [f"price={price_str}"]
                if has_time and segments:
                    seg = segments[0]
                    dep_t = seg.get("departureTime", "?")
                    arr_t = seg.get("arrivalTime", "?")
                    checks.append(f"time={dep_t}→{arr_t}")
                else:
                    checks.append("time=MISSING")
                checks.append(f"baggage={'OK' if has_baggage else 'MISSING'}")

                record(
                    f"search_flights({from_city}→{to_city}, {date})",
                    has_price and has_time,
                    f"{len(flights)} flights | {', '.join(checks)}",
                )
            else:
                record(f"search_flights({from_city}→{to_city}, {date})", False, "No flights found")
        except Exception as e:
            record(f"search_flights({from_city}→{to_city}, {date})", False, str(e))


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
async def main():
    print("=" * 60)
    print("Travel MCP 서버 API 테스트 (이슈 #5)")
    print("=" * 60)

    await test_search_destinations()
    await test_get_hotels()
    await test_hotel_details()
    airport_ids = await test_flight_destinations()
    await test_search_flights(airport_ids)

    # Summary
    print("\n" + "=" * 60)
    print("테스트 결과 요약")
    print("=" * 60)
    passed = sum(1 for _, s, _ in results if s == "PASS")
    failed = sum(1 for _, s, _ in results if s == "FAIL")
    print(f"  Total: {len(results)} | PASS: {passed} | FAIL: {failed}")

    if failed > 0:
        print("\n  실패 항목:")
        for name, status, detail in results:
            if status == "FAIL":
                print(f"    ❌ {name}: {detail[:100]}")

    print()
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
