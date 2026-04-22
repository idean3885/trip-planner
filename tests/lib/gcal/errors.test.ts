/**
 * spec 021 — classifyError가 Testing 모드 제약 거부를 UNREGISTERED로 분류하는지 검증.
 */
import { describe, it, expect } from "vitest";
import { classifyError, isUnregisteredError } from "@/lib/gcal/errors";

describe("classifyError — spec 021 UNREGISTERED 분류", () => {
  it("403 + 'access_denied' 텍스트 → UNREGISTERED", () => {
    const err = {
      code: 403,
      message: "access_denied: The app is not verified",
    };
    expect(classifyError(err)).toEqual({
      reason: "unregistered",
      lastError: "UNREGISTERED",
    });
  });

  it("401 + 'has not completed verification' → UNREGISTERED", () => {
    const err = {
      response: {
        status: 401,
        data: {
          error: "invalid_client",
          error_description: "App has not completed the Google verification process",
        },
      },
    };
    expect(classifyError(err)).toEqual({
      reason: "unregistered",
      lastError: "UNREGISTERED",
    });
  });

  it("403 + 일반 권한 오류 → 기존 REVOKED 유지", () => {
    const err = { code: 403, message: "Forbidden: insufficient scope" };
    expect(classifyError(err)).toEqual({
      reason: "forbidden",
      lastError: "REVOKED",
    });
  });

  it("401 + 일반 인증 오류 → 기존 REVOKED 유지", () => {
    const err = { code: 401, message: "Invalid credentials" };
    expect(classifyError(err)).toEqual({
      reason: "forbidden",
      lastError: "REVOKED",
    });
  });

  it("429 → RATE_LIMITED (회귀 방지)", () => {
    expect(classifyError({ code: 429 })).toEqual({
      reason: "rate_limited",
      lastError: "RATE_LIMITED",
    });
  });

  it("isUnregisteredError — 500은 대상 아님(권한 범주 외)", () => {
    expect(isUnregisteredError({ code: 500, message: "access_denied" })).toBe(false);
  });
});
