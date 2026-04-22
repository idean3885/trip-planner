/**
 * spec 021 — 미등록 사용자 안내에 사용되는 상수·헬퍼.
 *
 * 본 앱의 외부 캘린더 OAuth는 Testing 모드이므로 개발자가 Test users에 등록한
 * 계정만 연동이 가능하다. 미등록 사용자가 연동을 시도하면 access_denied 또는
 * Calendar API 403이 발생하며, UI는 단일 CTA로 리포의 공개 토론 채널(Q&A)의
 * 프리필 링크를 노출한다.
 */

const ISSUE_TITLE = "Google 캘린더 연동 등록 요청";
const ISSUE_BODY = [
  "<!-- spec 021: Test user 등록 요청 -->",
  "",
  "가입에 사용한 Google 이메일: (여기에 입력)",
  "",
  "사용 목적(선택): ",
  "",
].join("\n");

export const GCAL_DISCUSSIONS_URL = (() => {
  const base = "https://github.com/idean3885/trip-planner/discussions/new";
  const params = new URLSearchParams({
    category: "q-a",
    title: ISSUE_TITLE,
    body: ISSUE_BODY,
  });
  return `${base}?${params.toString()}`;
})();

/** UI에 표시하는 기본 안내 문구 (카드·토스트 공용). */
export const UNREGISTERED_NOTICE_TITLE = "개발자 등록이 필요한 기능";
export const UNREGISTERED_NOTICE_BODY =
  "이 기능은 현재 개발자 등록 사용자에게만 제공됩니다. 앱 심사 전 단계라 Test users 목록에 등록된 계정만 구글 캘린더 연동을 사용할 수 있습니다.";
