# 디자이너 핸드오프 가이드

Figma에서 작업한 디자이너가 개발자에게 UI 변경을 넘길 때 쓰는 표준 절차. 상위 흐름은 [`docs/WORKFLOW.md § 디자이너 협업 흐름`](./WORKFLOW.md#디자이너-협업-흐름) 참조. 본 문서는 실무 상세를 다룬다.

## 1. 디자이너 도구 셋업

### 필수

| 도구 | 용도 | 비고 |
|------|------|------|
| **Figma** | 디자인·컴포넌트 작성 | 프로젝트 파일 접근 권한 필요. 팀 플랜 구독 여부는 개발자에게 확인. |
| **[Tokens Studio](https://tokens.studio) Figma plugin** | 디자인 토큰 편집·export(W3C DTCG 형식) | 무료 티어로 충분. 토큰 변경이 있는 핸드오프에서만 필요. |
| **GitHub 계정** | 핸드오프 이슈 생성 | 저장소 issues 생성 권한 필요. 프라이빗 저장소면 collaborator 등록. |

### 선택 (권장)

| 도구 | 용도 | 비고 |
|------|------|------|
| **v0.dev 계정** | 디자이너 본인이 Figma 프레임 → 코드 초안 생성(셀프 검증) | 디자이너가 코드를 직접 보지 않아도 되나, 산출물 품질 감 잡기에 유용. |
| **스크린샷 도구** | Figma export로 충분하지만 OS 캡처도 허용 | `.png` 또는 `.jpg`. 상태별(default/hover/focus/disabled) 분리 권장. |

## 2. 핸드오프 산출물 형식

GitHub Issue "🎨 Designer Handoff" 템플릿(`.github/ISSUE_TEMPLATE/design-handoff.yml`) 선택 시 필수 필드가 자동 안내된다. 빈 값으로는 제출이 차단된다.

### 필수 필드 6종

| # | 필드 | 작성 예시 |
|---|------|----------|
| 1 | **Figma URL** | `https://www.figma.com/file/<fileId>?node-id=<frameId>` — 대상 Frame 또는 Component의 정확한 노드 링크. 공유 권한 확인 필수. |
| 2 | **스크린샷** | 최소 default / (적용 시) hover / focus / (적용 시) disabled 4상태. 이미지를 이슈 본문에 드래그 첨부. |
| 3 | **Variants & States** | 예: `variant = default / destructive / outline`, `size = sm / md / lg`, `state = idle / loading / success`. 사용자가 실제 마주할 조합을 모두 나열. |
| 4 | **인터랙션** | 예: "Submit 버튼 클릭 시 0.2s fade로 Success toast 노출", "Dialog는 200ms ease-out으로 fade-in, Esc로 닫힘". |
| 5 | **데이터 바인딩 의도** | 어떤 데이터가 어디에 표시되는가. 예: "카드 제목 = Trip.name", "부제 = Trip.destinationCity", "날짜 = Day.date (YYYY-MM-DD)". |
| 6 | **토큰 변경 여부** | "없음" 또는 "있음"(있으면 코멘트에 `tokens.json` 변경분 첨부 또는 JSON 블록). |

### 토큰 변경이 있을 때

Tokens Studio에서:

1. Plugin → `Export → JSON`.
2. `tokens.json` 파일을 이슈 본문 또는 코멘트에 첨부.
3. 어떤 토큰 그룹(color/spacing/typography/…)이 바뀌었는지 한 줄 요약 첨부(예: "primary 팔레트 hue 조정").

개발자가 받은 토큰을 저장소에 반영하는 방법은 [§ 4. 개발자 처리 절차](#4-개발자-처리-절차) 참조.

## 3. 핸드오프 접수 전 디자이너 자체 체크

제출 전 한 번 확인한다. "나중에 바로 다시 불려가지 않도록".

- [ ] Figma 프레임이 최종본인가? (작업 중 버전 섞여 있지 않음)
- [ ] Variants·States가 Figma 자체 variants로 정리되었는가? 낱개 프레임만 있으면 개발자가 조합을 직접 추측해야 함.
- [ ] 상태별 스크린샷이 최소 default + 1개 이상 포함되었는가?
- [ ] 인터랙션 의도가 한 문장으로 기술되었는가? "그냥 느낌대로" 금지.
- [ ] 데이터 바인딩 의도가 실 프로젝트 도메인 용어로 기술되었는가? (예: `Trip.name` 등. "제목" 같은 모호 표기는 피함)
- [ ] 토큰 변경 유무 체크박스가 정확한가?

## 4. 개발자 처리 절차

핸드오프 이슈를 받은 개발자는 다음 순서로 처리한다.

### 4-1. Assign + 컨텍스트 수집

1. 이슈 assign(본인).
2. Figma 프레임 열고 Variants·States·간격 확인.
3. 도메인 맥락 확인: "이 UI가 어느 spec/USx와 연결되는가?" → 관련 spec.md 재확인.

### 4-2. 브랜치 분기

- 신규 피처면 `/speckit.specify`로 `NNN-short-name` 브랜치 생성.
- 기존 피처의 디자인 교체면 해당 피처 브랜치에서 이어감.
- 단순 토큰 변경(토큰만)이면 `hotfix/design-token-YYYYMMDD` 같은 핫픽스 네이밍도 허용.

### 4-3. 변환

주로 두 경로:

| 경로 | 언제 | 산출 |
|------|------|------|
| **v0.dev로 먼저 초안 생성** | 새 컴포넌트, 복잡한 레이아웃 | v0.dev에 Figma 프레임 업로드 또는 스크린샷 + 설명 입력 → shadcn 기반 JSX 초안 → `src/components/ui/` 또는 해당 피처 컴포넌트로 이식. |
| **Claude Code로 직접 구현** | 단순 수정, 기존 컴포넌트 variants 추가 | 이슈 내용 그대로 붙여넣어 Claude에게 구현 요청. AI가 shadcn·토큰·도메인 규약을 따라 작성. |

둘 다 섞어도 된다(v0.dev → Claude Code 리팩터).

### 4-4. 토큰 반영 (필요 시)

토큰 변경이 있는 핸드오프라면:

1. 이슈 첨부의 `tokens.json`을 저장소의 `design/tokens.json`에 덮어쓰거나 머지.
2. `pnpm run tokens:build` 실행.
3. `git diff src/app/globals.css` 확인 — 예상한 CSS 변수만 바뀌었는지.
4. 문제 있으면 토큰 파일 수정 후 다시 빌드. 스크립트가 실패하면 sentinel·필수 alias 누락 확인([`contracts/token-pipeline.md`](../specs/012-shadcn-design-system/contracts/token-pipeline.md)).

### 4-5. 검토 체크포인트

PR 생성 전 네 가지를 반드시 통과:

| 체크포인트 | 확인 방법 |
|-----------|----------|
| **도메인 정합성** | 헌법 V(Cross-Domain Integrity)와 VI(권한). 새 UI가 기존 도메인 경계를 넘지 않는가? `[.specify/memory/constitution.md](../.specify/memory/constitution.md)` 참고. |
| **접근성** | 키보드 내비(Tab·Shift+Tab·Esc), 포커스 링, `aria-*` 속성, 대비(contrast). Radix primitives가 기본 제공하는 접근성을 깨뜨리지 않았는지 확인. |
| **시각 회귀** | 미리보기 경로(`/_dev/components` 또는 해당 피처)에서 전·후 스크린샷 대조. 예상치 않은 레이아웃 이동·색 역전·폰트 치환 없음. |
| **회귀 테스트** | `pnpm tsc --noEmit` · `pnpm build` · `pnpm test` · `pnpm lint` 전건 통과. |

### 4-6. PR 생성

- 제목: `feat(#<주 이슈>): <요약>` 또는 `fix(#<이슈>): <요약>`.
- 본문: `Handoff: #<핸드오프 이슈 번호>` 명시.
- 단편 추가: `changes/<주 이슈>.<타입>.md`.
- 리뷰어: 본인(1인 개발). AI 리뷰는 자율.
- 머지: `Create a merge commit`(squash off).

## 5. 핸드오프 이슈의 라이프사이클

| 상태 | 트리거 | 행위자 |
|------|--------|--------|
| **open** | 디자이너가 템플릿 제출 | 디자이너 |
| **assigned** | 개발자 본인 assign | 개발자 |
| **in-pr** | 연결된 PR 생성, `Handoff: #N` 역참조 | 개발자 |
| **closed** | PR 머지(GitHub 자동 close) 또는 디자이너 요청 기각(수동 close + 사유) | 개발자 |

기각할 경우 이유를 이슈에 코멘트로 남겨 디자이너가 재작성 가능하게 한다.

## 6. 자주 묻는 질문

### Q. 디자인이 도메인 규약과 충돌하면?

개발자가 머지 전에 "도메인 정합성" 체크포인트에서 감지하여 디자이너에게 재작성을 요청한다. 예: 게스트 권한 사용자에게 활동 편집 버튼이 보이는 디자인은 헌법 VI(RBAC) 위반.

### Q. 토큰 변경과 컴포넌트 추가가 한 이슈에 섞여 있으면?

원칙적으로 한 핸드오프 = 한 단위 변경이 이상적이다. 섞여 있으면 개발자가 PR을 2개로 쪼갠다(토큰 먼저, 컴포넌트 나중).

### Q. 시각 회귀가 발견되면?

해당 컴포넌트만 별도 브랜치로 분리해 롤백하고 원인 분석 후 재작성. 전체 PR을 버리지 않는다.

### Q. AI 에이전트가 만든 코드에 디자이너 의도와 다른 부분이 있으면?

개발자가 수동으로 고친다. AI 산출물을 "그대로" 머지하지 않는 것이 기본.

### Q. 자동화는 언제 도입하나?

6개월 운영 후 병목을 측정하여 결정한다. 현재는 수동 트리거 + 개발자 게이트가 정답.

---

## 변경 이력

- 2026-04-19 초판 — v2.4.3(#270) 디자인 시스템 기반 제정과 함께 도입.
