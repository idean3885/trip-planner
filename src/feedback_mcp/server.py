import json
import logging
import signal
import sys
from typing import Optional

from mcp.server.fastmcp import FastMCP

from feedback_mcp.github_client import (
    create_discussion,
    list_discussion_categories,
    list_discussions,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("feedback-mcp-server")

mcp = FastMCP("feedback")


@mcp.tool()
async def list_categories() -> str:
    """GitHub Discussions 카테고리 목록을 조회한다.

    디스커션을 생성하기 전에 사용 가능한 카테고리와 ID를 확인할 때 사용한다.
    """
    logger.info("Listing discussion categories")
    categories = await list_discussion_categories()

    if categories and "error" in categories[0]:
        return f"오류: {categories[0]['error']}"

    if not categories:
        return "사용 가능한 카테고리가 없습니다."

    lines = ["사용 가능한 디스커션 카테고리:\n"]
    for cat in categories:
        emoji = cat.get("emoji", "")
        name = cat.get("name", "")
        desc = cat.get("description", "")
        cat_id = cat.get("id", "")
        lines.append(f"- {emoji} **{name}** (ID: {cat_id})")
        if desc:
            lines.append(f"  {desc}")
    return "\n".join(lines)


@mcp.tool()
async def create_feedback(
    title: str,
    body: str,
    category_id: str,
) -> str:
    """동행자의 피드백을 GitHub Discussion으로 게시한다.

    일정 보완 요청은 제목에 [일정] prefix를, 디자인 피드백은 [디자인] prefix를 붙인다.
    category_id는 list_categories 도구로 먼저 확인한다.

    Args:
        title: 디스커션 제목 (예: "[일정] 셋째 날 저녁 식당 추가 요청")
        body: 디스커션 본문 (마크다운 지원)
        category_id: 카테고리 ID (list_categories로 확인)
    """
    logger.info(f"Creating feedback discussion: {title}")
    result = await create_discussion(title=title, body=body, category_id=category_id)

    if "error" in result:
        return f"오류: {result['error']}"

    number = result.get("number", "?")
    url = result.get("url", "")
    return f"피드백이 등록되었습니다!\n- Discussion #{number}\n- URL: {url}"


@mcp.tool()
async def list_feedback(limit: int = 10) -> str:
    """최근 등록된 피드백(GitHub Discussions) 목록을 조회한다.

    Args:
        limit: 조회할 최대 건수 (기본 10건)
    """
    logger.info(f"Listing recent discussions (limit={limit})")
    discussions = await list_discussions(limit=limit)

    if discussions and "error" in discussions[0]:
        return f"오류: {discussions[0]['error']}"

    if not discussions:
        return "등록된 피드백이 없습니다."

    lines = ["최근 피드백 목록:\n"]
    for d in discussions:
        number = d.get("number", "?")
        title = d.get("title", "")
        author = d.get("author", {}).get("login", "?")
        category = d.get("category", {}).get("name", "?")
        url = d.get("url", "")
        lines.append(f"- #{number} [{category}] {title} (@{author})")
        lines.append(f"  {url}")
    return "\n".join(lines)


def main():
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
