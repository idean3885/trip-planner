# 브랜드 이미지 생성 프롬프트 정본

> **대상**: "우리의 여행" 서비스 이미지 자산을 Gemini **Nano Banana Pro**(Gemini 이미지 생성)로 만들 때 그대로 복사해 쓰는 프롬프트 모음.

랜딩·소셜 공유·앱 아이콘에 쓰는 이미지를 서비스 팔레트와 톤에 맞춰 만듭니다. 프롬프트 지시문은 이미지 모델이 더 정확히 따르도록 영어로 적고, 렌더링할 한글 문구만 따옴표로 고정합니다. 색 정본은 [`src/app/globals.css`](../src/app/globals.css)의 `:root`이며, 아래 팔레트 표는 그 값을 그대로 옮긴 것입니다.

---

## 1. 사용 방법

1. **[3. 공통 스타일 블록](#3-공통-스타일-블록)** 을 먼저 복사하고, 그 아래에 원하는 자산의 개별 프롬프트를 이어 붙여 한 프롬프트로 넣습니다.
2. Nano Banana Pro에서 **가로세로 비율(aspect ratio)** 을 자산별 표기대로 설정합니다.
3. 색이 흔들리면 **팔레트 스와치 이미지**(아래 hex를 색칠한 작은 이미지)나 현재 화면 스크린샷을 참조 이미지로 함께 첨부해 색을 고정합니다.
4. 2~4장을 생성해 고른 뒤, 목표 크기로 축소하고 이미지 최적화(예: Squoosh)를 거쳐 커밋합니다.
5. 최종 파일 경로는 **[5. 생성 후 배선](#5-생성-후-배선)** 표를 따릅니다.

> 한글 문구가 들어가는 자산은 오탈자가 생길 수 있습니다. 생성물의 글자를 **글자 단위로 대조**하고, 틀리면 문구 없는 버전으로 만든 뒤 코드/디자인에서 텍스트를 얹는 방식을 씁니다(OG는 문구 없는 대안 프롬프트를 함께 실었습니다).

---

## 2. 팔레트 락 (정본 = `globals.css :root`)

| 역할 | Hex | 프롬프트 표기 |
|------|-----|--------------|
| 배경/흰색 | `#FFFFFF` | white background |
| 면(muted 표면) | `#F5F5F5` | light gray surface |
| 테두리/선 | `#D9D9D9` | light gray stroke |
| 잉크(근접-블랙 선·강조) | `#121212` | near-black ink |
| 보조 텍스트 회색 | `#616161` | mid gray |
| 흐린 회색 | `#B3B3B3` | muted gray |
| **포인트 블루** (오늘·주말·포커스) | `#17A1FA` | sky-blue accent |
| 진한 블루 | `#1270B0` | deep blue |
| **포인트 그린** (여행 주말·동행) | `#629126` | olive-green accent |
| 연한 라임 채움 (선택 셀·배너 배경) | `#F0FFD7` | pale-lime fill |
| 진한 그린 (선택 텍스트) | `#335803` | deep green |

**사용 색은 위 목록으로 한정합니다.** 빨강·주황·보라·네온 등 팔레트 밖 색은 넣지 않습니다.

---

## 3. 공통 스타일 블록

> 아래 블록을 모든 프롬프트 맨 앞에 붙여 씁니다.

```
Minimal flat vector illustration in a clean, modern SaaS product-illustration style.
Thin, uniform line weight (2–3px) in near-black ink #121212. Simple geometric shapes,
soft rounded corners, generous white negative space, calm and uncluttered.
Flat color fills, no gradients, no 3D, no photorealism, no heavy shadows
(at most one very subtle soft shadow). Friendly and quiet, not busy.

Strict color palette only:
- white background #FFFFFF
- near-black lines #121212
- sky-blue accent #17A1FA
- olive-green accent #629126 with pale-lime fill #F0FFD7
- neutral grays #F5F5F5, #D9D9D9, #B3B3B3, #616161
Do NOT use any other colors (no red, orange, purple, neon, teal).

Negative: no dark background, no gradient mesh, no glossy 3D, no realistic photo,
no lens flare, no watermark, no clutter, no extra text beyond what is specified.
```

**서비스 모티프**(장면 구성에 재사용): 캘린더 그리드에서 여행 기간을 연한 라임 `#F0FFD7`로 채우고 오늘은 블루 `#17A1FA` 점으로 표시 · 대화 말풍선(대화로 계획) · 단순한 원형 동행 아바타 2~3개(함께) · 지도 핀 · 점선 비행 경로 · 일정 카드 · 스마트폰 프레임(모바일 우선).

---

## 4. 자산별 프롬프트

### A. OG / 소셜 공유 이미지 (`hero-og.png`)

- **비율/크기**: 1.91:1, 1200×630 px (카톡·슬랙·트위터 공유 대표 이미지)
- **랜딩(`src/app/page.tsx`)이 이미 이 경로를 참조**하므로 파일만 채우면 연결됩니다.

**A1 — 문구 포함(1순위):**

```
[공통 스타일 블록]

A 1200x630 horizontal Open Graph banner, white background, split layout.

LEFT HALF (text block, left-aligned, comfortable margins):
- small overline in mid gray #616161: "여행 계획부터 현장까지 한 곳에서"
- large bold title in near-black #121212: "우리의 여행"
- subtitle in mid gray #616161: "대화로 만드는 여행 플래너"
Use a clean modern Korean sans-serif (Pretendard-like). Render the Korean text
crisply and exactly as written, correct spelling, well balanced.

RIGHT HALF (illustration): a rounded calendar card with one week row where a
3-day trip range is filled in pale-lime #F0FFD7 and today is marked with a small
sky-blue #17A1FA dot; a rounded chat bubble with three dots overlapping the calendar's
top corner; a small map pin in sky-blue; two simple circular companion avatars;
a light dotted airplane arc. Balanced, airy composition with white space between the
two halves. Flat line-and-fill style.
```

**A2 — 문구 없음(대안, 텍스트는 코드/디자인에서 얹기):**

```
[공통 스타일 블록]

A 1200x630 horizontal illustration, white background, no text at all.
Centered-right composition: a rounded calendar card with a 3-day trip range filled
in pale-lime #F0FFD7 and a sky-blue #17A1FA today dot; an overlapping chat bubble with
three dots; a small sky-blue map pin; two simple circular companion avatars; a light
dotted airplane arc. Leave the left third mostly empty white space for a text overlay.
```

---

### B. 랜딩 Hero 비주얼 (`hero-illustration.png`)

- **비율/크기**: 1:1, 1600×1600 px 권장 · **투명 배경(PNG)**
- **용도**: 랜딩 상단 Hero 옆/아래에 얹는 대표 일러스트("대화로 만드는 여행 플래너" 무드). 문구는 이미 화면에 있으므로 **글자 없이**.

```
[공통 스타일 블록]

Square 1:1 illustration on a transparent background, no text.
Scene that tells "plan a trip by talking, together": a rounded smartphone in the center
showing a small monthly calendar with a few trip days filled in pale-lime #F0FFD7 and a
sky-blue #17A1FA today dot. Above the phone, two or three rounded chat bubbles floating
(one with a small sparkle) suggesting a conversation turning into a plan. Around it:
two or three simple circular companion avatars, a sky-blue map pin, a light dotted airplane
arc, and one or two tiny itinerary cards. Centered, balanced, lots of breathing room.
Flat line-and-fill style, olive-green #629126 and sky-blue #17A1FA as the only accents.
Transparent background (PNG with alpha).
```

---

### C. 기능 소개 스팟 일러스트 4종 (`features/*.png`)

- **비율/크기**: 1:1, 512×512 px · **투명 배경(PNG)** · 4종 **한 세트로 톤 일치**
- **용도**: 랜딩 `FeatureHighlights` 카드. 현재는 작은 lucide 아이콘(Sparkles·MessageSquareText·MapPin·Wallet)을 쓰므로, 아래 스팟은 같은 은유를 크게 옮긴 것입니다. 카드 디자인 변경을 수반하므로 **배선은 후속 판단**(문서만 우선 확정).
- **공통 추가 지시**(4개 모두에 덧붙임): `Single simple spot illustration, one clear subject, centered, transparent background, consistent line weight across the set.`

**C1 — 대화로 계획합니다** (accent: sky-blue #17A1FA)

```
[공통 스타일 블록] [공통 추가 지시]
A rounded chat bubble with a small sparkle, and a tiny calendar day cell being filled
next to it — a conversation turning into a scheduled plan.
```

**C2 — 함께 관리하고 다듬습니다** (accent: olive-green #629126)

```
[공통 스타일 블록] [공통 추가 지시]
Three stacked rounded cards showing a trip → day → activity hierarchy, with two simple
circular companion avatars beside them and a small key/badge suggesting shared roles.
```

**C3 — 모바일에서 현장까지** (accent: sky-blue #17A1FA)

```
[공통 스타일 블록] [공통 추가 지시]
A rounded smartphone showing today's timeline as two or three short rows, with a small
map pin and a light sync arc linking to a tiny calendar icon.
```

**C4 — 현장 가계부** (accent: olive-green #629126)

```
[공통 스타일 블록] [공통 추가 지시]
A rounded receipt/wallet with a small currency mark and a short sum, split into two
parts (advance vs on-site) suggested by a thin divider.
```

---

### D. 파비콘 · 앱 아이콘

- **마스터**: 1:1, 1024×1024 px · 투명 배경 + 흰 배경 두 버전
- **용도**: `favicon.ico`, `icon.png`, `apple-icon.png`. **16px에서도 읽혀야 하므로 형태는 하나만** 담습니다.
- 아래 두 개념 중 하나를 골라 생성합니다. **D1을 권장**합니다(캘린더=일정 + 핀=여행을 한 형태로 합침).

**D1 — 캘린더 + 핀 (권장, accent: sky-blue #17A1FA)**

```
[공통 스타일 블록]
A single app icon glyph, centered on a square, extremely simple and legible at 16px.
A rounded-square calendar mark in near-black #121212 line, with one cell filled in
sky-blue #17A1FA, and a location pin shape formed at the calendar's top so it reads as
both "calendar" and "place". No text, no letters. Bold, minimal, high contrast.
Provide on transparent background.
```

**D2 — 말풍선 + 경로 (대안, accent: olive-green #629126)**

```
[공통 스타일 블록]
A single app icon glyph, centered, simple and legible at 16px. A rounded speech bubble
containing a short dotted travel path with a small map pin at its end — "plan a trip by
talking". Sky-blue #17A1FA path, olive-green #629126 pin, near-black #121212 outline.
No text. Bold, minimal, high contrast. Transparent background.
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

* 팔레트 밖 색이 섞이지 않았는가 (2. 팔레트 락 기준).
* 한글 문구가 오탈자 없이 정확한가 (A1·해당 자산).
* 파비콘·앱 아이콘이 16px 축소에서도 형태가 읽히는가.
* 투명 배경 자산의 가장자리에 흰 테두리·잔상이 없는가.
* 4종 기능 스팟의 선 두께·여백 톤이 한 세트로 일치하는가.
* 라이트 테마 한 벌만 만든다(다크 배경 버전은 만들지 않는다).
