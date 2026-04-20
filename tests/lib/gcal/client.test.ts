import { describe, it, expect } from "vitest";
import { classifyError, getStatus, isPreconditionFailed } from "@/lib/gcal/errors";

describe("getStatus", () => {
  it.each([
    [{ code: 401 }, 401],
    [{ status: 403 }, 403],
    [{ response: { status: 429 } }, 429],
    [{}, 0],
  ])("%o → %i", (err, expected) => {
    expect(getStatus(err)).toBe(expected);
  });
});

describe("classifyError", () => {
  it("401/403 → forbidden + REVOKED", () => {
    expect(classifyError({ code: 401 })).toEqual({ reason: "forbidden", lastError: "REVOKED" });
    expect(classifyError({ code: 403 })).toEqual({ reason: "forbidden", lastError: "REVOKED" });
  });

  it("404 → not_found, lastError null (조용한 정리)", () => {
    expect(classifyError({ code: 404 })).toEqual({ reason: "not_found", lastError: null });
  });

  it("429 → rate_limited + RATE_LIMITED", () => {
    expect(classifyError({ code: 429 })).toEqual({ reason: "rate_limited", lastError: "RATE_LIMITED" });
  });

  it("5xx → network + NETWORK", () => {
    expect(classifyError({ code: 500 })).toEqual({ reason: "network", lastError: "NETWORK" });
    expect(classifyError({ code: 503 })).toEqual({ reason: "network", lastError: "NETWORK" });
  });

  it("네트워크 오류(status=0) → network", () => {
    expect(classifyError(new Error("connection refused"))).toEqual({ reason: "network", lastError: "NETWORK" });
  });

  it("분류 불가 → unknown", () => {
    expect(classifyError({ code: 418 })).toEqual({ reason: "unknown", lastError: "UNKNOWN" });
  });
});

describe("isPreconditionFailed", () => {
  it("412는 참 (ETag 불일치)", () => {
    expect(isPreconditionFailed({ code: 412 })).toBe(true);
  });
  it("409도 참 (동등 취급)", () => {
    expect(isPreconditionFailed({ code: 409 })).toBe(true);
  });
  it("그 외는 거짓", () => {
    expect(isPreconditionFailed({ code: 404 })).toBe(false);
    expect(isPreconditionFailed({ code: 200 })).toBe(false);
  });
});
