"""Unit tests for attractions CLI script response parsing."""
import json
import sys
import pytest
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

FIXTURES = Path(__file__).parent.parent / "fixtures"


def load_fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


# ---------------------------------------------------------------------------
# search_attraction_locations parsing
# ---------------------------------------------------------------------------

class TestSearchAttractionLocationsParsing:
    """Replicate the formatting logic from search_attraction_locations()."""

    def _format(self, result: dict) -> tuple[str, str]:
        """Returns (destinations_output, products_output) as separate strings."""
        data = result.get("data", {})
        destinations = data.get("destinations", [])
        products = data.get("products", [])

        dest_lines = []
        if destinations:
            dest_lines.append("=== Destinations ===")
            for dest in destinations:
                dest_lines.append(f"  ID          : {dest.get('id', 'N/A')}")
                dest_lines.append(f"  City        : {dest.get('cityName', 'N/A')}")
                dest_lines.append(f"  Country     : {dest.get('country', 'N/A')}")
                dest_lines.append(f"  Products    : {dest.get('productCount', 0)}")
                dest_lines.append("")
        else:
            dest_lines.append("No destinations found.")

        prod_lines = []
        if products:
            prod_lines.append("=== Top Products ===")
            for product in products[:5]:
                prod_lines.append(f"  Title       : {product.get('title', 'N/A')}")
                prod_lines.append(f"  Category    : {product.get('taxonomySlug', 'N/A')}")
                prod_lines.append(f"  City        : {product.get('cityName', 'N/A')}")
                prod_lines.append(f"  ID          : {product.get('id', 'N/A')}")
                prod_lines.append("")
        else:
            prod_lines.append("No products found.")

        return "\n".join(dest_lines), "\n".join(prod_lines)

    def test_formats_destination_city_and_country(self):
        data = load_fixture("attractions_response.json")["searchLocation"]
        dest_out, _ = self._format(data)
        assert "Barcelona" in dest_out
        assert "Spain" in dest_out

    def test_formats_destination_id(self):
        data = load_fixture("attractions_response.json")["searchLocation"]
        dest_out, _ = self._format(data)
        assert "eyJ1ZmkiOi0zNzI0OTB9" in dest_out

    def test_formats_destination_product_count(self):
        data = load_fixture("attractions_response.json")["searchLocation"]
        dest_out, _ = self._format(data)
        assert "847" in dest_out

    def test_formats_destinations_section_header(self):
        data = load_fixture("attractions_response.json")["searchLocation"]
        dest_out, _ = self._format(data)
        assert "=== Destinations ===" in dest_out

    def test_formats_top_products_section_header(self):
        data = load_fixture("attractions_response.json")["searchLocation"]
        _, prod_out = self._format(data)
        assert "=== Top Products ===" in prod_out

    def test_formats_product_title(self):
        data = load_fixture("attractions_response.json")["searchLocation"]
        _, prod_out = self._format(data)
        assert "Sagrada Familia Skip-the-Line Ticket" in prod_out

    def test_formats_product_category(self):
        data = load_fixture("attractions_response.json")["searchLocation"]
        _, prod_out = self._format(data)
        assert "tickets-and-passes" in prod_out

    def test_products_capped_at_five(self):
        data = {
            "status": True,
            "data": {
                "destinations": [],
                "products": [
                    {"title": f"Product {i}", "taxonomySlug": "tours", "cityName": "Barcelona", "id": f"id-{i}"}
                    for i in range(10)
                ]
            }
        }
        _, prod_out = self._format(data)
        assert "Product 4" in prod_out
        assert "Product 5" not in prod_out

    def test_empty_destinations_returns_no_destinations_message(self):
        data = {"status": True, "data": {"destinations": [], "products": []}}
        dest_out, _ = self._format(data)
        assert "No destinations found." in dest_out

    def test_empty_products_returns_no_products_message(self):
        data = {"status": True, "data": {"destinations": [], "products": []}}
        _, prod_out = self._format(data)
        assert "No products found." in prod_out

    def test_missing_data_key_returns_no_destinations_message(self):
        dest_out, prod_out = self._format({})
        assert "No destinations found." in dest_out
        assert "No products found." in prod_out


# ---------------------------------------------------------------------------
# search_attractions (format_attraction) parsing
# ---------------------------------------------------------------------------

