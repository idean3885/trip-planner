# -*- coding: utf-8 -*-
"""
parse-daily-to-events.py — 데일리 마크다운 파일에서 캘린더 이벤트를 JSON으로 추출

Usage:
    # Single trip directory
    python3 scripts/parse-daily-to-events.py trips/2026-honeymoon-portugal-spain/

    # Output to file
    python3 scripts/parse-daily-to-events.py trips/2026-honeymoon-portugal-spain/ -o events.json

    # Single daily file (year must be provided since no overview.md context)
    python3 scripts/parse-daily-to-events.py trips/2026-honeymoon-portugal-spain/daily/day01-0607-lisbon-arrival.md --year 2026

Exit code:
    0 — 성공
    1 — 오류 발생
"""

import sys
import re
import json
import argparse
from pathlib import Path


# ---------------------------------------------------------------------------
# Markdown utility helpers
# ---------------------------------------------------------------------------

MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def strip_markdown(text: str) -> str:
    """마크다운 링크, 강조 기호 등을 제거하고 plain text 반환."""
    # [text](url) → text
    text = MARKDOWN_LINK_RE.sub(r"\1", text)
    # **bold** / *italic*
    text = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", text)
    return text.strip()


def extract_link_url(text: str) -> str | None:
    """첫 번째 마크다운 링크의 URL 반환. 없으면 None."""
    m = MARKDOWN_LINK_RE.search(text)
    return m.group(2) if m else None


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------

# 시간대 키워드 → 대표 시각 매핑
TIME_KEYWORD_MAP: dict[str, str | None] = {
    "오전": "09:00",
    "점심": "12:00",
    "오후": "14:00",
    "저녁": "18:00",
    "종일": None,
}

TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})")


def parse_time(raw: str) -> tuple[str | None, bool]:
    """시간대 문자열을 (start_time, all_day) 로 변환.

    Returns:
        (start_time, all_day)
        - start_time: "HH:MM" 또는 None
        - all_day: True면 종일 이벤트
    """
    raw = raw.strip()

    # 숫자 시각 (예: "20:15", "21:30~")
    m = TIME_RE.match(raw)
    if m:
        hh = int(m.group(1))
        mm = int(m.group(2))
        return f"{hh:02d}:{mm:02d}", False

    # 키워드 매핑
    for keyword, mapped_time in TIME_KEYWORD_MAP.items():
        if keyword in raw:
            if keyword == "종일":
                return None, True
            return mapped_time, False

    # 알 수 없는 형식 → None
    return None, False


# ---------------------------------------------------------------------------
# Date extraction
# ---------------------------------------------------------------------------

# DAY 1 — 리스본 도착 (6/7 일)
TITLE_FORMAT_1 = re.compile(r"#\s+DAY\s+\d+\s*[—\-]+\s*.*?\((\d+)/(\d+)\s*[가-힣]+\)")
# DAY 6 | 6.12 (금) - ...
TITLE_FORMAT_2 = re.compile(r"#\s+DAY\s+\d+\s*\|\s*(\d+)\.(\d+)\s*\([가-힣]+\)")


def extract_date_from_title(title_line: str) -> tuple[int, int] | None:
    """제목 줄에서 (month, day) 추출. 실패 시 None."""
    m = TITLE_FORMAT_1.search(title_line)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = TITLE_FORMAT_2.search(title_line)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None


def extract_year_from_overview(trip_dir: Path) -> int | None:
    """overview.md 에서 연도 추출. 예: **기간**: 2026.6.7(일) ~ ..."""
    overview = trip_dir / "overview.md"
    if not overview.exists():
        return None
    content = overview.read_text(encoding="utf-8")
    m = re.search(r"\*\*기간\*\*[^\d]*(\d{4})\.", content)
    if m:
        return int(m.group(1))
    return None


# ---------------------------------------------------------------------------
# Table parsing
# ---------------------------------------------------------------------------

def parse_table_rows(lines: list[str], section_start: int) -> list[list[str]]:
    """section_start 이후의 마크다운 표를 파싱하여 행 목록 반환 (헤더/구분선 제외)."""
    rows = []
    in_table = False
    header_passed = False
    separator_passed = False

    for line in lines[section_start:]:
        stripped = line.strip()
        if not stripped:
            if in_table:
                break
            continue
        if stripped.startswith("|"):
            in_table = True
            if not header_passed:
                header_passed = True
                continue  # 헤더 행 스킵
            if not separator_passed:
                # 구분선 행 (|---|---|)
                if re.match(r"^\|[\s\-|:]+\|$", stripped):
                    separator_passed = True
                    continue
            # 데이터 행
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            rows.append(cells)
        else:
            if in_table:
                break  # 표 끝

    return rows


