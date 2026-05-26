import { describe, it, expect } from "vitest";
import { formatActivityAsEvent, dedicatedCalendarName } from "@/lib/gcal/format";
import type { ActivityForFormat } from "@/lib/gcal/format";

function baseActivity(overrides: Partial<ActivityForFormat> = {}): ActivityForFormat {
  return {
    title: "벨렝 탑 방문",
    category: "SIGHTSEEING",
    startTime: new Date("2026-06-07T09:00:00.000Z"),
    startTimezone: "Europe/Lisbon",
    endTime: new Date("2026-06-07T11:00:00.000Z"),
    endTimezone: "Europe/Lisbon",
    location: "Torre de Belém",
    memo: null,
    reservationStatus: null,
    ...overrides,
  };
}

const TRIP = { id: 5, title: "포르투갈 신혼여행" };
const URL_OPTS = { tripUrl: "https://trip.idean.me/trips/5" };

describe("formatActivityAsEvent", () => {
  it("제목은 [여행명] 카테고리기호 활동제목 형식", () => {
    const event = formatActivityAsEvent(baseActivity(), TRIP, URL_OPTS);
    expect(event.summary).toBe("[포르투갈 신혼여행] 🗺️ 벨렝 탑 방문");
  });

  it("DINING은 식사 이모지", () => {
    const event = formatActivityAsEvent(baseActivity({ category: "DINING" }), TRIP, URL_OPTS);
    expect(event.summary).toContain("🍽️");
  });

  it("예약 상태·위치 지도 링크·트립 URL이 설명에 담긴다", () => {
    const event = formatActivityAsEvent(
      baseActivity({ reservationStatus: "REQUIRED", location: "Torre de Belém" }),
      TRIP,
      URL_OPTS
    );
    expect(event.description).toContain("사전 예약 필수");
    expect(event.description).toContain("📍 Torre de Belém");
    expect(event.description).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(event.description).toContain("여행 상세: https://trip.idean.me/trips/5");
  });

  it("timeZone은 IANA 그대로 Google event에 전달", () => {
    const event = formatActivityAsEvent(
      baseActivity({ startTimezone: "Asia/Seoul", endTimezone: "Asia/Seoul" }),
      TRIP,
      URL_OPTS
    );
    expect(event.start.timeZone).toBe("Asia/Seoul");
    expect(event.end.timeZone).toBe("Asia/Seoul");
  });

  it("timeZone이 없으면 UTC로 폴백", () => {
    const event = formatActivityAsEvent(
      baseActivity({ startTimezone: null, endTimezone: null }),
      TRIP,
      URL_OPTS
    );
    expect(event.start.timeZone).toBe("UTC");
    expect(event.end.timeZone).toBe("UTC");
  });

  it("endTime이 없으면 startTime + 1시간으로 보정 (Google API zero-duration 400 회피, #481)", () => {
    const event = formatActivityAsEvent(baseActivity({ endTime: null }), TRIP, URL_OPTS);
    const startMs = new Date(event.start.dateTime).getTime();
    const endMs = new Date(event.end.dateTime).getTime();
    expect(endMs - startMs).toBe(60 * 60 * 1000);
  });

  it("endTime이 startTime보다 이르면 +1시간으로 보정", () => {
    const event = formatActivityAsEvent(
      baseActivity({
        startTime: new Date("2026-06-07T11:00:00.000Z"),
        endTime: new Date("2026-06-07T10:00:00.000Z"),
      }),
      TRIP,
      URL_OPTS
    );
    const startMs = new Date(event.start.dateTime).getTime();
    const endMs = new Date(event.end.dateTime).getTime();
    expect(endMs - startMs).toBe(60 * 60 * 1000);
  });

  it("location이 null이면 event.location 키 자체를 제외 (Google API null reject 회피, #481)", () => {
    const event = formatActivityAsEvent(baseActivity({ location: null }), TRIP, URL_OPTS);
    expect("location" in event).toBe(false);
  });

  it("location이 있으면 그대로 전달", () => {
    const event = formatActivityAsEvent(baseActivity({ location: "Torre de Belém" }), TRIP, URL_OPTS);
    expect(event.location).toBe("Torre de Belém");
  });

  it("memo가 있으면 설명란에 포함", () => {
    const event = formatActivityAsEvent(
      baseActivity({ memo: "오전 9시 출발 전에 호텔 체크아웃" }),
      TRIP,
      URL_OPTS
    );
    expect(event.description).toContain("오전 9시 출발 전에 호텔 체크아웃");
  });
});

describe("dedicatedCalendarName", () => {
  it("여행 이름 + 접미어", () => {
    expect(dedicatedCalendarName("포르투갈 신혼여행")).toBe("포르투갈 신혼여행 (trip-planner)");
  });
});
