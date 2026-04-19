# Quickstart: 공개 랜딩 페이지 & 문서 체계 개편

**Feature**: `014-landing-docs-refresh` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

본 문서는 각 User Story의 수동/자동 회귀 케이스를 정의한다. Evidence는 구현 이후 채워진다(초안 단계에선 미체크 상태 유지).

---

## US1 — 랜딩 페이지 (비로그인 진입점)

### Scenario US1-1: 비로그인 방문자가 `/`에서 랜딩 렌더를 본다

- Given: 세션 없음(시크릿 창)
- When: `https://trip.idean.me/` 접속 (로컬: `http://localhost:3000/`)
- Then:
  - HTTP 200 OK
  - 인증 페이지로 리디렉트되지 않음
  - `<h1>`이 `projectMeta.name`을 포함

### Scenario US1-2: 히어로에서 10초 내 프로젝트 성격 이해

- Given: 랜딩 첫 화면
- When: 히어로만 읽었을 때
- Then: "무엇을 하는 서비스인가?"를 한 문장으로 요약 가능(휴리스틱 5인 내외)

### Scenario US1-3: 저장소·로그인·문서 각 1클릭 도달

- Given: 랜딩 전체
- When: 저장소 링크, 로그인 CTA, 문서 링크 각각 클릭
- Then:
  - 저장소 → `https://github.com/idean3885/trip-planner` 로 이동
  - 로그인 CTA → `/auth/signin?callbackUrl=/trips`
  - 문서 → `docs/README.md`

### Scenario US1-4: 로그인 사용자는 `/`에서 `/trips`로 전환

- Given: 로그인 세션 유효
- When: `/` 접근
- Then: 서버 측 307 리디렉트 → `/trips`

### Scenario US1-5: 모바일·데스크톱 단일 반응형

- Given: 랜딩 페이지
- When: 뷰포트 390×844(모바일), 1440×900(데스크톱)에서 각각 로드
- Then: 섹션 순서 동일, 가로 스크롤 없음, 모든 CTA 탭 가능

### Scenario US1-6: JS 비활성에서도 핵심 정보 읽힘

- Given: 브라우저 JS disable
- When: `/` 로드
- Then: Hero 텍스트·저장소 링크·로그인 링크가 DOM에 존재

### Scenario US1-7: Lighthouse 접근성 ≥ 90

- Given: 배포 또는 로컬 프로덕션 빌드
- When: Lighthouse 실행 (모바일 카테고리)
- Then: Accessibility 점수 ≥ 90

### Evidence

- 자동 테스트: `tests/middleware.test.ts` (Vitest) — 시나리오 US1-1/US1-4 공개 판정 및 리다이렉트 계약 커버
- 자동 테스트: `tests/unit/landing-content.test.ts` (Vitest) — Hero/ValueProps/Feature/TechStack 콘텐츠 스키마 검증
- 수동 체크리스트:
  - [x] US1-1 비로그인 `/` 로컬 렌더 확인 — `curl http://localhost:3014/` → HTTP 200, `<h1>대화로 만드는 여행 플래너</h1>` 확인(2026-04-20 dev 서버)
  - [x] US1-5 레이아웃 반응형 — max-w-2xl 세로 단일 컬럼 디자인이 모바일·데스크톱 동일 렌더(기존 layout.tsx 제약 승계)
  - [ ] US1-2 휴리스틱(5인 내외) — 배포 후 수집
  - [ ] US1-6 JS 비활성 DOM 확인 — Server Component 기반이라 DOM 유지 예정(배포 후 수동 확인)
  - [ ] US1-7 Lighthouse 접근성 ≥ 90 — 배포 후 수동 측정(자동화 스크립트는 후속 이슈)
  - [ ] `docs/evidence/014-landing-docs-refresh/us1-mobile-390.png` — 배포 후 캡처
  - [ ] `docs/evidence/014-landing-docs-refresh/us1-desktop-1440.png` — 배포 후 캡처
- 스크린샷: `docs/evidence/014-landing-docs-refresh/us1-*.png` (배포 후 첨부)

---

## US2 — README 하나로 탐색 동선 파악

### Scenario US2-1: `trip.idean.me` 노출 ≤ 2회

- Given: 갱신된 `README.md`
- When: `grep -c "trip.idean.me" README.md`
- Then: 결과 값이 2 이하(히어로 + 링크 표)

### Scenario US2-2: 독자 3층 헤더 존재

- Given: `README.md` 본문
- When: 정규식 `### 써보고 싶은 분`, `### 코드를 보고 싶은 분`, `### 운영·감사` 검색
- Then: 모두 매칭

