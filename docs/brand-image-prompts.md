# 브랜드 이미지 생성 프롬프트 정본

> **대상**: "우리의 여행" 서비스 이미지 자산을 Gemini **Nano Banana Pro**(Gemini 이미지 생성)로 만들 때 그대로 복사해 쓰는 프롬프트 모음.

랜딩·소셜 공유·앱 아이콘에 쓰는 이미지를 서비스 톤에 맞춰 만듭니다. 프롬프트 지시문은 이미지 모델이 더 정확히 따르도록 영어로 적고, 렌더링할 한글 문구만 따옴표로 고정합니다.

---

## 1. 아트 디렉션 (핵심)

* **모노크롬 베이스 + 파랑 포인트**입니다. 배경은 흰색에 가까운 **아이보리**, 선·형태는 **근접-블랙**, 보조는 회색. 여기에 **파랑 `#17A1FA` 을 포인트로 소량만** 얹습니다.
* 파랑은 **한 장에 한 요소**(여행 기간 칸 / 말풍선 / 아이콘 칸 등)에만 씁니다. **배경을 덮거나 넓은 면을 칠하지 않습니다** — 면적이 커지면 눈이 피곤하고 AI 티가 올라옵니다. 시선이 한 번 걸릴 정도의 작은 포인트로 끝냅니다.
* **화려하지 않게, 절제된 에디토리얼 라인 드로잉**입니다. 한 장에 **주제 하나**, 여백을 넉넉히 둡니다.
* **AI 티가 나는 요소를 뺍니다** — 몽타주·콜라주, 석양/그라데이션 하늘, 열기구, 빛나는 전구, 글로브+핀 클립아트, 두꺼운 스티커 외곽선, 가짜 입체(3D), 사진 합성, 지어낸 영문 브랜드 문구, 넓은 컬러 면을 모두 금지합니다.
* 앱 이름은 **"우리의 여행"** 입니다. 영문 브랜드명을 지어내지 않습니다.

> **앱 UI 색과의 관계**: 포인트 파랑 `#17A1FA` 은 앱 화면 색 정본([`src/app/globals.css`](../src/app/globals.css) `:root`)의 포인트 블루와 **같은 값**입니다. 이미지와 화면이 같은 파랑을 공유해 한 브랜드로 읽히도록 맞췄습니다. 나머지는 모노크롬으로 두어 이미지가 화면 위에서 튀지 않게 합니다.

---

## 2. 팔레트 락 (이미지 전용)

| 역할 | Hex | 프롬프트 표기 |
|------|-----|--------------|
| 배경 (아이보리) | `#F7F5EF` | warm ivory background |
| 잉크 (선·강조) | `#121212` | near-black ink |
| 보조 회색 | `#616161` | mid gray |
| 흐린 회색 (약한 톤·비활성) | `#B3B3B3` | muted gray |
| 헤어라인 (얇은 구분선) | `#E5E3DC` | warm hairline |
| **포인트 파랑 (시그니처, 소량)** | `#17A1FA` | sky-blue point accent |

**색은 위 목록으로 한정합니다.** 파랑 외 채도 있는 색(초록·빨강·주황 등)은 넣지 않고, 파랑도 작은 한 요소에만 씁니다. 투명 배경 자산(Hero·기능·아이콘)은 배경을 비우고 잉크·회색 선 + 파랑 포인트만 씁니다.

---

## 3. 공통 스타일 블록

> 아래 블록을 모든 프롬프트 맨 앞에 붙여 씁니다.

```
Minimalist editorial line illustration on a warm ivory background #F7F5EF, calm and restrained.
Fine, even line weight in near-black #121212. A single clear subject, lots of empty space.
Mostly monochrome — ivory, near-black, and neutral grays #616161 and #B3B3B3.
Add ONE small point of color only: a sky-blue #17A1FA accent used sparingly on a SINGLE key
element (for example a few highlighted calendar days, or one small fill). Keep the colored area
small — never cover the background, never fill large areas, never more than one accent spot.
Flat: no gradients, no glow, no 3D, no drop-shadow stickers, no photorealism.

Reduce the "AI-generated" look — AVOID: montage or collage of many objects, sunset or gradient sky,
hot-air balloons, glowing lightbulbs, globe-with-pins clip art, thick sticker outlines, faux-3D,
random extra objects, large flat color fields, garbled or invented text, logos, watermark.
Keep it quiet, sparse, and tasteful, like a hand-drawn editorial line.
```

