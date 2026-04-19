# Contract: Designer Handoff Issue Template — 012-shadcn-design-system

**Scope**: `.github/ISSUE_TEMPLATE/design-handoff.yml` 스키마 + 핸드오프 이슈의 라이프사이클 계약.

## 1. 템플릿 스키마

### 파일 위치

`.github/ISSUE_TEMPLATE/design-handoff.yml`

### YAML 스키마 (GitHub Issue Forms)

```yaml
name: 🎨 Designer Handoff
description: 디자이너 → 개발자 핸드오프 요청. 필수 필드 6종을 모두 채워야 제출 가능합니다.
title: "[Handoff] "
labels: ["design-handoff"]
assignees: []
body:
  - type: markdown
    attributes:
      value: |
        ## 핸드오프 체크리스트
        이 템플릿은 `docs/design-handoff.md`의 산출물 형식과 1:1 매칭됩니다. 작성 전 문서를 한 번 읽어주세요.
  - type: input
    id: figma-url
    attributes:
      label: Figma URL
      description: 핸드오프 대상 Frame/Component의 Figma 링크(공유 권한 확인)
      placeholder: https://www.figma.com/file/…
    validations:
      required: true
  - type: textarea
    id: screenshots
    attributes:
      label: 스크린샷
      description: |
        최소 다음 상태를 포함: default, hover(적용 시), focus, disabled(적용 시).
        이미지는 이 영역에 직접 드래그해서 첨부할 수 있습니다.
    validations:
      required: true
  - type: textarea
    id: variants-states
    attributes:
      label: Variants & States
      description: |
        예: variant = default / destructive / outline, size = sm / md / lg, state = idle / hover / active / disabled / loading.
        해당 컴포넌트가 보유한 조합을 모두 나열합니다.
    validations:
      required: true
  - type: textarea
    id: interactions
    attributes:
      label: 인터랙션
      description: |
        클릭/포커스/애니메이션 의도. 예: "버튼 클릭 시 0.15s ease-out으로 배경 색 전환", "Dialog는 200ms fade-in".
    validations:
      required: true
  - type: textarea
    id: data-binding
    attributes:
      label: 데이터 바인딩 의도
      description: |
        어떤 데이터가 어디에 표시되는가. 예: "카드 제목 = Trip.name, 부제 = Trip.destinationCity".
        프로퍼티 이름까지 구체적으로 기술하면 개발자 변환이 빨라집니다.
    validations:
      required: true
  - type: dropdown
    id: token-changes
    attributes:
      label: 토큰 변경 여부
      description: 신규 색상·간격·타이포 등 토큰이 새로 필요한지 여부
      options:
        - "없음 — 기존 토큰만 사용"
        - "있음 — tokens.json 갱신 첨부(코멘트에 DTCG JSON 블록 또는 파일)"
    validations:
      required: true
  - type: textarea
    id: notes
    attributes:
      label: 참고·비고 (선택)
      description: 제약 조건, 접근성 요구, 도메인 배경 등 추가 컨텍스트
```

## 2. 이슈 라이프사이클

| 상태 | 트리거 | 행위자 | 후속 |
|------|--------|--------|------|
| `open` | 디자이너가 템플릿으로 이슈 생성 | 디자이너 | 자동 라벨 `design-handoff` 부여, 개발자 알림 |
| `assigned` | 개발자가 본인 assign + 세션 시작 | 개발자 | feature 브랜치 생성, 작업 착수 |
| `in-pr` | 연결된 feature PR이 생성 | 개발자 | PR 본문에 `Handoff: #<issue-number>` 표기, 이슈에 PR 링크 코멘트 |
| `closed` | PR 머지 또는 기각 | GitHub 자동 | 머지 시 자동 close, 기각 시 수동 close + 사유 코멘트 |

## 3. 검수 체크포인트 (개발자 수행)

PR 생성 전 개발자가 확인:

1. **도메인 정합성**: 변경이 헌법 V(Cross-Domain Integrity) 준수하는가.
2. **접근성**: 키보드 내비·포커스 링·스크린 리더 호환이 새 구성에서 유지되는가.
3. **시각 회귀**: 미리보기 경로(`/_dev/components` 또는 해당 플로우)에서 전·후 스크린샷 비교.
4. **토큰 변경**: token-changes = "있음"이면 `design/tokens.json` 갱신 → `pnpm run tokens:build` 실행 → CSS diff 확인.
5. **연결 이슈**: PR 본문에 `Handoff: #N` 표기. 머지 시 자동 close.

## 4. Breakage 기준 (계약 위반 = 회귀)

- 필수 필드(6종) 중 하나라도 optional로 변경 → Spec SC-005 실패
- 템플릿 파일명·라벨 변경 → 디자이너 안내·자동화와 drift
- 이슈 생성 시 기본 라벨 `design-handoff` 누락 → 필터링 불가, 운영 병목

## 5. 파이프라인 자동화 범위 (의도적 제외)

**본 피처는 자동 변환을 하지 않는다**(spec Clarifications #4). 다음은 모두 범위 외, 6개월 운영 후 재평가:

- Figma Webhook → CI → 자동 PR 생성
- GitHub Action으로 token-changes 자동 감지 → `tokens:build` 자동 실행
- AI 에이전트가 핸드오프 이슈를 감지해 자동으로 PR 초안 생성

현 단계는 **디자이너 제출 → 개발자가 AI 세션에서 수동 변환 → 개발자 머지** 흐름만 보장한다.
