/**
 * Sync 엔진 — 여행 활동과 GCalEventMapping을 diff하여 Google Calendar 이벤트를
 * 생성·갱신·삭제한다.
 *
 * 핵심 원칙(스펙 Clarifications 3, research R3):
 *  - 삭제·갱신은 If-Match(ETag) 조건부.
 *  - 412 응답 시 **Google event.updated** 와 **mapping.lastSyncedAt** 을 비교해
 *    "사용자가 GCal에서 직접 수정했는지"를 판단한다 (v2.9.0 개선).
 *    - Google updated <= 우리 lastSyncedAt → Google의 내부 메타데이터/이전 sync의
 *      ETag 레이스 등으로 ETag만 밀림. 현재 ETag로 재시도하여 우리 DB 상태를 반영.
 *    - Google updated > 우리 lastSyncedAt → 사용자가 GCal에서 수정했다고 판단,
 *      덮어쓰지 않고 skipped로 집계.
 *  - 원본(DB)은 절대 훼손하지 않는다. 부분 실패 허용.
 */

import { prisma } from "@/lib/prisma";
import {
  classifyError,
  getStatus,
  isPreconditionFailed,
  type GCalClient,
} from "./client";
import { formatActivityAsEvent, type ActivityForFormat } from "./format";
import type { FailureReason } from "@/types/gcal";
import type { Activity, GCalEventMapping, Trip } from "@prisma/client";

export interface SyncContext {
  linkId: number;
  calendarId: string;
  trip: Pick<Trip, "id" | "title">;
  tripUrl: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  failed: Array<{ activityId: number; reason: FailureReason }>;
}

export interface UnlinkResult {
  deleted: number;
  skipped: number;
  failed: Array<{ activityId: number; reason: FailureReason }>;
}

type ActivityRow = Activity & {};

/** 여행에 속한 모든 활동을 dayId 순으로 조회한다. */
export async function fetchTripActivities(tripId: number): Promise<ActivityRow[]> {
  const days = await prisma.day.findMany({
    where: { tripId },
    orderBy: { date: "asc" },
    include: { activities: { orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }] } },
  });
  return days.flatMap((d) => d.activities);
}

/** 여행의 모든 활동을 Google Calendar에 반영 (생성/갱신/삭제). */
export async function syncActivities(
  client: GCalClient,
  ctx: SyncContext,
  options: { retryOnly?: number[] } = {}
): Promise<SyncResult> {
  const activities = await fetchTripActivities(ctx.trip.id);
  const mappings = await prisma.gCalEventMapping.findMany({
    where: { linkId: ctx.linkId },
  });
  const mapByActivity = new Map<number, GCalEventMapping>();
  mappings.forEach((m) => mapByActivity.set(m.activityId, m));

  const retryFilter = options.retryOnly ? new Set(options.retryOnly) : null;
  const result: SyncResult = { created: 0, updated: 0, deleted: 0, skipped: 0, failed: [] };

  // 1) Activity 순회 → create or update
  for (const a of activities) {
    if (retryFilter && !retryFilter.has(a.id)) continue;
    const mapping = mapByActivity.get(a.id);
    const event = formatActivityAsEvent(a as ActivityForFormat, ctx.trip, {
      tripUrl: ctx.tripUrl,
    });
    try {
      if (!mapping) {
        const res = await client.calendar.events.insert({
          calendarId: ctx.calendarId,
          requestBody: event,
        });
        if (res.data.id && res.data.etag) {
          await prisma.gCalEventMapping.create({
            data: {
              linkId: ctx.linkId,
              activityId: a.id,
              googleEventId: res.data.id,
              syncedEtag: res.data.etag,
              lastSyncedAt: new Date(),
            },
          });
          result.created++;
        }
      } else {
        const res = await client.calendar.events.patch(
          {
            calendarId: ctx.calendarId,
            eventId: mapping.googleEventId,
            requestBody: event,
          },
          { headers: { "If-Match": mapping.syncedEtag } }
        );
        if (res.data.etag) {
          await prisma.gCalEventMapping.update({
            where: { id: mapping.id },
            data: { syncedEtag: res.data.etag, lastSyncedAt: new Date() },
          });
          result.updated++;
        }
      }
    } catch (err) {
      if (isPreconditionFailed(err) && mapping) {
        // 412: ETag 불일치. 실제 사용자 수정 여부를 Google event.updated로 판별.
        const outcome = await resolvePreconditionConflict(client, ctx.calendarId, mapping, event);
        if (outcome === "updated") result.updated++;
        else if (outcome === "cleaned") {
          // 404로 내려가 mapping 정리된 경우 — 이후 sync에서 insert로 재생성
        } else if (outcome === "failed") {
          result.failed.push({ activityId: a.id, reason: "unknown" });
        } else {
          result.skipped++;
        }
      } else if (getStatus(err) === 404 && mapping) {
        // 이벤트가 이미 삭제됨 → 매핑 정리
        await prisma.gCalEventMapping.delete({ where: { id: mapping.id } });
      } else {
        const { reason } = classifyError(err);
        result.failed.push({ activityId: a.id, reason });
      }
    }
  }

  // 2) 매핑에 있으나 현재 활동 목록에 없는 것 → delete
  const activityIds = new Set(activities.map((a) => a.id));
  for (const mapping of mappings) {
    if (activityIds.has(mapping.activityId)) continue;
    if (retryFilter && !retryFilter.has(mapping.activityId)) continue;
    try {
      await client.calendar.events.delete(
        { calendarId: ctx.calendarId, eventId: mapping.googleEventId },
        { headers: { "If-Match": mapping.syncedEtag } }
      );
      await prisma.gCalEventMapping.delete({ where: { id: mapping.id } });
      result.deleted++;
    } catch (err) {
      if (isPreconditionFailed(err)) {
        // 사용자가 직접 수정한 이벤트 — 보존, 매핑만 끊는다.
        await prisma.gCalEventMapping.delete({ where: { id: mapping.id } });
        result.skipped++;
      } else if (getStatus(err) === 404) {
        await prisma.gCalEventMapping.delete({ where: { id: mapping.id } });
      } else {
        const { reason } = classifyError(err);
        result.failed.push({ activityId: mapping.activityId, reason });
      }
    }
  }

  return result;
}

