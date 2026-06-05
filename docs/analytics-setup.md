# 분석(GA4)·검색 노출(GSC) 설정 가이드

spec 057. 코드는 환경변수 기반으로 통합되어 있어, 아래 콘솔 작업과 환경변수 등록만 하면 활성화된다. 값이 없으면 분석·검증 태그가 붙지 않고 앱은 정상 동작한다.

## 1. GA4 측정 ID 발급

1. [Google Analytics](https://analytics.google.com) > 관리 > 속성 만들기(또는 기존 속성).
2. 데이터 스트림 > 웹 스트림 추가 > 사이트 URL(예: `https://trip.idean.me`).
3. 발급된 **측정 ID**(`G-XXXXXXX`)를 복사.

## 2. GSC 소유 확인값 발급

1. [Google Search Console](https://search.google.com/search-console) > 속성 추가 > URL 접두어(`https://trip.idean.me`).
2. 확인 방법 중 **HTML 태그** 선택 > `content="..."` 값만 복사(태그 전체가 아니라 값).
3. 배포 후 색인 정책상 공개 페이지(`/`, `/about`, `/docs`)만 노출되고, sitemap은 `/sitemap.xml`로 제출한다.

## 3. 환경변수 등록 (Vercel)

`.env.example` 참고. Vercel > 프로젝트 > Settings > Environment Variables에 등록한다.

| 키 | 값 | 노출 | 스코프 |
|----|----|------|--------|
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXX` | 클라이언트 | Production(+필요 시 Preview) |
| `GOOGLE_SITE_VERIFICATION` | GSC content 값 | 서버 메타 | Production |

> `NEXT_PUBLIC_*`는 빌드 시 클라이언트 번들에 포함된다. 측정 ID는 공개되어도 무방한 값이다.

## 4. 확인

- 배포 후 `https://<도메인>/robots.txt`, `https://<도메인>/sitemap.xml` 응답 확인.
- GA4 실시간 보고서에서 페이지뷰 + 전환 이벤트(`trip_created`, `calendar_import`) 집계 확인.
- GSC에서 소유 확인 완료 + sitemap 제출.

## 수집 항목

- 페이지뷰(자동), `trip_created`(여행 생성), `calendar_import`(가져오기 실행).
- 로그인 사용자는 내부 식별자를 `user_id`로 연결(이메일·이름 등 PII 미전송).
- 분석이 쿠키를 쓴다는 고지는 Footer에 노출(측정 ID 활성 시).

## 보류(후속)

- 동의(consent) 배너 UI, 서버 측 정밀 가입 추적, 행동 분석 심화 도구(PostHog 등).
