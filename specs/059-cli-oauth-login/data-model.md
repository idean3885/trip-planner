# Phase 1 Data Model: 059-cli-oauth-login

## PersonalAccessToken (변경 없음 — 기존 필드 재사용)

스키마 변경·마이그레이션 **없음**. 기존 모델의 `expiresAt`를 자동 발급 경로가 채운다.

| 속성 | 용도(본 피처) |
|------|----------------|
| name | 출처 구분(예: "CLI (자동 로그인)", "macOS bootstrap …"). 목록·폐기 식별. |
| expiresAt | **자동 발급 시 now+30일**로 설정(기존 null → 단기 만료). 수기 발급은 종전대로. |
| tokenHash / tokenPrefix | 기존 — SHA256 해시 저장, 평문 미저장. |
| lastUsedAt | 기존 — 사용 시각 갱신. |

- **불변식**: 수기 발급 토큰의 만료 정책은 이 피처로 바뀌지 않는다.
- **상태 전이**: 발급(만료시각 有) → 사용(lastUsedAt 갱신) → 만료(인증 거부) → 재인증으로 신규 발급(자동 갱신 소비자) 또는 폐기.
