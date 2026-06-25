/**
 * spec 063 후속 — "여행 소개" 접힘(depth).
 *
 * 여행이 어떤 여행인지(설명·인원)를 밖으로 나가지 않고 한 뎁스 안에서 펼쳐 본다.
 * 기본 접힘이라 메인 동선(일정·총액)을 가리지 않는다. 기간·총액은 각각 브레드크럼·
 * 일정 화면이 담당하므로 여기서 중복하지 않는다. 네이티브 <details>로 가볍게 둔다.
 */
export function TripInfoDisclosure({
  memberCount,
  descriptionHtml,
}: {
  memberCount: number;
  descriptionHtml: string | null;
}) {
  return (
    <details className="border-border bg-card rounded-lg border text-sm">
      <summary className="text-foreground hover:bg-muted/40 cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium transition-colors">
        여행 소개
      </summary>
      <div className="border-border space-y-2 border-t px-4 py-3">
        <p className="text-muted-foreground text-xs">동행자 {memberCount}명</p>
        {descriptionHtml ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p className="text-muted-foreground text-sm">아직 설명이 없습니다.</p>
        )}
      </div>
    </details>
  );
}
