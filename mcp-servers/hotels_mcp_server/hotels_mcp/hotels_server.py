import json
import logging
import re
import signal
import sys
import argparse
from typing import Dict, List, Any, Optional
from mcp.server.fastmcp import FastMCP

from hotels_mcp.api_client import make_rapidapi_request, RAPIDAPI_KEY, RAPIDAPI_HOST

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("travel-mcp-server")

# Initialize FastMCP server
mcp = FastMCP("travel")

# Validate required environment variables
if not RAPIDAPI_KEY:
    logger.error("RAPIDAPI_KEY environment variable is not set. Please create a .env file with your API key.")
    sys.exit(1)

@mcp.tool()
async def search_destinations(query: str) -> str:
    """Search for hotel destinations by name.
    
    Args:
        query: The destination to search for (e.g., "Paris", "New York", "Tokyo")
    """
    logger.info(f"Searching for destinations with query: {query}")
    endpoint = "/api/v1/hotels/searchDestination"
    params = {"query": query}
    
    result = await make_rapidapi_request(endpoint, params)
    
    if "error" in result:
        logger.error(f"Error in search_destinations: {result['error']}")
        return f"Error fetching destinations: {result['error']}"
    
    # Format the response
    formatted_results = []
    
    if "data" in result and isinstance(result["data"], list):
        destinations_count = len(result["data"])
        logger.info(f"Found {destinations_count} destinations for query: {query}")
        for destination in result["data"]:
            dest_info = (
                f"Name: {destination.get('name', 'Unknown')}\n"
                f"Type: {destination.get('dest_type', 'Unknown')}\n"
                f"City ID: {destination.get('city_ufi', 'N/A')}\n"
                f"Region: {destination.get('region', 'Unknown')}\n"
                f"Country: {destination.get('country', 'Unknown')}\n"
                f"Coordinates: {destination.get('latitude', 'N/A')}, {destination.get('longitude', 'N/A')}\n"
            )
            formatted_results.append(dest_info)
        
        return "\n---\n".join(formatted_results) if formatted_results else "No destinations found matching your query."
    else:
        logger.warning(f"Unexpected response format from API for query: {query}")
        return "Unexpected response format from the API."