**서비스 모티프**(한 장에 하나만): 캘린더 그리드에서 며칠을 묶은 여행 기간(← 파랑 포인트를 여기에 두기 좋음) · 대화 말풍선 · 단순한 원형 동행 아바타 · 지도 핀 · 점선 이동 경로 · 스마트폰 프레임. 여러 개를 한 장에 몰아넣지 않습니다.

---

## 4. 자산별 프롬프트

### A. OG / 소셜 공유 이미지 (`hero-og.png`)

- **비율/크기**: 1.91:1, 1200×630 px
- **랜딩(`src/app/page.tsx`)이 이미 이 경로를 참조**하므로 파일만 채우면 연결됩니다.

**A1 — 문구 포함(1순위):**

```
[공통 스타일 블록]

A 1200x630 horizontal Open Graph banner on warm ivory #F7F5EF, split layout.

LEFT (text, left-aligned, comfortable margins):
- small overline in mid gray #616161: "여행 계획부터 현장까지 한 곳에서"
- large title in near-black #121212: "우리의 여행"
- subtitle in mid gray #616161: "대화로 만드는 여행 플래너"
Clean modern Korean sans-serif (Pretendard-like). Render the Korean text crisply and
exactly as written, correct spelling. Do NOT add any English words or invented brand name.

RIGHT (one small line drawing, near-black lines): a simple calendar with a few days grouped
to mark a trip range, and one small chat bubble beside it. The trip-range days are the ONLY
colored element — fill just those few cells with sky-blue #17A1FA. Everything else stays
near-black line on ivory. Lots of ivory space between the two sides.
```

**A2 — 문구 없음(대안, 텍스트는 코드/디자인에서 얹기):**

```
[공통 스타일 블록]

A 1200x630 horizontal image on warm ivory #F7F5EF, no text at all.
One small centered-right line drawing: a simple calendar with a few trip-range days filled
in sky-blue #17A1FA (the only colored element) and one small chat bubble in near-black line.
Leave the left half as empty ivory space for a text overlay.
```

---

### B. 랜딩 Hero 비주얼 (`hero-illustration.png`)

- **비율/크기**: 1:1, 1600×1600 px · **투명 배경(PNG)**
- **용도**: 랜딩 상단 Hero 옆/아래 대표 라인 드로잉. 문구는 화면에 이미 있으므로 **글자 없이**.

```
[공통 스타일 블록]

Square 1:1 line drawing on a transparent background, no text, near-black #121212 lines.
One calm scene: a smartphone showing a small monthly calendar with a few trip days, and one or
two small chat bubbles beside it (a conversation becoming a plan). Fill only the few trip-range
calendar days with sky-blue #17A1FA — the single colored element; everything else near-black line.
Simple, sparse, centered, plenty of empty space. Transparent background (PNG with alpha).
```

---

### C. 기능 소개 스팟 일러스트 4종 (`features/*.png`)

- **비율/크기**: 1:1, 512×512 px · **투명 배경(PNG)** · 4종 **한 세트로 선 두께·톤 일치**
- **용도**: 랜딩 `FeatureHighlights` 카드. 현재는 작은 lucide 아이콘(Sparkles·MessageSquareText·MapPin·Wallet)을 쓰므로, 아래 스팟은 같은 은유의 라인 버전입니다. 카드 디자인 변경을 수반하므로 **배선은 후속 판단**.
- **공통 추가 지시**(4개 모두): `One simple line pictogram, near-black #121212 lines on transparent background, one subject, consistent line weight across the set. Add exactly ONE tiny sky-blue #17A1FA detail per icon and nothing more; keep the rest monochrome.`

**C1 — 대화로 계획합니다** (파랑 포인트: 말풍선 안 캘린더 칸)

```
[공통 스타일 블록] [공통 추가 지시]
A chat bubble with a small calendar day inside or beside it — a conversation turning into a plan.
The single day cell is the sky-blue #17A1FA detail.
```

**C2 — 함께 관리하고 다듬습니다** (파랑 포인트: 맨 위 카드의 한 칸)

