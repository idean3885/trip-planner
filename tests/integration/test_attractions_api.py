"""
Integration tests for attractions CLI scripts.

These tests make real API calls to the Booking.com RapidAPI and require a valid
RAPIDAPI_KEY in mcp-servers/hotels_mcp_server/.env.

Run with:
    pytest -m integration

Exclude from regular runs:
    pytest -m "not integration"
"""

import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv

# Load .env before importing api_client so RAPIDAPI_KEY is available
_env_path = Path(__file__).parent.parent.parent / "mcp-servers" / "hotels_mcp_server" / ".env"
load_dotenv(dotenv_path=_env_path)

# Ensure hotels_mcp package is importable (mirrors pyproject.toml pythonpath setting)
_hotels_mcp_root = Path(__file__).parent.parent.parent / "mcp-servers" / "hotels_mcp_server"
if str(_hotels_mcp_root) not in sys.path:
    sys.path.insert(0, str(_hotels_mcp_root))

from hotels_mcp.api_client import make_rapidapi_request  # noqa: E402


# ---------------------------------------------------------------------------
# Constants used across tests
# ---------------------------------------------------------------------------

BARCELONA_QUERY = "Barcelona"
BARCELONA_DESTINATION_ID = "eyJ1ZmkiOi0zNzI0OTB9"
SAGRADA_FAMILIA_SLUG = "prbspnfdkbkw-admission-to-sagrada-familia"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestSearchAttractionLocations:
    """Real API calls for /api/v1/attraction/searchLocation."""

    async def test_returns_successful_status(self):
        """API response has status=True for a valid city query."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/searchLocation",
            params={"query": BARCELONA_QUERY},
        )

        assert "error" not in result, f"Unexpected API error: {result.get('error')}"
        assert result.get("status") is True

    async def test_destinations_list_is_non_empty(self):
        """Searching 'Barcelona' returns at least one destination."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/searchLocation",
            params={"query": BARCELONA_QUERY},
        )

        destinations = result.get("data", {}).get("destinations", [])
        assert len(destinations) > 0, "Expected at least one destination for Barcelona"

    async def test_destination_fields_present(self):
        """Each destination has id, cityName, and country fields."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/searchLocation",
            params={"query": BARCELONA_QUERY},
        )

        destinations = result.get("data", {}).get("destinations", [])
        assert destinations, "No destinations returned"

        first = destinations[0]
        assert "id" in first, "Destination missing 'id' field"
        assert "cityName" in first, "Destination missing 'cityName' field"
        assert "country" in first, "Destination missing 'country' field"

    async def test_barcelona_destination_id_present(self):
        """Known Barcelona destination ID appears in results."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/searchLocation",
            params={"query": BARCELONA_QUERY},
        )

        destinations = result.get("data", {}).get("destinations", [])
        ids = [d.get("id") for d in destinations]
        assert BARCELONA_DESTINATION_ID in ids, (
            f"Expected destination ID {BARCELONA_DESTINATION_ID} in {ids}"
        )