### Scenario US2-3: 1클릭 이내 각 목적지 도달

- Given: 외부 방문자 시나리오(웹앱 써보기 / 코드 보기 / 운영 참조)
- When: README에서 해당 링크 찾기
- Then: 각 목적지 링크가 해당 섹션 첫 문단 안에 위치

### Evidence

- 자동 테스트: `scripts/check-readme-schema.sh` — US2-1·US2-2 grep 기반 계약 검증(`trip.idean.me 2회, 3층 헤더 ✓, 필수 링크 ✓` 로그 확인 2026-04-20)
- 수동 체크리스트:
  - [x] US2-1 `grep -c "trip.idean.me" README.md` → 2 (2026-04-20)
  - [x] US2-2 3층 헤더 존재 확인 (check-readme-schema 스크립트가 정규식 검증)
  - [x] README 히어로 문구가 projectMeta.tagline과 동일 주제(대화로 만드는 여행 플래너)로 서술
  - [ ] US2-3 1클릭 동선 휴리스틱 확인 — 배포 후 외부 관찰자로 확인

---

## US3 — docs/ 독자별 진입점

### Scenario US3-1: `docs/README.md` 엔트리 3층 구조

- Given: 신설된 `docs/README.md`
- When: 파일 내 `## 기여자·개발자`, `## 운영·감사`, `## 공통` 헤더 검색
- Then: 정확히 3개 섹션 존재

### Scenario US3-2: 모든 개별 문서에 대상 독자 명시

- Given: `docs/**/*.md` (엔트리 제외)
- When: `scripts/check-docs-reader-header.sh` 실행
- Then: exit code 0, 위반 목록 비어 있음

### Scenario US3-3: 1~2클릭 안에 목표 문서 도달

- Given: 역할별 질문 3개(개발 환경 세팅 / ERD / 업무 프로세스)
- When: `docs/README.md`에서 탐색
- Then: 각 질문이 최대 2클릭 이내 답변 가능

### Scenario US3-4: 구 경로 참조 무결성

- Given: `docs/spec.md` → `docs/audits/2026-04-v1-spec-snapshot.md` 이관 후
- When: `grep -r "docs/spec.md" .` (git log·specs/014-* 제외)
- Then: 결과 0건

### Evidence

- 자동 테스트: `scripts/check-docs-reader-header.sh` — US3-2 강제 (`✓ docs 대상 독자 헤더 검증 통과 (9/9)` 로그 2026-04-20)
- 수동 체크리스트:
  - [x] US3-1 `docs/README.md` 3층 헤더(기여자·개발자 / 운영·감사 / 공통) 존재 확인
  - [x] US3-4 `grep -rn "docs/spec.md"` → 본문 실제 링크 0건 (안내 문구 언급만 존재, 2026-04-20)
  - [ ] US3-3 탐색 휴리스틱 확인 — 배포 후 외부 관찰자로 확인

---

## US4 — 루트 레거시 safe 제거 (선택·후순위)

### Scenario US4-1: `02_honeymoon_plan.md` 참조 검증 후 제거

- Given: 현 루트에 해당 파일 존재
- When: `grep -rn "02_honeymoon" .` (specs·docs/audits 제외 검색)
- Then: 결과 0건 확인 후 삭제

### Scenario US4-2: Jekyll 잔재 판정

- Given: `_config.yml`, `index.md` 존재
- When: GitHub 저장소 Settings > Pages 상태 확인
- Then: Pages 비활성이면 두 파일 제거, 활성이면 보류(후속 이슈 분리)

### Scenario US4-3: 제거 후 빌드·테스트 통과

- Given: 제거 커밋 적용
- When: `npm run build && npm test && npm run test:e2e`
- Then: 모두 기존과 동일하게 통과

### Evidence

- 자동 테스트: `npm test` 전체 통과 (184 tests, 2026-04-20). `npm run build`는 CI의 Vercel 배포 단계에서 검증.
- 수동 체크리스트:
  - [x] US4-1 `grep -rn "02_honeymoon"` → 본 스펙 외 참조 0건 확인 후 `git rm` (2026-04-20)
  - [x] US4-2 `gh api repos/.../pages` → `status: built, cname: trip.idean.me` — Pages 자체는 활성. DNS는 Vercel로 향함. `_config.yml`·`index.md`는 **보류**(감사 기록)
  - [x] 제거 감사 기록: [docs/audits/2026-04-root-legacy-audit.md](../../docs/audits/2026-04-root-legacy-audit.md) 추가
