# Quickstart / 검증: 058-activity-card-url-refine

로컬 next dev 불가 환경(os=linux). 자동 검증(vitest/typecheck)으로 회귀를 막고, 시각·터치는 실기기/프리뷰로 확인한다.

## 실행

- 마이그레이션 SQL은 PR 포함 → 파이프라인 `prisma migrate deploy`(Preview=`neondb_dev`).
- 웹: dev.trip.idean.me 또는 PR 프리뷰.

### Evidence

#### 자동 (CI/로컬)
- `npx vitest run` 전체 그린(신규/회귀 단언 포함):
  - DayActivitiesPane: 컨테이너 보더 없음, 활동 0건 빈 상태 카드, 로딩 스켈레톤과 구분.
  - ActivityCard: memo `line-clamp-3` 적용 클래스 존재, url 있을 때 링크/없을 때 미표시.
  - ActivityForm: 시작·종료 반응형 클래스(좁은 폭 1열), url 입력 칸 존재.
  - activities route: url 입력 수용·응답 포함, 빈 문자열 null 정규화.
  - TripDetailLayout: 하단 min-height 축소값 + 스크롤 클램프 가드(짧은 문서에서 펼침 안 함).
  - ImportSection: 애플·구글 섹션 제목 각각 렌더.
- `npx tsc --noEmit` 통과, 변경 파일 prettier·eslint 통과.
- `prisma migrate diff`/마이그레이션 헤더 `[migration-type: schema-only]` 검증.

#### 수동 (실기기/프리뷰)
- 320px(아이폰13 미니)에서 활동 폼 시작·종료 겹침 없음.
- 빈 날: 보더 박스 없음 + 빈 상태 카드 + 하단 여백이 직전보다 줄고, 아래 스크롤로 캘린더 주간 접힘.
- 긴 메모 카드 3줄+말줄임, 상세에서 전문.
- url 입력→카드 링크 노출, 미입력→미표시.
- 가져오기 화면 애플·구글 섹션 구분.