@pytest.mark.integration
class TestSearchAttractions:
    """Real API calls for /api/v1/attraction/searchAttractions."""

    async def test_returns_successful_status(self):
        """API response has status=True for a valid destination ID."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/searchAttractions",
            params={"id": BARCELONA_DESTINATION_ID, "sortBy": "trending", "page": "1"},
        )

        assert "error" not in result, f"Unexpected API error: {result.get('error')}"
        assert result.get("status") is True

    async def test_products_list_is_non_empty(self):
        """Searching by Barcelona ID returns at least one product."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/searchAttractions",
            params={"id": BARCELONA_DESTINATION_ID, "sortBy": "trending", "page": "1"},
        )

        products = result.get("data", {}).get("products", [])
        assert len(products) > 0, "Expected at least one product for Barcelona"

    async def test_product_required_fields_present(self):
        """Each product contains name, slug, and representativePrice fields."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/searchAttractions",
            params={"id": BARCELONA_DESTINATION_ID, "sortBy": "trending", "page": "1"},
        )

        products = result.get("data", {}).get("products", [])
        assert products, "No products returned"

        first = products[0]
        assert "name" in first, "Product missing 'name' field"
        assert "slug" in first, "Product missing 'slug' field"
        assert "representativePrice" in first, "Product missing 'representativePrice' field"

    async def test_product_name_is_string(self):
        """Product name field is a non-empty string."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/searchAttractions",
            params={"id": BARCELONA_DESTINATION_ID, "sortBy": "trending", "page": "1"},
        )

        products = result.get("data", {}).get("products", [])
        assert products, "No products returned"

        for product in products[:5]:
            name = product.get("name")
            assert isinstance(name, str) and name, f"Product name is not a non-empty string: {name!r}"

    async def test_representative_price_has_currency_and_amount(self):
        """representativePrice contains currency and chargeAmount fields."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/searchAttractions",
            params={"id": BARCELONA_DESTINATION_ID, "sortBy": "trending", "page": "1"},
        )

        products = result.get("data", {}).get("products", [])
        assert products, "No products returned"

        first = products[0]
        price = first.get("representativePrice", {})
        assert "currency" in price, "representativePrice missing 'currency'"
        assert "chargeAmount" in price, "representativePrice missing 'chargeAmount'"


@pytest.mark.integration
class TestGetAttractionDetails:
    """Real API calls for /api/v1/attraction/getAttractionDetails."""

    async def test_returns_successful_status(self):
        """API response has status=True for a valid slug."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/getAttractionDetails",
            params={"slug": SAGRADA_FAMILIA_SLUG},
        )

        assert "error" not in result, f"Unexpected API error: {result.get('error')}"
        assert result.get("status") is True

    async def test_data_section_is_present(self):
        """Response contains a non-empty data section."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/getAttractionDetails",
            params={"slug": SAGRADA_FAMILIA_SLUG},
        )

        data = result.get("data")
        assert data, "Expected non-empty 'data' in response"

    async def test_name_field_present_and_string(self):
        """Attraction detail has a non-empty string name."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/getAttractionDetails",
            params={"slug": SAGRADA_FAMILIA_SLUG},
        )

        data = result.get("data", {})
        name = data.get("name")
        assert isinstance(name, str) and name, f"name is not a non-empty string: {name!r}"

    async def test_description_field_present(self):
        """Attraction detail includes a description field."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/getAttractionDetails",
            params={"slug": SAGRADA_FAMILIA_SLUG},
        )

        data = result.get("data", {})
        assert "description" in data, "Missing 'description' in attraction details"

    async def test_representative_price_present(self):
        """Attraction detail has pricing information."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/getAttractionDetails",
            params={"slug": SAGRADA_FAMILIA_SLUG},
        )

        data = result.get("data", {})
        assert "representativePrice" in data, "Missing 'representativePrice' in attraction details"

        price = data["representativePrice"]
        assert isinstance(price, dict), "representativePrice should be a dict"

    async def test_cancellation_policy_present(self):
        """Attraction detail includes a cancellationPolicy section."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/getAttractionDetails",
            params={"slug": SAGRADA_FAMILIA_SLUG},
        )

        data = result.get("data", {})
        assert "cancellationPolicy" in data, "Missing 'cancellationPolicy' in attraction details"
        assert isinstance(data["cancellationPolicy"], dict)

    async def test_is_bookable_field_is_bool(self):
        """isBookable field is a boolean."""
        result = await make_rapidapi_request(
            "/api/v1/attraction/getAttractionDetails",
            params={"slug": SAGRADA_FAMILIA_SLUG},
        )

        data = result.get("data", {})
        assert "isBookable" in data, "Missing 'isBookable' in attraction details"
        assert isinstance(data["isBookable"], bool), f"isBookable should be bool, got {type(data['isBookable'])}"
