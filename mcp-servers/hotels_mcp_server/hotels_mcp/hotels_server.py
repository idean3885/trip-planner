import json
import logging
import re
import signal
import sys
import argparse
from typing import Dict, List, Any, Optional
from urllib.parse import quote_plus
from mcp.server.fastmcp import FastMCP

from hotels_mcp.api_client import make_rapidapi_request, RAPIDAPI_KEY, RAPIDAPI_HOST


def _booking_links(hotel_name: str, checkin_date: str, checkout_date: str, adults: int = 2) -> str:
    """Generate Booking.com and Agoda search links with dates."""
    encoded_name = quote_plus(hotel_name)
    booking_url = (
        f"https://www.booking.com/searchresults.html"
        f"?ss={encoded_name}&checkin={checkin_date}&checkout={checkout_date}"
        f"&group_adults={adults}"
    )
    agoda_url = (
        f"https://www.agoda.com/search"
        f"?q={encoded_name}&checkIn={checkin_date}&checkOut={checkout_date}"
        f"&adults={adults}"
    )
    return f"Booking.com: {booking_url}\nAgoda: {agoda_url}\n"

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
async def get_hotels(destination_id: str, checkin_date: str, checkout_date: str, adults: int = 2) -> str:
    """Get hotels for a specific destination.
    
    Args:
        destination_id: The destination ID (city_ufi from search_destinations)
        checkin_date: Check-in date in YYYY-MM-DD format
        checkout_date: Check-out date in YYYY-MM-DD format
        adults: Number of adults (default: 2)
    """
    logger.info(f"Getting hotels for destination_id: {destination_id}, checkin: {checkin_date}, checkout: {checkout_date}, adults: {adults}")
    endpoint = "/api/v1/hotels/searchHotels"
    params = {
        "dest_id": destination_id,
        "search_type": "CITY",
        "arrival_date": checkin_date,
        "departure_date": checkout_date,
        "adults": str(adults)
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

                # Add booking links with dates
                hotel_name = property_data.get('name', '')
                if hotel_name:
                    hotel_info += _booking_links(hotel_name, checkin_date, checkout_date, adults)

                formatted_results.append(hotel_info)
            else:
                formatted_results.append("Hotel information not available in the expected format.")
        
        return "\n---\n".join(formatted_results) if formatted_results else "No hotels found for this destination and dates."
    else:
        logger.warning(f"Unexpected response format from API for destination: {destination_id}")
        return "Unexpected response format from the API."

@mcp.tool()
async def get_hotel_details(hotel_id: str, checkin_date: str, checkout_date: str, adults: int = 2) -> str:
    """Get detailed information about a specific hotel including reviews, facilities, and policies.

    Args:
        hotel_id: The hotel ID (from get_hotels results or Booking.com URL)
        checkin_date: Check-in date in YYYY-MM-DD format
        checkout_date: Check-out date in YYYY-MM-DD format
        adults: Number of adults (default: 2)
    """
    logger.info(f"Getting hotel details for hotel_id: {hotel_id}")
    endpoint = "/api/v1/hotels/getHotelDetails"
    params = {
        "hotel_id": hotel_id,
        "arrival_date": checkin_date,
        "departure_date": checkout_date,
        "adults": str(adults),
        "currency_code": "EUR"
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

    # Description
    desc = data.get("description", "")
    if desc:
        info_parts.append(f"\nDescription: {desc[:500]}")

    # Booking links with dates
    hotel_name = data.get("hotel_name", "")
    if hotel_name:
        info_parts.append(_booking_links(hotel_name, checkin_date, checkout_date, adults))

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