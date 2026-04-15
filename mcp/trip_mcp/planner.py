"""일정 관리 도구 — 여행/일자/활동 CRUD (웹 API 기반)."""

import logging
from mcp.server.fastmcp import FastMCP
from trip_mcp.web_client import api_request

logger = logging.getLogger("trip-mcp-server")


def register_planner_tools(mcp: FastMCP) -> None:
    """일정 관리 도구 12개를 FastMCP 서버에 등록한다."""

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
                activity_count = day.get("_count", {}).get("activities", 0)
                if activity_count:
                    day_info += f"\n  활동: {activity_count}개"
                content = day.get("content", "")
                has_content = bool(content)
                if has_content:
                    preview = content[:200].replace("\n", " ")
                    day_info += f"\n  내용: {preview}{'...' if len(content) > 200 else ''}"
                elif not activity_count:
                    day_info += "\n  (내용 없음)"
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

    # ── Activity CRUD ──────────────────────────────────────

    @mcp.tool()
    async def create_activity(
        trip_id: int,
        day_id: int,
        category: str,
        title: str,
        start_time: str = "",
        end_time: str = "",
        location: str = "",
        memo: str = "",
        cost: float = 0,
        currency: str = "EUR",
        reservation_status: str = "",
    ) -> str:
        """일자에 활동을 추가한다.

        Args:
            trip_id: 여행 ID
            day_id: 일자 ID (get_trip에서 확인)
            category: 활동 유형 (SIGHTSEEING, DINING, TRANSPORT, ACCOMMODATION, SHOPPING, OTHER)
            title: 활동 제목 (예: "벨렝 탑 방문")
            start_time: 시작 시간 HH:mm (예: "09:30", 선택)
            end_time: 종료 시간 HH:mm (예: "11:00", 선택)
            location: 장소명 (예: "Torre de Belém", 선택)
            memo: 메모 (선택)
            cost: 예상 비용 (0이면 미입력, 선택)
            currency: 통화 코드 (기본 EUR)
            reservation_status: 예약 상태 (REQUIRED, RECOMMENDED, ON_SITE, NOT_NEEDED, 선택)
        """
        body: dict = {"category": category, "title": title, "currency": currency}
        if start_time:
            body["startTime"] = start_time
        if end_time:
            body["endTime"] = end_time
        if location:
            body["location"] = location
        if memo:
            body["memo"] = memo
        if cost:
            body["cost"] = cost
        if reservation_status:
            body["reservationStatus"] = reservation_status

        result = await api_request(
            "POST", f"/api/trips/{trip_id}/days/{day_id}/activities", json=body
        )

        if "error" in result:
            return f"오류: {result['error']}"

        time_info = ""
        if result.get("startTime"):
            time_info = f" {result['startTime']}"
            if result.get("endTime"):
                time_info += f"~{result['endTime']}"

        return (
            f"활동 추가 완료: [{result.get('category', category)}]{time_info} "
            f"{result.get('title', title)} (ID: {result.get('id', 'N/A')})"
        )

    @mcp.tool()
    async def update_activity(
        trip_id: int,
        day_id: int,
        activity_id: int,
        title: str = "",
        start_time: str = "",
        end_time: str = "",
        location: str = "",
        memo: str = "",
        cost: float = 0,
        currency: str = "",
        category: str = "",
        reservation_status: str = "",
    ) -> str:
        """활동을 수정한다.

        Args:
            trip_id: 여행 ID
            day_id: 일자 ID
            activity_id: 활동 ID
            title: 변경할 제목 (빈 문자열이면 변경하지 않음)
            start_time: 변경할 시작 시간 HH:mm
            end_time: 변경할 종료 시간 HH:mm
            location: 변경할 장소명
            memo: 변경할 메모
            cost: 변경할 비용 (0이면 변경하지 않음)
            currency: 변경할 통화 코드
            category: 변경할 유형 (SIGHTSEEING, DINING, TRANSPORT, ACCOMMODATION, SHOPPING, OTHER)
            reservation_status: 변경할 예약 상태 (REQUIRED, RECOMMENDED, ON_SITE, NOT_NEEDED)
        """
        body: dict = {}
        if title:
            body["title"] = title
        if start_time:
            body["startTime"] = start_time
        if end_time:
            body["endTime"] = end_time
        if location:
            body["location"] = location
        if memo:
            body["memo"] = memo
        if cost:
            body["cost"] = cost
        if currency:
            body["currency"] = currency
        if category:
            body["category"] = category
        if reservation_status:
            body["reservationStatus"] = reservation_status

        if not body:
            return "변경할 내용이 없습니다. 수정할 필드를 지정하세요."

        result = await api_request(
            "PUT",
            f"/api/trips/{trip_id}/days/{day_id}/activities/{activity_id}",
            json=body,
        )

        if "error" in result:
            return f"오류: {result['error']}"

        return f"활동 수정 완료: {result.get('title', 'N/A')} (ID: {activity_id})"

    @mcp.tool()
    async def delete_activity(trip_id: int, day_id: int, activity_id: int) -> str:
        """활동을 삭제한다.

        Args:
            trip_id: 여행 ID
            day_id: 일자 ID
            activity_id: 삭제할 활동 ID
        """
        result = await api_request(
            "DELETE",
            f"/api/trips/{trip_id}/days/{day_id}/activities/{activity_id}",
        )

        if "error" in result:
            return f"오류: {result['error']}"

        return f"활동 삭제 완료 (ID: {activity_id})"

    @mcp.tool()
    async def reorder_activities(
        trip_id: int, day_id: int, activity_ids: list[int]
    ) -> str:
        """일자 내 활동 순서를 변경한다.

        Args:
            trip_id: 여행 ID
            day_id: 일자 ID
            activity_ids: 새 순서의 활동 ID 목록 (예: [3, 1, 2])
        """
        result = await api_request(
            "PATCH",
            f"/api/trips/{trip_id}/days/{day_id}/activities",
            json={"orderedIds": activity_ids},
        )

        if "error" in result:
            return f"오류: {result['error']}"

        return f"활동 순서 변경 완료 ({len(activity_ids)}개)"

    # ── 마크다운 변환 지원 ─────────────────────────────

    @mcp.tool()
    async def get_day_content(trip_id: int, day_id: int) -> str:
        """일자의 전체 마크다운 콘텐츠를 조회한다. 활동 변환 시 원본 확인용.

        Args:
            trip_id: 여행 ID
            day_id: 일자 ID (get_trip에서 확인)
        """
        result = await api_request("GET", f"/api/trips/{trip_id}/days/{day_id}")

        if "error" in result:
            return f"오류: {result['error']}"

        content = result.get("content", "")
        if not content:
            return f"일자 ID {day_id}에 마크다운 콘텐츠가 없습니다."

        activities = result.get("activities", [])
        header = f"[Day ID: {day_id}] 활동: {len(activities)}개 | 마크다운: {len(content)}자\n"
        return header + "---\n" + content

    @mcp.tool()
    async def clear_day_content(trip_id: int, day_id: int) -> str:
        """일자의 마크다운 콘텐츠를 비운다. 활동 변환 완료 후 정리용.

        주의: 활동이 0개인 상태에서는 실행할 수 없다 (데이터 유실 방지).

        Args:
            trip_id: 여행 ID
            day_id: 일자 ID
        """
        # 먼저 활동 수 확인
        day = await api_request("GET", f"/api/trips/{trip_id}/days/{day_id}")
        if "error" in day:
            return f"오류: {day['error']}"

        activities = day.get("activities", [])
        if not activities:
            return "활동이 0개입니다. 먼저 create_activity로 활동을 추가한 뒤 실행하세요."

        content = day.get("content", "")
        if not content:
            return "이미 마크다운 콘텐츠가 비어 있습니다."

        result = await api_request(
            "PUT",
            f"/api/trips/{trip_id}/days/{day_id}",
            json={"content": ""},
        )

        if "error" in result:
            return f"오류: {result['error']}"

        return f"마크다운 콘텐츠 삭제 완료 (일자 ID: {day_id}, 활동 {len(activities)}개 유지)"
