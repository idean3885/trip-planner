/**
 * spec 027 — 외부 캘린더 import 도메인 타입.
 *
 * Provider별 fetch 어댑터(google.ts, apple.ts)가 만족해야 하는 인터페이스.
 * spec 024 push 방향 `CalendarProvider`와는 별개로, pull 방향만 다룬다.
 * 어댑터는 라우트 권한 검증을 통과한 호출만 받는다.
 */

import type { CalendarProviderId } from "@prisma/client";

/** 외부 캘린더 1건 (사용자 자산). */
export interface ExternalCalendarRef {
  provider: CalendarProviderId;
  externalCalendarId: string;
  displayName: string | null;
  /** 어느 사용자 계정에 속하는지(예: "user@gmail.com"). 표시용. */
  accountLabel: string | null;
  /** trip-planner가 만든 캘린더인지. 본값 true면 import 대상에서 제외. */
  isManagedByTripPlanner: boolean;
}

/** 외부 이벤트 1건 (raw — 매퍼가 ActivityDraft로 변환). */
export interface ExternalEvent {
  externalEventId: string;
  title: string;
  /** UTC 또는 timezone 명시된 시각. all-day면 일자 00:00. */
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  locationText: string | null;
  description: string | null;
  /** IANA timezone. null이면 floating-time(승격 시 사용자 입력). */
  startTimezone: string | null;
  endTimezone: string | null;
}

/** 외부 이벤트 조회 시간 범위. trip 기간으로 좁힌다. */
export interface DateRange {
  start: Date;
  end: Date;
}

/** 외부 캘린더 fetcher — provider별 구현체가 만족. */
export interface ExternalCalendarFetcher {
  readonly provider: CalendarProviderId;

  /** 사용자가 외부 계정 연결을 보유한 상태인지. false면 미연결로 안내. */
  isConnected(userId: string): Promise<boolean>;

  /** 사용자가 외부 계정에 가진 캘린더 목록(trip-planner 관리 캘린더는 자동 제외 가능). */
  listCalendars(userId: string): Promise<ExternalCalendarRef[]>;

  /** 캘린더 1개의 trip 기간 내 이벤트들. 반복 일정은 인스턴스 전개 후 반환. */
  listEvents(
    userId: string,
    externalCalendarId: string,
    range: DateRange,
  ): Promise<ExternalEvent[]>;
}

/** import 1회 실행 결과. service.runImport 반환값. */
export interface ImportResult {
  importRunId: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  failedTitles: string[];
}
