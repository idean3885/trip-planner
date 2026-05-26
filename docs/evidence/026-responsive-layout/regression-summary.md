# 회귀 점검 — spec 026 묶음 E

**일시**: 2026-05-26
**환경**: prod 배포 후 사용자 직접 확인 (수동)

## 점검 대상 (6종)

| 표면 | 모바일 폭 시각 회귀 | 데스크탑 분기 의도 |
|------|--------------------|--------------------|
| `/` (홈) | 변경 없음 (글로벌 layout max-w-2xl 모바일 유지) | layout main이 lg:max-w-wide로 확장만 됨. 단일 컬럼 그대로. |
| `/trips` | 변경 없음 (그리드 wrapper가 모바일에서 1열) | lg:grid-cols-2 xl:grid-cols-3 적용 |
| `/trips/[id]` | 변경 없음 (grid가 모바일에서 단일 컬럼) | lg에서 본문 + 사이드 다단 |
| `/trips/[id]/day/[dayId]` | 변경 없음 | 부모 layout 폭만 확장 |
| `/docs` | 변경 없음 (이미 풀폭 출발선) | max-w-screen-2xl → max-w-wide(1440) 96px 축소 |
| GCal/Apple 모달 | 변경 없음 (모바일 풀폭) | sm:max-w-narrow(768) override |

## 검증 흐름 (사용자 측 prod 배포 후 수동 점검)

1. trip.idean.me 데스크탑(1440px) 브라우저 → trip 상세 다단 확인
2. trip.idean.me 모바일(375px) 브라우저 → 단일 컬럼 시각 회귀 없음 확인
3. `/trips` 목록 → 데스크탑 2~3열, 모바일 1열 확인
4. 캘린더 모달 → 데스크탑 좁은 폭(narrow 768) 유지, 모바일 풀폭 확인
5. 헤더 → 데스크탑 nav 가로 노출, 모바일 로고만 확인

## Outstanding

- 자동 비주얼 회귀 도구는 본 마일스톤 범위 외(spec 026 R6). 후속 별도 이슈에서 검토.
