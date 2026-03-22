#!/usr/bin/env python3
"""
validate-daily.py — 데일리 파일 포맷 정합성 검증 스크립트

Usage:
    python scripts/validate-daily.py trips/*/daily/*.md
    python scripts/validate-daily.py trips/2026-honeymoon/daily/day01-0607-lisbon.md

Exit code:
    0 — 모든 파일 통과
    1 — 하나 이상의 파일 실패
"""

import sys
import re
import glob
from pathlib import Path

# 7개 필수 섹션 (CLAUDE.md 정의)
REQUIRED_SECTIONS = [
    "오늘의 요약",
    "숙소",
    "이동",
    "일정",
    "투어/관광 상세",
    "식사 추천",
    "메모",
]

# 유효한 예약 상태 마커 (data-model.md 정의)
VALID_BOOKING_MARKERS = {
    "🔴 사전 예약 필수",
    "🟡 사전 예약 권장",
    "🟢 현장 구매",
    "⚪ 불필요",
    "✅ 예약 완료",
}

# 예약 상태처럼 보이는 패턴 (이모지로 시작하는 예약 관련 텍스트)
BOOKING_MARKER_PATTERN = re.compile(
    r"(🔴|🟡|🟢|⚪|✅)\s*(사전 예약 필수|사전 예약 권장|현장 구매|불필요|예약 완료)"
)

# 이모지만 있고 올바른 텍스트가 없는 잘못된 패턴 감지
INVALID_BOOKING_PATTERN = re.compile(
    r"(🔴|🟡|🟢|⚪|✅)\s+(?!사전 예약 필수|사전 예약 권장|현장 구매|불필요|예약 완료)(\S+)"
)


def extract_sections(content: str) -> set[str]:
    """마크다운에서 ## 수준 섹션 헤더 추출"""
    sections = set()
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("## "):
            section_name = line[3:].strip()
            sections.add(section_name)
    return sections


def check_missing_sections(sections: set[str]) -> list[str]:
    """필수 섹션 중 누락된 것 반환"""
    missing = []
    for required in REQUIRED_SECTIONS:
        if required not in sections:
            missing.append(required)
    return missing


def check_booking_markers(content: str) -> list[str]:
    """잘못된 예약 상태 마커 검출.

    이모지(🔴🟡🟢⚪✅)가 포함된 토큰을 찾아 유효한 예약 상태 마커와 비교한다.
    유효한 마커: '🔴 사전 예약 필수', '🟡 사전 예약 권장', '🟢 현장 구매', '⚪ 불필요', '✅ 예약 완료'
    이모지만 단독으로 있는 경우는 오류로 처리하지 않는다 (주석 라인 등).
    """
    # 이모지로 시작하고 유효한 마커 텍스트가 뒤따르는 패턴 (가장 긴 것 우선 매칭)
    valid_marker_re = re.compile(
        r"(🔴\s*사전\s*예약\s*필수|🟡\s*사전\s*예약\s*권장|🟢\s*현장\s*구매|⚪\s*불필요|✅\s*예약\s*완료)"
    )
    # 이모지 뒤에 텍스트가 따라오는 모든 패턴 (유효/무효 구분용)
    emoji_with_text_re = re.compile(
        r"(🔴|🟡|🟢|⚪|✅)\s*([^\s|,\n][^|,\n]*?)(?=\s*[|,\n]|$)"
    )

    errors = []
    for i, line in enumerate(content.splitlines(), start=1):
        # 먼저 유효한 마커 위치를 모두 찾는다
        valid_spans = set()
        for m in valid_marker_re.finditer(line):
            valid_spans.add(m.start())

        # 이모지+텍스트 패턴 전체를 순회하며, 유효 마커에 해당하지 않는 것만 오류
        for m in emoji_with_text_re.finditer(line):
            if m.start() not in valid_spans:
                token = m.group(0).strip()
                errors.append(f"  Line {i}: 잘못된 예약 상태 마커: '{token}'")
    return errors


def validate_file(filepath: Path) -> tuple[bool, list[str]]:
    """단일 파일 검증. (passed, messages) 반환"""
    messages = []

    try:
        content = filepath.read_text(encoding="utf-8")
    except OSError as e:
        return False, [f"  파일 읽기 실패: {e}"]

    sections = extract_sections(content)
    missing = check_missing_sections(sections)
    booking_errors = check_booking_markers(content)

    if missing:
        messages.append(f"  누락된 섹션 ({len(missing)}개):")
        for s in missing:
            messages.append(f"    - {s}")

    if booking_errors:
        messages.append(f"  잘못된 예약 상태 마커 ({len(booking_errors)}개):")
        messages.extend(booking_errors)

    passed = not missing and not booking_errors
    return passed, messages


def expand_patterns(args: list[str]) -> list[Path]:
    """glob 패턴 또는 파일 경로를 실제 파일 목록으로 확장"""
    paths = []
    for arg in args:
        expanded = glob.glob(arg, recursive=True)
        if expanded:
            paths.extend(Path(p) for p in expanded)
        else:
            p = Path(arg)
            if p.exists():
                paths.append(p)
            else:
                print(f"경고: 파일을 찾을 수 없음: {arg}", file=sys.stderr)
    return paths


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/validate-daily.py <file_or_glob> [...]")
        print("Example: python scripts/validate-daily.py trips/*/daily/*.md")
        return 1

    paths = expand_patterns(sys.argv[1:])

    if not paths:
        print("검증할 파일이 없습니다.")
        return 1

    passed_count = 0
    failed_count = 0

    for filepath in sorted(paths):
        passed, messages = validate_file(filepath)
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {filepath}")
        for msg in messages:
            print(msg)
        if passed:
            passed_count += 1
        else:
            failed_count += 1

    print()
    print(f"결과: {passed_count}개 통과 / {failed_count}개 실패 / 총 {len(paths)}개")

    return 0 if failed_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