@mcp.tool()
async def get_hotels(destination_id: str, checkin_date: str, checkout_date: str, adults: int = 2, currency_code: str = "KRW") -> str:
    """Get hotels for a specific destination.

    Args:
        destination_id: The destination ID (city_ufi from search_destinations)
        checkin_date: Check-in date in YYYY-MM-DD format
        checkout_date: Check-out date in YYYY-MM-DD format
        adults: Number of adults (default: 2)
        currency_code: Currency code for prices (default: KRW). Examples: KRW, EUR, USD
    """
    logger.info(f"Getting hotels for destination_id: {destination_id}, checkin: {checkin_date}, checkout: {checkout_date}, adults: {adults}, currency: {currency_code}")
    endpoint = "/api/v1/hotels/searchHotels"
    params = {
        "dest_id": destination_id,
        "search_type": "CITY",
        "arrival_date": checkin_date,
        "departure_date": checkout_date,
        "adults": str(adults),
        "currency_code": currency_code
    }
    
    result = await make_rapidapi_request(endpoint, params)
    
    if "error" in result:
        logger.error(f"Error in get_hotels: {result['error']}")
        return f"Error fetching hotels: {result['error']}"
    
    # Format the response
    formatted_results = []
    
    if "data" in result and "hotels" in result["data"] and isinstance(result["data"]["hotels"], list):
        hotels_count = len(result["data"]["hotels"])
        logger.info(f"Found {hotels_count} hotels for destination: {destination_id}")
        hotels = result["data"]["hotels"]
        for hotel_entry in hotels[:10]:  # Limit to 10 hotels to avoid too much text
            if "property" in hotel_entry:
                property_data = hotel_entry["property"]
                
                # Parse accessibility label for room info
                room_info = "Not available"
                accessibility_label = hotel_entry.get("accessibilityLabel", "")
                if accessibility_label:
                    # Try to extract room type information
                    room_match = re.search(r'(Hotel room|Entire villa|Private suite|Private room)[^\.]*', accessibility_label)
                    if room_match:
                        room_info = room_match.group(0).strip()
                
                hotel_info = (
                    f"Name: {property_data.get('name', 'Unknown')}\n"
                    f"Hotel ID: {property_data.get('id', 'N/A')}\n"
                    f"Location: {property_data.get('wishlistName', 'Unknown')}\n"
                    f"Rating: {property_data.get('reviewScore', 'N/A')}/10\n"
                    f"Reviews: {property_data.get('reviewCount', 'N/A')} ({property_data.get('reviewScoreWord', 'N/A')})\n"
                )
                
                # Add room information
                hotel_info += f"Room: {room_info}\n"
                
                # Add pricing info if available
                if "priceBreakdown" in property_data and "grossPrice" in property_data["priceBreakdown"]:
                    price_data = property_data["priceBreakdown"]["grossPrice"]
                    hotel_info += f"Price: {price_data.get('currency', '$')}{price_data.get('value', 'N/A')}\n"
                    
                    # Add discount information if available
                    if "strikethroughPrice" in property_data["priceBreakdown"]:
                        original_price = property_data["priceBreakdown"]["strikethroughPrice"].get("value", "N/A")
                        if original_price != "N/A":
                            discount_pct = 0
                            try:
                                current = float(price_data.get('value', 0))
                                original = float(original_price)
                                if original > 0:
                                    discount_pct = round((1 - current/original) * 100)
                            except (ValueError, TypeError):
                                pass
                            
                            if discount_pct > 0:
                                hotel_info += f"Discount: {discount_pct}% off original price\n"
                else:
                    hotel_info += "Price: Not available\n"
                
                # Add location coordinates
                if "latitude" in property_data and "longitude" in property_data:
                    hotel_info += f"Coordinates: {property_data.get('latitude', 'N/A')}, {property_data.get('longitude', 'N/A')}\n"
                
                # Add star rating
                if "propertyClass" in property_data:
                    stars = property_data.get('propertyClass', 'N/A')
                    hotel_info += f"Stars: {stars}\n"
                
                # Add photo URL
                if property_data.get('photoUrls') and len(property_data.get('photoUrls', [])) > 0:
                    hotel_info += f"Photo: {property_data['photoUrls'][0]}\n"
                
                # Add check-in/check-out times
                checkin = property_data.get('checkin', {})
                checkout = property_data.get('checkout', {})
                if checkin and checkout:
                    hotel_info += f"Check-in: {checkin.get('fromTime', 'N/A')}-{checkin.get('untilTime', 'N/A')}\n"
                    hotel_info += f"Check-out: by {checkout.get('untilTime', 'N/A')}\n"
                
                formatted_results.append(hotel_info)
            else:
                formatted_results.append("Hotel information not available in the expected format.")
        
        return "\n---\n".join(formatted_results) if formatted_results else "No hotels found for this destination and dates."
    else:
        logger.warning(f"Unexpected response format from API for destination: {destination_id}")
        return "Unexpected response format from the API."

