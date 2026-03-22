"""Unit tests for Hotels tool response parsing in hotels_server.py."""
import json
import re
import pytest
from pathlib import Path

FIXTURES = Path(__file__).parent.parent / "fixtures"


def load_fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


# ---------------------------------------------------------------------------
# search_destinations parsing
# ---------------------------------------------------------------------------

class TestSearchDestinationsParsing:
    """Replicate the formatting logic from search_destinations()."""

    def _format(self, data: dict) -> str:
        formatted_results = []
        if "data" in data and isinstance(data["data"], list):
            for destination in data["data"]:
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

    def test_formats_two_destinations(self):
        data = load_fixture("hotels_search_destinations.json")
        result = self._format(data)
        assert "Lisbon" in result
        assert "Porto" in result
        assert "---" in result

    def test_destination_contains_required_fields(self):
        data = load_fixture("hotels_search_destinations.json")
        result = self._format(data)
        assert "Name:" in result
        assert "Type:" in result
        assert "City ID:" in result
        assert "Country:" in result
        assert "Coordinates:" in result

    def test_empty_data_returns_no_destinations_message(self):
        result = self._format({"data": []})
        assert result == "No destinations found matching your query."

    def test_missing_data_key_returns_no_destinations_message(self):
        result = self._format({})
        assert result == "No destinations found matching your query."

    def test_country_value_correct(self):
        data = load_fixture("hotels_search_destinations.json")
        result = self._format(data)
        assert "Portugal" in result


# ---------------------------------------------------------------------------
# get_hotels parsing
# ---------------------------------------------------------------------------

class TestGetHotelsParsing:
    """Replicate the formatting logic from get_hotels()."""

    def _format(self, data: dict) -> str:
        formatted_results = []
        if "data" in data and "hotels" in data["data"] and isinstance(data["data"]["hotels"], list):
            hotels = data["data"]["hotels"]
            for hotel_entry in hotels[:10]:
                if "property" not in hotel_entry:
                    formatted_results.append("Hotel information not available in the expected format.")
                    continue
                property_data = hotel_entry["property"]

                room_info = "Not available"
                accessibility_label = hotel_entry.get("accessibilityLabel", "")
                if accessibility_label:
                    room_match = re.search(
                        r'(Hotel room|Entire villa|Private suite|Private room)[^\.]*',
                        accessibility_label
                    )
                    if room_match:
                        room_info = room_match.group(0).strip()

                hotel_info = (
                    f"Name: {property_data.get('name', 'Unknown')}\n"
                    f"Location: {property_data.get('wishlistName', 'Unknown')}\n"
                    f"Rating: {property_data.get('reviewScore', 'N/A')}/10\n"
                    f"Reviews: {property_data.get('reviewCount', 'N/A')} ({property_data.get('reviewScoreWord', 'N/A')})\n"
                    f"Room: {room_info}\n"
                )

                if "priceBreakdown" in property_data and "grossPrice" in property_data["priceBreakdown"]:
                    price_data = property_data["priceBreakdown"]["grossPrice"]
                    hotel_info += f"Price: {price_data.get('currency', '$')}{price_data.get('value', 'N/A')}\n"

                    if "strikethroughPrice" in property_data["priceBreakdown"]:
                        original_price = property_data["priceBreakdown"]["strikethroughPrice"].get("value", "N/A")
                        if original_price != "N/A":
                            discount_pct = 0
                            try:
                                current = float(price_data.get('value', 0))
                                original = float(original_price)
                                if original > 0:
                                    discount_pct = round((1 - current / original) * 100)
                            except (ValueError, TypeError):
                                pass
                            if discount_pct > 0:
                                hotel_info += f"Discount: {discount_pct}% off original price\n"
                else:
                    hotel_info += "Price: Not available\n"

                if "latitude" in property_data and "longitude" in property_data:
                    hotel_info += f"Coordinates: {property_data.get('latitude', 'N/A')}, {property_data.get('longitude', 'N/A')}\n"

                if "propertyClass" in property_data:
                    hotel_info += f"Stars: {property_data.get('propertyClass', 'N/A')}\n"

                if property_data.get('photoUrls') and len(property_data.get('photoUrls', [])) > 0:
                    hotel_info += f"Photo: {property_data['photoUrls'][0]}\n"

                checkin = property_data.get('checkin', {})
                checkout = property_data.get('checkout', {})
                if checkin and checkout:
                    hotel_info += f"Check-in: {checkin.get('fromTime', 'N/A')}-{checkin.get('untilTime', 'N/A')}\n"
                    hotel_info += f"Check-out: by {checkout.get('untilTime', 'N/A')}\n"

                formatted_results.append(hotel_info)

        return "\n---\n".join(formatted_results) if formatted_results else "No hotels found for this destination and dates."

    def test_formats_hotel_name(self):
        data = load_fixture("hotels_search_hotels.json")
        result = self._format(data)
        assert "Bairro Alto Hotel" in result

    def test_formats_price(self):
        data = load_fixture("hotels_search_hotels.json")
        result = self._format(data)
        assert "EUR" in result
        assert "280" in result

    def test_formats_discount(self):
        data = load_fixture("hotels_search_hotels.json")
        result = self._format(data)
        # 280 / 350 = 20% off
        assert "20% off original price" in result

    def test_formats_review_score(self):
        data = load_fixture("hotels_search_hotels.json")
        result = self._format(data)
        assert "9.2/10" in result
        assert "Exceptional" in result

    def test_formats_room_info_from_accessibility_label(self):
        data = load_fixture("hotels_search_hotels.json")
        result = self._format(data)
        assert "Hotel room" in result

    def test_formats_star_rating(self):
        data = load_fixture("hotels_search_hotels.json")
        result = self._format(data)
        assert "Stars: 5" in result

    def test_formats_checkin_checkout(self):
        data = load_fixture("hotels_search_hotels.json")
        result = self._format(data)
        assert "Check-in:" in result
        assert "Check-out:" in result

    def test_empty_hotels_returns_no_hotels_message(self):
        result = self._format({"data": {"hotels": []}})
        assert result == "No hotels found for this destination and dates."

    def test_two_hotels_separated_by_divider(self):
        data = load_fixture("hotels_search_hotels.json")
        result = self._format(data)
        assert "---" in result


