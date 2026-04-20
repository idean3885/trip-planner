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

/** Google Calendar API scope — 이벤트 읽기/쓰기만 요청한다. */
export const GCAL_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events" as const;

/** 전용 캘린더 이름 접미어. 사용자의 다른 캘린더와 구분 목적. */
export const DEDICATED_CALENDAR_SUFFIX = " (trip-planner)" as const;
