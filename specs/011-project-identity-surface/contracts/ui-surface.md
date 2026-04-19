# UI Surface Contract — 011-project-identity-surface

본 피처는 외부 API·네트워크 계약이 없다. 대신 앱이 사용자에게 노출하는 **UI 표면**이 계약이다. 구현 변경 시 본 계약을 깨면 spec의 FR·SC가 무너진다.

## 1. 전역 풋터 (`<Footer />`)

**Location**: `src/components/Footer.tsx`
**Rendered by**: `src/app/layout.tsx`의 루트 `<body>` 말미

### DOM 표면

```html
<footer class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-6 text-sm text-surface-600">
  <span>Made by {projectMeta.author}</span>
  <span aria-hidden="true">·</span>
  <a href="{projectMeta.githubUrl}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
  <span aria-hidden="true">·</span>
  <a href="/docs">API Docs ↗</a>
  <!-- About 링크는 US2 배포 이후 추가 -->
</footer>
```

### 계약 조건

- 모든 공개 페이지의 하단에 렌더될 것(spec FR-001, SC-001).
- 3개(US2 이후 4개) 링크/텍스트 요소를 포함할 것.
- 외부 링크는 `target="_blank" rel="noopener noreferrer"` 필수(spec FR-005).
- 구분자 `·`는 `aria-hidden="true"`로 스크린 리더에서 무시되게 함.
- 가로 폭 축소 시 flex-wrap으로 자동 줄바꿈. 레이아웃 깨짐 금지(spec SC-004).
- 짧은 콘텐츠 페이지에서도 뷰포트 하단에 고정(sticky footer via flex column min-h-screen, spec FR-011).

## 2. About 페이지 (`/about`)

**Location**: `src/app/about/page.tsx`
**Access**: 공개(로그인 불요, spec SC-005)

### DOM 표면 (구조 계약)

```html
<main class="max-w-2xl mx-auto px-4 py-10 space-y-6">
  <header class="space-y-2">
    <h1>{projectMeta.name}</h1>
    <p>{projectMeta.description}</p>
  </header>

  <section>
    <h2>프로젝트 배경</h2>
    <p>…{배경 설명 하드코딩 또는 projectMeta 확장 필드}…</p>
  </section>

  <section>
    <h2>정보</h2>
    <dl>
      <dt>저작자</dt><dd>{projectMeta.author}</dd>
      <dt>라이선스</dt><dd>{projectMeta.license}</dd>
      <dt>저장소</dt><dd><a href="{projectMeta.githubUrl}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></dd>
    </dl>
  </section>

  <section>
    <h2>기술 스택</h2>
    <ul>
      {projectMeta.techStack.map((tech) => (<li key={tech}>{tech}</li>))}
    </ul>
  </section>
</main>
```

### 계약 조건

- `/about` 경로는 인증 미들웨어 대상 제외(공개 라우트).
- 모든 표시 값은 `projectMeta`에서 읽음. 하드코딩 금지(spec FR-003).
- 외부 링크는 풋터와 동일 규약 적용(`target="_blank" rel="noopener noreferrer"`).
- 단일 컬럼 `max-w-2xl`로 모바일·데스크톱 모두 가로 스크롤 없음(spec SC-004).

## 3. 설정 페이지 API 문서 링크

**Location**: `src/app/settings/page.tsx` (기존 파일 편집)

### DOM 표면

설정 페이지 제목 영역 하단 또는 옆에 추가:

```html
<Link href="/docs" class="text-sm text-blue-600 hover:underline">API 문서 →</Link>
```

### 계약 조건

- 위치는 페이지 상단 식별 가능한 영역(제목 아래/옆).
- 내부 이동이므로 `target="_blank"` 붙이지 않음(풋터와 동일 경로로 이동).
- 새 컴포넌트 추출 금지(spec US3는 최소 변경).

## 4. 메타 소스 Import 계약

- **단일 경로**: `import { projectMeta } from "@/lib/project-meta";`
- 다른 경로에서 `projectMeta`를 재정의하거나 mirror 금지.
- About·Footer·설정 페이지·미래 확장 모두 동일 경로를 참조해야 구조적 일관성 확보(spec SC-003).

## Breakage 기준 (계약 위반 = 회귀)

- 풋터가 일부 라우트에서 누락 → SC-001 실패
- 외부 링크에 `rel` 누락 → FR-005 실패, 보안 감사 실패
- 브레이크포인트 분기(`md:flex-row` 등) 도입 → FR-009 실패, 헌법 III 위배
- `projectMeta` 필드가 빈 문자열로 배포 → SC-006 실패(타입 경유 우회 시도는 리뷰에서 차단)
- About 페이지 레이아웃이 모바일에서 가로 스크롤 발생 → SC-004 실패, 헌법 III 위배
