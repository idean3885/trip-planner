# Contract — 레거시 캘린더 API 410 Gone

**Created**: 2026-04-23
**Scope**: `/api/trips/<id>/gcal/{link,sync,status}` — v2.10.0에서 410 Gone으로 종료.

## 적용 대상 라우트

- `GET|POST|DELETE /api/trips/<id>/gcal/link`
- `PATCH /api/trips/<id>/gcal/sync`
- `GET /api/trips/<id>/gcal/status`

## Response

모든 메소드·쿼리·바디에 대해 동일 응답:

- Status: `410 Gone`
- Body(JSON):
  ```
  {
    "error": "gone",
    "message": "This endpoint has been retired. See spec 022 (v2.10.0 contract expand). Use /api/v2/trips/<id>/calendar endpoints."
  }
  ```

## Headers

- `Cache-Control: no-store` (잔존 호출 감시 목적)

## 서버 동작

- 요청 파싱·인증 검증 없이 즉시 410 반환. DB 접근 금지.
- 서버 로그에는 "gcal-legacy-gone" 태그로 간단 기록(경로·메소드만).

## 후속 릴리즈에서의 처리

- v2.11.0+에서 파일 자체 삭제 예정. 로그에서 잔존 호출 0건 확인 후 진행.
