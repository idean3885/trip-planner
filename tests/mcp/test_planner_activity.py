"""Activity CRUD + 변환 MCP 도구 단위 테스트."""

import pytest
from unittest.mock import AsyncMock, patch
from mcp.server.fastmcp import FastMCP

from trip_mcp.planner import register_planner_tools


@pytest.fixture
def mcp():
    m = FastMCP("test")
    register_planner_tools(m)
    return m


@pytest.fixture
def tools(mcp):
    """도구 이름 → 함수 매핑."""
    import asyncio
    tool_list = asyncio.get_event_loop().run_until_complete(mcp.list_tools())
    # FastMCP 내부에서 등록된 함수를 가져옴
    return {t.name: t for t in tool_list}


def get_tool_fn(mcp, name):
    """FastMCP에서 도구 함수를 직접 가져온다."""
    return mcp._tool_manager._tools[name].fn


class TestCreateActivity:
    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_success(self, mock_api, mcp):
        mock_api.return_value = {"id": 1, "category": "SIGHTSEEING", "title": "벨렝 탑", "startTime": "2026-06-07T09:00:00.000Z", "endTime": "2026-06-07T11:00:00.000Z"}
        fn = get_tool_fn(mcp, "create_activity")
        result = await fn(trip_id=1, day_id=1, category="SIGHTSEEING", title="벨렝 탑", start_time="09:00", end_time="11:00")
        assert "활동 추가 완료" in result
        assert "벨렝 탑" in result
        mock_api.assert_called_once()

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_error(self, mock_api, mcp):
        mock_api.return_value = {"error": "권한 없음"}
        fn = get_tool_fn(mcp, "create_activity")
        result = await fn(trip_id=1, day_id=1, category="DINING", title="식사")
        assert "오류" in result

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_all_optional_fields(self, mock_api, mcp):
        mock_api.return_value = {"id": 2, "category": "DINING", "title": "Lunch", "startTime": None, "endTime": None}
        fn = get_tool_fn(mcp, "create_activity")
        result = await fn(
            trip_id=1, day_id=1, category="DINING", title="Lunch",
            start_time="12:00", end_time="13:00", location="Restaurant",
            memo="Good", cost=25.0, currency="EUR", reservation_status="RECOMMENDED",
        )
        assert "활동 추가 완료" in result
        call_body = mock_api.call_args[1]["json"]
        assert call_body["location"] == "Restaurant"
        assert call_body["cost"] == 25.0


class TestUpdateActivity:
    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_success(self, mock_api, mcp):
        mock_api.return_value = {"id": 1, "title": "수정됨"}
        fn = get_tool_fn(mcp, "update_activity")
        result = await fn(trip_id=1, day_id=1, activity_id=1, title="수정됨")
        assert "활동 수정 완료" in result

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_no_changes(self, mock_api, mcp):
        fn = get_tool_fn(mcp, "update_activity")
        result = await fn(trip_id=1, day_id=1, activity_id=1)
        assert "변경할 내용이 없습니다" in result
        mock_api.assert_not_called()

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_error(self, mock_api, mcp):
        mock_api.return_value = {"error": "Not Found"}
        fn = get_tool_fn(mcp, "update_activity")
        result = await fn(trip_id=1, day_id=1, activity_id=999, title="x")
        assert "오류" in result


class TestDeleteActivity:
    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_success(self, mock_api, mcp):
        mock_api.return_value = {"ok": True}
        fn = get_tool_fn(mcp, "delete_activity")
        result = await fn(trip_id=1, day_id=1, activity_id=1)
        assert "활동 삭제 완료" in result

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_error(self, mock_api, mcp):
        mock_api.return_value = {"error": "Forbidden"}
        fn = get_tool_fn(mcp, "delete_activity")
        result = await fn(trip_id=1, day_id=1, activity_id=1)
        assert "오류" in result


class TestReorderActivities:
    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_success(self, mock_api, mcp):
        mock_api.return_value = {"ok": True}
        fn = get_tool_fn(mcp, "reorder_activities")
        result = await fn(trip_id=1, day_id=1, activity_ids=[3, 1, 2])
        assert "활동 순서 변경 완료" in result
        assert "3개" in result


class TestGetDayContent:
    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_returns_content(self, mock_api, mcp):
        mock_api.return_value = {"content": "# Day 1\n일정 내용", "activities": []}
        fn = get_tool_fn(mcp, "get_day_content")
        result = await fn(trip_id=1, day_id=1)
        assert "# Day 1" in result
        assert "마크다운: " in result

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_empty_content(self, mock_api, mcp):
        mock_api.return_value = {"content": "", "activities": [{"id": 1}]}
        fn = get_tool_fn(mcp, "get_day_content")
        result = await fn(trip_id=1, day_id=1)
        assert "콘텐츠가 없습니다" in result

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_error(self, mock_api, mcp):
        mock_api.return_value = {"error": "Not Found"}
        fn = get_tool_fn(mcp, "get_day_content")
        result = await fn(trip_id=1, day_id=1)
        assert "오류" in result


class TestClearDayContent:
    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_success(self, mock_api, mcp):
        mock_api.side_effect = [
            {"content": "old content", "activities": [{"id": 1}]},  # GET
            {"id": 1, "content": ""},  # PUT
        ]
        fn = get_tool_fn(mcp, "clear_day_content")
        result = await fn(trip_id=1, day_id=1)
        assert "마크다운 콘텐츠 삭제 완료" in result
        assert "활동 1개 유지" in result

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_blocked_when_no_activities(self, mock_api, mcp):
        mock_api.return_value = {"content": "old", "activities": []}
        fn = get_tool_fn(mcp, "clear_day_content")
        result = await fn(trip_id=1, day_id=1)
        assert "활동이 0개입니다" in result

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_already_empty(self, mock_api, mcp):
        mock_api.return_value = {"content": "", "activities": [{"id": 1}]}
        fn = get_tool_fn(mcp, "clear_day_content")
        result = await fn(trip_id=1, day_id=1)
        assert "이미 마크다운 콘텐츠가 비어 있습니다" in result

    @pytest.mark.asyncio
    @patch("trip_mcp.planner.api_request")
    async def test_error(self, mock_api, mcp):
        mock_api.return_value = {"error": "Unauthorized"}
        fn = get_tool_fn(mcp, "clear_day_content")
        result = await fn(trip_id=1, day_id=1)
        assert "오류" in result