@mcp.tool()
async def get_hotel_details(hotel_id: str, checkin_date: str, checkout_date: str, adults: int = 2, currency_code: str = "KRW") -> str:
    """Get detailed information about a specific hotel including reviews, facilities, and policies.

    Args:
        hotel_id: The hotel ID (from get_hotels results or Booking.com URL)
        checkin_date: Check-in date in YYYY-MM-DD format
        checkout_date: Check-out date in YYYY-MM-DD format
        adults: Number of adults (default: 2)
        currency_code: Currency code for prices (default: KRW). Examples: KRW, EUR, USD
    """
    logger.info(f"Getting hotel details for hotel_id: {hotel_id}")
    endpoint = "/api/v1/hotels/getHotelDetails"
    params = {
        "hotel_id": hotel_id,
        "arrival_date": checkin_date,
        "departure_date": checkout_date,
        "adults": str(adults),
        "currency_code": currency_code
    }

    result = await make_rapidapi_request(endpoint, params)

    if "error" in result:
        return f"Error fetching hotel details: {result['error']}"

    data = result.get("data", {})
    if not data:
        return "No hotel details found."

    # Basic info
    info_parts = []
    info_parts.append(f"Name: {data.get('hotel_name', 'Unknown')}")
    info_parts.append(f"Address: {data.get('address', 'N/A')}")
    info_parts.append(f"City: {data.get('city', 'N/A')}")

    # Rating — review_score can be None in detail API; fall back to wifi_review_score
    review_score = data.get("review_score")
    if not review_score:
        wifi = data.get("wifi_review_score", {})
        review_score = wifi.get("rating") if isinstance(wifi, dict) else None
    review_score = review_score if review_score else "N/A"
    review_count = data.get("review_nr", "N/A")
    review_word = data.get("review_score_word", "N/A")
    info_parts.append(f"Rating: {review_score}/10 ({review_word}, {review_count} reviews)")

    # Star rating
    star = data.get("class", data.get("propertyClass", "N/A"))
    info_parts.append(f"Stars: {star}")

    # Check-in/out
    checkin_info = data.get("checkin", {})
    checkout_info = data.get("checkout", {})
    if checkin_info:
        info_parts.append(f"Check-in: {checkin_info.get('from', 'N/A')} ~ {checkin_info.get('until', 'N/A')}")
    if checkout_info:
        info_parts.append(f"Check-out: by {checkout_info.get('until', 'N/A')}")

    # Facilities
    facilities = data.get("facilities_block", {}).get("facilities", [])
    if facilities:
        fac_names = [f.get("name", "") for f in facilities[:15]]
        info_parts.append(f"Facilities: {', '.join(fac_names)}")

    # Price
    price_data = data.get("composite_price_breakdown", {})
    if price_data:
        gross = price_data.get("gross_amount_per_night", {})
        if gross:
            info_parts.append(f"Price/night: {gross.get('currency', 'EUR')} {gross.get('value', 'N/A')}")

    # Booking.com URL
    url = data.get("url", "")
    if url:
        info_parts.append(f"Booking.com: {url}")

    # Description
    desc = data.get("description", "")
    if desc:
        info_parts.append(f"\nDescription: {desc[:500]}")

    return "\n".join(info_parts)


