/**
 * IANA timezone → 사용자 친화 약어.
 *
 * Node ICU는 상당수 주요 IANA 존에 대해 `Asia/Seoul` → `GMT+9`처럼 오프셋만
 * 돌려준다. 본 모듈은 여행에서 자주 쓰이는 존을 화이트리스트로 가지고 있다가
 * 실제 오프셋 기반으로 DST-aware 약어를 돌려준다.
 *
 * 폴백 순서: 화이트리스트 → Intl short(GMT 제외) → IANA 마지막 세그먼트.
 */

interface TzEntry {
  /** 표준시 오프셋 (분) */
  std: number;
  /** 표준시 약어 */
  stdAbbr: string;
  /** DST 오프셋 (분). DST 없는 존은 undefined */
  dst?: number;
  /** DST 약어 */
  dstAbbr?: string;
}

const TABLE: Record<string, TzEntry> = {
  "Asia/Seoul": { std: 540, stdAbbr: "KST" },
  "Asia/Tokyo": { std: 540, stdAbbr: "JST" },
  "Asia/Hong_Kong": { std: 480, stdAbbr: "HKT" },
  "Asia/Singapore": { std: 480, stdAbbr: "SGT" },
  "Asia/Bangkok": { std: 420, stdAbbr: "ICT" },
  "Asia/Jakarta": { std: 420, stdAbbr: "WIB" },
  "Asia/Kolkata": { std: 330, stdAbbr: "IST" },
  "Asia/Dubai": { std: 240, stdAbbr: "GST" },
  "Europe/London": { std: 0, stdAbbr: "GMT", dst: 60, dstAbbr: "BST" },
  "Europe/Lisbon": { std: 0, stdAbbr: "WET", dst: 60, dstAbbr: "WEST" },
  "Europe/Madrid": { std: 60, stdAbbr: "CET", dst: 120, dstAbbr: "CEST" },
  "Europe/Paris": { std: 60, stdAbbr: "CET", dst: 120, dstAbbr: "CEST" },
  "Europe/Berlin": { std: 60, stdAbbr: "CET", dst: 120, dstAbbr: "CEST" },
  "Europe/Rome": { std: 60, stdAbbr: "CET", dst: 120, dstAbbr: "CEST" },
  "Europe/Amsterdam": { std: 60, stdAbbr: "CET", dst: 120, dstAbbr: "CEST" },
  "Europe/Zurich": { std: 60, stdAbbr: "CET", dst: 120, dstAbbr: "CEST" },
  "Europe/Vienna": { std: 60, stdAbbr: "CET", dst: 120, dstAbbr: "CEST" },
  "Europe/Prague": { std: 60, stdAbbr: "CET", dst: 120, dstAbbr: "CEST" },
  "Europe/Athens": { std: 120, stdAbbr: "EET", dst: 180, dstAbbr: "EEST" },
  "Europe/Istanbul": { std: 180, stdAbbr: "TRT" },
  "Europe/Moscow": { std: 180, stdAbbr: "MSK" },
  "America/New_York": { std: -300, stdAbbr: "EST", dst: -240, dstAbbr: "EDT" },
  "America/Toronto": { std: -300, stdAbbr: "EST", dst: -240, dstAbbr: "EDT" },
  "America/Chicago": { std: -360, stdAbbr: "CST", dst: -300, dstAbbr: "CDT" },
  "America/Denver": { std: -420, stdAbbr: "MST", dst: -360, dstAbbr: "MDT" },
  "America/Los_Angeles": { std: -480, stdAbbr: "PST", dst: -420, dstAbbr: "PDT" },
  "America/Anchorage": { std: -540, stdAbbr: "AKST", dst: -480, dstAbbr: "AKDT" },
  "America/Honolulu": { std: -600, stdAbbr: "HST" },
  "America/Sao_Paulo": { std: -180, stdAbbr: "BRT" },
  "Australia/Sydney": { std: 600, stdAbbr: "AEST", dst: 660, dstAbbr: "AEDT" },
  "Australia/Melbourne": { std: 600, stdAbbr: "AEST", dst: 660, dstAbbr: "AEDT" },
  "Australia/Perth": { std: 480, stdAbbr: "AWST" },
  "Pacific/Auckland": { std: 720, stdAbbr: "NZST", dst: 780, dstAbbr: "NZDT" },
  UTC: { std: 0, stdAbbr: "UTC" },
};

function tzOffsetMinutes(utcMs: number, timezone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return Math.round((asUtc - utcMs) / 60000);
}

export function tzLabel(iana: string, at: Date = new Date()): string {
  const entry = TABLE[iana];
  if (entry) {
    try {
      const offset = tzOffsetMinutes(at.getTime(), iana);
      if (entry.dst !== undefined && offset === entry.dst) return entry.dstAbbr!;
      if (offset === entry.std) return entry.stdAbbr;
    } catch {
      /* c8 ignore next -- defensive: Intl 구현체 예외 시 다음 폴백으로 */
    }
  }
  try {
    const parts = new Intl.DateTimeFormat("en", { timeZone: iana, timeZoneName: "short" }).formatToParts(at);
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    if (name && !name.startsWith("GMT") && !name.startsWith("UTC")) return name;
  } catch {
    /* c8 ignore next -- defensive: 잘못된 IANA면 최종 폴백으로 */
  }
  const last = iana.split("/").pop() ?? iana;
  return last.replace(/_/g, " ");
}
