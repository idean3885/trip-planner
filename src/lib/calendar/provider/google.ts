/**
 * spec 024 (#416) — Google Calendar provider 구현체.
 *
 * **현재 PR(Foundation 1차)는 stub만**. registry import 만족 + 컴파일 통과 목적.
 * 실제 메서드 구현은 후속 Implementation PR에서 진행:
 *   - 기존 src/lib/gcal/{client,format,auth,acl,errors,unregistered}.ts 함수를 각 메서드에 위임
 *   - service.ts 신설 + v2 라우트 4종 위임 교체
 *   - 회귀 테스트(US1·US2·US3) 추가
 *
 * Foundation 1차 단계에서는 본 객체가 import만 되고 호출되지 않는다 — 라우트는 여전히
 * 기존 src/lib/gcal/* 함수를 직접 호출(사용자 가시 회귀 0).
 */

import type {
  CalendarErrorCode,
  CalendarProvider,
  CalendarRef,
  ExternalEventRef,
  ProviderCapabilities,
  RevokeAclResult,
} from "./types";

const NOT_IMPLEMENTED =
  "googleProvider 메서드는 후속 Implementation PR에서 구현됩니다 (#416). " +
  "Foundation 1차 PR은 인터페이스 + DB expand만 도입합니다.";

const CAPABILITIES: ProviderCapabilities = {
  // Google: 서버가 OAuth 토큰으로 ACL을 자동 부여(writer/reader). v2.9.0에서 검증 완료.
  autoMemberAcl: "auto",
  // calendars.insert로 신규 DEDICATED 캘린더 생성 가능 (#343 이후 calendar 전체 scope).
  supportsCalendarCreation: true,
  // calendarList로 기존 캘린더 목록 노출 가능.
  supportsCalendarSelection: true,
};

export const googleProvider: CalendarProvider = {
  id: "GOOGLE",
  capabilities: CAPABILITIES,

  async hasValidAuth(_userId: string): Promise<boolean> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async getReauthUrl(_userId: string, _returnTo: string): Promise<string | null> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async listCalendars(_userId: string): Promise<CalendarRef[]> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async createCalendar(_userId: string, _name: string): Promise<CalendarRef> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async putEvent(_userId: string, _calendarId: string, _ics: string): Promise<ExternalEventRef> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async updateEvent(
    _userId: string,
    _ref: ExternalEventRef,
    _ics: string,
  ): Promise<ExternalEventRef> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async deleteEvent(_userId: string, _ref: ExternalEventRef): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async upsertMemberAcl(_args: {
    userId: string;
    calendarId: string;
    memberEmail: string;
    role: "writer" | "reader";
  }): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  },

  async revokeMemberAcl(_args: {
    userId: string;
    calendarId: string;
    memberEmail: string;
    retainIfStillNeeded: boolean;
  }): Promise<RevokeAclResult> {
    throw new Error(NOT_IMPLEMENTED);
  },

  classifyError(_err: unknown): CalendarErrorCode | null {
    throw new Error(NOT_IMPLEMENTED);
  },
};
