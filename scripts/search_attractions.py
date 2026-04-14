#!/usr/bin/env python3
"""Search for attractions/tours in a specific location using Booking.com RapidAPI."""

import argparse
import asyncio
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

ENDPOINT = "/api/v1/attraction/searchAttractions"
MAX_RESULTS = 15


def format_attraction(product: dict) -> str:
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

    lines = [
        f"  Name        : {name}",
        f"  Price       : {price_str}",
        f"  Rating      : {rating_str}",
        f"  Free cancel : {free_cancel}",
        f"  Description : {short_desc}",
        f"  Slug        : {slug}",
    ]
    return "\n".join(lines)


async def search_attractions(location_id: str, sort_by: str, page: int) -> None:
    params = {
        "id": location_id,
        "sortBy": sort_by,
        "page": str(page),
    }

    print(f"Searching attractions for location ID: {location_id} (sort: {sort_by}, page: {page})\n")

    result = await make_rapidapi_request(ENDPOINT, params)

    if "error" in result:
        print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)

    if not result.get("status"):
        print("API returned unsuccessful status.", file=sys.stderr)
        sys.exit(1)

    products = result.get("data", {}).get("products", [])

    if not products:
        print("No attractions found for the given location.")
        return

    top = products[:MAX_RESULTS]
    print(f"Found {len(products)} attraction(s). Showing top {len(top)}:\n")
    print("=" * 60)

    for i, product in enumerate(top, start=1):
        print(f"[{i}]")
        print(format_attraction(product))
        print("-" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Search for attractions/tours using Booking.com RapidAPI."
    )
    parser.add_argument(
        "--location-id",
        required=True,
        help="Destination ID (base64 encoded, e.g. eyJ1ZmkiOi0zNzI0OTB9)",
    )
    parser.add_argument(
        "--sort-by",
        default="trending",
        help="Sort order (default: trending)",
    )
    parser.add_argument(
        "--page",
        type=int,
        default=1,
        help="Page number (default: 1)",
    )
    args = parser.parse_args()
    asyncio.run(search_attractions(args.location_id, args.sort_by, args.page))


if __name__ == "__main__":
    main()
