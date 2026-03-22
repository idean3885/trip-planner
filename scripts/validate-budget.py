#!/usr/bin/env python3
"""
validate-budget.py — 예산 추적 포맷 검증 스크립트

Usage:
    python scripts/validate-budget.py trips/2026-honeymoon/budget.md

Exit code:
    0 — 검증 통과
    1 — 검증 실패
"""

import sys
import re
from pathlib import Path

# 유효한 결제수단 값 (CLAUDE.md 정의)
VALID_PAYMENT_METHODS = {"트레블월렛", "현금", "카드"}

# 날짜 패턴: YYYY-MM-DD 또는 MM/DD
DATE_PATTERN_FULL = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DATE_PATTERN_SHORT = re.compile(r"^\d{1,2}/\d{1,2}$")

# 실지출 추적 테이블 감지 패턴 (헤더 행)
# "날짜 | 항목 | 금액 | 결제수단" 형태의 헤더를 찾는다
EXPENSE_TABLE_HEADER_PATTERN = re.compile(r"\|\s*날짜\s*\|.*결제수단")


def parse_table_rows(lines: list[str], start_idx: int) -> list[tuple[int, list[str]]]:
    """
    start_idx 이후의 마크다운 테이블 데이터 행을 파싱한다.
    헤더 행과 구분선 행(---|---) 은 건너뛴다.
    반환: [(line_number, [cell1, cell2, ...]), ...]
    """
    rows = []
    for i in range(start_idx + 1, len(lines)):
        line = lines[i].strip()
        if not line.startswith("|"):
            break
        # 구분선 행 건너뜀 (|---|---|)
        if re.match(r"^\|[-: |]+\|$", line):
            continue
        cells = [c.strip() for c in line.split("|")]
        # 앞뒤 빈 셀 제거 (파이프 앞뒤)
        if cells and cells[0] == "":
            cells = cells[1:]
        if cells and cells[-1] == "":
            cells = cells[:-1]
        if cells:
            rows.append((i + 1, cells))  # 1-indexed line number
    return rows


def find_expense_table(lines: list[str]) -> list[tuple[int, int]]:
    """
    실지출 추적 테이블 헤더 위치 반환.
    반환: [(header_line_idx, date_col_idx, payment_col_idx), ...]
    """
    tables = []
    for i, line in enumerate(lines):
        if EXPENSE_TABLE_HEADER_PATTERN.search(line):
            # 컬럼 인덱스 파악
            cells = [c.strip() for c in line.split("|")]
            if cells and cells[0] == "":
                cells = cells[1:]
            if cells and cells[-1] == "":
                cells = cells[:-1]
            date_col = next((j for j, c in enumerate(cells) if "날짜" in c), None)
            payment_col = next((j for j, c in enumerate(cells) if "결제수단" in c), None)
            if date_col is not None and payment_col is not None:
                tables.append((i, date_col, payment_col))
    return tables


def is_valid_date(value: str) -> bool:
    """날짜 값이 유효한 형식인지 확인 (YYYY-MM-DD 또는 MM/DD)"""
    value = value.strip()
    if not value or value == "날짜":
        return True  # 헤더 또는 빈 셀은 건너뜀
    return bool(DATE_PATTERN_FULL.match(value) or DATE_PATTERN_SHORT.match(value))


def is_valid_payment(value: str) -> bool:
    """결제수단 값이 유효한지 확인"""
    value = value.strip()
    if not value or value == "결제수단":
        return True  # 헤더 또는 빈 셀은 건너뜀
    return value in VALID_PAYMENT_METHODS


def validate_budget_file(filepath: Path) -> tuple[bool, list[str]]:
    """budget.md 파일 검증. (passed, messages) 반환"""
    messages = []

    try:
        content = filepath.read_text(encoding="utf-8")
    except OSError as e:
        return False, [f"파일 읽기 실패: {e}"]

    lines = content.splitlines()

    tables = find_expense_table(lines)

    if not tables:
        messages.append("경고: 실지출 추적 테이블을 찾을 수 없습니다.")
        messages.append("  '날짜 | 항목 | 금액 | 결제수단' 형태의 테이블이 필요합니다.")
        # 테이블이 없는 템플릿은 경고만 출력하고 통과
        return True, messages

    date_errors = []
    payment_errors = []

    for header_idx, date_col, payment_col in tables:
        rows = parse_table_rows(lines, header_idx)
        for line_num, cells in rows:
            # 날짜 컬럼 검증
            if date_col < len(cells):
                date_val = cells[date_col]
                if date_val and not is_valid_date(date_val):
                    date_errors.append(
                        f"  Line {line_num}: 잘못된 날짜 형식 '{date_val}' "
                        f"(허용: YYYY-MM-DD 또는 MM/DD)"
                    )
            # 결제수단 컬럼 검증
            if payment_col < len(cells):
                payment_val = cells[payment_col]
                if payment_val and not is_valid_payment(payment_val):
                    payment_errors.append(
                        f"  Line {line_num}: 잘못된 결제수단 '{payment_val}' "
                        f"(허용: {', '.join(sorted(VALID_PAYMENT_METHODS))})"
                    )

    if date_errors:
        messages.append(f"날짜 형식 오류 ({len(date_errors)}개):")
        messages.extend(date_errors)

    if payment_errors:
        messages.append(f"결제수단 오류 ({len(payment_errors)}개):")
        messages.extend(payment_errors)

    passed = not date_errors and not payment_errors
    return passed, messages


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/validate-budget.py <budget.md>")
        print("Example: python scripts/validate-budget.py trips/2026-honeymoon/budget.md")
        return 1

    filepath = Path(sys.argv[1])
    if not filepath.exists():
        print(f"오류: 파일을 찾을 수 없음: {filepath}", file=sys.stderr)
        return 1

    passed, messages = validate_budget_file(filepath)
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {filepath}")
    for msg in messages:
        print(msg)

    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
