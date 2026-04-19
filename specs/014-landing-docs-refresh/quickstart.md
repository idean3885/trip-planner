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

- 자동 테스트: `tests/e2e/landing.spec.ts` (Playwright) — 시나리오 US1-1/US1-3/US1-4/US1-5 커버
- 자동 테스트: `tests/unit/middleware.spec.ts` (Vitest) — `/` 공개 판정
- 자동 테스트: `scripts/lighthouse-landing.sh` — US1-7 Lighthouse 실행 로그
- 수동 체크리스트:
  - [ ] US1-2 휴리스틱(5인 내외) — 요약 가능 여부 기록
  - [ ] US1-6 JS 비활성 DOM 확인
  - [ ] `docs/evidence/014-landing-docs-refresh/us1-mobile-390.png` 첨부
  - [ ] `docs/evidence/014-landing-docs-refresh/us1-desktop-1440.png` 첨부
- 스크린샷: `docs/evidence/014-landing-docs-refresh/us1-*.png`

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

- 자동 테스트: `scripts/check-readme-schema.sh` — US2-1·US2-2 grep 기반 계약 검증
- 수동 체크리스트:
  - [ ] US2-3 1클릭 동선 휴리스틱 확인
  - [ ] projectMeta와 README 히어로 문구 일치 확인

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

- 자동 테스트: `scripts/check-docs-reader-header.sh` — US3-2 강제
- 자동 테스트: `scripts/check-docs-links.sh` — 내부 링크 무결성
- 수동 체크리스트:
  - [ ] US3-1 엔트리 구조 눈으로 확인
  - [ ] US3-3 탐색 휴리스틱 확인

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

- 자동 테스트: `npm run build` · `npm test` · `npm run test:e2e` (US4-3)
- 수동 체크리스트:
  - [ ] US4-1 grep 0건 스크린샷/로그
  - [ ] US4-2 GitHub Pages 상태 스크린샷 `docs/evidence/014-landing-docs-refresh/us4-pages.png`
  - [ ] 제거 감사 기록: `docs/audits/2026-04-root-legacy-audit.md` 추가