class TestSearchAttractionsParsing:
    """Replicate the formatting logic from format_attraction() and search_attractions()."""

    def _format_attraction(self, product: dict) -> str:
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

    def _format_results(self, result: dict) -> str:
        products = result.get("data", {}).get("products", [])
        if not products:
            return "No attractions found for the given location."

        max_results = 15
        top = products[:max_results]
        lines = [f"Found {len(products)} attraction(s). Showing top {len(top)}:\n"]
        lines.append("=" * 60)
        for i, product in enumerate(top, start=1):
            lines.append(f"[{i}]")
            lines.append(self._format_attraction(product))
            lines.append("-" * 60)
        return "\n".join(lines)

    def test_formats_attraction_name(self):
        data = load_fixture("attractions_response.json")["searchAttractions"]
        result = self._format_results(data)
        assert "Sagrada Familia: Skip-the-Line Ticket" in result

    def test_formats_price_with_two_decimal_places(self):
        data = load_fixture("attractions_response.json")["searchAttractions"]
        result = self._format_results(data)
        assert "EUR 36.00" in result

    def test_formats_rating_with_review_count(self):
        data = load_fixture("attractions_response.json")["searchAttractions"]
        result = self._format_results(data)
        assert "4.8/5 (12543 reviews)" in result

    def test_formats_free_cancellation_yes(self):
        data = load_fixture("attractions_response.json")["searchAttractions"]
        result = self._format_results(data)
        assert "Free cancel : Yes" in result

    def test_formats_free_cancellation_no(self):
        data = load_fixture("attractions_response.json")["searchAttractions"]
        result = self._format_results(data)
        assert "Free cancel : No" in result

    def test_formats_slug(self):
        data = load_fixture("attractions_response.json")["searchAttractions"]
        result = self._format_results(data)
        assert "prbspnfdkbkw-admission-to-sagrada-familia" in result

    def test_formats_short_description(self):
        data = load_fixture("attractions_response.json")["searchAttractions"]
        result = self._format_results(data)
        assert "Gaudí's iconic basilica" in result

    def test_formats_numbered_entries(self):
        data = load_fixture("attractions_response.json")["searchAttractions"]
        result = self._format_results(data)
        assert "[1]" in result
        assert "[2]" in result

    def test_formats_found_count_header(self):
        data = load_fixture("attractions_response.json")["searchAttractions"]
        result = self._format_results(data)
        assert "Found 2 attraction(s). Showing top 2" in result

    def test_results_capped_at_max_15(self):
        products = [
            {
                "name": f"Attraction {i}",
                "slug": f"slug-{i}",
                "shortDescription": "",
                "representativePrice": {"currency": "EUR", "chargeAmount": 10.0},
                "reviewsStats": {"combinedNumericStats": {"average": 4.0, "total": 100}},
                "cancellationPolicy": {"hasFreeCancellation": True},
            }
            for i in range(20)
        ]
        data = {"status": True, "data": {"products": products}}
        result = self._format_results(data)
        assert "[15]" in result
        assert "[16]" not in result

    def test_empty_products_returns_no_attractions_message(self):
        result = self._format_results({"data": {"products": []}})
        assert result == "No attractions found for the given location."

    def test_missing_price_returns_na(self):
        product = {
            "name": "Test Tour",
            "slug": "test-tour",
            "shortDescription": "",
            "representativePrice": {"currency": "EUR"},
            "reviewsStats": {"combinedNumericStats": {}},
            "cancellationPolicy": {},
        }
        result = self._format_attraction(product)
        assert "Price       : N/A" in result

    def test_missing_rating_returns_na(self):
        product = {
            "name": "Test Tour",
            "slug": "test-tour",
            "shortDescription": "",
            "representativePrice": {},
            "reviewsStats": {},
            "cancellationPolicy": {},
        }
        result = self._format_attraction(product)
        assert "Rating      : N/A" in result


# ---------------------------------------------------------------------------
# get_attraction_details parsing
# ---------------------------------------------------------------------------

