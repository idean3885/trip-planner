"""
Get detailed information about a specific attraction using the Booking.com RapidAPI.

Usage:
    python scripts/get_attraction_details.py --slug "prbspnfdkbkw-admission-to-sagrada-familia"
"""

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


async def get_attraction_details(slug: str) -> None:
    """Fetch and print detailed information about a specific attraction."""
    print(f"Fetching attraction details for slug: {slug}\n")

    result = make_rapidapi_request(
        "/api/v1/attraction/getAttractionDetails",
        params={"slug": slug},
    )
    # make_rapidapi_request is a coroutine
    if asyncio.iscoroutine(result):
        result = await result

    if "error" in result:
        print(f"API error: {result['error']}", file=sys.stderr)
        sys.exit(1)

    if not result.get("status"):
        print("API returned status=false. Attraction not found.", file=sys.stderr)
        sys.exit(1)

    data = result.get("data", {})

    if not data:
        print("No attraction data returned.", file=sys.stderr)
        sys.exit(1)

    # --- Name ---
    print(f"Name        : {data.get('name', 'N/A')}")
    print()

    # --- Description ---
    description = data.get("description", "")
    if description:
        print("Description :")
        print(f"  {description}")
        print()

    # --- Address + coordinates ---
    addresses = data.get("addresses", {})
    attraction_addresses = addresses.get("attraction", [])
    if attraction_addresses:
        addr = attraction_addresses[0]
        print("Address     :")
        print(f"  {addr.get('address', 'N/A')}, {addr.get('city', 'N/A')}, {addr.get('country', 'N/A').upper()}")
        lat = addr.get("latitude")
        lon = addr.get("longitude")
        if lat and lon:
            print(f"  Coordinates : {lat}, {lon}")
        print()

    # --- Price ---
    rep_price = data.get("representativePrice", {})
    if rep_price:
        currency = rep_price.get("currency", "")
        charge_amount = rep_price.get("chargeAmount")
        if charge_amount is not None:
            print(f"Price       : {charge_amount} {currency}")
            print()

    # --- Cancellation policy ---
    cancellation = data.get("cancellationPolicy", {})
    if cancellation:
        free = cancellation.get("hasFreeCancellation", False)
        print(f"Cancellation: {'Free cancellation available' if free else 'No free cancellation'}")
        print()

    # --- Labels / flags ---
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
        print(f"Labels/Flags: {', '.join(badges)}")
        print()

    # --- Audio languages ---
    audio_langs = data.get("audioSupportedLanguages", [])
    if audio_langs:
        print(f"Audio Langs : {', '.join(audio_langs)}")
        print()

    # --- Additional info (truncated to 500 chars) ---
    additional_info = data.get("additionalInfo", "")
    if additional_info:
        truncated = additional_info[:500]
        if len(additional_info) > 500:
            truncated += "..."
        print("Additional  :")
        print(f"  {truncated}")
        print()

    # --- Not included ---
    not_included = data.get("notIncluded", [])
    if not_included:
        print("Not Included:")
        for item in not_included:
            text = item if isinstance(item, str) else item.get("text", str(item))
            print(f"  - {text}")
        print()

    # --- Bookable status ---
    is_bookable = data.get("isBookable", False)
    print(f"Bookable    : {'Yes' if is_bookable else 'No'}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Get detailed information about a specific attraction via Booking.com RapidAPI."
    )
    parser.add_argument(
        "--slug",
        required=True,
        help="Product slug from searchAttractions (e.g. 'prbspnfdkbkw-admission-to-sagrada-familia')",
    )
    args = parser.parse_args()
    asyncio.run(get_attraction_details(args.slug))


if __name__ == "__main__":
    main()