/**
 * 412 발생 시 실제 사용자 수정 여부를 판별해 적절히 재시도하거나 skip한다.
 *
 * 반환:
 *  - "updated": Google 쪽이 우리 마지막 sync 이후 수정되지 않았음 → 현재 ETag로 재-patch 성공, mapping 갱신
 *  - "skipped": Google 쪽이 마지막 sync 이후 수정됨 → 사용자 편집 존중, 그대로 둠
 *  - "cleaned": 404로 내려가 mapping 정리됨 (다음 sync에서 insert로 재생성)
 *  - "failed": 복구 중 알 수 없는 에러
 */
async function resolvePreconditionConflict(
  client: GCalClient,
  calendarId: string,
  mapping: GCalEventMapping,
  desiredEvent: ReturnType<typeof formatActivityAsEvent>
): Promise<"updated" | "skipped" | "cleaned" | "failed"> {
  let currentRes;
  try {
    currentRes = await client.calendar.events.get({
      calendarId,
      eventId: mapping.googleEventId,
    });
  } catch (getErr) {
    if (getStatus(getErr) === 404) {
      await prisma.gCalEventMapping.delete({ where: { id: mapping.id } });
      return "cleaned";
    }
    return "failed";
  }

  const googleUpdatedMs = currentRes.data.updated
    ? new Date(currentRes.data.updated).getTime()
    : 0;
  const ourLastSyncMs = mapping.lastSyncedAt
    ? mapping.lastSyncedAt.getTime()
    : 0;
  // 2초 오차 허용 — Google 내부 시각 차이·우리 서버 시계 보정.
  const userTouchedInGoogle = googleUpdatedMs > ourLastSyncMs + 2000;

  if (userTouchedInGoogle) {
    return "skipped";
  }

  // Google 쪽은 사용자 수정 없음 → 현재 ETag로 재-patch 시도.
  try {
    const retryRes = await client.calendar.events.patch(
      { calendarId, eventId: mapping.googleEventId, requestBody: desiredEvent },
      { headers: { "If-Match": currentRes.data.etag ?? "" } }
    );
    if (retryRes.data.etag) {
      await prisma.gCalEventMapping.update({
        where: { id: mapping.id },
        data: { syncedEtag: retryRes.data.etag, lastSyncedAt: new Date() },
      });
      return "updated";
    }
    return "failed";
  } catch (retryErr) {
    if (getStatus(retryErr) === 404) {
      await prisma.gCalEventMapping.delete({ where: { id: mapping.id } });
      return "cleaned";
    }
    return "failed";
  }
}

/** 링크 해제 — 매핑된 이벤트를 모두 삭제하려 시도한다. 412면 보존. */
export async function unlinkEvents(
  client: GCalClient,
  ctx: Pick<SyncContext, "linkId" | "calendarId">
): Promise<UnlinkResult> {
  const mappings = await prisma.gCalEventMapping.findMany({
    where: { linkId: ctx.linkId },
  });
  const result: UnlinkResult = { deleted: 0, skipped: 0, failed: [] };

  for (const m of mappings) {
    try {
      await client.calendar.events.delete(
        { calendarId: ctx.calendarId, eventId: m.googleEventId },
        { headers: { "If-Match": m.syncedEtag } }
      );
      result.deleted++;
    } catch (err) {
      if (isPreconditionFailed(err)) {
        result.skipped++;
      } else if (getStatus(err) === 404) {
        // 이미 삭제됨 — 성공 간주
        result.deleted++;
      } else {
        const { reason } = classifyError(err);
        result.failed.push({ activityId: m.activityId, reason });
      }
    }
  }
  return result;
}
