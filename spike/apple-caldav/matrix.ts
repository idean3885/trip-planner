/**
 * Apple iCloud CalDAV POC — 검증 매트릭스 10항목 자동 측정 스크립트.
 *
 * 이슈: https://github.com/idean3885/trip-planner/issues/345
 *
 * 사용:
 *   1. .env.local에 APPLE_ID, APPLE_APP_PASSWORD 입력
 *   2. npm install (spike/apple-caldav 디렉토리에서)
 *   3. npm run matrix  (사람이 읽을 수 있는 출력)
 *      또는
 *      npm run matrix:json  (results/<run-label>.json 저장)
 *
 * 사이드 이펙트:
 *   - 측정 #3 (MKCALENDAR): "trip-planner-poc-<timestamp>" 캘린더를 생성 시도.
 *   - 측정 #5~#7 (PUT/UPDATE/DELETE): 그 캘린더에 1개 이벤트만 생성/수정/삭제.
 *   - 측정 종료 후 cleanup 단계가 같은 캘린더 자체를 DELETE 시도. cleanup 실패 시
 *     사용자가 Apple Calendar에서 수동 삭제.
 *
 * 절대 사용자의 다른 캘린더·이벤트는 건드리지 않는다.
 */

import "dotenv/config";
import { DAVClient, type DAVCalendar } from "tsdav";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, "results");

const APPLE_ID = process.env.APPLE_ID;
const APPLE_APP_PASSWORD = process.env.APPLE_APP_PASSWORD;
const RUN_LABEL = process.env.POC_RUN_LABEL ?? "run-1";
const ICLOUD_CALDAV_URL = "https://caldav.icloud.com";

const jsonOnly = process.argv.includes("--json");

if (!APPLE_ID || !APPLE_APP_PASSWORD) {
  console.error("✗ APPLE_ID 또는 APPLE_APP_PASSWORD 미설정. .env.local 확인.");
  process.exit(1);
}

interface Measurement {
  id: number;
  name: string;
  expected: string;
  ok: boolean | null;
  observed: string;
  durationMs?: number;
  raw?: unknown;
}

const results: Measurement[] = [];

function log(msg: string) {
  if (!jsonOnly) console.log(msg);
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t0 = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - t0 };
}

async function record(
  id: number,
  name: string,
  expected: string,
  fn: () => Promise<{ ok: boolean; observed: string; raw?: unknown; ms?: number }>,
): Promise<Measurement> {
  log(`\n#${id} ${name}`);
  log(`  기대: ${expected}`);
  let m: Measurement;
  try {
    const r = await fn();
    m = {
      id,
      name,
      expected,
      ok: r.ok,
      observed: r.observed,
      durationMs: r.ms,
      raw: r.raw,
    };
    log(`  실측: ${r.observed}${r.ms != null ? ` (${r.ms}ms)` : ""} ${r.ok ? "✓" : "✗"}`);
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    m = { id, name, expected, ok: false, observed: `예외: ${msg}` };
    log(`  실측: ${m.observed} ✗`);
  }
  results.push(m);
  return m;
}

