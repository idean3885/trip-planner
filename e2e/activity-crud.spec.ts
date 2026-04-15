import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "https://trip.idean.me";
const PAT = process.env.TRIP_PAT!;
const TRIP_ID = 4;
const DAY_ID = 43;
const API = `${BASE}/api/trips/${TRIP_ID}/days/${DAY_ID}`;

// Vercel Deployment Protection bypass
const BYPASS_TOKEN = process.env.VERCEL_BYPASS_TOKEN;

function headers() {
  const h: Record<string, string> = {
    Authorization: `Bearer ${PAT}`,
    "Content-Type": "application/json",
  };
  if (BYPASS_TOKEN) {
    h["x-vercel-protection-bypass"] = BYPASS_TOKEN;
  }
  return h;
}

test.describe("Activity CRUD E2E", () => {
  let activityId: number;

  test("GET /days/{dayId} — 단일 일자 조회", async ({ request }) => {
    const res = await request.get(API, { headers: headers() });
    // 이 엔드포인트는 #134에서 추가됨 — 프로덕션 머지 전에는 405
    if (res.status() === 405) {
      test.skip(true, "GET /days/{dayId} not deployed yet");
      return;
    }
    expect(res.status()).toBe(200);
    const day = await res.json();
    expect(day.id).toBe(DAY_ID);
    expect(day).toHaveProperty("content");
    expect(day).toHaveProperty("activities");
  });

  test("POST /activities — 활동 생성", async ({ request }) => {
    const res = await request.post(`${API}/activities`, {
      headers: headers(),
      data: {
        category: "SIGHTSEEING",
        title: "E2E 테스트 관광",
        startTime: "10:00",
        endTime: "12:00",
        location: "테스트 장소",
        memo: "자동 테스트 https://example.com",
        cost: 15,
        currency: "EUR",
        reservationStatus: "RECOMMENDED",
      },
    });
    expect(res.status()).toBe(201);
    const activity = await res.json();
    expect(activity.title).toBe("E2E 테스트 관광");
    expect(activity.category).toBe("SIGHTSEEING");
    expect(activity.startTime).toBe("10:00");
    expect(activity.location).toBe("테스트 장소");
    activityId = activity.id;
  });

  test("GET /activities — 활동 목록 조회", async ({ request }) => {
    const res = await request.get(`${API}/activities`, { headers: headers() });
    expect(res.status()).toBe(200);
    const activities = await res.json();
    expect(activities.length).toBeGreaterThan(0);
    const found = activities.find((a: { id: number }) => a.id === activityId);
    expect(found).toBeTruthy();
  });

  test("PUT /activities/{id} — 활동 수정", async ({ request }) => {
    const res = await request.put(`${API}/activities/${activityId}`, {
      headers: headers(),
      data: { title: "E2E 수정됨", memo: "수정 메모 https://test.com" },
    });
    expect(res.status()).toBe(200);
    const updated = await res.json();
    expect(updated.title).toBe("E2E 수정됨");
    expect(updated.memo).toContain("https://test.com");
  });

  test("PATCH /activities reorder — 순서 변경", async ({ request }) => {
    // 두 번째 활동 생성
    const res2 = await request.post(`${API}/activities`, {
      headers: headers(),
      data: { category: "DINING", title: "E2E 식사", startTime: "13:00", endTime: "14:00" },
    });
    const second = await res2.json();

    const res = await request.patch(`${API}/activities`, {
      headers: headers(),
      data: { orderedIds: [second.id, activityId] },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // 순서 확인
    const listRes = await request.get(`${API}/activities`, { headers: headers() });
    const list = await listRes.json();
    expect(list[0].id).toBe(second.id);
    expect(list[1].id).toBe(activityId);

    // 두 번째 활동 정리
    await request.delete(`${API}/activities/${second.id}`, { headers: headers() });
  });

  test("DELETE /activities/{id} — 활동 삭제", async ({ request }) => {
    const res = await request.delete(`${API}/activities/${activityId}`, {
      headers: headers(),
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // 삭제 확인
    const listRes = await request.get(`${API}/activities`, { headers: headers() });
    const list = await listRes.json();
    const found = list.find((a: { id: number }) => a.id === activityId);
    expect(found).toBeFalsy();
  });

  test("GET /days/{dayId} — content 필드로 마크다운 확인", async ({ request }) => {
    const res = await request.get(API, { headers: headers() });
    if (res.status() === 405) {
      test.skip(true, "GET /days/{dayId} not deployed yet");
      return;
    }
    const day = await res.json();
    expect(day.content).toBeTruthy();
    expect(day.content.length).toBeGreaterThan(100);
  });
});
