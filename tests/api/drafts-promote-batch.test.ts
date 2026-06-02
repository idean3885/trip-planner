/**
 * spec 033 — POST /api/trips/[id]/drafts/promote-batch 라우트.
 *
 * 선택분 일괄 승격, 부분 성공(일부 실패는 failed 로), 필수 누락 항목 건너뛰기,
 * 빈 items 400, 권한 없음 403.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  userCanImportCalendar: vi.fn(),
  promoteDraft: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ getAuthUserId: mocks.getAuthUserId }));
// spec 049 — route 직접 호출은 request scope 밖이라 after()가 throw. 콜백을 즉시
// 실행해 트리거 경로를 커버하고, 자동 반영 본체는 아래 mock 으로 끊는다.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (fn: () => void) => fn(),
}));
// 자동 반영 모듈을 mock 해 service→prisma import chain(테스트 env DATABASE_URL 부재)을 끊는다.
vi.mock("@/lib/calendar/auto-sync", () => ({
  triggerCalendarAutoSync: vi.fn(),
}));
vi.mock("@/lib/permissions/activity", () => ({
  userCanImportCalendar: mocks.userCanImportCalendar,
}));
vi.mock("@/lib/calendar-import/promotion", () => {
  // prisma(env) 로드를 피하려 actual 을 부르지 않고 자체 정의한다. route 와
  // 테스트가 같은 클래스를 참조하므로 instanceof 가 일치한다.
  class DraftNotPromotableError extends Error {}
  return { promoteDraft: mocks.promoteDraft, DraftNotPromotableError };
});

import { POST } from "@/app/api/trips/[id]/drafts/promote-batch/route";
import { DraftNotPromotableError } from "@/lib/calendar-import/promotion";

function req(body: unknown) {
  return new Request("http://localhost/api/trips/1/drafts/promote-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const params = { params: Promise.resolve({ id: "1" }) };

const VALID = {
  category: "SIGHTSEEING",
  reservationStatus: "NOT_NEEDED",
  startTimezone: "Asia/Seoul",
  endTimezone: "Asia/Seoul",
};

describe("POST /drafts/promote-batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthUserId.mockResolvedValue("user1");
    mocks.userCanImportCalendar.mockResolvedValue(true);
    mocks.promoteDraft.mockImplementation(
      async ({ draftId }: { draftId: number }) => ({
        activityId: draftId * 10,
      }),
    );
  });

  it("선택분을 일괄 승격하고 promoted 를 반환한다", async () => {
    const res = await POST(
      req({
        items: [
          { draftId: 1, ...VALID },
          { draftId: 2, ...VALID },
        ],
      }),
      params,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.promoted).toHaveLength(2);
    expect(data.failed).toHaveLength(0);
    expect(mocks.promoteDraft).toHaveBeenCalledTimes(2);
  });

  it("일부 실패는 failed 로 모으고 성공분은 유지한다(부분 성공)", async () => {
    mocks.promoteDraft.mockImplementation(
      async ({ draftId }: { draftId: number }) => {
        if (draftId === 2)
          throw new DraftNotPromotableError("draft_not_pending");
        return { activityId: draftId * 10 };
      },
    );
    const res = await POST(
      req({
        items: [
          { draftId: 1, ...VALID },
          { draftId: 2, ...VALID },
        ],
      }),
      params,
    );
    const data = await res.json();
    expect(data.promoted).toHaveLength(1);
    expect(data.failed).toEqual([{ draftId: 2, error: "draft_not_pending" }]);
  });

  it("필수 필드 누락 항목은 승격하지 않고 failed 로 둔다", async () => {
    const res = await POST(
      req({ items: [{ draftId: 1, category: "SIGHTSEEING" }] }),
      params,
    );
    const data = await res.json();
    expect(data.promoted).toHaveLength(0);
    expect(data.failed[0]).toEqual({
      draftId: 1,
      error: "missing_required_fields",
    });
    expect(mocks.promoteDraft).not.toHaveBeenCalled();
  });

  it("빈 items 는 400", async () => {
    const res = await POST(req({ items: [] }), params);
    expect(res.status).toBe(400);
  });

  it("권한 없으면 403", async () => {
    mocks.userCanImportCalendar.mockResolvedValue(false);
    const res = await POST(req({ items: [{ draftId: 1, ...VALID }] }), params);
    expect(res.status).toBe(403);
  });

  it("RESERVED(예약 완료) 를 허용한다 (#632)", async () => {
    const res = await POST(
      req({ items: [{ draftId: 1, ...VALID, reservationStatus: "RESERVED" }] }),
      params,
    );
    const data = await res.json();
    expect(data.promoted).toHaveLength(1);
    expect(data.failed).toHaveLength(0);
  });
});
