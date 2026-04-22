# Contract — OAuth 동의 콜백 `error=access_denied` 처리

**Created**: 2026-04-22
**Scope**: `GET /api/gcal/consent` 콜백이 Testing 모드 제약으로 차단된 경우의 새 분기.

## 기존 경로

현재 동의 성공 시: scope 갱신 후 `returnTo` URL로 리다이렉트. `returnTo`에는 `?gcal=link-ready` 등 후속 액션 힌트 포함.

## 변경 요약

콜백 쿼리에 `error=access_denied`(또는 Google이 돌려주는 동등한 거부 표식)가 실린 경우:

1. **scope 업데이트 수행하지 않음**.
2. 응답에 **단기 쿠키 `gcal-unregistered`** 기록 (httpOnly, TTL 10분, SameSite=Lax, Secure=프로덕션).
3. `returnTo` URL로 리다이렉트하되 쿼리에 `?gcal=unregistered` 힌트 추가. `returnTo`가 없으면 기본 경로(`/`) 리다이렉트.

## 상호 작용

- 리다이렉트 직후 클라이언트의 `/trips/<id>` 페이지가 로드되면 `GCalLinkPanel`이 `/status`를 조회 → 쿠키 플래그로 인해 응답에 `unregistered: true` → 패널이 미등록 안내 카드로 렌더.
- 동의 루프 방지 — 기존 sessionStorage `gcal-auto-*` 플래그는 변경 없이 유지. `action=unregistered`는 자동 재시도 대상에서 제외.

## 오류 분류 경계

- `error=access_denied`: Testing 모드 제약. 본 피처가 처리.
- `error=interaction_required` / 기타: 기존 동작 유지(일반 실패 토스트).

## 보안 고려

- 쿠키는 `Secure=true`(프로덕션), httpOnly — 클라이언트 JS가 접근 불가.
- 쿠키 값은 타임스탬프만 — 민감 정보 포함 없음.
- 10분 TTL — 장기 잔존 방지.

## 테스트

- 단위: consent 라우트에 `error=access_denied` 쿼리를 넣어 호출 → Set-Cookie 헤더에 `gcal-unregistered` 확인 + 리다이렉트 Location 확인.
- 통합: 없음(외부 Google OAuth 실제 호출 없이 콜백 단위만 검증).
