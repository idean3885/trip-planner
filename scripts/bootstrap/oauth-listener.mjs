#!/usr/bin/env node
/**
 * spec 030 T003 — install.sh 가 spawn 하는 localhost OAuth listener.
 *
 * 흐름:
 *  1. localhost:0 으로 바인딩(임의 포트), 32 hex char state nonce 생성
 *  2. https://trip.idean.me/bootstrap?port=<PORT>&state=<STATE> 를 default
 *     브라우저로 연다(stderr 안내 + stdout 에 URL 도 출력)
 *  3. /callback 으로 redirect 받으면 fragment 토큰을 받기 위해 1줄 HTML 을
 *     응답 — 페이지가 fragment 를 query 로 다시 GET /token 으로 POST 한다
 *  4. /token 수령 시 state 검증 + PAT 평문을 stdout(stdoutOnly)에 JSON 으로
 *     1줄 출력하고 200 응답 후 process 종료
 *
 * 종료 코드:
 *  0 — 성공
 *  2 — timeout (기본 300초)
 *  3 — state mismatch
 *  4 — 사용자 취소
 *
 * 출력 규약: stdout 은 마지막에 JSON({"token":"...","userLabel":"..."}) 1줄.
 * stderr 는 사람이 읽는 진단 로그(평문 token 노출 금지).
 *
 * 환경변수:
 *  TRIP_BOOTSTRAP_BASE_URL — 기본 https://trip.idean.me. dev 환경 변경용.
 *  TRIP_BOOTSTRAP_TIMEOUT_SEC — 기본 300.
 */

import http from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const BASE_URL = process.env.TRIP_BOOTSTRAP_BASE_URL ?? "https://trip.idean.me";
const TIMEOUT_SEC = Number.parseInt(
  process.env.TRIP_BOOTSTRAP_TIMEOUT_SEC ?? "300",
  10,
);

function generateState() {
  return randomBytes(16).toString("hex");
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  // 비차단 spawn. 실패 시 stderr 출력만 하고 listener 는 계속 대기.
  try {
    spawn(cmd, [url], { stdio: "ignore", detached: true, shell: platform === "win32" }).unref();
  } catch (e) {
    process.stderr.write(
      `[bootstrap] 자동 브라우저 실행 실패: ${e.message}. 아래 URL 을 수동으로 열어주세요.\n`,
    );
  }
}

/** /callback fragment 를 query 로 재전송하기 위한 1줄 HTML. */
function callbackHtml() {
  return `<!doctype html><meta charset="utf-8"><title>trip-planner bootstrap</title>
<script>
  var f = location.hash.substring(1);
  // fragment 를 query 로 변환해 POST 로 listener 에 전달.
  fetch('/token?' + f, { method: 'POST' })
    .then(function(r){ document.body.textContent = r.ok ? '완료. 이 창을 닫아도 됩니다.' : '오류. install 스크립트를 다시 실행해 주세요.'; })
    .catch(function(){ document.body.textContent = '오류. install 스크립트를 다시 실행해 주세요.'; });
</script>
<body>처리 중...</body>`;
}

export async function runOAuthListener({
  baseUrl = BASE_URL,
  timeoutSec = TIMEOUT_SEC,
  open = openBrowser,
} = {}) {
  const state = generateState();
  return new Promise((resolve, reject) => {
    let timer = null;
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1`);
      if (req.method === "GET" && url.pathname === "/callback") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(callbackHtml());
        return;
      }
      if (req.method === "POST" && url.pathname === "/token") {
        const token = url.searchParams.get("token") ?? "";
        const got = url.searchParams.get("state") ?? "";
        if (got !== state) {
          res.writeHead(400).end("state_mismatch");
          cleanup();
          reject({ code: 3, message: "state_mismatch" });
          return;
        }
        if (!token.startsWith("tp_")) {
          res.writeHead(400).end("invalid_token");
          cleanup();
          reject({ code: 1, message: "invalid_token" });
          return;
        }
        res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
        cleanup();
        resolve({ token });
        return;
      }
      res.writeHead(404).end();
    });

    function cleanup() {
      if (timer) clearTimeout(timer);
      server.close();
    }

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const target = `${baseUrl}/bootstrap?port=${port}&state=${state}`;
      process.stderr.write(`[bootstrap] 브라우저에서 다음 URL 로 인증을 진행해 주세요:\n  ${target}\n`);
      open(target);
      timer = setTimeout(() => {
        cleanup();
        reject({ code: 2, message: "timeout" });
      }, timeoutSec * 1000);
    });
  });
}

// CLI 진입점.
const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("oauth-listener.mjs");
if (isMain) {
  runOAuthListener()
    .then((result) => {
      // stdout 마지막 1줄 JSON. install.sh 가 tail -n 1 로 파싱.
      process.stdout.write(JSON.stringify(result) + "\n");
      process.exit(0);
    })
    .catch((err) => {
      const code = err?.code ?? 1;
      process.stderr.write(`[bootstrap] 실패: ${err?.message ?? err}\n`);
      process.exit(code);
    });
}