# ---------------------------------------------------------------------------
# get_hotel_details parsing
# ---------------------------------------------------------------------------

class TestGetHotelDetailsParsing:
    """Replicate the formatting logic from get_hotel_details()."""

    def _format(self, result: dict) -> str:
        data = result.get("data", {})
        if not data:
            return "No hotel details found."

        info_parts = []
        info_parts.append(f"Name: {data.get('hotel_name', 'Unknown')}")
        info_parts.append(f"Address: {data.get('address', 'N/A')}")
        info_parts.append(f"City: {data.get('city', 'N/A')}")

        review_score = data.get("review_score")
        if not review_score:
            wifi = data.get("wifi_review_score", {})
            review_score = wifi.get("rating") if isinstance(wifi, dict) else None
        review_score = review_score if review_score else "N/A"
        review_count = data.get("review_nr", "N/A")
        review_word = data.get("review_score_word", "N/A")
        info_parts.append(f"Rating: {review_score}/10 ({review_word}, {review_count} reviews)")

        star = data.get("class", data.get("propertyClass", "N/A"))
        info_parts.append(f"Stars: {star}")

        checkin_info = data.get("checkin", {})
        checkout_info = data.get("checkout", {})
        if checkin_info:
            info_parts.append(f"Check-in: {checkin_info.get('from', 'N/A')} ~ {checkin_info.get('until', 'N/A')}")
        if checkout_info:
            info_parts.append(f"Check-out: by {checkout_info.get('until', 'N/A')}")

        facilities = data.get("facilities_block", {}).get("facilities", [])
        if facilities:
            fac_names = [f.get("name", "") for f in facilities[:15]]
            info_parts.append(f"Facilities: {', '.join(fac_names)}")

        price_data = data.get("composite_price_breakdown", {})
        if price_data:
            gross = price_data.get("gross_amount_per_night", {})
            if gross:
                info_parts.append(f"Price/night: {gross.get('currency', 'EUR')} {gross.get('value', 'N/A')}")

        desc = data.get("description", "")
        if desc:
            info_parts.append(f"\nDescription: {desc[:500]}")

        return "\n".join(info_parts)

    def test_formats_hotel_name(self):
        data = load_fixture("hotels_get_details.json")
        result = self._format(data)
        assert "Bairro Alto Hotel" in result

    def test_formats_address_and_city(self):
        data = load_fixture("hotels_get_details.json")
        result = self._format(data)
        assert "Praca Luis de Camoes" in result
        assert "Lisbon" in result

    def test_formats_rating(self):
        data = load_fixture("hotels_get_details.json")
        result = self._format(data)
        assert "9.2/10" in result
        assert "Exceptional" in result
        assert "1842" in result

    def test_formats_stars(self):
        data = load_fixture("hotels_get_details.json")
        result = self._format(data)
        assert "Stars: 5" in result

    def test_formats_checkin_checkout(self):
        data = load_fixture("hotels_get_details.json")
        result = self._format(data)
        assert "Check-in: 15:00" in result
        assert "Check-out: by 12:00" in result

    def test_formats_facilities(self):
        data = load_fixture("hotels_get_details.json")
        result = self._format(data)
        assert "Facilities:" in result
        assert "Free WiFi" in result
        assert "Restaurant" in result

    def test_formats_price_per_night(self):
        data = load_fixture("hotels_get_details.json")
        result = self._format(data)
        assert "Price/night: EUR 280.0" in result

    def test_formats_description(self):
        data = load_fixture("hotels_get_details.json")
        result = self._format(data)
        assert "Description:" in result
        assert "boutique hotel" in result

    def test_fallback_review_score_from_wifi(self):
        """When review_score is None, fall back to wifi_review_score.rating."""
        data = load_fixture("hotels_get_details.json")
        data["data"]["review_score"] = None
        result = self._format(data)
        assert "9.0/10" in result

    def test_empty_data_returns_no_details_message(self):
        result = self._format({"data": {}})
        assert result == "No hotel details found."