```
[공통 스타일 블록] [공통 추가 지시]
Three stacked cards (a trip → day → activity hierarchy) with two simple circular avatars beside them.
One small cell on the top card is the sky-blue #17A1FA detail.
```

**C3 — 모바일에서 현장까지** (파랑 포인트: 지도 핀)

```
[공통 스타일 블록] [공통 추가 지시]
A smartphone showing today's timeline as two or three short rows, with a small map pin.
The map pin is the sky-blue #17A1FA detail.
```

**C4 — 현장 가계부** (파랑 포인트: 합계 줄)

```
[공통 스타일 블록] [공통 추가 지시]
A simple receipt with a short list of lines and a total at the bottom.
The total line is the sky-blue #17A1FA detail.
```

---

### D. 파비콘 · 앱 아이콘

- **마스터**: 1:1, 1024×1024 px · 투명 배경
- **용도**: `favicon.ico`, `icon.png`, `apple-icon.png`. **16px에서도 읽혀야 하므로 형태는 하나만** 담습니다.
- 두 개념 중 하나를 골라 생성합니다. **D1을 권장**합니다(캘린더=일정 + 핀=여행을 한 형태로 합침).

**D1 — 캘린더 + 핀 (권장)**

```
[공통 스타일 블록]
A single app icon glyph, centered, extremely simple and legible at 16px.
A rounded-square calendar mark in near-black #121212, with a location pin shape formed at its
top so it reads as both "calendar" and "place". Fill ONE calendar cell with sky-blue #17A1FA as
the single accent; the rest is near-black on transparent. No text, no letters. Bold, minimal, high contrast.
```

**D2 — 말풍선 + 경로 (대안)**

```
[공통 스타일 블록]
A single app icon glyph, centered, simple and legible at 16px. A rounded speech bubble containing
a short dotted travel path with a small map pin at its end. Near-black #121212 lines on transparent;
the map pin is a small sky-blue #17A1FA accent. No text. Bold, minimal, high contrast.
```

- **마스크 버전**: PWA maskable용은 아이콘을 가운데 80% 안에 두고 여백(safe zone)을 남깁니다. 프롬프트에 `keep the glyph within the center 80%, extra padding around it` 추가.

---

## 5. 생성 후 배선

| 자산 | 파일 경로 | 크기 | 연결 방식 |
|------|----------|------|----------|
| OG 이미지 | `public/landing/hero-og.png` | 1200×630 | 이미 `page.tsx`가 참조 — 파일만 배치하면 연결 |
| Hero 비주얼 | `public/landing/hero-illustration.png` | 1600×1600 (투명) | `Hero.tsx`에 `next/image`로 삽입 (후속) |
| 기능 스팟 ×4 | `public/landing/features/{plan,manage,mobile,expense}.png` | 512×512 (투명) | `landing-content.ts` / `FeatureHighlights` 배선 (후속) |
| 파비콘 | `src/app/favicon.ico` | 16·32·48 멀티 | Next.js App Router 자동 인식 |
| 앱 아이콘 | `src/app/icon.png` | 512×512 | Next.js App Router 자동 인식 |
| Apple 아이콘 | `src/app/apple-icon.png` | 180×180 | Next.js App Router 자동 인식 |

> 생성 이미지 바이너리와 위 배선은 이미지가 만들어진 뒤 별도로 진행합니다. 없는 파일을 미리 참조하면 깨진 이미지가 노출되므로, 파일 배치와 코드 연결을 같은 단계에서 함께 커밋합니다.

---

## 6. 검수 기준

* 베이스가 모노크롬(아이보리·근접-블랙·회색)이고, 파랑 `#17A1FA` 이 **작은 한 요소에만** 들어갔는가. 넓은 컬러 면이 없는가.
* AI 티 요소(몽타주·석양·열기구·전구·글로브핀·스티커 외곽선·가짜 입체)가 없는가.
* 한 장에 주제가 하나이고 여백이 충분한가.
* 한글 문구가 오탈자 없이 정확하고, 지어낸 영문/브랜드명이 없는가.
* 파비콘·앱 아이콘이 16px 축소에서도 형태가 읽히는가.
* 투명 배경 자산의 가장자리에 흰 테두리·잔상이 없는가.
* 4종 기능 스팟의 선 두께·톤이 한 세트로 일치하는가.