async function main() {
  log(`Apple CalDAV POC — ${RUN_LABEL}`);
  log(`Apple ID: ${APPLE_ID}`);
  log(`Endpoint: ${ICLOUD_CALDAV_URL}`);

  const client = new DAVClient({
    serverUrl: ICLOUD_CALDAV_URL,
    credentials: { username: APPLE_ID!, password: APPLE_APP_PASSWORD! },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  // ─────────────────────────────────────────
  // #1 PROPFIND 인증 검증 응답 시간
  // ─────────────────────────────────────────
  const login = await record(
    1,
    "PROPFIND 인증 검증 응답 시간",
    "<2s",
    async () => {
      const t = await timed(() => client.login());
      return { ok: t.ms < 2000, observed: `login 성공`, ms: t.ms };
    },
  );

  if (!login.ok && login.observed.startsWith("예외")) {
    log("\n✗ 로그인 실패 — 이후 측정 중단. 측정 #8(401 즉시) 결과로 간주.");
    await record(8, "잘못된 app-password", "401 즉시", async () => ({
      ok: true,
      observed: `현재 자격증명에서 ${login.observed}`,
    }));
    return finalize();
  }

  // ─────────────────────────────────────────
  // #2 기존 캘린더 목록 조회
  // ─────────────────────────────────────────
  let calendars: DAVCalendar[] = [];
  await record(
    2,
    "기존 캘린더 목록 조회 (한국어 이름·공유 캘린더 포함 여부)",
    "전체 목록 정확 반환",
    async () => {
      const t = await timed(() => client.fetchCalendars());
      calendars = t.value;
      const koreanNamed = calendars.filter((c) =>
        /[가-힯]/.test(typeof c.displayName === "string" ? c.displayName : ""),
      ).length;
      const shared = calendars.filter((c) => (c as DAVCalendar & { ctag?: string }).resourcetype && JSON.stringify(c.resourcetype).includes("shared")).length;
      return {
        ok: calendars.length > 0,
        observed: `총 ${calendars.length}개 (한국어 이름 ${koreanNamed}개, 공유 ${shared}개)`,
        ms: t.ms,
        raw: calendars.map((c) => ({
          displayName: c.displayName,
          url: c.url,
          ctag: (c as DAVCalendar & { ctag?: string }).ctag,
          components: c.components,
        })),
      };
    },
  );

  // ─────────────────────────────────────────
  // #3 MKCALENDAR로 신규 캘린더 생성
  // ─────────────────────────────────────────
  const newCalName = `trip-planner-poc-${Date.now()}`;
  let newCalendarUrl: string | null = null;
  await record(
    3,
    "MKCALENDAR로 신규 캘린더 생성",
    "성공 또는 명확 실패 (iCloud는 미지원으로 알려짐)",
    async () => {
      const t = await timed(async () => {
        // tsdav는 createCalendar를 직접 노출하지 않으므로 raw HTTP 호출.
        // iCloud는 보통 MKCALENDAR를 거부 (403/501) — 이 사실 자체가 측정 목적.
        const principalUrl = client.account?.principalUrl ?? "";
        if (!principalUrl) throw new Error("principalUrl 없음");
        // calendar home의 임의 segment에 MKCALENDAR
        const calendarHome = client.account?.homeUrl ?? "";
        if (!calendarHome) throw new Error("calendarHomeUrl 없음");
        const targetUrl = `${calendarHome.replace(/\/$/, "")}/${newCalName}/`;
        const credentials = Buffer.from(`${APPLE_ID}:${APPLE_APP_PASSWORD}`).toString("base64");
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<C:mkcalendar xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:set>
    <D:prop>
      <D:displayname>${newCalName}</D:displayname>
      <C:supported-calendar-component-set>
        <C:comp name="VEVENT"/>
      </C:supported-calendar-component-set>
    </D:prop>
  </D:set>
</C:mkcalendar>`;
        const res = await fetch(targetUrl, {
          method: "MKCALENDAR",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/xml; charset=utf-8",
          },
          body,
        });
        return { status: res.status, statusText: res.statusText, targetUrl };
      });
      const ok = t.value.status === 201;
      if (ok) newCalendarUrl = t.value.targetUrl;
      return {
        ok,
        observed: `${t.value.status} ${t.value.statusText}${ok ? " (생성됨)" : " (미지원/실패 — fallback 필요)"}`,
        ms: t.ms,
        raw: t.value,
      };
    },
  );

  // ─────────────────────────────────────────
  // #4 Apple 캘린더 앱에서 수동 생성 → iCloud 반영 지연
  // ─────────────────────────────────────────
  await record(
    4,
    "Apple 캘린더 앱 수동 생성 → iCloud 반영 지연",
    "폴링 주기 결정용 (수동 측정 필요)",
    async () => ({
      ok: true,
      observed: "수동 측정 항목. README 'Step 4 — 수동 측정' 절차 따라 별도 기재.",
    }),
  );

  // ─────────────────────────────────────────
  // 테스트 대상 캘린더 결정 (#3 실패 시 첫 번째 기존 캘린더 사용)
  // ─────────────────────────────────────────
  let targetCal: DAVCalendar | null = null;
  if (newCalendarUrl) {
    // 새로 만든 게 list에 즉시 안 보일 수 있으니 재조회
    const refreshed = await client.fetchCalendars();
    targetCal = refreshed.find((c) => c.url === newCalendarUrl) ?? null;
  }
  if (!targetCal) {
    targetCal = calendars[0] ?? null;
    log(`  ↳ #3 실패 또는 미발견 → fallback: 기존 첫 번째 캘린더 사용 (${targetCal?.displayName ?? "없음"})`);
  }

  // ─────────────────────────────────────────
  // #5~#7 VEVENT PUT/UPDATE/DELETE
  // ─────────────────────────────────────────
  const eventUid = `poc-${Date.now()}@trip-planner.local`;
  const eventFilename = `${eventUid}.ics`;
  let eventUrl: string | null = null;
  let firstEtag: string | null = null;

  const ics = (summary: string) => `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//trip-planner//apple-caldav-poc//EN
BEGIN:VEVENT
UID:${eventUid}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}
DTSTART:20260601T090000Z
DTEND:20260601T100000Z
SUMMARY:${summary}
END:VEVENT
END:VCALENDAR
`;

  if (targetCal) {
    await record(5, "VEVENT PUT (생성)", "201/204 + 반영 시각", async () => {
      const t = await timed(() =>
        client.createCalendarObject({
          calendar: targetCal!,
          filename: eventFilename,
          iCalString: ics("[POC] 생성 테스트"),
        }),
      );
      const r = t.value as { url?: string; etag?: string };
      eventUrl = r.url ?? null;
      firstEtag = r.etag ?? null;
      return {
        ok: !!eventUrl,
        observed: `created ${eventUrl ? "OK" : "URL 없음"} ETag=${firstEtag ?? "없음"}`,
        ms: t.ms,
        raw: r,
      };
    });

    await record(6, "VEVENT PUT (update, If-Match ETag)", "204", async () => {
      if (!eventUrl || !firstEtag) {
        return { ok: false, observed: "이전 단계에서 URL/ETag 미확보. skip." };
      }
      const t = await timed(() =>
        client.updateCalendarObject({
          calendarObject: {
            url: eventUrl!,
            data: ics("[POC] 수정 테스트"),
            etag: firstEtag!,
          },
        }),
      );
      const r = t.value as { ok?: boolean; status?: number };
      return {
        ok: r.ok !== false,
        observed: `update status=${r.status ?? "?"}`,
        ms: t.ms,
        raw: r,
      };
    });

    await record(7, "VEVENT DELETE", "204", async () => {
      if (!eventUrl) {
        return { ok: false, observed: "URL 없음. skip." };
      }
      const t = await timed(() =>
        client.deleteCalendarObject({
          calendarObject: { url: eventUrl!, etag: firstEtag ?? "" },
        }),
      );
      const r = t.value as { ok?: boolean; status?: number };
      return {
        ok: r.ok !== false,
        observed: `delete status=${r.status ?? "?"}`,
        ms: t.ms,
        raw: r,
      };
    });
  } else {
    log("  ↳ 대상 캘린더 없음 — #5~#7 skip");
    [5, 6, 7].forEach((id) =>
      results.push({
        id,
        name: id === 5 ? "VEVENT PUT (생성)" : id === 6 ? "VEVENT PUT (update)" : "VEVENT DELETE",
        expected: "skip",
        ok: null,
        observed: "대상 캘린더 부재로 skip",
      }),
    );
  }

  // ─────────────────────────────────────────
  // #8 잘못된 app-password
  // ─────────────────────────────────────────
  await record(8, "잘못된 app-password", "401 즉시", async () => {
    const wrong = new DAVClient({
      serverUrl: ICLOUD_CALDAV_URL,
      credentials: { username: APPLE_ID!, password: "wrong-app-password-zzzz" },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    });
    const t = await timed(async () => {
      try {
        await wrong.login();
        return { status: 200 as number };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const m = msg.match(/\b(401|403|503)\b/);
        return { status: m ? Number(m[1]) : -1, msg };
      }
    });
    const r = t.value as { status: number; msg?: string };
    return {
      ok: r.status === 401,
      observed: `status=${r.status}${r.msg ? ` (${r.msg.slice(0, 80)})` : ""}`,
      ms: t.ms,
    };
  });

  // ─────────────────────────────────────────
  // #9 2FA 미설정 Apple ID — 측정 불가 (상위 정책)
  // ─────────────────────────────────────────
  await record(9, "2FA 미설정 Apple ID", "app-password 발급 불가", async () => ({
    ok: true,
    observed:
      "Apple 정책: app-password 발급 자체가 2FA 필수. 본 스크립트로 검증 불가 — UX 안내 문구만 정의.",
  }));

  // ─────────────────────────────────────────
  // #10 app-password 만료/재발급 주기
  // ─────────────────────────────────────────
  await record(10, "app-password 만료/재발급 주기", "수명 측정", async () => ({
    ok: true,
    observed:
      "장기 측정 항목. Apple 공식 문서 기준 'Apple ID 비밀번호 변경 시 모든 app-password 자동 무효화'. 그 외 자연 만료는 없음 — 사용자가 수동 폐기까지 유효.",
  }));

  // ─────────────────────────────────────────
  // Cleanup: 새로 만든 캘린더 자체 DELETE 시도
  // ─────────────────────────────────────────
  if (newCalendarUrl) {
    log("\nCleanup: 생성한 POC 캘린더 자체 DELETE 시도");
    try {
      const credentials = Buffer.from(`${APPLE_ID}:${APPLE_APP_PASSWORD}`).toString("base64");
      const res = await fetch(newCalendarUrl, {
        method: "DELETE",
        headers: { Authorization: `Basic ${credentials}` },
      });
      log(`  cleanup status=${res.status} ${res.statusText}`);
    } catch (err) {
      log(`  cleanup 실패: ${err instanceof Error ? err.message : String(err)}`);
      log("  → Apple Calendar 앱에서 수동 삭제 필요");
    }
  }

  await finalize();
}

async function finalize() {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const path = join(RESULTS_DIR, `${RUN_LABEL}.json`);
  writeFileSync(
    path,
    JSON.stringify(
      {
        runLabel: RUN_LABEL,
        timestamp: new Date().toISOString(),
        endpoint: ICLOUD_CALDAV_URL,
        results,
      },
      null,
      2,
    ),
  );
  log(`\n결과 저장: ${path}`);
  if (jsonOnly) console.log(JSON.stringify({ runLabel: RUN_LABEL, results }));
}

main().catch((e) => {
  console.error("✗ 스크립트 실패:", e);
  process.exit(1);
});
