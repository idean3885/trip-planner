# Data Model: 글래스 캘린더 재설계 + 카드 테두리 버그 수정

**Feature**: `067-glass-calendar-redesign`

## 스키마 변경
**없음.** UI 표시 처리 전용. Prisma 스키마·마이그레이션·영속 데이터 변경 없음.

## 정적 자산(디자인 토큰)
`src/app/globals.css :root`에 캘린더 글래스 토큰 신설:

| 토큰 | 용도 |
|------|------|
| `--cal-range-band` | 여행 기간 반투명 밴드 배경 |
| `--cal-selected-glass` | 선택일 반투명 프로스트 틴트 |
| `--cal-ring` | 선택·오늘 얇은 브랜드 링 색 |

기존 `--cal-*`(요일 색 코딩·텍스트)는 유지. 기존 글래스 토큰(`--glass-*`) 재사용.
