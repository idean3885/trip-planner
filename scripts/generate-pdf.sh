#!/bin/bash
# 마크다운 → PDF 변환 스크립트
# 사용법: ./scripts/generate-pdf.sh <trip-folder>
# 예시: ./scripts/generate-pdf.sh trips/2026-honeymoon-portugal-spain
#
# 의존성: pandoc, wkhtmltopdf (또는 weasyprint)
#   macOS: brew install pandoc wkhtmltopdf
#
# 출력: <trip-folder>/pdf/ 디렉토리에 PDF 생성

set -e

TRIP_DIR="${1:?Usage: $0 <trip-folder>}"
PDF_DIR="${TRIP_DIR}/pdf"

if ! command -v pandoc &> /dev/null; then
    echo "Error: pandoc이 설치되어 있지 않습니다."
    echo "설치: brew install pandoc"
    exit 1
fi

mkdir -p "$PDF_DIR"

# 1. 전체 일정 통합 PDF
echo "=== 전체 일정 PDF 생성 ==="
COMBINED="${PDF_DIR}/full-itinerary.md"
cat /dev/null > "$COMBINED"

# overview → itinerary → daily 순으로 병합
for file in \
    "${TRIP_DIR}/overview.md" \
    "${TRIP_DIR}/itinerary.md" \
    "${TRIP_DIR}/accommodations.md" \
    "${TRIP_DIR}/transport.md" \
    "${TRIP_DIR}/budget.md" \
    "${TRIP_DIR}/reservations.md" \
    "${TRIP_DIR}/packing.md" \
    "${TRIP_DIR}/tips.md"; do
    if [ -f "$file" ]; then
        cat "$file" >> "$COMBINED"
        echo -e "\n\n---\n\n" >> "$COMBINED"
    fi
done

pandoc "$COMBINED" \
    -o "${PDF_DIR}/full-itinerary.pdf" \
    --pdf-engine=wkhtmltopdf \
    -V margin-top=15 -V margin-bottom=15 \
    -V margin-left=15 -V margin-right=15 \
    --metadata title="여행 일정표" \
    2>/dev/null || \
pandoc "$COMBINED" \
    -o "${PDF_DIR}/full-itinerary.pdf" \
    --pdf-engine=weasyprint \
    2>/dev/null || \
echo "Warning: PDF 엔진을 찾을 수 없습니다. brew install wkhtmltopdf 실행 후 재시도하세요."

rm -f "$COMBINED"
echo "  → ${PDF_DIR}/full-itinerary.pdf"

# 2. 데일리 개별 PDF
echo "=== 데일리 PDF 생성 ==="
if [ -d "${TRIP_DIR}/daily" ]; then
    for daily_file in "${TRIP_DIR}"/daily/day*.md; do
        if [ -f "$daily_file" ]; then
            filename=$(basename "$daily_file" .md)
            pandoc "$daily_file" \
                -o "${PDF_DIR}/${filename}.pdf" \
                --pdf-engine=wkhtmltopdf \
                -V margin-top=15 -V margin-bottom=15 \
                -V margin-left=15 -V margin-right=15 \
                2>/dev/null || \
            pandoc "$daily_file" \
                -o "${PDF_DIR}/${filename}.pdf" \
                --pdf-engine=weasyprint \
                2>/dev/null || true
            echo "  → ${PDF_DIR}/${filename}.pdf"
        fi
    done
fi

echo "=== PDF 생성 완료 ==="
echo "출력 디렉토리: ${PDF_DIR}/"
ls -la "${PDF_DIR}/"*.pdf 2>/dev/null || echo "(PDF 파일 없음 — pandoc/wkhtmltopdf 설치 확인)"
