# Design Tokens

디자이너와 개발자가 공유하는 **디자인 토큰 단일 소스**. W3C DTCG(Design Tokens Community Group) 호환 JSON 형식.

## 파일

- `tokens.json` — 토큰 원본. 색상·간격·반경·그림자·타이포 등. 디자이너와 개발자 모두 이 파일을 정본으로 본다.

## 흐름

```text
Figma (Tokens Studio plugin)
        │  export (JSON)
        ▼
design/tokens.json  ← 원본 (이 파일)
        │  npm run tokens:build
        ▼
src/app/globals.css @theme { /* BEGIN:tokens */ … /* END:tokens */ }
        │
        ▼
Tailwind v4 유틸리티 (bg-primary-500, shadow-card, rounded-card …)
```

## 디자이너 워크플로우

1. Figma에서 **Tokens Studio** plugin 설치(무료).
2. 토큰 변경 후 plugin의 `Tools → Export` → JSON 다운로드.
3. 내용을 `design/tokens.json`에 붙여넣거나 PR 본문에 첨부.
4. 개발자에게 이슈 템플릿 "🎨 Designer Handoff"로 전달 — `.github/ISSUE_TEMPLATE/design-handoff.yml`.
5. 상세 절차: [`docs/design-handoff.md`](../docs/design-handoff.md).

## 개발자 워크플로우

1. `design/tokens.json` 갱신 수령(디자이너 PR 또는 직접 편집).
2. `npm run tokens:build` 실행 — `scripts/build-tokens.ts`가 DTCG 트리를 평탄화하여 `globals.css`의 sentinel 구간을 자동 재작성(현재 자체 구현, Style Dictionary 미사용 — 입력이 단순 팔레트 수준이라 외부 라이브러리 불필요).
3. `git diff src/app/globals.css` 확인.
4. dev 환경에서 UI 회귀 체크 후 PR.

## 스키마

- **형식**: W3C DTCG spec v1 — `{ "$value": ..., "$type": "color|dimension|shadow|..." }`
- **필수 카테고리**(빌드 실패 조건): `color`(primary·surface 팔레트 포함), `radius`, `shadow`, `maxWidth`
- **shadcn 필수 alias**: 추후 PR에서 `color.background`, `color.foreground`, `color.border`, `color.ring` 등 shadcn이 기대하는 키를 추가할 예정(현 단계는 기존 Tailwind 팔레트만 1:1 포팅).

## 규칙

- **수동 CSS 편집 금지** — sentinel `/* BEGIN:tokens */ … /* END:tokens */` 내부는 `npm run tokens:build`가 관리. sentinel 밖의 `.prose` 규칙 등은 수동 편집 허용.
- **원본 직접 커밋** — `tokens.json`은 Git에서 버전 관리한다. binary export 도구 산출물(`.tokens.backup.json` 등)은 `.gitignore`.

## 참고

- W3C DTCG: <https://www.designtokens.org>
- Tokens Studio: <https://tokens.studio>
- Style Dictionary (추후 alias·transform 요구 시 도입 재평가): <https://amzn.github.io/style-dictionary>
