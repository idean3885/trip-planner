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

/** 로그인 → 토큰 저장. 의존성 주입으로 테스트 가능. */
export async function main({
  runListener = runOAuthListener,
  storeToken = storeTokenMac,
} = {}) {
  const { token } = await runListener();
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
