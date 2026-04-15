"""일정 관리 도구 — 여행/일자 CRUD (웹 API 기반)."""

import logging
from mcp.server.fastmcp import FastMCP
from trip_mcp.web_client import api_request

logger = logging.getLogger("trip-mcp-server")


def register_planner_tools(mcp: FastMCP) -> None:
    """일정 관리 도구 6개를 FastMCP 서버에 등록한다."""

    @mcp.tool()
    async def list_trips() -> str:
        """사용자의 여행 목록을 조회한다."""
        result = await api_request("GET", "/api/trips")

        if "error" in result:
            return f"오류: {result['error']}"

        if not isinstance(result, list):
            return "여행 목록이 없습니다."

        if not result:
            return "등록된 여행이 없습니다."

        formatted = []
        for trip in result:
            members = trip.get("tripMembers", [])
            day_count = trip.get("_count", {}).get("days", 0)
            formatted.append(
                f"ID: {trip['id']}\n"
                f"제목: {trip['title']}\n"
                f"기간: {trip.get('startDate', 'N/A')} ~ {trip.get('endDate', 'N/A')}\n"
                f"멤버: {len(members)}명 | 일자: {day_count}일"
            )
        return "\n---\n".join(formatted)

    @mcp.tool()
    async def get_trip(trip_id: int) -> str:
        """여행 상세 정보와 전체 일자를 조회한다.

        Args:
            trip_id: 여행 ID (list_trips에서 확인)
        """
        result = await api_request("GET", f"/api/trips/{trip_id}")

        if "error" in result:
            return f"오류: {result['error']}"

        parts = [
            f"제목: {result.get('title', 'Unknown')}",
            f"설명: {result.get('description', '없음')}",
            f"기간: {result.get('startDate', 'N/A')} ~ {result.get('endDate', 'N/A')}",
            f"내 역할: {result.get('myRole', 'N/A')}",
        ]

        days = result.get("days", [])
        if days:
            parts.append(f"\n=== 일정 ({len(days)}일) ===")
            for day in days:
                day_info = f"\n[Day {day.get('sortOrder', '?')}] {day.get('date', 'N/A')}"
                if day.get("title"):
                    day_info += f" — {day['title']}"
                day_info += f"\n  ID: {day['id']}"
                content = day.get("content", "")
                if content:
                    preview = content[:200].replace("\n", " ")
                    day_info += f"\n  내용: {preview}{'...' if len(content) > 200 else ''}"
                parts.append(day_info)

        members = result.get("tripMembers", [])
        if members:
            parts.append(f"\n=== 멤버 ({len(members)}명) ===")
            for m in members:
                user = m.get("user", {})
                parts.append(f"  {user.get('name', 'Unknown')} ({m.get('role', 'N/A')})")

        return "\n".join(parts)

    @mcp.tool()
    async def create_day(trip_id: int, date: str, title: str, content: str = "") -> str:
        """여행에 새 일자를 추가한다.

        Args:
            trip_id: 여행 ID
            date: 날짜 (YYYY-MM-DD 형식)
            title: 일자 제목 (예: "리스본 도착일")
            content: 일정 내용 (마크다운 지원, 선택사항)
        """
        result = await api_request("POST", f"/api/trips/{trip_id}/days", json={
            "date": date,
            "title": title,
            "content": content,
        })

        if "error" in result:
            return f"오류: {result['error']}"

        return f"일자 추가 완료: [{result.get('date', date)}] {result.get('title', title)} (ID: {result.get('id', 'N/A')})"

    @mcp.tool()
    async def update_day(trip_id: int, day_id: int, title: str = "", content: str = "") -> str:
        """일자의 제목이나 내용을 수정한다.

        Args:
            trip_id: 여행 ID
            day_id: 일자 ID (get_trip에서 확인)
            title: 변경할 제목 (빈 문자열이면 변경하지 않음)
            content: 변경할 내용 (빈 문자열이면 변경하지 않음)
        """
        body: dict = {}
        if title:
            body["title"] = title
        if content:
            body["content"] = content

        if not body:
            return "변경할 내용이 없습니다. title 또는 content를 지정하세요."

        result = await api_request("PUT", f"/api/trips/{trip_id}/days/{day_id}", json=body)

        if "error" in result:
            return f"오류: {result['error']}"

        return f"일자 수정 완료: [{result.get('date', 'N/A')}] {result.get('title', 'N/A')} (ID: {day_id})"

    @mcp.tool()
    async def delete_day(trip_id: int, day_id: int) -> str:
        """일자를 삭제한다.

        Args:
            trip_id: 여행 ID
            day_id: 삭제할 일자 ID (get_trip에서 확인)
        """
        result = await api_request("DELETE", f"/api/trips/{trip_id}/days/{day_id}")

        if "error" in result:
            return f"오류: {result['error']}"

        return f"일자 삭제 완료 (ID: {day_id})"

    @mcp.tool()
    async def list_members(trip_id: int) -> str:
        """여행 멤버 목록을 조회한다.

        Args:
            trip_id: 여행 ID
        """
        result = await api_request("GET", f"/api/trips/{trip_id}/members")

        if "error" in result:
            return f"오류: {result['error']}"

        members = result.get("members", [])
        if not members:
            return "멤버가 없습니다."

        formatted = []
        for m in members:
            user = m.get("user", {})
            formatted.append(
                f"{user.get('name', 'Unknown')} ({user.get('email', 'N/A')})\n"
                f"  역할: {m.get('role', 'N/A')} | 참여: {m.get('joinedAt', 'N/A')}"
            )
        return "\n---\n".join(formatted)
