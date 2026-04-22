# Data Model — 021 구글 캘린더 권한 제약 감지·안내

**Created**: 2026-04-22
**Scope**: 신규 DB 엔티티 없음. 상태 신호 2종만 추가.

## 신규 상태 신호

### `UNREGISTERED` — GCalLastError 확장

- **정의**: 현재 사용자가 Google OAuth 앱의 Test users 목록에 없어 캘린더 scope 동의·API 호출이 거부된 상태.
- **전달 지점**:
  - `GET /api/trips/<id>/gcal/status` 응답의 `link.lastError` 또는 최상위 `unregistered` 플래그
  - `POST/PUT/DELETE` 계열 캘린더 조작 엔드포인트의 오류 응답 본문 `{ error: "unregistered" }`
- **UI 처리**: spec 020의 다이얼로그 패턴 재사용, "개발자에게 문의(Discussions)" 단일 CTA.

### 단기 쿠키 플래그 `gcal-unregistered`

- **정의**: OAuth 콜백에서 `error=access_denied`를 포착했을 때 클라이언트에 전달하는 1회성 신호.
- **속성**:
  - 이름: `gcal-unregistered`
  - TTL: 10분
  - HTTP only, `SameSite=Lax`, Secure(프로덕션)
  - 값: 생성 타임스탬프(UTC ISO) — 서버 응답에서 만료 판단
- **소비**: 다음 `/status` 조회에서 서버가 쿠키 존재를 확인하면 응답에 `unregistered: true` 추가 후 쿠키 즉시 만료. 동일 상태가 지속되면 다음 API 호출의 403에서 재전파.

## 참조 엔티티 (변경 없음)

- `TripCalendarLink` — 스키마 그대로. 본 피처가 수정하지 않음.
- `GCalLink` (레거시) — 본 피처 미관여.
- `TripMember.role` — 본 피처가 역할 분기에 참조만 함.
- User / Account — 본 피처가 수정하지 않음.

## State Transitions

```
(정상)        ─────────────► linked / not-linked
                                    │
(access_denied at consent)          ▼
────────────────────────────► unregistered 플래그 세팅(10분)
                                    │
 다음 /status ─────────────► unregistered:true 노출 + 플래그 소거
                                    │
 다음 API 호출 403 ────────────► { error: "unregistered" } 전파
```

## 제약

- 마이그레이션 SQL 없음 → `[migration-type]` 헤더 대상 없음.
- 쿠키 플래그는 단말 세션 수준 — 다른 기기 로그인에 영향 없음. 각 기기에서 첫 시도 시 재감지.
