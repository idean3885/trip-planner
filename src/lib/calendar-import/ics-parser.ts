/**
 * spec 027 — 간이 ICS(VEVENT) 파서.
 *
 * Apple CalDAV가 반환하는 ICS 문자열에서 외부 import에 필요한 필드만 추출한다.
 * RFC 5545 전체 호환은 의도하지 않으며, 의존성 0으로 유지하기 위해 직접 작성.
 * - line unfolding (CRLF + " " or TAB 접두로 이어지는 다음 줄을 합침)
 * - VEVENT 블록 1건만 추출 (반복 일정 인스턴스 전개는 tsdav timeRange로 처리)
 * - DTSTART/DTEND/SUMMARY/LOCATION/DESCRIPTION/UID/TZID/VALUE=DATE 만 처리
 *
 * 더 복잡한 ICS(반복 규칙, 첨부 등)는 본 마일스톤 스코프 외 — Apple도 timeRange로
 * 인스턴스 전개된 ICS만 받는다.
 */

import type { ExternalEvent } from "./types";

interface VEventFields {
  uid?: string;
  summary?: string;
  description?: string;
  location?: string;
  dtstart?: { value: string; tzid?: string; isDate?: boolean };
  dtend?: { value: string; tzid?: string; isDate?: boolean };
}

function unfold(raw: string): string[] {
  // RFC 5545 §3.1: CRLF + (SPACE or TAB) → continuation. \n도 허용.
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** "YYYYMMDDTHHmmssZ" / "YYYYMMDDTHHmmss" / "YYYYMMDD" → Date. */
function parseIcsTimestamp(
  value: string,
  tzid: string | undefined,
  isDate: boolean,
): {
  date: Date;
  timezone: string | null;
  isAllDay: boolean;
} | null {
  if (isDate || /^\d{8}$/.test(value)) {
    const m = value.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!m) return null;
    return {
      date: new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`),
      timezone: null,
      isAllDay: true,
    };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (z === "Z") {
    return {
      date: new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`),
      timezone: tzid ?? "UTC",
      isAllDay: false,
    };
  }
  // floating-time 또는 TZID: Date 객체는 UTC 기준 ISO로 일단 저장하고 timezone 별도 보관
  // (저장 정확도는 사용자가 승격 시 timezone을 정확히 지정해야 함)
  return {
    date: new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`),
    timezone: tzid ?? null,
    isAllDay: false,
  };
}

function parseVeventBlock(lines: string[]): VEventFields {
  const fields: VEventFields = {};
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const left = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [name, ...paramParts] = left.split(";");
    const params = new Map<string, string>();
    for (const p of paramParts) {
      const eq = p.indexOf("=");
      if (eq > 0) params.set(p.slice(0, eq).toUpperCase(), p.slice(eq + 1));
    }
    const upper = name.toUpperCase();
    switch (upper) {
      case "UID":
        fields.uid = value.trim();
        break;
      case "SUMMARY":
        fields.summary = unescapeText(value);
        break;
      case "DESCRIPTION":
        fields.description = unescapeText(value);
        break;
      case "LOCATION":
        fields.location = unescapeText(value);
        break;
      case "DTSTART":
        fields.dtstart = {
          value,
          tzid: params.get("TZID"),
          isDate: params.get("VALUE")?.toUpperCase() === "DATE",
        };
        break;
      case "DTEND":
        fields.dtend = {
          value,
          tzid: params.get("TZID"),
          isDate: params.get("VALUE")?.toUpperCase() === "DATE",
        };
        break;
    }
  }
  return fields;
}

/** ICS 문자열 1건에서 ExternalEvent 추출. 실패 시 null. */
export function parseVevent(
  ics: string,
  fallbackExternalEventId?: string,
): ExternalEvent | null {
  const lines = unfold(ics);
  let inVevent = false;
  const veventLines: string[] = [];
  for (const line of lines) {
    if (line.toUpperCase().startsWith("BEGIN:VEVENT")) {
      inVevent = true;
      continue;
    }
    if (line.toUpperCase().startsWith("END:VEVENT")) {
      inVevent = false;
      break;
    }
    if (inVevent) veventLines.push(line);
  }
  if (veventLines.length === 0) return null;
  const f = parseVeventBlock(veventLines);
  if (!f.dtstart || !f.dtend) return null;

  const start = parseIcsTimestamp(
    f.dtstart.value,
    f.dtstart.tzid,
    f.dtstart.isDate ?? false,
  );
  const end = parseIcsTimestamp(
    f.dtend.value,
    f.dtend.tzid,
    f.dtend.isDate ?? false,
  );
  if (!start || !end) return null;

  const externalEventId = f.uid ?? fallbackExternalEventId;
  if (!externalEventId) return null;

  return {
    externalEventId,
    title: f.summary ?? "(제목 없음)",
    startTime: start.date,
    endTime: end.date,
    isAllDay: start.isAllDay,
    locationText: f.location ?? null,
    description: f.description ?? null,
    startTimezone: start.timezone,
    endTimezone: end.timezone,
  };
}
