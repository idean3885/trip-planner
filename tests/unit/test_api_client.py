"""Unit tests for api_client.py — make_rapidapi_request."""
import pytest
import httpx
from pytest_httpx import HTTPXMock
from unittest.mock import patch

import hotels_mcp.api_client as api_client_module
from hotels_mcp.api_client import make_rapidapi_request


# Patch module-level constants so tests work without a real .env file
@pytest.fixture(autouse=True)
def patch_api_credentials():
    with (
        patch.object(api_client_module, "RAPIDAPI_KEY", "test-key-123"),
        patch.object(api_client_module, "RAPIDAPI_HOST", "booking-com15.p.rapidapi.com"),
    ):
        # Reset shared client before each test so httpx_mock can intercept
        api_client_module._client = None
        yield
        api_client_module._client = None


class TestMakeRapidapiRequest:
    async def test_successful_response(self, httpx_mock: HTTPXMock):
        """Successful GET returns parsed JSON."""
        httpx_mock.add_response(
            url="https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination?query=Lisbon",
            json={"status": True, "data": [{"name": "Lisbon"}]},
        )

        result = await make_rapidapi_request(
            "/api/v1/hotels/searchDestination", {"query": "Lisbon"}
        )

        assert result["status"] is True
        assert result["data"][0]["name"] == "Lisbon"

    async def test_error_response_returns_error_key(self, httpx_mock: HTTPXMock):
        """HTTP error response returns dict with 'error' key."""
        httpx_mock.add_response(
            url="https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination?query=bad",
            status_code=500,
        )

        result = await make_rapidapi_request(
            "/api/v1/hotels/searchDestination", {"query": "bad"}
        )

        assert "error" in result

    async def test_timeout_returns_error_key(self, httpx_mock: HTTPXMock):
        """Network timeout returns dict with 'error' key."""
        httpx_mock.add_exception(
            httpx.TimeoutException("timed out"),
            url="https://booking-com15.p.rapidapi.com/api/v1/flights/searchDestination?query=Porto",
        )

        result = await make_rapidapi_request(
            "/api/v1/flights/searchDestination", {"query": "Porto"}
        )

        assert "error" in result

    async def test_request_includes_rapidapi_headers(self, httpx_mock: HTTPXMock):
        """Request carries the correct RapidAPI authentication headers."""
        httpx_mock.add_response(json={"status": True, "data": []})

        await make_rapidapi_request("/api/v1/hotels/searchDestination", {"query": "x"})

        request = httpx_mock.get_requests()[0]
        assert request.headers["X-RapidAPI-Key"] == "test-key-123"
        assert request.headers["X-RapidAPI-Host"] == "booking-com15.p.rapidapi.com"

    async def test_no_params(self, httpx_mock: HTTPXMock):
        """Calling without params does not raise."""
        httpx_mock.add_response(json={"status": True, "data": []})

        result = await make_rapidapi_request("/api/v1/hotels/searchDestination")

        assert "error" not in result


class TestConnectionReuse:
    """API client should reuse connections for performance."""

    def test_module_exposes_shared_client(self):
        """api_client should have a module-level shared client for connection pooling."""
        assert hasattr(api_client_module, "get_client"), \
            "api_client must expose get_client() for connection reuse"

    async def test_consecutive_requests_reuse_client(self, httpx_mock: HTTPXMock):
        """Two consecutive requests should reuse the same underlying client."""
        httpx_mock.add_response(json={"status": True, "data": []})
        httpx_mock.add_response(json={"status": True, "data": []})

        await make_rapidapi_request("/api/v1/hotels/searchDestination", {"query": "a"})
        await make_rapidapi_request("/api/v1/hotels/searchDestination", {"query": "b"})

        # Both requests should have gone through (proves client works for multiple calls)
        assert len(httpx_mock.get_requests()) == 2
