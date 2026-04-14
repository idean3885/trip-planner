"""
Search for attraction location IDs by city name using the Booking.com RapidAPI.

Usage:
    python scripts/search_attraction_locations.py --query "Barcelona"
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

try:
    from trip_mcp.rapidapi import make_rapidapi_request
except ImportError:
    # Fallback: add mcp/ to path when package is not installed
    _mcp_root = Path(__file__).parent.parent / "mcp"
    sys.path.insert(0, str(_mcp_root))
    from trip_mcp.rapidapi import make_rapidapi_request  # noqa: E402


async def search_attraction_locations(query: str) -> None:
    """Search for attraction location IDs by city name and print results."""
    print(f"Searching attraction locations for: {query}\n")

    result = make_rapidapi_request(
        "/api/v1/attraction/searchLocation",
        params={"query": query},
    )
    # make_rapidapi_request is a coroutine
    if asyncio.iscoroutine(result):
        result = await result

    if "error" in result:
        print(f"API error: {result['error']}", file=sys.stderr)
        sys.exit(1)

    if not result.get("status"):
        print("API returned status=false. No results found.", file=sys.stderr)
        sys.exit(1)

    data = result.get("data", {})
    destinations = data.get("destinations", [])
    products = data.get("products", [])

    # --- Destinations ---
    if destinations:
        print("=== Destinations ===")
        for dest in destinations:
            print(
                f"  ID          : {dest.get('id', 'N/A')}"
            )
            print(f"  City        : {dest.get('cityName', 'N/A')}")
            print(f"  Country     : {dest.get('country', 'N/A')}")
            print(f"  Products    : {dest.get('productCount', 0)}")
            print()
    else:
        print("No destinations found.\n")

    # --- Top products (up to 5) ---
    if products:
        print("=== Top Products ===")
        for product in products[:5]:
            print(f"  Title       : {product.get('title', 'N/A')}")
            print(f"  Category    : {product.get('taxonomySlug', 'N/A')}")
            print(f"  City        : {product.get('cityName', 'N/A')}")
            print(f"  ID          : {product.get('id', 'N/A')}")
            print()
    else:
        print("No products found.\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Search attraction location IDs by city name via Booking.com RapidAPI."
    )
    parser.add_argument(
        "--query",
        required=True,
        help="City name to search for (e.g. 'Barcelona')",
    )
    args = parser.parse_args()
    asyncio.run(search_attraction_locations(args.query))


if __name__ == "__main__":
    main()
