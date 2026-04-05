import httpx
import logging
import os
import platform
import subprocess
from typing import Dict, Any, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger("travel-mcp-server")

KEYCHAIN_SERVICE = "trip-planner"
KEYCHAIN_ACCOUNT = "rapidapi-key"


def _read_keychain() -> Optional[str]:
    """macOS 키체인에서 RapidAPI 키를 읽는다. 실패 시 None 반환."""
    if platform.system() != "Darwin":
        return None
    try:
        result = subprocess.run(
            ["/usr/bin/security", "find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


# 키체인 → 환경변수 순서로 API 키 로드
RAPIDAPI_KEY = _read_keychain() or os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "booking-com15.p.rapidapi.com")


async def make_rapidapi_request(endpoint: str, params: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Make a request to the RapidAPI with proper error handling."""
    # 런타임에 환경변수 재확인 (Claude Desktop env 블록 지원)
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
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params, timeout=30.0)
            response.raise_for_status()
            logger.info(f"API request to {endpoint} successful")
            return response.json()
        except Exception as e:
            logger.error(f"API request to {endpoint} failed: {str(e)}")
            return {"error": str(e)}