def find_section_line(lines: list[str], section_name: str) -> int | None:
    """## {section_name} 으로 시작하는 줄 인덱스 반환. 없으면 None."""
    for i, line in enumerate(lines):
        if re.match(rf"^##\s+{re.escape(section_name)}(\s|$)", line.strip()):
            return i
    return None


# ---------------------------------------------------------------------------
# Event extractors
# ---------------------------------------------------------------------------

def extract_schedule_events(
    lines: list[str], date_str: str
) -> list[dict]:
    """## 일정 섹션에서 이벤트 추출."""
    events = []
    section_idx = find_section_line(lines, "일정")
    if section_idx is None:
        return events

    rows = parse_table_rows(lines, section_idx + 1)
    for row in rows:
        if len(row) < 2:
            continue
        time_raw = row[0]
        schedule_raw = row[1]
        booking = row[2] if len(row) > 2 else ""
        cost = row[3] if len(row) > 3 else ""

        if not time_raw or not schedule_raw:
            continue
        if re.match(r"^[-—\s]*$", schedule_raw):
            continue

        title = strip_markdown(schedule_raw)
        if not title or title in ("-", "—"):
            continue

        location = extract_link_url(schedule_raw)
        start_time, all_day = parse_time(time_raw)

        notes_parts = []
        if cost and cost not in ("-", "—", ""):
            notes_parts.append(f"비용: {strip_markdown(cost)}")
        if booking and booking not in ("-", "—", ""):
            notes_parts.append(f"예약: {strip_markdown(booking)}")

        events.append({
            "title": title,
            "start_date": date_str,
            "start_time": start_time,
            "end_time": None,
            "all_day": all_day,
            "location": location,
            "notes": "; ".join(notes_parts) if notes_parts else None,
            "source_section": "일정",
        })

    return events


def extract_flight_events(
    lines: list[str], date_str: str, year: int
) -> list[dict]:
    """## 항공 섹션에서 이벤트 추출.

    열: 편명 | 출발 | 도착 | 예약번호
    출발/도착 형식: "인천 13:00", "리스본 20:15"
    """
    events = []
    section_idx = find_section_line(lines, "항공")
    if section_idx is None:
        return events

    rows = parse_table_rows(lines, section_idx + 1)
    for row in rows:
        if len(row) < 3:
            continue
        flight_name = row[0].strip()
        departure_raw = row[1].strip()
        arrival_raw = row[2].strip()
        booking_num = row[3].strip() if len(row) > 3 else ""

        if not flight_name or flight_name in ("-", "—"):
            continue

        # 출발지/시각 파싱: "인천 13:00" → ("인천", "13:00")
        dep_city, dep_time = _split_city_time(departure_raw)
        arr_city, arr_time = _split_city_time(arrival_raw)

        title = strip_markdown(flight_name)
        if dep_city:
            title = f"{title} ({dep_city}→{arr_city})"

        notes_parts = []
        if booking_num and booking_num not in ("-", "—", ""):
            notes_parts.append(f"예약번호: {booking_num}")
        if arr_city and arr_time:
            notes_parts.append(f"도착: {arr_city} {arr_time}")

        events.append({
            "title": title,
            "start_date": date_str,
            "start_time": dep_time or None,
            "end_time": arr_time or None,
            "all_day": False,
            "location": dep_city or None,
            "notes": "; ".join(notes_parts) if notes_parts else None,
            "source_section": "항공",
        })

    return events


def extract_transport_events(
    lines: list[str], date_str: str
) -> list[dict]:
    """## 도시 간 이동 섹션에서 이벤트 추출.

    열: 구간 | 수단 | 소요시간 | 비용(2인) | 예약
    """
    events = []
    section_idx = find_section_line(lines, "도시 간 이동")
    if section_idx is None:
        return events

    rows = parse_table_rows(lines, section_idx + 1)
    for row in rows:
        if len(row) < 2:
            continue
        route = row[0].strip()
        transport = row[1].strip() if len(row) > 1 else ""
        duration = row[2].strip() if len(row) > 2 else ""
        cost = row[3].strip() if len(row) > 3 else ""
        booking = row[4].strip() if len(row) > 4 else ""

        if not route or route in ("-", "—"):
            continue

        title = f"{strip_markdown(route)} ({strip_markdown(transport)})"

        notes_parts = []
        if duration and duration not in ("-", "—", ""):
            notes_parts.append(f"소요: {strip_markdown(duration)}")
        if cost and cost not in ("-", "—", ""):
            notes_parts.append(f"비용: {strip_markdown(cost)}")
        if booking and booking not in ("-", "—", ""):
            notes_parts.append(f"예약: {strip_markdown(booking)}")

        events.append({
            "title": title,
            "start_date": date_str,
            "start_time": None,
            "end_time": None,
            "all_day": False,
            "location": None,
            "notes": "; ".join(notes_parts) if notes_parts else None,
            "source_section": "도시 간 이동",
        })

    return events


