"""검색 도구 — 숙소, 항공편, 관광지 (RapidAPI 기반)."""

import json
import logging
import re
from urllib.parse import quote_plus

from mcp.server.fastmcp import FastMCP
from trip_mcp.rapidapi import make_rapidapi_request

logger = logging.getLogger("trip-mcp-server")


def register_search_tools(mcp: FastMCP) -> None:
    """검색 도구 8개를 FastMCP 서버에 등록한다."""

    @mcp.tool()
    async def search_destinations(query: str) -> str:
        """Search for hotel destinations by name.

        Args:
            query: The destination to search for (e.g., "Paris", "New York", "Tokyo")
        """
        logger.info(f"Searching for destinations with query: {query}")
        result = await make_rapidapi_request("/api/v1/hotels/searchDestination", {"query": query})

        if "error" in result:
            return f"Error fetching destinations: {result['error']}"

        formatted = []
        if "data" in result and isinstance(result["data"], list):
            for dest in result["data"]:
                formatted.append(
                    f"Name: {dest.get('name', 'Unknown')}\n"
                    f"Type: {dest.get('dest_type', 'Unknown')}\n"
                    f"City ID: {dest.get('city_ufi', 'N/A')}\n"
                    f"Region: {dest.get('region', 'Unknown')}\n"
                    f"Country: {dest.get('country', 'Unknown')}\n"
                    f"Coordinates: {dest.get('latitude', 'N/A')}, {dest.get('longitude', 'N/A')}"
                )
            return "\n---\n".join(formatted) if formatted else "No destinations found matching your query."
        return "Unexpected response format from the API."

    @mcp.tool()
    async def get_hotels(destination_id: str, checkin_date: str, checkout_date: str, adults: int = 2, currency_code: str = "KRW") -> str:
        """Get hotels for a specific destination. After showing results, ALWAYS call get_hotel_details for hotels the user is interested in to provide booking links and detailed information.

        Args:
            destination_id: The destination ID (city_ufi from search_destinations)
            checkin_date: Check-in date in YYYY-MM-DD format
            checkout_date: Check-out date in YYYY-MM-DD format
            adults: Number of adults (default: 2)
            currency_code: Currency code for prices (default: KRW). Examples: KRW, EUR, USD
        """
        result = await make_rapidapi_request("/api/v1/hotels/searchHotels", {
            "dest_id": destination_id, "search_type": "CITY",
            "arrival_date": checkin_date, "departure_date": checkout_date,
            "adults": str(adults), "currency_code": currency_code,
        })

        if "error" in result:
            return f"Error fetching hotels: {result['error']}"

        formatted = []
        hotels_data = result.get("data", {}).get("hotels", [])
        if not hotels_data:
            return "No hotels found for this destination and dates."

        for hotel_entry in hotels_data[:10]:
            prop = hotel_entry.get("property", {})
            if not prop:
                continue

            room_info = "Not available"
            label = hotel_entry.get("accessibilityLabel", "")
            if label:
                match = re.search(r'(Hotel room|Entire villa|Private suite|Private room)[^\.]*', label)
                if match:
                    room_info = match.group(0).strip()

            parts = [
                f"Name: {prop.get('name', 'Unknown')}",
                f"Hotel ID: {prop.get('id', 'N/A')}",
                f"Location: {prop.get('wishlistName', 'Unknown')}",
                f"Rating: {prop.get('reviewScore', 'N/A')}/10",
                f"Reviews: {prop.get('reviewCount', 'N/A')} ({prop.get('reviewScoreWord', 'N/A')})",
                f"Room: {room_info}",
            ]

            price_bd = prop.get("priceBreakdown", {})
            gross = price_bd.get("grossPrice", {})
            if gross:
                parts.append(f"Price: {gross.get('currency', '$')}{gross.get('value', 'N/A')}")
                strike = price_bd.get("strikethroughPrice", {})
                if strike and strike.get("value"):
                    try:
                        pct = round((1 - float(gross["value"]) / float(strike["value"])) * 100)
                        if pct > 0:
                            parts.append(f"Discount: {pct}% off")
                    except (ValueError, TypeError, ZeroDivisionError):
                        pass
            else:
                parts.append("Price: Not available")

            if "latitude" in prop:
                parts.append(f"Coordinates: {prop['latitude']}, {prop.get('longitude', 'N/A')}")
            if "propertyClass" in prop:
                parts.append(f"Stars: {prop['propertyClass']}")
            photos = prop.get("photoUrls", [])
            if photos:
                parts.append(f"Photo: {photos[0]}")
            ci = prop.get("checkin", {})
            co = prop.get("checkout", {})
            if ci and co:
                parts.append(f"Check-in: {ci.get('fromTime', 'N/A')}-{ci.get('untilTime', 'N/A')}")
                parts.append(f"Check-out: by {co.get('untilTime', 'N/A')}")

            formatted.append("\n".join(parts))

        return "\n---\n".join(formatted)

    @mcp.tool()
    async def get_hotel_details(hotel_id: str, checkin_date: str, checkout_date: str, adults: int = 2, currency_code: str = "KRW") -> str:
        """Get detailed information about a specific hotel including reviews, facilities, policies, and booking links.

        Args:
            hotel_id: The hotel ID (from get_hotels results)
            checkin_date: Check-in date in YYYY-MM-DD format
            checkout_date: Check-out date in YYYY-MM-DD format
            adults: Number of adults (default: 2)
            currency_code: Currency code for prices (default: KRW). Examples: KRW, EUR, USD
        """
        result = await make_rapidapi_request("/api/v1/hotels/getHotelDetails", {
            "hotel_id": hotel_id, "arrival_date": checkin_date,
            "departure_date": checkout_date, "adults": str(adults),
            "currency_code": currency_code,
        })

        if "error" in result:
            return f"Error fetching hotel details: {result['error']}"

        data = result.get("data", {})
        if not data:
            return "No hotel details found."

        parts = []
        parts.append(f"Name: {data.get('hotel_name', 'Unknown')}")
        parts.append(f"Address: {data.get('address', 'N/A')}")
        parts.append(f"City: {data.get('city', 'N/A')}")

        score = data.get("review_score") or (data.get("wifi_review_score", {}) or {}).get("rating") or "N/A"
        parts.append(f"Rating: {score}/10 ({data.get('review_score_word', 'N/A')}, {data.get('review_nr', 'N/A')} reviews)")
        parts.append(f"Stars: {data.get('class', data.get('propertyClass', 'N/A'))}")

        ci = data.get("checkin", {})
        co = data.get("checkout", {})
        if ci:
            parts.append(f"Check-in: {ci.get('from', 'N/A')} ~ {ci.get('until', 'N/A')}")
        if co:
            parts.append(f"Check-out: by {co.get('until', 'N/A')}")

        facs = data.get("facilities_block", {}).get("facilities", [])
        if facs:
            parts.append(f"Facilities: {', '.join(f.get('name', '') for f in facs[:15])}")

        gross = data.get("composite_price_breakdown", {}).get("gross_amount_per_night", {})
        if gross:
            parts.append(f"Price/night: {gross.get('currency', 'EUR')} {gross.get('value', 'N/A')}")

        hotel_name = data.get("hotel_name", "")
        city = data.get("city", "")
        sq = quote_plus(f"{hotel_name} {city}")
        parts.append("\n=== 예약 링크 ===")
        url = data.get("url", "")
        if url:
            parts.append(f"Booking.com: {url}")
        if hotel_name:
            parts.append(f"Agoda: https://www.google.com/search?q={sq}+agoda")
            parts.append(f"Hotels.com: https://www.google.com/search?q={sq}+hotels.com")
            parts.append(f"Google Hotels: https://www.google.com/travel/hotels?q={sq}")

        desc = data.get("description", "")
        if desc:
            parts.append(f"\nDescription: {desc[:500]}")

        return "\n".join(parts)

    @mcp.tool()
    async def search_flights(from_id: str, to_id: str, depart_date: str, adults: int = 2, cabin_class: str = "ECONOMY") -> str:
        """Search for flights between two locations.

        Args:
            from_id: Departure airport/city ID (e.g., "OPO.AIRPORT" for Porto)
            to_id: Arrival airport/city ID (e.g., "MAD.AIRPORT" for Madrid)
            depart_date: Departure date in YYYY-MM-DD format
            adults: Number of adults (default: 2)
            cabin_class: Cabin class - ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST (default: ECONOMY)
        """
        result = await make_rapidapi_request("/api/v1/flights/searchFlights", {
            "fromId": from_id, "toId": to_id, "departDate": depart_date,
            "adults": str(adults), "cabinClass": cabin_class, "currency_code": "EUR",
        })

        if "error" in result:
            return f"Error searching flights: {result['error']}"

        flights = result.get("data", {}).get("flightOffers", result.get("data", {}).get("flights", []))
        if not flights:
            return "No flight offers found for this route and date."

        formatted = []
        for i, flight in enumerate(flights[:10]):
            parts = [f"--- Flight {i+1} ---"]
            price_raw = flight.get("priceBreakdown", {}).get("total", {})
            if price_raw:
                parts.append(f"Price: {price_raw.get('currencyCode', 'EUR')} {price_raw.get('units', 'N/A')}")

            for seg in flight.get("segments", []):
                dep = seg.get("departureAirport", {})
                arr = seg.get("arrivalAirport", {})
                duration = seg.get("totalTime", 0)
                legs = seg.get("legs", [])
                carrier = ""
                if legs:
                    carrier = legs[0].get("carriersData", [{}])[0].get("name", "Unknown")
                    fn = legs[0].get("flightInfo", {}).get("flightNumber", "")
                    cc = legs[0].get("flightInfo", {}).get("carrierInfo", {}).get("operatingCarrier", "")
                    if cc and fn:
                        carrier = f"{carrier} ({cc}{fn})"
                stops = len(legs) - 1 if legs else 0
                parts.append(f"  {dep.get('code', '?')} {seg.get('departureTime', 'N/A')} → {arr.get('code', '?')} {seg.get('arrivalTime', 'N/A')}")
                parts.append(f"  Airline: {carrier}")
                parts.append(f"  Duration: {duration // 3600}h {(duration % 3600) // 60}m | {'Direct' if stops == 0 else f'{stops} stop(s)'}")

            baggage = flight.get("baggagePolicy", {})
            if baggage:
                parts.append(f"  Baggage: cabin={baggage.get('cabin', {}).get('allowance', 'N/A')}, checked={baggage.get('checked', {}).get('allowance', 'N/A')}")

            formatted.append("\n".join(parts))
        return "\n\n".join(formatted)

    @mcp.tool()
    async def search_flight_destinations(query: str) -> str:
        """Search for flight destination/airport IDs by name.

        Args:
            query: City or airport name (e.g., "Porto", "Madrid", "Barcelona")
        """
        result = await make_rapidapi_request("/api/v1/flights/searchDestination", {"query": query})
        if "error" in result:
            return f"Error searching flight destinations: {result['error']}"

        data = result.get("data", [])
        if not data:
            return "No flight destinations found."

        return "\n---\n".join(
            f"Name: {d.get('name', 'Unknown')}\nID: {d.get('id', 'N/A')}\nType: {d.get('type', 'N/A')}\n"
            f"City: {d.get('cityName', 'N/A')}\nCountry: {d.get('countryName', 'N/A')}\nIATA: {d.get('code', 'N/A')}"
            for d in data[:10]
        )

    @mcp.tool()
    async def search_attraction_locations(query: str) -> str:
        """Search for attraction location IDs by city name.

        Args:
            query: City name to search for (e.g., "Barcelona", "Lisbon", "Tokyo")
        """
        result = await make_rapidapi_request("/api/v1/attraction/searchLocation", {"query": query})
        if "error" in result:
            return f"Error fetching attraction locations: {result['error']}"
        if not result.get("status"):
            return "API returned unsuccessful status. No results found."

        data = result.get("data", {})
        parts = []
        dests = data.get("destinations", [])
        if dests:
            lines = ["=== Destinations ==="]
            for d in dests:
                lines.append(f"  ID: {d.get('id', 'N/A')}\n  City: {d.get('cityName', 'N/A')}\n  Country: {d.get('country', 'N/A')}\n  Products: {d.get('productCount', 0)}")
            parts.append("\n\n".join(lines))

        prods = data.get("products", [])
        if prods:
            lines = ["=== Top Products ==="]
            for p in prods[:5]:
                lines.append(f"  Title: {p.get('title', 'N/A')}\n  Category: {p.get('taxonomySlug', 'N/A')}\n  City: {p.get('cityName', 'N/A')}\n  ID: {p.get('id', 'N/A')}")
            parts.append("\n\n".join(lines))

        return "\n\n".join(parts) if parts else "No results found."

    @mcp.tool()
    async def search_attractions(id: str, sortBy: str = "trending", page: int = 1) -> str:
        """Search for attractions/tours in a specific location.

        Args:
            id: Destination ID (base64 encoded, from search_attraction_locations)
            sortBy: Sort order (default: "trending")
            page: Page number (default: 1)
        """
        result = await make_rapidapi_request("/api/v1/attraction/searchAttractions", {"id": id, "sortBy": sortBy, "page": str(page)})
        if "error" in result:
            return f"Error searching attractions: {result['error']}"
        if not result.get("status"):
            return "No attractions found."

        products = result.get("data", {}).get("products", [])
        if not products:
            return "No attractions found for the given location."

        formatted = []
        for i, p in enumerate(products[:15], 1):
            price = p.get("representativePrice", {})
            amount = price.get("chargeAmount")
            price_str = f"{price.get('currency', '')} {amount:.2f}" if amount is not None else "N/A"
            stats = p.get("reviewsStats", {}).get("combinedNumericStats", {})
            avg = stats.get("average")
            rating = f"{avg}/5 ({stats.get('total', 0)} reviews)" if avg else "N/A"
            cancel = "Yes" if p.get("cancellationPolicy", {}).get("hasFreeCancellation") else "No"
            formatted.append(
                f"[{i}]\n  Name: {p.get('name', 'Unknown')}\n  Price: {price_str}\n  Rating: {rating}\n"
                f"  Free cancel: {cancel}\n  Description: {p.get('shortDescription', '')}\n  Slug: {p.get('slug', '')}"
            )
        return "\n---\n".join(formatted)

    @mcp.tool()
    async def get_attraction_details(slug: str) -> str:
        """Get detailed information about a specific attraction.

        Args:
            slug: Product slug from search_attractions (e.g., "prbspnfdkbkw-admission-to-sagrada-familia")
        """
        result = await make_rapidapi_request("/api/v1/attraction/getAttractionDetails", {"slug": slug})
        if "error" in result:
            return f"Error fetching attraction details: {result['error']}"
        if not result.get("status"):
            return "Attraction not found."

        data = result.get("data", {})
        if not data:
            return "No attraction data returned."

        parts = [f"Name: {data.get('name', 'N/A')}"]
        desc = data.get("description", "")
        if desc:
            parts.append(f"Description:\n  {desc}")

        addrs = data.get("addresses", {}).get("attraction", [])
        if addrs:
            a = addrs[0]
            addr = f"  {a.get('address', 'N/A')}, {a.get('city', 'N/A')}, {a.get('country', 'N/A').upper()}"
            if a.get("latitude"):
                addr += f"\n  Coordinates: {a['latitude']}, {a.get('longitude', 'N/A')}"
            parts.append(f"Address:\n{addr}")

        rp = data.get("representativePrice", {})
        if rp.get("chargeAmount") is not None:
            parts.append(f"Price: {rp['chargeAmount']} {rp.get('currency', '')}")

        cp = data.get("cancellationPolicy", {})
        if cp:
            parts.append(f"Cancellation: {'Free cancellation available' if cp.get('hasFreeCancellation') else 'No free cancellation'}")

        badges = [l.get("text", "") for l in data.get("labels", []) if l.get("text")]
        badges += [f.get("flag", "").replace("_", " ").title() for f in data.get("flags", []) if f.get("value")]
        if badges:
            parts.append(f"Labels: {', '.join(badges)}")

        langs = data.get("audioSupportedLanguages", [])
        if langs:
            parts.append(f"Audio Langs: {', '.join(langs)}")

        ai = data.get("additionalInfo", "")
        if ai:
            parts.append(f"Additional:\n  {ai[:500]}{'...' if len(ai) > 500 else ''}")

        ni = data.get("notIncluded", [])
        if ni:
            items = [f"  - {(x if isinstance(x, str) else x.get('text', str(x)))}" for x in ni]
            parts.append("Not Included:\n" + "\n".join(items))

        parts.append(f"Bookable: {'Yes' if data.get('isBookable') else 'No'}")
        return "\n\n".join(parts)
