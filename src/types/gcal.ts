/**
 * Google Calendar 연동 공통 타입.
 *
 * 스펙: specs/018-gcal-integration/spec.md
 * 계약: specs/018-gcal-integration/contracts/gcal-api.yaml
 */

export type CalendarType = "DEDICATED" | "PRIMARY";

export type GCalLastError = "REVOKED" | "RATE_LIMITED" | "NETWORK" | "UNKNOWN" | null;

export interface GCalLinkState {
  calendarType: CalendarType;
  calendarId: string;
  calendarName: string | null;
  lastSyncedAt: string | null;
  lastError: GCalLastError;
  skippedCount: number;
}

export type SyncStatus = "ok" | "partial" | "failed";

export interface SyncSummary {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  failed: number;
}

export type FailureReason =
  | "rate_limited"
  | "network"
  | "forbidden"
  | "not_found"
  | "unknown";

export interface FailedItem {
  activityId: number;
  reason: FailureReason;
}

export interface SyncResponse {
  status: SyncStatus;
  summary: SyncSummary;
  failed: FailedItem[];
  link: GCalLinkState;
}

export interface UnlinkResponse {
  status: "ok" | "partial";
  summary: {
    deleted: number;
    skipped: number;
    failed: number;
  };
  failed: FailedItem[];
}

export interface ConsentRequired {
  error: "consent_required";
  /** 브라우저를 이동시킬 Google 동의 URL 또는 서버 액션 신호 */
  authorizationUrl?: string;
}

export type StatusResponse =
  | { linked: true; link: GCalLinkState }
  | { linked: false; scopeGranted: boolean };

/**
 * Google Calendar API scope.
 *
 * Testing 단계에서는 `auth/calendar` 전체 scope를 요청한다. 이유:
 *  - `calendar.events`만으로는 `calendars.insert`(전용 캘린더 생성) 불가 → DEDICATED 모드가 403(#343).
 *  - Production 승급은 Restricted scope 심사 비용(CASA 등)이 커서 당분간 보류.
 *  - Testing 모드는 Test users 한정 운영이라 scope 확대가 외부 악용 경로를 넓히지 않는다.
 *
 * Google Cloud Console → 대상 → 데이터 액세스에 아래 scope를 함께 등록해야 한다.
 */
export const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar" as const;
/** @deprecated GCAL_SCOPE로 통일됨(#343). 본 상수는 기존 호환 참조를 위해 남겨둔다. */
export const GCAL_EVENTS_SCOPE = GCAL_SCOPE;

/** 전용 캘린더 이름 접미어. 사용자의 다른 캘린더와 구분 목적. */
export const DEDICATED_CALENDAR_SUFFIX = " (trip-planner)" as const;
