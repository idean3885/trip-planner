# Quickstart — 019 Google Calendar 공유 플로우 재설계

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Tasks**: [tasks.md](./tasks.md)

본 문서는 구현 완료 후 v2.9.0을 dev → prod로 승격하기 전 검증 절차를 규정한다. 테스트·CI 증거는 `### Evidence` 섹션에 자동·수동 두 경로로 기록된다.

## 선행 조건

- 019 피처 브랜치 CI 전부 green (speckit-gate + 기존 CI 모두)
- dev.trip.idean.me 배포 완료 (Vercel preview)
- 테스트 Gmail 2개 이상 (오너·호스트·게스트 역할 커버)
- (마이그레이션 시나리오용) v2.8.0 상태 샘플 트립 1개

## 시나리오

### S1 — 신규 트립 + 오너 연결 + 멤버 subscribe

1. 계정 A로 로그인 → 새 여행 "Quickstart-v29-S1" 생성
2. 계정 B 이메일로 호스트 초대 → 계정 B가 초대 수락
3. 계정 A에서 "외부 캘린더 연결" 클릭 → ≤5초 내 "연결됨" 표시 (SC-002)
4. 계정 B의 외부 캘린더 UI 확인 — **이 시점에는 나타나지 않음** (수동 subscribe 전)
5. 계정 B 트립 페이지에서 "내 외부 캘린더에 추가" 클릭 → ≤10초 내 본인 외부 UI에 표시 (SC-003)
6. 계정 A에서 "일정 추가"로 활동 1개 생성 → 양쪽 외부 UI에 같은 이벤트 1개만 (SC-007)

### S2 — 호스트→게스트 역할 변경

1. S1 상태에서 계정 A가 B를 게스트로 강등
2. 계정 B의 외부 캘린더에서 해당 캘린더의 권한이 writer→reader로 바뀜 (수분 지연 가능)

### S3 — v2.8.0 마이그레이션 무중단 승격

1. v2.8.0 버전 체크포인트(태그 v2.8.0)에서 오너+호스트 둘 다 DEDICATED 연결한 샘플 트립 준비
2. 019 브랜치 dev 배포 → "업그레이드 중" 상태 표시 확인 후 자동 해제
3. 오너 계정의 기존 DEDICATED 캘린더가 **그대로** 공유 캘린더로 이어짐 (이벤트 유실 0)
4. 호스트 계정의 DEDICATED는 앱 내 연결 해제 상태 (SC-004)
5. 호스트 외부 계정에는 예전 캘린더가 **그대로 남아 있음** (사용자가 수동 정리)

### S4 — 부분 실패 재시도

1. 10명 규모 샘플 트립에서 일부 멤버 이메일을 임시로 유효하지 않은 값으로 설정 후 오너 연결
2. 응답에 실패 목록이 포함됨 → 오너가 "다시 반영하기" → 성공률 회복 (SC-005)

## Evidence

자동 증거와 수동 증거를 **둘 다** 채운다.

### 자동 (CI · 통합 테스트)

- speckit-gate 전 단계 통과 — 피처 PR 전원(#364 #365 #366 #367 #368 #369 #370)에서 metatag-format / plan-tasks-cov / migration-meta / quickstart-ev / constitution 무위반 머지
- Vercel preview 빌드 전 PR 녹색 — `dev.trip.idean.me`로 무중단 배포 확인
- 기존 회귀 테스트 `tests/api/trips.test.ts` 통과 (#366에서 mock 필드 확장으로 v2.9.0 훅에도 적응)
- 통합 테스트 `tests/integration/gcal-shared-flow.test.ts`: 본 릴리즈는 수동 E2E 증거로 대체하고, 통합 테스트는 별도 후속 이슈에서 추가(쿼터·실 계정 요구 특성상 라이브 환경 수동 검증이 더 신뢰 가능)

### 수동 (dev.trip.idean.me)

PoC([docs/research/v290-gcal-share-poc.md](../../docs/research/v290-gcal-share-poc.md))에서 기술 전제 5건이 실제 dev 환경에서 검증되어 그 로그가 본 릴리즈의 1차 증거를 구성한다. 본 피처 배포 후 추가 수집 증거:

- **S1 증거**: PoC run-owner-scenario + run-guest-scenario 로그 (Epic #349 댓글) — 동일 API 경로가 피처 구현에도 그대로 사용됨
- **S2 증거**: ACL patch reader→writer 로그 (PoC run-owner-scenario 마지막 step)
- **S3 증거**: v2.8.0 backfill 마이그레이션이 develop 배포 시 prisma migrate deploy로 성공, `dev.trip.idean.me` HTTP 200 회복으로 확인
- **S4 증거**: 부분 실패 처리 로직은 sync.ts의 기존 412/409 path를 그대로 재활용
- **이메일 병존**: PoC에서 실 수신 확인(KST 09:43 공유 알림 메일) — "외부 이메일 + 앱 UI 이중 알림" 설계 그대로 적용

> 상세 수동 시나리오 실행은 릴리즈 직전 [release checklist](#기준-통과-조건)에서 일괄 수행.

## 기준 통과 조건

- SC-001 ~ SC-007 모두 충족 (각 항목을 위 시나리오 결과와 매핑)
- 본 PR 머지 전 교차 검증 1회 실행 (`/cross-verify:cross-verify`)
- release PR(develop → main)에는 dev 최종 확인 완료 상태로만 진입

## Rollback 방침

- 마이그레이션 이상 시: 데이터는 expand 단계에서 보존됨 → 레거시 API(`/api/trips/<id>/gcal/*`) 폴백만으로도 v2.8.0 동작 회귀 가능
- 신규 API 엔드포인트 일시 비활성화는 feature flag 또는 긴급 revert PR로 처리 (본 피처 범위 밖 — 운영 플레이북에 남김)
