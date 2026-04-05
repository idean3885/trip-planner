# Travel Planner - Claude Desktop 작업 지침

## 프로젝트 개요
범용 여행 서포터/플래너. 여행 일정, 예산, 숙소, 교통, 예약, 와인/식사 추천 등을 마크다운으로 관리하고, iCal 연동 및 PDF 추출을 지원합니다.

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
│       ├── wine-checklist.md       # 와인 체크리스트 (이 여행 특화)
│       ├── shopping.md             # 쇼핑 리스트
│       ├── tips.md                 # 주의사항 & 팁
│       └── calendar/               # .ics 파일
├── templates/                      # 새 여행 생성용 템플릿
├── scripts/                        # PDF 변환, ical 생성 등
└── docs/                           # GitHub Pages용 (추후)
```

## Git 워크플로우 규칙

### 필수: `/devex:flow` 사용
- 모든 코드 변경은 반드시 `/devex:flow`를 통해 진행한다
- main 브랜치에 직접 push 금지 (어드민 포함, `enforce_admins: true`)
- feature 브랜치 → PR → 리뷰 → 머지 순서를 반드시 따른다

### 브랜치 최신화
- feature 브랜치 작업 전 반드시 `git pull origin main`으로 최신화
- PR 생성 전 base 브랜치와 충돌 여부 확인
- 충돌 발생 시 rebase로 해결 후 PR 생성

## 작업 규칙

### 데일리 파일 포맷
각 daily/*.md 파일은 다음 섹션을 포함해야 합니다:
1. **오늘의 요약** — 도시, 숙소, 이동, 예상 경비
2. **숙소** — 체크인/아웃, 가격, 상태
3. **이동** — 도시 간 이동 수단, 시간, 비용, 예약 여부
4. **일정** — 시간대별 일정 + **예약 필요 여부** (사전 예약 필수/권장/불필요)
5. **투어/관광 상세** — 예약처, 비용, 소요시간
6. **식사 추천** — 장소, 메뉴, 가격대, 예약 필요 여부
7. **메모** — 팁, 주의사항

### 예약 상태 표기
- `사전 예약 필수` — 매진 위험, 반드시 미리
- `사전 예약 권장` — 미리 하면 편리
- `현장 구매` — 현장에서 구매 가능
- `불필요` — 예약 불필요

### 예산 추적
- budget.md의 실지출 추적 섹션에 날짜별로 기록
- 결제수단 컬럼에 트레블월렛/현금/카드 구분

### iCal 연동
- Apple 캘린더 기준
- calendar/ 디렉토리에 .ics 파일 생성
- scripts/generate-ical.py로 마크다운에서 자동 생성

### PDF 추출
- scripts/generate-pdf.sh로 마크다운 → PDF 변환
- 인터넷 없는 환경 대비용
- 전체 일정 PDF + 데일리 개별 PDF

### 블로그 활용
- 모든 콘텐츠는 마크다운으로 관리
- 추후 블로그 포스팅 소재로 재활용 가능하도록 작성

## Active Technologies
- Python 3.14 + FastMCP, httpx, python-dotenv, pytes (001-ax-travel-planning)
- 마크다운 파일 (`trips/` 디렉토리, git 관리) (001-ax-travel-planning)

## Recent Changes
- 001-ax-travel-planning: Added Python 3.14 + FastMCP, httpx, python-dotenv, pytes