@mcp.tool()
async def search_flights(
    from_id: str,
    to_id: str,
    depart_date: str,
    adults: int = 2,
    cabin_class: str = "ECONOMY"
) -> str:
    """Search for flights between two locations.

    Args:
        from_id: Departure airport/city ID (e.g., "OPO.AIRPORT" for Porto, "GRX.AIRPORT" for Granada)
        to_id: Arrival airport/city ID (e.g., "MAD.AIRPORT" for Madrid, "BCN.AIRPORT" for Barcelona)
        depart_date: Departure date in YYYY-MM-DD format
        adults: Number of adults (default: 2)
        cabin_class: Cabin class - ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST (default: ECONOMY)
    """
    logger.info(f"Searching flights: {from_id} -> {to_id} on {depart_date}")
    endpoint = "/api/v1/flights/searchFlights"
    params = {
        "fromId": from_id,
        "toId": to_id,
        "departDate": depart_date,
        "adults": str(adults),
        "cabinClass": cabin_class,
        "currency_code": "EUR"
    }

    result = await make_rapidapi_request(endpoint, params)

    if "error" in result:
        return f"Error searching flights: {result['error']}"

    data = result.get("data", {})
    if not data:
        return "No flights found."

    # Parse flight offers
    flights = data.get("flightOffers", data.get("flights", []))
    if not flights:
        return "No flight offers found for this route and date."

    formatted = []
    for i, flight in enumerate(flights[:10]):
        parts = []
        parts.append(f"--- Flight {i+1} ---")

        # Price
        price_raw = flight.get("priceBreakdown", {}).get("total", {})
        if price_raw:
            parts.append(f"Price: {price_raw.get('currencyCode', 'EUR')} {price_raw.get('units', 'N/A')}")

        # Segments
        segments = flight.get("segments", [])
        for seg in segments:
            dep = seg.get("departureAirport", {})
            arr = seg.get("arrivalAirport", {})
            dep_time = seg.get("departureTime", "N/A")
            arr_time = seg.get("arrivalTime", "N/A")
            duration = seg.get("totalTime", 0)
            hours = duration // 3600
            mins = (duration % 3600) // 60

            carrier = ""
            legs = seg.get("legs", [])
            if legs:
                carrier = legs[0].get("carriersData", [{}])[0].get("name", "Unknown")
                flight_num = legs[0].get("flightInfo", {}).get("flightNumber", "")
                carrier_code = legs[0].get("flightInfo", {}).get("carrierInfo", {}).get("operatingCarrier", "")
                if carrier_code and flight_num:
                    carrier = f"{carrier} ({carrier_code}{flight_num})"

            stops = len(legs) - 1 if legs else 0
            stop_text = "Direct" if stops == 0 else f"{stops} stop(s)"

            parts.append(f"  {dep.get('code', '?')} {dep_time} → {arr.get('code', '?')} {arr_time}")
            parts.append(f"  Airline: {carrier}")
            parts.append(f"  Duration: {hours}h {mins}m | {stop_text}")

        # Baggage
        baggage = flight.get("baggagePolicy", {})
        if baggage:
            cabin_bag = baggage.get("cabin", {}).get("allowance", "N/A")
            checked_bag = baggage.get("checked", {}).get("allowance", "N/A")
            parts.append(f"  Baggage: cabin={cabin_bag}, checked={checked_bag}")

        formatted.append("\n".join(parts))

    return "\n\n".join(formatted)


@mcp.tool()
async def search_flight_destinations(query: str) -> str:
    """Search for flight destination/airport IDs by name. Use this to find the from_id and to_id for search_flights.

    Args:
        query: City or airport name (e.g., "Porto", "Madrid", "Barcelona")
    """
    logger.info(f"Searching flight destinations for: {query}")
    endpoint = "/api/v1/flights/searchDestination"
    params = {"query": query}

    result = await make_rapidapi_request(endpoint, params)

    if "error" in result:
        return f"Error searching flight destinations: {result['error']}"

    data = result.get("data", [])
    if not data:
        return "No flight destinations found."

    formatted = []
    for dest in data[:10]:
        info = (
            f"Name: {dest.get('name', 'Unknown')}\n"
            f"ID: {dest.get('id', 'N/A')}\n"
            f"Type: {dest.get('type', 'N/A')}\n"
            f"City: {dest.get('cityName', 'N/A')}\n"
            f"Country: {dest.get('countryName', 'N/A')}\n"
            f"IATA: {dest.get('code', 'N/A')}"
        )
        formatted.append(info)

    return "\n---\n".join(formatted)


