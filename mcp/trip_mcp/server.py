"""trip-mcp 통합 서버 — 검색(RapidAPI) + 일정 관리(웹 API)."""

import argparse
import logging
import signal
import sys

from mcp.server.fastmcp import FastMCP

from trip_mcp.search import register_search_tools
from trip_mcp.planner import register_planner_tools

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("trip-mcp-server")

mcp = FastMCP("trip")

# 도구 등록: 검색 8개 + CRUD 10개 = 18개
register_search_tools(mcp)
register_planner_tools(mcp)


def handle_shutdown(signum, frame):
    logger.info("Received shutdown signal, shutting down gracefully...")
    sys.exit(0)


def main():
    parser = argparse.ArgumentParser(description="Trip Planner MCP Server")
    parser.parse_args()

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    try:
        logger.info("Starting Trip MCP Server with stdio transport...")
        mcp.run(transport="stdio")
        return 0
    except Exception as e:
        logger.error(f"Error starting server: {e}")
        return 1
    finally:
        logger.info("Trip MCP Server shutting down...")


if __name__ == "__main__":
    sys.exit(main())
