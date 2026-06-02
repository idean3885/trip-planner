import { syncCalendar } from "@/lib/calendar/service";

/**
 * spec 049 — 활동 변경 후 연결된 외부 캘린더에 자동 반영.
 *
 * Route Handler 의 `after()` 안에서 호출해 변경 응답을 지연시키지 않는다. 기존 수동
 * 동기화 진입점과 같은 `syncCalendar` 를 재사용한다 — 편집 권한 확인, Google/Apple
 * provider 분기, 미연결(404), 412 충돌·부분 실패 처리가 모두 그 안에 있다.
 *
 * 변경(활동 저장)은 이미 커밋된 상태이므로, 자동 반영의 미연결·실패는 응답이나
 * 저장에 영향을 주지 않는다. 미연결(404)·권한(403)은 정상 흐름이라 조용히 지나가고,
 * 그 외 실패만 로그를 남긴다. 사용자는 필요 시 수동 "다시 반영하기"로 보정할 수 있다.
 */
export async function triggerCalendarAutoSync(
  tripId: number,
  userId: string,
  tripUrl: string,
): Promise<void> {
  try {
    const result = await syncCalendar({ userId, tripId }, { tripUrl });
    if (
      result.status >= 400 &&
      result.status !== 404 &&
      result.status !== 403
    ) {
      console.error(
        `[auto-sync] tripId=${tripId} sync status=${result.status}`,
      );
    }
  } catch (e) {
    console.error(`[auto-sync] tripId=${tripId} 예외`, e);
  }
}
