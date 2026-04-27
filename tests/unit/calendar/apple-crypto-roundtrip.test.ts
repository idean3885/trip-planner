/**
 * spec 025 (#417) — apple-crypto round-trip 검증.
 *
 * AES-256-GCM은 위·변조 시 decrypt가 throw해야 한다(authenticated encryption).
 * 잘못된 키·iv·tampered ciphertext 전 케이스 검증.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";

import {
  encryptPassword,
  decryptPassword,
  __resetKeyCacheForTests,
} from "@/lib/calendar/provider/apple-crypto";

const KEY1 = randomBytes(32).toString("base64");
const KEY2 = randomBytes(32).toString("base64");

describe("apple-crypto — round-trip", () => {
  beforeEach(() => {
    process.env.APPLE_PASSWORD_ENCRYPTION_KEY = KEY1;
    __resetKeyCacheForTests();
  });

  it("encrypt → decrypt가 원본 평문과 일치", () => {
    const plain = "abcd-efgh-ijkl-mnop"; // Apple 16자리 형식
    const { ciphertext, iv } = encryptPassword(plain);
    expect(decryptPassword(ciphertext, iv)).toBe(plain);
  });

  it("같은 평문이라도 매번 다른 ciphertext (per-row IV)", () => {
    const plain = "abcd-efgh-ijkl-mnop";
    const r1 = encryptPassword(plain);
    const r2 = encryptPassword(plain);
    expect(r1.ciphertext).not.toBe(r2.ciphertext);
    expect(r1.iv).not.toBe(r2.iv);
  });

  it("UTF-8 한글·이모지도 round-trip 통과", () => {
    const plain = "안녕하세요-🍎-iCloud-1234";
    const { ciphertext, iv } = encryptPassword(plain);
    expect(decryptPassword(ciphertext, iv)).toBe(plain);
  });
});

describe("apple-crypto — 인증 실패", () => {
  beforeEach(() => {
    process.env.APPLE_PASSWORD_ENCRYPTION_KEY = KEY1;
    __resetKeyCacheForTests();
  });

  it("다른 키로 decrypt 시 throw", () => {
    const { ciphertext, iv } = encryptPassword("secret-12345");
    process.env.APPLE_PASSWORD_ENCRYPTION_KEY = KEY2;
    __resetKeyCacheForTests();
    expect(() => decryptPassword(ciphertext, iv)).toThrow();
  });

  it("ciphertext tamper 시 throw (auth tag 검증)", () => {
    const { ciphertext, iv } = encryptPassword("secret-12345");
    // base64 첫 글자 변조
    const tampered =
      (ciphertext[0] === "A" ? "B" : "A") + ciphertext.slice(1);
    expect(() => decryptPassword(tampered, iv)).toThrow();
  });

  it("iv tamper 시 throw", () => {
    const { ciphertext, iv } = encryptPassword("secret-12345");
    const tamperedIv = (iv[0] === "A" ? "B" : "A") + iv.slice(1);
    expect(() => decryptPassword(ciphertext, tamperedIv)).toThrow();
  });
});

describe("apple-crypto — env 키 검증", () => {
  it("32바이트가 아닌 키는 throw", () => {
    process.env.APPLE_PASSWORD_ENCRYPTION_KEY = Buffer.from("short").toString(
      "base64",
    );
    __resetKeyCacheForTests();
    expect(() => encryptPassword("x")).toThrow(/32 bytes/);
  });

  it("env 키 부재 시 throw", () => {
    delete process.env.APPLE_PASSWORD_ENCRYPTION_KEY;
    __resetKeyCacheForTests();
    expect(() => encryptPassword("x")).toThrow(/env not set/);
  });
});
