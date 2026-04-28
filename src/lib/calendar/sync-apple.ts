/**
 * spec 025 (#417) — Apple iCloud CalDAV 활동 sync 엔진.
 *
 * Activity 순회 → ICS VEVENT 생성 → provider.putEvent/updateEvent로 iCloud 반영.
 * 매핑은 기존 `TripCalendarEventMapping` 테이블 재사용:
 *  - googleEventId 컬럼에 Apple VEVENT URL을 저장(컬럼명은 contract 회차에서 rename)
 *  - syncedEtag 컬럼에 Apple ETag 저장
 *
 * 412 처리(외부 직접 수정):
 *  - provider.classifyError가 "precondition_failed" 반환 시 skipped 카운트 증가
 *  - 다음 sync에서 GET을 통한 ETag 갱신 시도(본 회차는 단순화 — 잔여 분기는 후속 회차)
 */

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { appleProvider } from "./provider/apple";
import { formatActivityAsIcs } from "./ics";
import type { Activity, Trip, TripCalendarEventMapping } from "@prisma/client";
import type { FailureReason } from "@/types/gcal";

/**
 * Apple put 결과 URL의 마지막 segment에서 UID를 추출.
 * iCloud는 PUT URL을 `<calendar>/<uid>.ics`로 보관하므로, update·delete 시 같은
 * UID를 ICS 안에 다시 사용하면 CalDAV 일관성이 유지된다(2026-04-28 dev 보고: UID
 * 불일치로 update가 새 객체 생성·reject되던 버그 #460 fix).
 */
function uidFromExternalEventId(url: string): string {
  const last = url.replace(/\/$/, "").split("/").pop() ?? "";
  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {
    /* keep raw */
  }
  return decoded.replace(/\.ics$/i, "") || randomUUID();
}

export interface AppleSyncContext {
  tripCalendarLinkId: number;
  calendarId: string;
  trip: Pick<Trip, "id" | "title">;
  tripUrl: string;
  ownerId: string;
}

export interface AppleSyncResult {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  failed: Array<{ activityId: number; reason: FailureReason }>;
}

async function fetchTripActivities(tripId: number): Promise<Activity[]> {
  const days = await prisma.day.findMany({
    where: { tripId },
    orderBy: { date: "asc" },
    include: {
      activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] },
    },
  });
  return days.flatMap((d) => d.activities);
}

function classifyToReason(err: unknown): FailureReason {
  const code = appleProvider.classifyError(err);
  if (code === "auth_invalid") return "forbidden";
  if (code === "transient_failure") return "network";
  if (code === "precondition_failed") return "unknown";
  return "unknown";
}

export async function syncAppleActivities(
  ctx: AppleSyncContext,
): Promise<AppleSyncResult> {
  const activities = await fetchTripActivities(ctx.trip.id);
  const mappings = await prisma.tripCalendarEventMapping.findMany({
    where: { tripCalendarLinkId: ctx.tripCalendarLinkId },
  });
  const mapByActivity = new Map<number, TripCalendarEventMapping>();
  mappings.forEach((m) => mapByActivity.set(m.activityId, m));

  const result: AppleSyncResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    failed: [],
  };

  for (const a of activities) {
    const mapping = mapByActivity.get(a.id);
    try {
      if (!mapping) {
        // 신규 — 명시적 UUID 생성. ICS UID와 filename(provider 내부)을 일치시켜
        // 후속 update/delete가 같은 객체를 정확히 가리키게 한다.
        const uid = randomUUID();
        const ics = formatActivityAsIcs(a, ctx.trip, {
          tripUrl: ctx.tripUrl,
          uid,
        });
        const ref = await appleProvider.putEvent(ctx.ownerId, ctx.calendarId, ics);
        await prisma.tripCalendarEventMapping.create({
          data: {
            tripCalendarLinkId: ctx.tripCalendarLinkId,
            activityId: a.id,
            googleEventId: ref.externalEventId,
            syncedEtag: ref.etag ?? "",
            lastSyncedAt: new Date(),
          },
        });
        result.created++;
      } else {
        // update — mapping URL에서 UID 추출해 ICS UID로 동일 사용 (#460 fix).
        // 이전엔 extractIcsUid("UID:placeholder")가 "placeholder" 문자열을 반환해
        // ICS UID가 매번 잘못된 값으로 PUT → iCloud가 새 객체로 인식하거나 reject.
        const uid = uidFromExternalEventId(mapping.googleEventId);
        const ics = formatActivityAsIcs(a, ctx.trip, {
          tripUrl: ctx.tripUrl,
          uid,
        });
        const ref = await appleProvider.updateEvent(
          ctx.ownerId,
          {
            externalEventId: mapping.googleEventId,
            etag: mapping.syncedEtag,
          },
          ics,
        );
        await prisma.tripCalendarEventMapping.update({
          where: { id: mapping.id },
          data: {
            syncedEtag: ref.etag ?? "",
            lastSyncedAt: new Date(),
          },
        });
        result.updated++;
      }
    } catch (e) {
      const code = appleProvider.classifyError(e);
      if (code === "precondition_failed" && mapping) {
        // 412: 외부 직접 수정으로 판단. 매핑만 끊고 다음 sync에서 재생성 안 함(skipped).
        result.skipped++;
        continue;
      }
      result.failed.push({
        activityId: a.id,
        reason: classifyToReason(e),
      });
    }
  }

  // 활동에 없는 mapping → delete
  const activityIds = new Set(activities.map((a) => a.id));
  for (const mapping of mappings) {
    if (activityIds.has(mapping.activityId)) continue;
    try {
      await appleProvider.deleteEvent(ctx.ownerId, {
        externalEventId: mapping.googleEventId,
        etag: mapping.syncedEtag,
      });
      await prisma.tripCalendarEventMapping.delete({ where: { id: mapping.id } });
      result.deleted++;
    } catch (e) {
      const code = appleProvider.classifyError(e);
      if (code === "precondition_failed") {
        // 외부에서 수정된 이벤트 → 보존, 매핑만 끊는다
        await prisma.tripCalendarEventMapping.delete({ where: { id: mapping.id } });
        result.skipped++;
        continue;
      }
      result.failed.push({
        activityId: mapping.activityId,
        reason: classifyToReason(e),
      });
    }
  }

  return result;
}
