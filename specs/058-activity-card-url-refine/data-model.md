# Phase 1 Data Model: 058-activity-card-url-refine

## Activity (변경)

기존 `activities` 테이블에 단일 컬럼을 추가한다. 그 외 속성·관계 불변.

| 속성 | 타입 | 변경 | 설명 |
|------|------|------|------|
| url | `String?` (nullable, `@db.Text` 또는 기본 varchar) | **신규** | 예약·티켓·문서 링크. 선택값. 메모와 독립. 애플 캘린더 URL 필드 대응. |

- **기본값/이전**: 기존 행은 `url = NULL`. 데이터 백필 없음.
- **검증 규칙(앱 계층)**: 입력 시 빈 문자열은 `null`로 정규화. 형식 불일치도 저장 허용하되 표시 시 안전 처리(임의 스크립트 실행 금지).
- **불변식**: `memo`와 `url`은 서로 독립. 한쪽 변경이 다른 쪽에 영향 없음.

### 마이그레이션

- **유형**: schema-only (expand). 컬럼 추가만, 데이터 이동 없음.
- **헤더**: `[migration-type: schema-only]` (SQL 상단).
- **환경**: `prisma migrate deploy`로 배포 파이프라인 적용. Preview/Dev는 `neondb_dev`, Prod는 `neondb`(#318).

## 영향 표현(읽기/쓰기 계약)

- API 활동 생성/수정: 입력 바디에 `url?` 수용, 응답에 `url` 포함.
- MCP `create_activity`/`update_activity`/조회: `url` 매개·필드 포함.
- OpenAPI activity 스키마: `url` 속성(nullable string) 추가.
- 비변경: 시작/종료 시각·타임존(부동 시간) 로직 그대로.
