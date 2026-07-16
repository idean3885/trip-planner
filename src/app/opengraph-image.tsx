import { ImageResponse } from "next/og";

import { projectMeta } from "@/lib/project-meta";

// spec: 브랜드 이미지(#907) — OG 이미지를 코드로 생성한다. 이미지 모델의 한글
// 렌더링이 오탈자를 내는 문제를 피하려고, 문구는 실제 폰트로 서버에서 그린다.
// 아트 디렉션 정본: docs/brand-image-prompts.md (아이보리 + 모노크롬 + 파랑 포인트).
export const alt = `${projectMeta.name} — ${projectMeta.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 팔레트 정본(globals.css :root)과 동일 값.
const INK = "#121212";
const IVORY = "#F7F5EF";
const BLUE = "#17A1FA";
const GRAY = "#616161";

const OVERLINE = "여행 계획부터 현장까지 한 곳에서";
const SUBTITLE = "대화로 만드는 여행 플래너";

// Next.js 공식 예제 방식 — css2가 Node fetch(브라우저 UA 없음)에는 truetype URL을
// 돌려준다. text= 로 필요한 글자만 서브셋해 작게 받는다.
async function loadKoreanFont(
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const family = `Noto+Sans+KR:wght@${weight}`;
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
  );
  if (!resource) throw new Error(`Korean font load failed (weight ${weight})`);
  const res = await fetch(resource[1]);
  if (!res.ok) throw new Error(`Korean font fetch failed (weight ${weight})`);
  return res.arrayBuffer();
}

// 캘린더 + 여행 기간(파랑 포인트) + 말풍선. near-black 라인, 파랑은 기간 칸에만.
function calendarSvg(): string {
  const cols = [34, 66, 98, 130, 162];
  const rowY = [78, 108, 138];
  const cw = 24;
  const ch = 22;
  // 주 경계를 넘는 여행 기간 블록(파랑 포인트).
  const range = new Set(["0-3", "0-4", "1-0", "1-1", "1-2", "1-3"]);
  let cells = "";
  rowY.forEach((y, r) => {
    cols.forEach((x, c) => {
      const on = range.has(`${r}-${c}`);
      cells += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="4" fill="${on ? BLUE : "none"}" stroke="${INK}" stroke-width="2.5"/>`;
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="210" viewBox="0 0 220 210" fill="none" stroke="${INK}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M60 34 v-10 a5 5 0 0 1 10 0 v10" stroke-width="4"/>
    <path d="M150 34 v-10 a5 5 0 0 1 10 0 v10" stroke-width="4"/>
    <rect x="20" y="30" width="180" height="146" rx="14" stroke-width="4.5"/>
    <path d="M20 62 h180" stroke-width="3"/>
    ${cells}
    <path d="M150 130 h44 a11 11 0 0 1 11 11 v16 a11 11 0 0 1 -11 11 h-20 l-10 10 v-10 h-14 a11 11 0 0 1 -11 -11 v-16 a11 11 0 0 1 11 -11 z" fill="${IVORY}" stroke-width="3"/>
    <circle cx="161" cy="149" r="2.4" fill="${INK}" stroke="none"/>
    <circle cx="172" cy="149" r="2.4" fill="${INK}" stroke="none"/>
    <circle cx="183" cy="149" r="2.4" fill="${INK}" stroke="none"/>
  </svg>`;
}

export default async function OpengraphImage() {
  const [bold, medium] = await Promise.all([
    loadKoreanFont(700, projectMeta.name),
    loadKoreanFont(500, OVERLINE + SUBTITLE),
  ]);

  const art = `data:image/svg+xml;base64,${Buffer.from(calendarSvg()).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: IVORY,
        padding: "0 96px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
        <div style={{ fontSize: 30, fontWeight: 500, color: GRAY }}>
          {OVERLINE}
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 700,
            color: INK,
            letterSpacing: "-0.02em",
            margin: "14px 0 12px",
          }}
        >
          {projectMeta.name}
        </div>
        <div style={{ fontSize: 40, fontWeight: 500, color: GRAY }}>
          {SUBTITLE}
        </div>
      </div>
      <img src={art} width={360} height={344} alt="" />
    </div>,
    {
      ...size,
      fonts: [
        { name: "Noto Sans KR", data: bold, weight: 700, style: "normal" },
        { name: "Noto Sans KR", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
