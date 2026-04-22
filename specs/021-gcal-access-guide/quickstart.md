# Quickstart — 021 구글 캘린더 권한 제약 감지·안내

**Created**: 2026-04-22
**Purpose**: 재현 시나리오 + 회귀 방지 규약. 자동 테스트가 정본, dev 재현 1회로 수동 증거 대체.

## 사전 조건

- 테스트 계정: Google Cloud Console Test users에 등록된 계정(정상 경로용) + 미등록 계정(거부 경로용).
- 1차 검증: dev.trip.idean.me → 2차 통과: trip.idean.me.

## S1 — 미등록 주인이 공유 캘린더 연결 시도

1. 미등록 Google 계정으로 로그인 후 미연결 여행에 주인으로 진입.
2. "공유 캘린더 연결" 클릭 → OAuth 동의 페이지로 이동 → Google이 access_denied로 차단.
3. 콜백 복귀 → 다이얼로그가 **권한 제약 안내 카드**로 전환.
4. 카드 내용: "이 기능은 현재 개발자 등록 사용자에게만 제공됩니다…" + "개발자에게 문의(Discussions)" 버튼(외부 링크 아이콘).
5. 버튼 클릭 → 리포의 `discussions/new?category=q-a&...` 프리필 탭 새로 열림.

## S2 — 토큰 보유자의 403 경로

1. Test user였다가 등록 해제된 계정으로 가정.
2. 서버가 Calendar API 403을 받도록 유도(통합 검증 어려우면 mock/단위 테스트로 대체).
3. 응답 본문에 `{ error: "unregistered" }` → UI가 S1과 동일한 카드로 렌더.

## S3 — 호스트·게스트의 미등록 진입

1. 미등록 호스트 계정으로 여행 진입.
2. "내 구글 캘린더에 추가" 또는 캘린더 트리거 클릭.
3. 주인과 동일한 안내 카드 표시(FR-006). 액션 버튼 수·디자인 동일.

## S4 — 사전 고지 블록

1. 랜딩 페이지 로드 → "현재 Google 캘린더 연동은 개발자 등록 사용자에게만 제공됩니다" 블록 확인.
2. GitHub 리포 README의 설치·사용 섹션에 동일 제약 단락 확인.

## Evidence

템플릿 규약(`.specify/templates/quickstart-template.md`)은 **자동 테스트 또는 수동 체크리스트 최소 하나**를 요구한다. 본 피처는 자동 테스트가 정본.

### 자동 테스트 (정본)

- `tests/lib/gcal/errors.test.ts` — `classifyError`가 `access_denied` 힌트를 `UNREGISTERED`로 분류하는지 검증(기존 REVOKED와 구분).
- `tests/components/GCalLinkPanel.test.tsx` — `unregistered: true` 상태에서 패널이 Discussions 링크 버튼을 렌더하고 기존 조작 버튼이 없음을 검증.
- 실행: `pnpm test`.

### 수동 체크 (dev 재현)

- [ ] S1 — 미등록 주인 access_denied 후 카드 전환
- [ ] S2 — 403 mock 경로(또는 수동 재현) 카드 동일
- [ ] S3 — 미등록 호스트 카드 동일
- [ ] S4 — 랜딩 + README 사전 고지 블록 확인

> dev 재현 1회 후 위 체크박스를 `[x]`로 갱신한다. 스크린샷은 별도 요건 아니며 회귀 감지 시 수집한다.

### 운영 회귀 모니터링

배포 후 `POST /api/v2/trips/*/calendar/*`에서 `unregistered` 응답 비율을 서버 로그로 관찰. 추세가 계속 높으면 ADR 0004의 "심사 재고려 트리거(사용자 수)" 근거.

## Rollback

- `src/lib/gcal/errors.ts` — 단일 파일 revert로 UNREGISTERED 분류 제거.
- `src/app/api/gcal/consent/route.ts` — 쿠키 기록 로직 revert.
- `src/app/api/trips/<id>/gcal/status/route.ts` — unregistered 병렬 필드 제거.
- `src/components/GCalLinkPanel.tsx` — 미등록 분기 revert.
- ADR 0004·README 블록·랜딩 블록 — 문서 파일 revert.
- 데이터 변경 없음 → 데이터 손실 없음.