class TestGetAttractionDetailsParsing:
    """Replicate the formatting logic from get_attraction_details()."""

    def _format(self, result: dict) -> str:
        data = result.get("data", {})
        if not data:
            return "No attraction data returned."

        lines = []

        lines.append(f"Name        : {data.get('name', 'N/A')}")
        lines.append("")

        description = data.get("description", "")
        if description:
            lines.append("Description :")
            lines.append(f"  {description}")
            lines.append("")

        addresses = data.get("addresses", {})
        attraction_addresses = addresses.get("attraction", [])
        if attraction_addresses:
            addr = attraction_addresses[0]
            lines.append("Address     :")
            lines.append(
                f"  {addr.get('address', 'N/A')}, "
                f"{addr.get('city', 'N/A')}, "
                f"{addr.get('country', 'N/A').upper()}"
            )
            lat = addr.get("latitude")
            lon = addr.get("longitude")
            if lat and lon:
                lines.append(f"  Coordinates : {lat}, {lon}")
            lines.append("")

        rep_price = data.get("representativePrice", {})
        if rep_price:
            currency = rep_price.get("currency", "")
            charge_amount = rep_price.get("chargeAmount")
            if charge_amount is not None:
                lines.append(f"Price       : {charge_amount} {currency}")
                lines.append("")

        cancellation = data.get("cancellationPolicy", {})
        if cancellation:
            free = cancellation.get("hasFreeCancellation", False)
            lines.append(f"Cancellation: {'Free cancellation available' if free else 'No free cancellation'}")
            lines.append("")

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
            lines.append(f"Labels/Flags: {', '.join(badges)}")
            lines.append("")

        audio_langs = data.get("audioSupportedLanguages", [])
        if audio_langs:
            lines.append(f"Audio Langs : {', '.join(audio_langs)}")
            lines.append("")

        additional_info = data.get("additionalInfo", "")
        if additional_info:
            truncated = additional_info[:500]
            if len(additional_info) > 500:
                truncated += "..."
            lines.append("Additional  :")
            lines.append(f"  {truncated}")
            lines.append("")

        not_included = data.get("notIncluded", [])
        if not_included:
            lines.append("Not Included:")
            for item in not_included:
                text = item if isinstance(item, str) else item.get("text", str(item))
                lines.append(f"  - {text}")
            lines.append("")

        is_bookable = data.get("isBookable", False)
        lines.append(f"Bookable    : {'Yes' if is_bookable else 'No'}")

        return "\n".join(lines)

    def test_formats_name(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Sagrada Familia: Skip-the-Line Ticket" in result

    def test_formats_description(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Description :" in result
        assert "UNESCO World Heritage Site" in result

    def test_formats_address(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Address     :" in result
        assert "Carrer de Mallorca, 401" in result
        assert "Barcelona" in result
        assert "ES" in result

    def test_formats_coordinates(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Coordinates : 41.4036, 2.1744" in result

    def test_formats_price(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Price       : 36.0 EUR" in result

    def test_formats_free_cancellation(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Cancellation: Free cancellation available" in result

    def test_formats_no_free_cancellation(self):
        data = {
            "status": True,
            "data": {
                "name": "Test",
                "cancellationPolicy": {"hasFreeCancellation": False},
                "isBookable": False,
            }
        }
        result = self._format(data)
        assert "Cancellation: No free cancellation" in result

    def test_formats_labels(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Best Seller" in result
        assert "Skip the Line" in result

    def test_formats_flags_as_title_case(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Likely To Sell Out" in result

    def test_formats_audio_languages(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Audio Langs : en, es, fr, de, it" in result

    def test_formats_additional_info(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Additional  :" in result
        assert "booking confirmation" in result

    def test_additional_info_truncated_at_500_chars(self):
        long_text = "A" * 600
        data = {"status": True, "data": {"name": "X", "additionalInfo": long_text, "isBookable": False}}
        result = self._format(data)
        assert "A" * 500 + "..." in result

    def test_formats_not_included(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Not Included:" in result
        assert "- Tower access (available as an add-on)" in result
        assert "- Audio guide (included in some ticket types)" in result

    def test_formats_bookable_yes(self):
        data = load_fixture("attractions_response.json")["getAttractionDetails"]
        result = self._format(data)
        assert "Bookable    : Yes" in result

    def test_formats_bookable_no(self):
        data = {"status": True, "data": {"name": "X", "isBookable": False}}
        result = self._format(data)
        assert "Bookable    : No" in result

    def test_empty_data_returns_no_data_message(self):
        result = self._format({"data": {}})
        assert result == "No attraction data returned."

    def test_missing_data_key_returns_no_data_message(self):
        result = self._format({})
        assert result == "No attraction data returned."

    def test_not_included_string_items(self):
        """notIncluded items that are plain strings (not dicts) are handled."""
        data = {
            "status": True,
            "data": {
                "name": "Test",
                "notIncluded": ["Lunch", "Transport"],
                "isBookable": True,
            }
        }
        result = self._format(data)
        assert "- Lunch" in result
        assert "- Transport" in result