@mcp.tool()
async def search_attraction_locations(query: str) -> str:
    """Search for attraction location IDs by city name.

    Args:
        query: City name to search for (e.g., "Barcelona", "Lisbon", "Tokyo")
    """
    logger.info(f"Searching attraction locations for: {query}")
    endpoint = "/api/v1/attraction/searchLocation"
    params = {"query": query}

    result = await make_rapidapi_request(endpoint, params)

    if "error" in result:
        logger.error(f"Error in search_attraction_locations: {result['error']}")
        return f"Error fetching attraction locations: {result['error']}"

    if not result.get("status"):
        logger.warning(f"API returned status=false for query: {query}")
        return "API returned unsuccessful status. No results found."

    data = result.get("data", {})
    destinations = data.get("destinations", [])
    products = data.get("products", [])

    formatted_parts = []

    if destinations:
        dest_lines = ["=== Destinations ==="]
        for dest in destinations:
            dest_lines.append(
                f"  ID          : {dest.get('id', 'N/A')}\n"
                f"  City        : {dest.get('cityName', 'N/A')}\n"
                f"  Country     : {dest.get('country', 'N/A')}\n"
                f"  Products    : {dest.get('productCount', 0)}"
            )
        formatted_parts.append("\n\n".join(dest_lines))
    else:
        formatted_parts.append("No destinations found.")

    if products:
        prod_lines = ["=== Top Products ==="]
        for product in products[:5]:
            prod_lines.append(
                f"  Title       : {product.get('title', 'N/A')}\n"
                f"  Category    : {product.get('taxonomySlug', 'N/A')}\n"
                f"  City        : {product.get('cityName', 'N/A')}\n"
                f"  ID          : {product.get('id', 'N/A')}"
            )
        formatted_parts.append("\n\n".join(prod_lines))
    else:
        formatted_parts.append("No products found.")

    return "\n\n".join(formatted_parts)


@mcp.tool()
async def search_attractions(id: str, sortBy: str = "trending", page: int = 1) -> str:
    """Search for attractions/tours in a specific location.

    Args:
        id: Destination ID (base64 encoded, from search_attraction_locations)
        sortBy: Sort order (default: "trending")
        page: Page number (default: 1)
    """
    logger.info(f"Searching attractions for location ID: {id} (sort: {sortBy}, page: {page})")
    endpoint = "/api/v1/attraction/searchAttractions"
    params = {
        "id": id,
        "sortBy": sortBy,
        "page": str(page),
    }

    result = await make_rapidapi_request(endpoint, params)

    if "error" in result:
        logger.error(f"Error in search_attractions: {result['error']}")
        return f"Error searching attractions: {result['error']}"

    if not result.get("status"):
        logger.warning(f"API returned status=false for location ID: {id}")
        return "API returned unsuccessful status. No attractions found."

    products = result.get("data", {}).get("products", [])

    if not products:
        return "No attractions found for the given location."

    top = products[:15]
    logger.info(f"Found {len(products)} attraction(s) for location: {id}, showing top {len(top)}")

    formatted_results = []
    for i, product in enumerate(top, start=1):
        name = product.get("name", "Unknown")
        slug = product.get("slug", "")
        short_desc = product.get("shortDescription", "")

        price_info = product.get("representativePrice", {})
        currency = price_info.get("currency", "")
        amount = price_info.get("chargeAmount")
        price_str = f"{currency} {amount:.2f}" if amount is not None else "N/A"

        reviews = product.get("reviewsStats", {})
        combined = reviews.get("combinedNumericStats", {})
        avg = combined.get("average")
        total = combined.get("total", 0)
        rating_str = f"{avg}/5 ({total} reviews)" if avg is not None else "N/A"

        cancellation = product.get("cancellationPolicy", {})
        free_cancel = "Yes" if cancellation.get("hasFreeCancellation") else "No"

        attraction_info = (
            f"[{i}]\n"
            f"  Name        : {name}\n"
            f"  Price       : {price_str}\n"
            f"  Rating      : {rating_str}\n"
            f"  Free cancel : {free_cancel}\n"
            f"  Description : {short_desc}\n"
            f"  Slug        : {slug}"
        )
        formatted_results.append(attraction_info)

    return "\n---\n".join(formatted_results)


