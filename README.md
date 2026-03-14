# Travel Planner

마크다운 기반 여행 플래너. 일정, 예산, 숙소, 교통, 예약, 식사 추천 등을 구조화된 마크다운으로 관리하고, iCal 연동 및 PDF 추출을 지원합니다.

## 특징

- **마크다운 중심** — 모든 여행 정보를 `.md` 파일로 관리, Git으로 버전 추적
- **일자별 상세 일정** — 숙소, 이동, 관광, 식사, 경비를 일자별 단일 파일로 통합
- **iCal 연동** — 마크다운에서 `.ics` 파일 자동 생성, Apple 캘린더 등에 바로 등록
- **PDF 추출** — 인터넷 없는 환경 대비, 전체/일자별 PDF 변환
- **예산 추적** — 예상 비용 + 실지출 기록을 한 파일에서 관리
- **예약 체크리스트** — 사전 예약 필요 항목의 상태 추적

## 디렉토리 구조

```
travel-planner/
├── trips/                          # 여행별 폴더
│   └── {year}-{trip-name}/         # 예: 2026-honeymoon-portugal-spain
│       ├── overview.md             # 여행 개요 (인원, 기간, 루트, 항공, 날씨)
│       ├── itinerary.md            # 전체 일정 요약
│       ├── daily/                  # 일자별 상세 일정
│       │   └── dayNN-MMDD-*.md     # 숙소, 이동, 관광, 식사, 경비 통합
│       ├── accommodations.md       # 숙소 정보 + 대안
│       ├── transport.md            # 도시 간 이동 + 시내 교통
│       ├── budget.md               # 예산 + 실지출 추적
│       ├── payments.md             # 결제 수단 (트레블월렛, 현금 등)
│       ├── reservations.md         # 사전 예약 체크리스트
│       ├── packing.md              # 패킹 리스트 + 세탁 계획
│       ├── wine-checklist.md       # 와인 체크리스트 (여행별 특화)
│       ├── shopping.md             # 쇼핑 리스트
│       ├── tips.md                 # 주의사항 & 팁
│       └── calendar/               # .ics 파일
├── templates/                      # 새 여행 생성용 템플릿
│   ├── trip-template.md            # 여행 개요 템플릿
│   └── daily-template.md           # 일자별 일정 템플릿
├── scripts/                        # 자동화 스크립트
│   ├── generate-pdf.sh             # 마크다운 → PDF 변환
│   └── generate-ical.py            # 마크다운 → iCal 변환 (예정)
└── docs/                           # GitHub Pages (추후)
```

## 사용법

### 새 여행 만들기

`templates/` 디렉토리의 템플릿을 복사하여 새 여행 폴더를 생성합니다.

```bash
cp -r templates/ trips/2026-my-trip/
mv trips/2026-my-trip/trip-template.md trips/2026-my-trip/overview.md
```

### PDF 생성

```bash
# 의존성 설치
brew install pandoc wkhtmltopdf

# PDF 생성 (전체 일정 + 일자별)
./scripts/generate-pdf.sh trips/2026-honeymoon-portugal-spain
```

출력: `trips/2026-honeymoon-portugal-spain/pdf/` (`.gitignore`에 의해 원격에 올라가지 않음)

### 데일리 파일 포맷

각 `daily/*.md` 파일은 다음 섹션을 포함합니다:

| 섹션 | 내용 |
|------|------|
| 오늘의 요약 | 도시, 숙소, 이동, 예상 경비 |
| 숙소 | 체크인/아웃, 가격, 상태 |
| 이동 | 도시 간 이동 수단, 시간, 비용 |
| 일정 | 시간대별 일정 + 예약 필요 여부 |
| 투어/관광 상세 | 예약처, 비용, 소요시간 |
| 식사 추천 | 장소, 메뉴, 가격대, 예약 필요 여부 |
| 메모 | 팁, 주의사항 |

### 예약 상태 표기

- `사전 예약 필수` — 매진 위험, 반드시 미리
- `사전 예약 권장` — 미리 하면 편리
- `현장 구매` — 현장에서 구매 가능
- `불필요` — 예약 불필요

## 현재 여행

### 포르투갈 & 스페인 신혼여행 (2026.6.7~6.20)

```
리스본 1박 → 포르투 3박 → 마드리드 1박 → 세비야 2박 → 그라나다 1박 → 바르셀로나 5박
```

- 14일, 6개 도시, 13박
- 테마: 와인 & 미식, 건축, 해변

## 라이선스

개인 프로젝트입니다.
