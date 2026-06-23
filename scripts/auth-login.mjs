#!/usr/bin/env node
/**
 * spec 059 — 범용 OAuth 로그인 커맨드.
 *
 * 임의 API 소비자(curl 헬퍼·운영 스크립트)가 단일 실행으로 브라우저 Google
 * 로그인을 거쳐 토큰을 발급받아 OS 키체인에 저장한다. 이후 API 호출이 수기 PAT
 * 발급·복사 없이 동작한다. 기존 `bootstrap/oauth-listener.mjs`(브라우저 열기·
 * state 검증·타임아웃·로컬 콜백)를 그대로 재사용한다.
 *
 * 토큰 저장 위치: 키체인 service=`trip-planner`, account=`api-pat`
 *   (install.sh·MCP `web_client.py`와 동일 — 모든 소비자가 한 토큰을 공유).
 *
 * 종료 코드: 0 성공 / 2 timeout / 3 state_mismatch / 1 기타 / 5 키체인 저장 실패
 */
import { spawn } from "node:child_process";

import { runOAuthListener } from "./bootstrap/oauth-listener.mjs";

export const KEYCHAIN_SERVICE = "trip-planner";
export const KEYCHAIN_ACCOUNT = "api-pat";

/** 발급 토큰을 macOS 키체인에 저장(-U: 기존 항목 갱신). */
export function storeTokenMac(
  token,
  { service = KEYCHAIN_SERVICE, account = KEYCHAIN_ACCOUNT } = {},
) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "darwin") {
      reject({
        code: 5,
        message: `자동 저장은 macOS 키체인만 지원합니다. 토큰을 직접 저장하세요 (service=${service}, account=${account}).`,
      });
      return;
    }
    const p = spawn(
      "/usr/bin/security",
      ["add-generic-password", "-s", service, "-a", account, "-w", token, "-U"],
      { stdio: "ignore" },
    );
    p.on("error", (e) => reject({ code: 5, message: e.message }));
    p.on("close", (c) =>
      c === 0 ? resolve() : reject({ code: 5, message: `security exit ${c}` }),
    );
  });
}

export const DEVICE_BASE_URL =
  process.env.TRIP_BOOTSTRAP_BASE_URL ?? "https://trip.idean.me";

/**
 * spec 060 (#793) — Device Authorization Grant 흐름.
 * loopback 없이: 개시 → 사용자에게 승인 주소 안내 → 폴링으로 토큰 자동 수신.
 * 종료 코드 규약(상위 catch와 동일): 2 timeout / 4 거부 / 1 기타.
 */
export async function runDeviceFlow({
  baseUrl = DEVICE_BASE_URL,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
} = {}) {
  const startRes = await fetchImpl(`${baseUrl}/api/auth/device/start`, {
    method: "POST",
  });
  if (!startRes.ok) {
    throw { code: 1, message: `device start 실패 (${startRes.status})` };
  }
  const d = await startRes.json();
  let interval = Number(d.interval ?? 5);
  const expiresIn = Number(d.expires_in ?? 600);
  process.stderr.write(
    `[auth] 기기(휴대폰 등)에서 다음 주소를 열어 본인 계정으로 승인하세요 (코드 ${d.user_code}):\n  ${d.verification_uri_complete}\n`,
  );
  const deadline = Date.now() + expiresIn * 1000;
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const poll = await fetchImpl(`${baseUrl}/api/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code: d.device_code }),
    });
    if (poll.status === 200) {
      const t = await poll.json();
      return { token: t.access_token };
    }
    let err = "";
    try {
      err = (await poll.json()).error ?? "";
    } catch {
      err = "";
    }
    if (err === "authorization_pending") continue;
    if (err === "slow_down") {
      interval += 5;
      continue;
    }
    if (err === "access_denied") throw { code: 4, message: "사용자가 거부했습니다" };
    if (err === "expired_token") throw { code: 2, message: "요청이 만료되었습니다" };
    throw { code: 1, message: `예기치 못한 응답: ${err || poll.status}` };
  }
  throw { code: 2, message: "timeout" };
}

/** 로그인 → 토큰 저장. 의존성 주입으로 테스트 가능. */
export async function main({
  runListener = runOAuthListener,
  storeToken = storeTokenMac,
  deviceFlow = runDeviceFlow,
} = {}) {
  // spec 060 — 헤드리스(브라우저-리스너 분리) 환경은 device 흐름. 기본은 loopback.
  const useDevice =
    !!process.env.TRIP_DEVICE_AUTH || process.argv.includes("--device");
  const { token } = useDevice ? await deviceFlow() : await runListener();
  await storeToken(token);
  process.stderr.write(
    "[auth] 로그인 완료. 토큰을 키체인에 저장했습니다. 이제 API 를 바로 호출할 수 있습니다.\n",
  );
  // 일반 소비자는 토큰 만료 시 401 을 받으면 이 커맨드를 다시 실행한다(재로그인).
  process.stderr.write("[auth] 토큰 만료 시 이 커맨드를 다시 실행하세요.\n");
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("auth-login.mjs");
if (isMain) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      const code = err?.code ?? 1;
      process.stderr.write(`[auth] 실패: ${err?.message ?? err}\n`);
      process.exit(code);
    });
}
