# Tasks: 풀스택 전환

**Input**: Design documents from `/specs/004-fullstack-transition/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: 수동 E2E (quickstart.md 시나리오 기반). 자동화 테스트 미포함.

**Organization**: Phase 단위로 구성. 각 Phase는 GitHub 이슈 1건에 대응.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: 인프라 전환 (Vercel + Neon + Prisma)

**Purpose**: 정적 빌드에서 SSR + DB로 전환하는 기반 작업

- [ ] T001 next.config.ts에서 `output: "export"` 제거하여 SSR 모드 전환
- [ ] T002 Vercel 프로젝트 생성 및 GitHub 레포 연결
- [ ] T003 trip.idean.me 커스텀 도메인을 Vercel로 재연결
- [ ] T004 Vercel Marketplace에서 Neon Postgres 통합 설치
- [ ] T005 [P] Prisma 의존성 설치 (prisma, @prisma/client)
- [ ] T006 prisma/schema.prisma 작성 (Auth.js 표준 모델 + App 모델: User, Trip, Day, Member, Invitation)
- [ ] T007 `prisma migrate dev --name init` 초기 마이그레이션 실행
- [ ] T008 [P] src/lib/prisma.ts Prisma 클라이언트 싱글톤 생성
- [ ] T009 package.json 빌드 스크립트 수정: `prisma generate && prisma migrate deploy && next build`
- [ ] T010 Vercel 배포 확인 (빌드 성공 + DB 연결)

**Checkpoint**: Vercel SSR 배포 + Neon DB 연결 완료

---

## Phase 2: 소셜 로그인 (Auth.js + 보호 라우트)

**Purpose**: 소셜 계정 인증 및 비로그인 사용자 차단

- [ ] T011 [US1] Auth.js 의존성 설치 (next-auth@5, @auth/prisma-adapter)
- [ ] T012 [US1] src/auth.config.ts 작성 (Google 프로바이더, Edge 호환 설정, authorized 콜백)
- [ ] T013 [US1] src/auth.ts 작성 (PrismaAdapter, JWT 세션 전략, jwt/session 콜백)
- [ ] T014 [US1] src/app/api/auth/[...nextauth]/route.ts Auth.js 핸들러 생성
- [ ] T015 [US1] src/middleware.ts 보호 라우트 설정 (비로그인 차단)
- [ ] T016 [US1] Google Cloud Console에서 OAuth 클라이언트 생성 + Vercel 환경변수 설정 (AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET)
- [ ] T017 [P] [US1] src/app/auth/signin/page.tsx 로그인 페이지 (소셜 로그인 버튼)
- [ ] T018 [P] [US1] src/components/AuthButton.tsx 로그인/로그아웃 버튼 컴포넌트
- [ ] T019 [US1] src/app/layout.tsx에 세션 프로바이더 적용
- [ ] T020 [US1] QS1 검증: 로그인/로그아웃/세션 만료/보호 라우트

**Checkpoint**: 소셜 로그인 동작, 비로그인 차단 확인

---

## Phase 3: 데이터 마이그레이션 + CRUD (US2 + US4)

**Purpose**: 기존 마크다운 데이터를 DB로 이전하고, 여행/일정 CRUD 구현

### 데이터 마이그레이션 (US4)

- [ ] T021 [US4] scripts/migrate-markdown.ts 마이그레이션 스크립트 작성 (trips/ → DB)
- [ ] T022 [US4] 마이그레이션 실행 + 데이터 정합성 확인
- [ ] T023 [US4] QS4 검증: 14일 6개 도시 데이터 마이그레이션 후 조회 확인

### 여행 CRUD

- [x] T024 [US2] src/app/api/trips/route.ts 여행 목록 조회 + 생성 API (생성자 OWNER 등록: #191 에서 HOST 회귀 수정)
- [x] T025 [US2] src/app/api/trips/[tripId]/route.ts 여행 상세 조회 + 수정 + 삭제 API (삭제 UI: #191)
- [x] T026 [US2] API에 권한 검증 추가 (소유자/편집자만 수정, 소유자만 삭제) (#191: OWNER 권한 분기 테스트)
- [ ] T027 [P] [US2] src/components/TripForm.tsx 여행 생성/편집 폼 컴포넌트
- [ ] T028 [US2] src/app/page.tsx를 DB 조회로 전환 (기존 마크다운 읽기 → Prisma 쿼리)

### 일정 CRUD

- [ ] T029 [US2] src/app/api/trips/[tripId]/days/route.ts 일정 목록 조회 + 추가 API
- [ ] T030 [US2] src/app/api/trips/[tripId]/days/[dayId]/route.ts 일정 수정 + 삭제 API
- [ ] T031 [US2] API에 권한 검증 추가 (편집자 이상만 수정/추가/삭제, 조회자 읽기 전용)
- [ ] T032 [P] [US2] src/components/DayEditor.tsx 하루 단위 텍스트 편집기 컴포넌트
- [ ] T033 [US2] src/app/trips/[slug]/page.tsx를 DB 조회로 전환
- [ ] T034 [US2] src/app/trips/[slug]/day/[num]/page.tsx를 DB 조회 + 편집 기능으로 전환
- [ ] T035 [US2] 조회자 UI 비활성화 처리 (편집 버튼 숨김, 폼 readonly)
- [ ] T036 [US2] QS2 검증: 여행 생성/일정 CRUD/새로고침 후 유지/개요 편집

**Checkpoint**: 마이그레이션 완료, DB 기반 CRUD 동작, 권한별 UI 분기

---

## Phase 4: 팀 기능 (초대/권한/관리)

**Purpose**: 동행자 초대, 팀 합류, 권한 관리

### 초대 시스템

- [ ] T037 [US3] src/app/api/trips/[tripId]/invitations/route.ts 초대 생성 API (토큰 생성, 7일 만료)
- [ ] T038 [US3] src/app/api/invitations/[token]/accept/route.ts 초대 수락 API (Member 생성, 트랜잭션)
- [ ] T039 [US3] src/app/invite/[token]/page.tsx 초대 수락 페이지 (비로그인 시 로그인 리다이렉트)

### 팀 관리

- [ ] T040 [US3] src/app/api/trips/[tripId]/members/route.ts 팀원 목록 조회 API
- [ ] T041 [US3] src/app/api/trips/[tripId]/members/[memberId]/route.ts 권한 변경 + 제거 API
- [ ] T042 [US3] API에 권한 검증 추가 (소유자만 초대/권한 변경/제거)
- [ ] T043 [P] [US3] src/components/TeamManager.tsx 팀 관리 컴포넌트 (초대/권한 변경/제거)
- [ ] T044 [US3] src/app/trips/[slug]/page.tsx에 팀 관리 섹션 추가

### Edge Cases

- [ ] T045 [US3] 초대 만료/중복 처리: 기존 PENDING 초대 EXPIRED 전환 후 재발급
- [x] T046 [US3] 소유자 자기 제거 방지 로직 추가 (leave API + 테스트: #191)
- [ ] T047 [US3] QS3 검증: 초대~합류~권한 변경~제거 전체 플로우

**Checkpoint**: 팀 초대/합류/권한 변경/제거 전체 동작

---

## Phase 5: 검증

**Purpose**: 전체 시나리오 검증 및 보안 확인

- [ ] T048 QS5 검증: VIEWER 권한 보안 검증 (UI 비활성화 + 서버 403)
- [ ] T049 EC1 검증: 만료된 초대 링크 안내 메시지
- [ ] T050 EC2 검증: 소유자 자기 제거 시도 차단
- [ ] T051 EC3 검증: 동시 편집 last-write-wins 동작
- [ ] T052 모바일 확인: trip.idean.me에서 전체 기능 모바일 UI 정상 동작
- [ ] T053 GitHub Pages → Vercel 전환 완료 후 기존 URL 리다이렉트 확인

**Checkpoint**: 전체 시나리오 통과, 모바일 정상, 배포 완료

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (인프라)**: 독립 실행 가능
- **Phase 2 (인증)**: Phase 1 완료 후 시작
- **Phase 3 (마이그레이션 + CRUD)**: Phase 2 완료 후 시작
- **Phase 4 (팀 기능)**: Phase 3 완료 후 시작
- **Phase 5 (검증)**: Phase 4 완료 후 시작

### 순차 실행 (1인 개발)

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

---

## Implementation Strategy

### MVP First (Phase 1~3)

1. Phase 1: 인프라 전환 완료
2. Phase 2: 소셜 로그인 동작
3. Phase 3: 기존 데이터 마이그레이션 + CRUD
4. **STOP and VALIDATE**: 로그인 → 여행 조회 → 편집이 동작하면 MVP

### Incremental Delivery

1. Phase 1~3 완료 → MVP 배포
2. Phase 4 추가 → 팀 기능 배포
3. Phase 5 → 전체 검증 완료

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- 각 Phase가 GitHub 이슈 1건에 대응
- 자동화 테스트 미포함, quickstart.md 시나리오로 수동 검증
- 커밋은 태스크 또는 논리적 그룹 단위
