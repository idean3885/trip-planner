# 다이어그램 워크스페이스

다이어그램 **소스**(`.drawio`)를 모아 두는 작업 공간입니다. 독자가 보는 **결과물**(`.png`)은 상위 [`docs/diagrams/`](../)에 있습니다.

> draw.io는 결과물을 뽑기 위한 출력 도구입니다. 코드 리뷰·문서 열람의 주안점은 `.png`이며, `.drawio`는 그것을 다시 뽑기 위한 소스입니다.

## 소스 → 결과물 규약

`.drawio`(소스)와 `.png`(결과물)은 **항상 같이 커밋**합니다. 소스만 고치고 PNG를 안 뽑으면 문서에 보이는 그림이 옛 버전으로 남습니다.

```
workspace/system-context.drawio   →   docs/diagrams/system-context.png
workspace/deploy-topology.drawio  →   docs/diagrams/deploy-topology.png
```

## 편집 방법

- **draw.io 데스크톱** 또는 **VS Code Draw.io Integration**(`hediet.vscode-drawio`)에서 `.drawio`를 연다.
- AI(Claude)가 코드로 직접 수정하기도 한다 — 이 경우에도 아래 export를 같은 커밋에 포함한다.

## PNG 다시 뽑기 (export)

draw.io 데스크톱 설치: `brew install --cask drawio`

```bash
DRAWIO="/Applications/draw.io.app/Contents/MacOS/draw.io"
cd docs/diagrams/workspace
"$DRAWIO" --export --format png --scale 3 --output ../system-context.png  system-context.drawio  --no-sandbox
"$DRAWIO" --export --format png --scale 3 --output ../deploy-topology.png deploy-topology.drawio --no-sandbox
```

`--scale 3`은 고해상도(레티나·확대 대응). 산출된 `../*.png`를 `.drawio`와 함께 커밋한다.

## 왜 PNG로 표시하나 (`.drawio.svg`를 쓰지 않는 이유)

draw.io의 SVG 내보내기는 라벨 텍스트를 `<foreignObject>`(HTML)로 담는데, GitHub는 `.svg`를 `<img>`로 표시하면서 그 안의 foreignObject를 렌더하지 않는다. 그 결과 `.drawio.svg`를 문서에 임베드하면 **박스만 보이고 글자가 사라진다**. 그래서 표시본은 PNG로 고정한다.

## 노드를 기술 로고로

제품 노드는 로고 + 라벨(예: PostgreSQL·Python·Vercel·GitHub·Google), 추상 개념(미들웨어·SSR 등)은 도형 + 텍스트로 둔다(업계 관행). 로고는 [simple-icons](https://simpleicons.org)(CC0)의 SVG를 쓰고, draw.io 박스 스타일에 `shape=label;image=data:image/svg+xml,<base64>;imageAlign=left;spacingLeft=…`로 넣어 텍스트와 겹치지 않게 한다.
