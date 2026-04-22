/**
 * v2.8.0 → v2.9.0 데이터 마이그레이션 헬퍼.
 *
 * 주 마이그레이션은 `prisma/migrations/20260422000001_backfill_v28_gcal_links/migration.sql`에서
 * 수행됨. 본 모듈은 운영 중 누락·재시도 필요 시 런타임에서 같은 의미 체계를 재적용한다.
 */

import { prisma } from "@/lib/prisma";

export interface BackfillResult {
  promoted: number;  // v2.8.0 오너 DEDICATED를 TripCalendarLink로 승격한 수
  unlinked: number;  // 비-오너 GCalLink 제거 수
  skipped: number;   // 이미 TripCalendarLink가 존재해 건너뛴 트립 수
}

/**
 * v2.8.0 스타일 GCalLink 중 오너 소유 DEDICATED 레코드를 TripCalendarLink로 승격하고,
 * 같은 트립의 비-오너 GCalLink를 제거한다.
 *
 * 이미 해당 트립에 TripCalendarLink가 존재하면 해당 트립은 건너뛴다(멱등).
 * 비-오너 GCalLink의 gcal_event_mappings는 cascade로 함께 제거되지만,
 * 멤버 외부 계정에 남은 실제 구글 캘린더는 건드리지 않는다.
 */
export async function backfillV28(): Promise<BackfillResult> {
  const candidates = await prisma.$queryRaw<Array<{
    trip_id: number;
    owner_id: string;
    calendar_id: string;
    calendar_name: string | null;
    last_synced_at: Date | null;
    last_error: string | null;
    skipped_count: number;
    created_at: Date;
    updated_at: Date;
  }>>`
    SELECT gl.trip_id, gl.user_id AS owner_id, gl.calendar_id, gl.calendar_name,
           gl.last_synced_at, gl.last_error, gl.skipped_count, gl.created_at, gl.updated_at
    FROM gcal_links gl
    INNER JOIN trip_members tm
      ON tm.trip_id = gl.trip_id
     AND tm.user_id = gl.user_id
     AND tm.role = 'OWNER'
    WHERE gl.calendar_type = 'DEDICATED'
  `;

  let promoted = 0;
  let skipped = 0;
  for (const c of candidates) {
    const existing = await prisma.tripCalendarLink.findUnique({
      where: { tripId: c.trip_id },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.tripCalendarLink.create({
      data: {
        tripId: c.trip_id,
        ownerId: c.owner_id,
        calendarId: c.calendar_id,
        calendarName: c.calendar_name,
        lastSyncedAt: c.last_synced_at,
        lastError: c.last_error,
        skippedCount: c.skipped_count,
      },
    });
    promoted++;
  }

  const deleteResult = await prisma.$executeRaw`
    DELETE FROM gcal_links gl
    USING trip_calendar_links tcl
    WHERE gl.trip_id = tcl.trip_id
      AND gl.user_id != tcl.owner_id
  `;

  return {
    promoted,
    unlinked: Number(deleteResult),
    skipped,
  };
}
