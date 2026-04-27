/**
 * spec 024 (#416) — CalendarProvider 추상화 인터페이스.
 *
 * 외부 캘린더 서비스(Google, Apple 등)가 만족해야 하는 공통 동작 집합.
 * 라우트 핸들러는 link row의 `provider`를 읽어 `getProvider(id)`로 구현체를 받아
 * 본 인터페이스 메서드만 호출한다. provider별 분기 로직은 호출자에 노출되지 않는다.
 *
 * 의사결정·근거: specs/024-calendar-provider-abstraction/{spec.md, plan.md}
 */

import type { CalendarProviderId } from "@prisma/client";

export type ProviderId = CalendarProviderId;

/** 사용자 가시 에러 6종 vocabulary. plan.md "에러 vocabulary 정규화" 절 참조. */
export type CalendarErrorCode =
  | "auth_invalid"
  | "precondition_failed"
  | "revoked"
  | "transient_failure"
  | "unregistered_user"
  | "already_linked";

/**
 * provider별 자동화 가능 영역. 호출자는 본 capability를 읽어 분기한다 — provider 식별자
 * 직접 비교는 금지(SC-008).
 */
export interface ProviderCapabilities {
  /** 멤버 ACL 자동 부여 가능 여부. Google: "auto", Apple(잠정): "manual". */
  autoMemberAcl: "auto" | "manual" | "unsupported";
  /** 새 캘린더 생성 지원 여부 (MKCALENDAR / calendars.insert). */
  supportsCalendarCreation: boolean;
  /** 기존 캘린더 목록에서 선택 지원 여부. */
  supportsCalendarSelection: boolean;
}

/** 외부 캘린더 1건. provider별 표현 차이는 여기서 흡수. */
export interface CalendarRef {
  /** provider가 발급한 캘린더 식별자. Google: calendarId, Apple: CalDAV calendar URL. */
  calendarId: string;
  displayName: string | null;
  /** VEVENT 미보유 캘린더(Apple "미리 알림" 등)는 UI에서 자동 필터. POC #345 추가 발견 B. */
  components: ("VEVENT" | "VTODO")[];
}

/** 활동 ↔ 외부 이벤트 1:1 매핑 핵심 정보. */
export interface ExternalEventRef {
  /** Google: eventId, Apple: VEVENT URL의 마지막 segment 또는 UID. */
  externalEventId: string;
  /** 마지막 동기화 ETag. null이면 새 fetch 후 재시도 신호. */
  etag: string | null;
}

/** 멤버 ACL 회수 결과. retain 보류 시 사유 포함. */
export interface RevokeAclResult {
  revoked: boolean;
  retainedReason?: string;
}

/**
 * 본 인터페이스의 모든 메서드는 라우트 계층의 권한 검증을 통과한 호출만 받는다.
 * provider 구현체는 권한 검증을 다시 하지 않는다.
 */
export interface CalendarProvider {
  readonly id: ProviderId;
  readonly capabilities: ProviderCapabilities;

  // ── 인증 상태 ───────────────────────────────────────────
  hasValidAuth(userId: string): Promise<boolean>;
  /** 재인증이 필요할 때의 진입 URL. provider별 흐름이 다름(Google: OAuth, Apple: 가이드 페이지). */
  getReauthUrl(userId: string, returnTo: string): Promise<string | null>;

  // ── 캘린더 관리 ─────────────────────────────────────────
  listCalendars(userId: string): Promise<CalendarRef[]>;
  createCalendar(userId: string, name: string): Promise<CalendarRef>;

  // ── 이벤트 sync ─────────────────────────────────────────
  putEvent(userId: string, calendarId: string, ics: string): Promise<ExternalEventRef>;
  updateEvent(userId: string, ref: ExternalEventRef, ics: string): Promise<ExternalEventRef>;
  deleteEvent(userId: string, ref: ExternalEventRef): Promise<void>;

  // ── 멤버 ACL ────────────────────────────────────────────
  upsertMemberAcl(args: {
    userId: string;
    calendarId: string;
    memberEmail: string;
    role: "writer" | "reader";
  }): Promise<void>;

  /**
   * 멤버 ACL 회수.
   * `retainIfStillNeeded: true`면 구현체가 "다른 활성 link로 같은 캘린더+멤버가 필요한가"
   * 판정 후 보류 결정. 본 판정을 메서드 책임으로 캡슐화해 호출자 단순화.
   */
  revokeMemberAcl(args: {
    userId: string;
    calendarId: string;
    memberEmail: string;
    retainIfStillNeeded: boolean;
  }): Promise<RevokeAclResult>;

  // ── 에러 분류 ───────────────────────────────────────────
  /** provider 고유 에러를 6종 vocabulary로 매핑. 분류 불가는 null. */
  classifyError(err: unknown): CalendarErrorCode | null;
}