def _split_city_time(raw: str) -> tuple[str, str]:
    """"도시명 HH:MM" 형식에서 (도시명, HH:MM) 반환. 파싱 실패 시 ("", "")."""
    raw = raw.strip()
    m = re.search(r"(\d{1,2}:\d{2})", raw)
    if m:
        time_part = m.group(1)
        hh, mm = time_part.split(":")
        normalized_time = f"{int(hh):02d}:{int(mm):02d}"
        city_part = raw[: m.start()].strip()
        return city_part, normalized_time
    return raw, ""


# ---------------------------------------------------------------------------
# Per-file parsing
# ---------------------------------------------------------------------------

def parse_daily_file(filepath: Path, year: int) -> list[dict]:
    """단일 데일리 파일에서 이벤트 목록 추출."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except OSError as e:
        print(f"오류: 파일 읽기 실패 {filepath}: {e}", file=sys.stderr)
        return []

    lines = content.splitlines()
    if not lines:
        return []

    # 날짜 추출 (첫 번째 # 제목 줄에서)
    title_line = next(
        (l for l in lines if l.strip().startswith("# ")), ""
    )
    date_parts = extract_date_from_title(title_line)
    if date_parts is None:
        print(
            f"경고: {filepath.name} — 날짜 파싱 실패, 스킵합니다.",
            file=sys.stderr,
        )
        return []

    month, day = date_parts
    date_str = f"{year}-{month:02d}-{day:02d}"

    events: list[dict] = []
    events.extend(extract_flight_events(lines, date_str, year))
    events.extend(extract_schedule_events(lines, date_str))
    events.extend(extract_transport_events(lines, date_str))

    return events


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="데일리 마크다운 파일에서 캘린더 이벤트를 JSON으로 추출합니다."
    )
    parser.add_argument(
        "path",
        help="여행 디렉토리 또는 단일 데일리 .md 파일 경로",
    )
    parser.add_argument(
        "-o",
        "--output",
        metavar="FILE",
        help="JSON 출력 파일 경로 (생략 시 stdout)",
    )
    parser.add_argument(
        "--year",
        type=int,
        help="연도 (단일 파일 지정 시 필수; 디렉토리 지정 시 overview.md에서 자동 추출)",
    )
    return parser


def collect_daily_files(path: Path) -> list[Path]:
    """디렉토리 또는 파일을 받아 처리할 .md 파일 목록 반환."""
    if path.is_file():
        return [path]
    if path.is_dir():
        daily_dir = path / "daily"
        if daily_dir.exists():
            return sorted(daily_dir.glob("day*.md"))
        # daily/ 서브디렉토리 없이 직접 daily 디렉토리로 지정된 경우
        return sorted(path.glob("day*.md"))
    return []


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()

    target = Path(args.path)
    if not target.exists():
        print(f"오류: 경로가 존재하지 않습니다: {target}", file=sys.stderr)
        return 1

    daily_files = collect_daily_files(target)
    if not daily_files:
        print(f"오류: 처리할 데일리 파일을 찾을 수 없습니다: {target}", file=sys.stderr)
        return 1

    # 연도 결정
    year = args.year
    if year is None:
        # 여행 디렉토리 루트 찾기
        if target.is_file():
            trip_dir = target.parent.parent
        elif (target / "overview.md").exists():
            trip_dir = target
        else:
            trip_dir = target.parent

        year = extract_year_from_overview(trip_dir)
        if year is None:
            print(
                "오류: overview.md에서 연도를 찾을 수 없습니다. --year 옵션을 사용하세요.",
                file=sys.stderr,
            )
            return 1

    all_events: list[dict] = []
    error_count = 0

    for filepath in daily_files:
        events = parse_daily_file(filepath, year)
        if not events and filepath.stat().st_size > 100:
            # 내용이 있는 파일인데 이벤트가 없으면 경고
            print(f"경고: {filepath.name} — 이벤트 없음", file=sys.stderr)
        all_events.extend(events)

    output_json = json.dumps(all_events, ensure_ascii=False, indent=2)

    if args.output:
        out_path = Path(args.output)
        try:
            out_path.write_text(output_json, encoding="utf-8")
            print(
                f"완료: {len(all_events)}개 이벤트 → {out_path}",
                file=sys.stderr,
            )
        except OSError as e:
            print(f"오류: 파일 쓰기 실패 {out_path}: {e}", file=sys.stderr)
            return 1
    else:
        print(output_json)

    return 0


if __name__ == "__main__":
    sys.exit(main())
