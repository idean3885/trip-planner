# Quickstart — 020 공유 캘린더 미연결 상태의 역할별 UI

**Created**: 2026-04-22
**Purpose**: 재현 시나리오 + 회귀 방지 규약. 1인 개발 전제로 dev 환경 1회 확인 + 자동 테스트 수트가 정본 증거.

## 사전 조건

- 테스트 여행: `신혼여행` (tripId=5)
- 테스트 계정: 주인 `jamittlee@gmail.com` · 호스트 `idean3885@gmail.com`
- 1차 검증: dev.trip.idean.me — 2차 통과: trip.idean.me 배포

## S1 — 호스트 미연결 진입 (FR-001/FR-002/FR-004)

호스트 계정으로 미연결 여행 진입 → 캘린더 트리거(주인과 동일 outline sm + Calendar 아이콘) 클릭 → 다이얼로그에 안내문 + "닫기"만 표시 → 네트워크에 `/calendar/{subscribe,sync}` 호출 0건 → 일정 편집 정상.

## S2 — 주인 연결 → 호스트 전환 (FR-006, SC-003)

주인 계정으로 진입 → 단일 "공유 캘린더 연결" CTA → 동의 후 연결 완료 → 호스트 새로고침 1회 → "내 구글 캘린더에 추가" CTA 노출.

## S3 — 게스트 진입 (FR-007)

게스트(또는 호스트 일시 강등)로 진입 → 호스트와 동일한 설명 + "닫기" 다이얼로그. 편집 뉘앙스 없음.

## S4 — 해제 후 미연결 동일성 (Clarification Session 2026-04-22)

주인 "연결 해제" → 호스트·게스트 새로고침 → UI가 S1과 완전히 동일(별도 "방금 해제됨" 문구 없음).

## Evidence

템플릿(`.specify/templates/quickstart-template.md`) 규약은 **자동 테스트 또는 수동 체크리스트 최소 하나**를 요구한다. 본 피처는 자동 테스트가 정본, 수동 체크는 dev 재현 1회로 충족한다.

### 자동 테스트 (정본)

- `tests/api/gcal-status.test.ts` — 5 케이스. `TripCalendarLink` 부재 시 per-user 링크 유무와 무관하게 `{ linked: false }` 반환 회귀 방지.
- `tests/components/GCalLinkPanel.test.tsx` — 3 케이스. 역할(HOST/GUEST/OWNER) × 미연결 상태에서 다이얼로그 내부 버튼 구성 검증.
- 실행: `pnpm test` → 233/233 통과(2026-04-22 배포 시점).

### 수동 체크 (dev 재현 완료)

- [x] S1 — 호스트 다이얼로그가 설명문 + "닫기"만 (dev 확인, 2026-04-22)
- [x] S3 — 게스트 진입 동일 렌더 확인 (dev 확인, 2026-04-22)
- [x] S2 — 주인 연결 후 호스트 새로고침으로 연결됨 UI 전환 (dev 확인, 2026-04-22)
- [x] S4 — 해제 후 미연결 UI가 생성 직후와 동일 (dev 확인, 2026-04-22)

스크린샷/모바일 device mode는 별도 요건이 아니다. 추가 회귀가 감지되면 해당 시점에 수집한다.

### 운영 회귀 모니터링

배포 이후 `POST /api/v2/trips/*/calendar/{subscribe,sync}` 응답에서 404가 관찰되면 spec 020 회귀로 판단하고 이슈를 재오픈한다. 주기적 조회는 강제하지 않는다(1인 개발 전제).

조회 명령(필요 시):

```bash
vercel logs --environment production --no-follow --no-branch --since 7d --status-code 404 | grep calendar
```

## Rollback

- `src/app/api/trips/<id>/gcal/status/route.ts` — 단일 파일 revert로 폴백 재도입.
- `src/components/GCalLinkPanel.tsx` — 단일 파일 revert로 기존 비-주인 분기 유지.
- 데이터 변경 없음 → 데이터 손실 없음.
