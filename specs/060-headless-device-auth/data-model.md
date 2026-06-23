# Data Model: 060-headless-device-auth

## 신규: `DeviceAuthorizationRequest` (단명 테이블)

진행 중인 device 인증 요청 1건의 상태. 승인(브라우저)과 폴링(에이전트) 두 요청이 공유하는 가변 상태를 담는다. 승인·만료로 소비되면 삭제된다.

> **설계 부연(비표준 — 의도적)**: device code 상태는 본질이 단명·자동만료라 *일반적으로 TTL 기반 Redis/KV*에 둔다. 본 프로젝트는 신규 인프라 비용을 피하기 위해(헌법 II) 기존 Neon Postgres에 단명 테이블 + `expiresAt` + lazy 정리로 대체한다. Vercel 서버리스는 요청 간 인메모리를 공유하지 않으므로 인메모리는 선택지가 아니다. 트래픽 증가 시 Redis 재검토 여지.

### 모델명 충돌 회피

기존 모델(`User`/`Account`/`Session`/`VerificationToken`[Auth.js], `PersonalAccessToken`[PAT])과 겹치지 않는다. 특히 Auth.js `VerificationToken`과 **이름·용도 모두 구분**(그건 이메일/매직링크용, 이건 device 인가용).

### 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (cuid) | PK |
| `deviceCodeHash` | String (unique, indexed) | 소비자 보관 `device_code`의 해시. 폴링 시 해시 조회로 검증(평문 미저장) |
| `userCode` | String (unique, indexed) | 사람용 짧은 대조 코드(예: 8자, 혼동문자 배제) |
| `status` | `DeviceAuthStatus` enum | `PENDING` / `APPROVED` / `DENIED` |
| `userId` | String? (FK→User, nullable) | 승인 시 본인 계정. 발급 토큰 소유자 |
| `expiresAt` | DateTime | 요청 만료(기본 now+10분). 이후 무발급 |
| `interval` | Int (기본 5) | 폴링 권장 간격(초). slow_down 시 증가 가능 |
| `lastPolledAt` | DateTime? | slow_down 판정용(과도 폴링 감지) |
| `createdAt` | DateTime (default now) | 생성·정리 기준 |

> **rawToken 미보관**: 승인 시 토큰을 만들지 않는다. 승인 후 첫 폴링에서 `createPAT`로 발급해 1회 반환하고 행을 삭제하므로, 발급 토큰 평문이 본 테이블에 머무르지 않는다.

### enum `DeviceAuthStatus`

- `PENDING` — 개시됨, 승인 대기
- `APPROVED` — 사람이 승인(userId 확정). 다음 폴링에서 토큰 발급 후 행 삭제
- `DENIED` — 사람이 거부. 폴링은 access_denied 후 행 삭제

### 인덱스

- `deviceCodeHash` UNIQUE — 폴링 조회
- `userCode` UNIQUE — 승인 화면 대조
- `expiresAt` — 만료 판정/정리 조회

### 상태 전이

```
[개시] → PENDING
PENDING --(사람 승인)--> APPROVED --(폴링: createPAT 발급+행 삭제)--> [소멸]
PENDING --(사람 거부)--> DENIED --(폴링: access_denied+행 삭제)--> [소멸]
PENDING/APPROVED/DENIED --(expiresAt 경과)--> [무발급 + lazy 삭제]
```

### 검증 규칙(FR 매핑)

- 만료(`now > expiresAt`)면 어떤 상태든 토큰 발급 금지(FR-008/011).
- `APPROVED`→토큰 발급은 **정확히 1회**, 발급 즉시 행 삭제(중복 발급 0, FR-008/SC-005).
- 토큰 발급 대상은 `userId`(승인 본인)뿐(FR-010, 헌법 VI).
- 폴링 간격 미준수(너무 잦음)면 `slow_down` + `interval` 증가(FR-006).

## 기존 모델 영향

- **`User`**: 참조만(FK `userId`). 변경 없음.
- **`PersonalAccessToken`**: 발급 산출물. 모델 변경 없음 — `createPAT` 재사용(`expiresAt = autoPatExpiry()` = now+30일).
- 그 외 테이블 무관.

## 마이그레이션

- Prisma 마이그레이션 1건, **`[migration-type: schema-only]`** — 신규 테이블 1종 + enum 1종 추가. 기존 컬럼/데이터 변경 없음.
- Production `neondb` / Preview·Dev `neondb_dev` 분리(#318) 그대로. `prisma migrate deploy`로만 적용.
