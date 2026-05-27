/**
 * spec 027 — 외부 캘린더 import 오케스트레이터.
 *
 * 1) fetcher.listEvents(trip 기간)
 * 2) 기존 draft 조회(멱등성)
 * 3) 신규 이벤트만 매핑 → draft create
 * 4) ImportRun 결과 기록
 *
 * 이벤트별 try/catch로 부분 실패 허용. 실패 이벤트의 title 첫 3건만 응답에 노출(privacy).
 */

import type { CalendarProviderId } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { googleImportFetcher } from "./google";
import { appleImportFetcher } from "./apple";
import { findExistingDraftIds, ignoreUniqueViolation } from "./idempotency";
import { mapExternalEvent, overlapsTrip } from "./mapper";
import type {
  ExternalCalendarFetcher,
  ExternalEvent,
  ImportResult,
} from "./types";

const FAILED_TITLES_LIMIT = 3;

export class ExternalAccountNotLinkedError extends Error {
  constructor(public readonly provider: CalendarProviderId) {
    super(`External account for provider ${provider} is not linked`);
  }
}

function getFetcher(provider: CalendarProviderId): ExternalCalendarFetcher {
  switch (provider) {
    case "GOOGLE":
      return googleImportFetcher;
    case "APPLE":
      return appleImportFetcher;
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }
}

export interface RunImportArgs {
  tripId: number;
  triggeredByUserId: string;
  provider: CalendarProviderId;
  externalCalendarId: string;
}

/** 외부 캘린더 → trip draft import 실행. 권한 검증은 호출자(라우트)가 끝낸 상태. */
export async function runImport(args: RunImportArgs): Promise<ImportResult> {
  const fetcher = getFetcher(args.provider);

  // 1) 외부 계정 연결 확인
  const connected = await fetcher.isConnected(args.triggeredByUserId);
  if (!connected) {
    throw new ExternalAccountNotLinkedError(args.provider);
  }

  // 2) trip 기간 조회
  const trip = await prisma.trip.findUnique({
    where: { id: args.tripId },
    select: { startDate: true, endDate: true },
  });
  if (!trip) {
    throw new Error(`Trip ${args.tripId} not found`);
  }

  // 3) ImportRun 헤더 먼저 생성 (draft FK 참조 대상)
  const importRun = await prisma.importRun.create({
    data: {
      tripId: args.tripId,
      triggeredByUserId: args.triggeredByUserId,
      provider: args.provider,
      externalCalendarId: args.externalCalendarId,
    },
  });

  let externalEvents: ExternalEvent[] = [];
  try {
    externalEvents = await fetcher.listEvents(
      args.triggeredByUserId,
      args.externalCalendarId,
      { start: trip.startDate, end: trip.endDate },
    );
  } catch (err) {
    await prisma.importRun.update({
      where: { id: importRun.id },
      data: { finishedAt: new Date(), failedCount: 1 },
    });
    throw err;
  }

  // 4) trip 기간 필터(추가 안전망 — fetcher가 timeMin/timeMax를 정확히 처리한다 가정)
  const candidates = externalEvents.filter((ev) =>
    overlapsTrip(ev, { startDate: trip.startDate, endDate: trip.endDate }),
  );

  // 5) 이미 import된 이벤트 식별
  const existingIds = await findExistingDraftIds({
    provider: args.provider,
    externalCalendarId: args.externalCalendarId,
    externalEventIds: candidates.map((c) => c.externalEventId),
  });

  let importedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const failedTitles: string[] = [];

  for (const ev of candidates) {
    if (existingIds.has(ev.externalEventId)) {
      skippedCount += 1;
      continue;
    }
    try {
      const created = await ignoreUniqueViolation(() =>
        prisma.activityDraft.create({
          data: mapExternalEvent({
            tripId: args.tripId,
            provider: args.provider,
            externalCalendarId: args.externalCalendarId,
            importRunId: importRun.id,
            event: ev,
          }),
        }),
      );
      if (created) {
        importedCount += 1;
      } else {
        // race로 다른 동시 import가 같은 키 draft를 만든 케이스
        skippedCount += 1;
      }
    } catch (err) {
      failedCount += 1;
      if (failedTitles.length < FAILED_TITLES_LIMIT) {
        failedTitles.push(ev.title);
      }
      console.warn(
        `[calendar-import] failed event tripId=${args.tripId} externalEventId=${ev.externalEventId} reason=${(err as Error).message}`,
      );
    }
  }

  await prisma.importRun.update({
    where: { id: importRun.id },
    data: {
      importedCount,
      skippedCount,
      failedCount,
      failedTitles,
      finishedAt: new Date(),
    },
  });

  return {
    importRunId: importRun.id,
    importedCount,
    skippedCount,
    failedCount,
    failedTitles,
  };
}

/** 사용자의 외부 계정에서 import 가능한 캘린더 목록(trip-planner 관리 캘린더 제외). */
export async function listAvailableExternalCalendars(userId: string) {
  const fetchers: ExternalCalendarFetcher[] = [googleImportFetcher, appleImportFetcher];
  const results = await Promise.all(
    fetchers.map(async (f) => {
      if (!(await f.isConnected(userId))) return [];
      try {
        return await f.listCalendars(userId);
      } catch (err) {
        console.warn(
          `[calendar-import] listCalendars failed provider=${f.provider} reason=${(err as Error).message}`,
        );
        return [];
      }
    }),
  );
  return results.flat().filter((c) => !c.isManagedByTripPlanner);
}

/** "다시 가져오기" — 매핑 가능 필드만 외부 최신 값으로 덮어쓰기. */
export class DraftRefreshConflictError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function refreshDraft(args: {
  tripId: number;
  draftId: number;
  triggeredByUserId: string;
}): Promise<{ refreshed: boolean }> {
  const draft = await prisma.activityDraft.findFirst({
    where: { id: args.draftId, tripId: args.tripId },
  });
  if (!draft) throw new Error("draft_not_found");
  if (draft.status !== "PENDING") {
    throw new DraftRefreshConflictError("draft is not PENDING");
  }
  const fetcher = getFetcher(draft.provider);
  if (!(await fetcher.isConnected(args.triggeredByUserId))) {
    throw new ExternalAccountNotLinkedError(draft.provider);
  }
  const trip = await prisma.trip.findUnique({
    where: { id: draft.tripId },
    select: { startDate: true, endDate: true },
  });
  if (!trip) throw new Error("trip_not_found");

  const events = await fetcher.listEvents(
    args.triggeredByUserId,
    draft.externalCalendarId,
    { start: trip.startDate, end: trip.endDate },
  );
  const fresh = events.find((e) => e.externalEventId === draft.externalEventId);
  if (!fresh) return { refreshed: false };

  await prisma.activityDraft.update({
    where: { id: draft.id },
    data: {
      title: fresh.title,
      startTime: fresh.startTime,
      endTime: fresh.endTime,
      isAllDay: fresh.isAllDay,
      locationText: fresh.locationText,
      description: fresh.description,
      lastRefreshedAt: new Date(),
      // 매핑 불가 필드(startTimezone, endTimezone)는 사용자 입력 보존을 위해 덮어쓰지 않음
    },
  });
  return { refreshed: true };
}
