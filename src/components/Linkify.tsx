"use client";

/**
 * spec 048 US3 — 활동 상세·카드 메모 안의 URL 렌더.
 *
 * 링크를 새 탭(target=_blank) 대신 팝업 창(window.open)으로 연다. 모바일·앱에서
 * 새 탭으로 넘어가 여행 화면 맥락을 벗어나던 문제를 줄인다. 또한 클릭이 상위 카드
 * 탭(상세 펼침)으로 전파되지 않게 막는다.
 */

const URL_RE = /(https?:\/\/[^\s]+)/;

function openPopup(url: string) {
  const w = 480;
  const h = 640;
  const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
  window.open(
    url,
    "trip-link",
    `popup,noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`,
  );
}

export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openPopup(part);
            }}
            className="text-foreground break-all underline underline-offset-2 hover:opacity-80"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
