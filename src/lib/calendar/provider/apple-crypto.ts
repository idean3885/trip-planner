/**
 * spec 025 (#417) — Apple app-specific password 암호화 모듈.
 *
 * AES-256-GCM (authenticated encryption). per-row IV로 암호화된 ciphertext + 16바이트
 * auth tag를 단일 base64 문자열로 저장.
 *
 * 키 관리:
 *  - 환경 변수 `APPLE_PASSWORD_ENCRYPTION_KEY` (32바이트 base64 인코딩)
 *  - dev/preview/production 별도 키. 키 회전 시 전체 재암호화 필요(1인 운영 가정).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // GCM 권장
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.APPLE_PASSWORD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APPLE_PASSWORD_ENCRYPTION_KEY env not set");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `APPLE_PASSWORD_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length})`,
    );
  }
  cachedKey = buf;
  return buf;
}

/** 평문 패스워드를 암호화. 결과의 ciphertext는 base64 문자열(ciphertext bytes || auth tag). */
export function encryptPassword(plaintext: string): {
  ciphertext: string;
  iv: string;
} {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([enc, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

/** ciphertext+iv를 받아 평문 패스워드를 복호화. 위·변조 시 throw. */
export function decryptPassword(ciphertextB64: string, ivB64: string): string {
  const key = loadKey();
  const buf = Buffer.from(ciphertextB64, "base64");
  if (buf.length < TAG_BYTES + 1) {
    throw new Error("ciphertext too short");
  }
  const tag = buf.subarray(buf.length - TAG_BYTES);
  const enc = buf.subarray(0, buf.length - TAG_BYTES);
  const iv = Buffer.from(ivB64, "base64");
  if (iv.length !== IV_BYTES) {
    throw new Error(`iv length mismatch (expected ${IV_BYTES}, got ${iv.length})`);
  }
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** 테스트 격리용 — process.env 변경 후 캐시된 키를 무효화한다. */
export function __resetKeyCacheForTests(): void {
  cachedKey = null;
}