@mcp.tool()
async def get_attraction_details(slug: str) -> str:
    """Get detailed information about a specific attraction.

    Args:
        slug: Product slug from search_attractions (e.g., "prbspnfdkbkw-admission-to-sagrada-familia")
    """
    logger.info(f"Getting attraction details for slug: {slug}")
    endpoint = "/api/v1/attraction/getAttractionDetails"
    params = {"slug": slug}

    result = await make_rapidapi_request(endpoint, params)

    if "error" in result:
        logger.error(f"Error in get_attraction_details: {result['error']}")
        return f"Error fetching attraction details: {result['error']}"

    if not result.get("status"):
        logger.warning(f"API returned status=false for slug: {slug}")
        return "API returned unsuccessful status. Attraction not found."

    data = result.get("data", {})
    if not data:
        return "No attraction data returned."

    info_parts = []

    # Name
    info_parts.append(f"Name        : {data.get('name', 'N/A')}")

    # Description
    description = data.get("description", "")
    if description:
        info_parts.append(f"Description :\n  {description}")

    # Address + coordinates
    addresses = data.get("addresses", {})
    attraction_addresses = addresses.get("attraction", [])
    if attraction_addresses:
        addr = attraction_addresses[0]
        addr_str = f"  {addr.get('address', 'N/A')}, {addr.get('city', 'N/A')}, {addr.get('country', 'N/A').upper()}"
        lat = addr.get("latitude")
        lon = addr.get("longitude")
        if lat and lon:
            addr_str += f"\n  Coordinates : {lat}, {lon}"
        info_parts.append(f"Address     :\n{addr_str}")

    # Price
    rep_price = data.get("representativePrice", {})
    if rep_price:
        currency = rep_price.get("currency", "")
        charge_amount = rep_price.get("chargeAmount")
        if charge_amount is not None:
            info_parts.append(f"Price       : {charge_amount} {currency}")

    # Cancellation policy
    cancellation = data.get("cancellationPolicy", {})
    if cancellation:
        free = cancellation.get("hasFreeCancellation", False)
        info_parts.append(f"Cancellation: {'Free cancellation available' if free else 'No free cancellation'}")

    # Labels / flags
    labels = data.get("labels", [])
    flags = data.get("flags", [])
    badges = []
    for label in labels:
        text = label.get("text")
        if text:
            badges.append(text)
    for flag in flags:
        flag_name = flag.get("flag", "")
        flag_value = flag.get("value")
        if flag_value and flag_name:
            badges.append(flag_name.replace("_", " ").title())
    if badges:
        info_parts.append(f"Labels/Flags: {', '.join(badges)}")

    # Audio languages
    audio_langs = data.get("audioSupportedLanguages", [])
    if audio_langs:
        info_parts.append(f"Audio Langs : {', '.join(audio_langs)}")

    # Additional info (truncated to 500 chars)
    additional_info = data.get("additionalInfo", "")
    if additional_info:
        truncated = additional_info[:500]
        if len(additional_info) > 500:
            truncated += "..."
        info_parts.append(f"Additional  :\n  {truncated}")

    # Not included
    not_included = data.get("notIncluded", [])
    if not_included:
        items = []
        for item in not_included:
            text = item if isinstance(item, str) else item.get("text", str(item))
            items.append(f"  - {text}")
        info_parts.append("Not Included:\n" + "\n".join(items))

    # Bookable status
    is_bookable = data.get("isBookable", False)
    info_parts.append(f"Bookable    : {'Yes' if is_bookable else 'No'}")

    return "\n\n".join(info_parts)


def handle_shutdown(signum, frame):
    """Handle shutdown signals gracefully."""
    logger.info("Received shutdown signal, shutting down gracefully...")
    sys.exit(0)

def main():
    """Main function to run the Hotels MCP server."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Travel MCP Server')
    args = parser.parse_args()
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    
    try:
        # Use STDIO transport - it's the most reliable for Claude for Desktop
        logger.info("Starting Travel MCP Server with stdio transport...")
        mcp.run(transport='stdio')
        return 0
    except Exception as e:
        logger.error(f"Error starting server: {str(e)}")
        return 1
    finally:
        logger.info("Travel MCP Server shutting down...")

if __name__ == "__main__":
    sys.exit(main()) 