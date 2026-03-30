import httpx
import logging
import os
from typing import Dict, Any, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger("travel-mcp-server")

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "booking-com15.p.rapidapi.com")

# Shared client for connection reuse (connection pooling)
_client: Optional[httpx.AsyncClient] = None


def get_client() -> httpx.AsyncClient:
    """Get or create a shared httpx client for connection reuse."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


async def make_rapidapi_request(endpoint: str, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Make a request to the RapidAPI with proper error handling."""
    api_key = RAPIDAPI_KEY or os.getenv("RAPIDAPI_KEY")
    api_host = RAPIDAPI_HOST or os.getenv("RAPIDAPI_HOST", "booking-com15.p.rapidapi.com")

    if not api_key:
        return {"error": "RAPIDAPI_KEY is not set. Please check your .env file or environment variables."}

    url = f"https://{api_host}{endpoint}"

    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": api_host
    }

    logger.info(f"Making API request to {endpoint} with params: {params}")
    client = get_client()
    try:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        logger.info(f"API request to {endpoint} successful")
        return response.json()
    except Exception as e:
        logger.error(f"API request to {endpoint} failed: {str(e)}")
        return {"error": str(e)}
