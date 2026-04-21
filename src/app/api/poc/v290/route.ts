/**
 * PoC v2.9.0 — Google Calendar 공유 플로우 검증 엔드포인트.
 *
 * 목적: 5개 시나리오를 실측해 v2.9.0 재설계의 기술적 전제를 검증한다.
 *  1) acl.insert 재호출 시 중복 생성 여부
 *  2) 게스트 토큰으로 calendarList.insert 성공 조건 (ACL·scope 의존성)
 *  3) role=writer/reader Google UI 반영
 *  4) sendNotifications:false 실제 무음
 *  5) role 변경(acl.patch)의 반영 지연
 *
 * 보안: production 빌드(VERCEL_ENV=production) 차단. 세션 유저의 본인 Google 토큰으로만 호출.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCalendarClient, classifyError, getStatus } from "@/lib/gcal/client";
import { hasCalendarScope } from "@/lib/gcal/auth";

const POC_DISABLED_MESSAGE =
  "PoC endpoint is not available in production. Set VERCEL_ENV=preview or run locally.";

function assertPocEnabled(): NextResponse | null {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: POC_DISABLED_MESSAGE }, { status: 404 });
  }
  return null;
}

type Action =
  | "whoami"
  | "create-calendar"
  | "insert-acl"
  | "list-acl"
  | "patch-acl-role"
  | "delete-calendar"
  | "subscribe-calendar"
  | "unsubscribe-calendar"
  | "list-my-calendars"
  | "run-owner-scenario"
  | "run-guest-scenario";

interface ActionRequest {
  action: Action;
  calendarId?: string;
  calendarSummary?: string;
  guestEmail?: string;
  role?: "reader" | "writer" | "owner" | "freeBusyReader";
  sendNotifications?: boolean;
}

export async function POST(req: NextRequest) {
  const blocked = assertPocEnabled();
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<ActionRequest>;
  const action = body.action;
  if (!action) {
    return NextResponse.json({ error: "missing_action" }, { status: 400 });
  }

  if (action === "whoami") {
    const scopeGranted = await hasCalendarScope(session.user.id);
    return NextResponse.json({
      userId: session.user.id,
      email: session.user.email,
      scopeGranted,
      env: process.env.VERCEL_ENV ?? "local",
    });
  }

  const client = await getCalendarClient(session.user.id);
  if (!client) {
    return NextResponse.json(
      { error: "no_google_account_or_missing_scope" },
      { status: 409 }
    );
  }

  const started = Date.now();
  const result: Record<string, unknown> = { action, actor: session.user.email };

  try {
    switch (action) {
      case "create-calendar": {
        const res = await client.calendar.calendars.insert({
          requestBody: { summary: body.calendarSummary ?? "PoC v2.9.0 Trip Calendar" },
        });
        result.status = res.status;
        result.calendarId = res.data.id;
        result.summary = res.data.summary;
        result.etag = res.data.etag;
        break;
      }
      case "insert-acl": {
        if (!body.calendarId || !body.guestEmail) {
          return NextResponse.json({ error: "missing_calendar_or_email" }, { status: 400 });
        }
        const res = await client.calendar.acl.insert({
          calendarId: body.calendarId,
          sendNotifications: body.sendNotifications ?? false,
          requestBody: {
            scope: { type: "user", value: body.guestEmail },
            role: body.role ?? "reader",
          },
        });
        result.status = res.status;
        result.ruleId = res.data.id;
        result.role = res.data.role;
        result.etag = res.data.etag;
        break;
      }
      case "list-acl": {
        if (!body.calendarId) {
          return NextResponse.json({ error: "missing_calendar" }, { status: 400 });
        }
        const res = await client.calendar.acl.list({ calendarId: body.calendarId });
        result.status = res.status;
        result.count = res.data.items?.length ?? 0;
        result.rules = res.data.items?.map((r) => ({
          id: r.id,
          role: r.role,
          scope: r.scope,
        }));
        break;
      }
      case "patch-acl-role": {
        if (!body.calendarId || !body.guestEmail || !body.role) {
          return NextResponse.json({ error: "missing_fields" }, { status: 400 });
        }
        const ruleId = `user:${body.guestEmail}`;
        const res = await client.calendar.acl.patch({
          calendarId: body.calendarId,
          ruleId,
          sendNotifications: body.sendNotifications ?? false,
          requestBody: { role: body.role },
        });
        result.status = res.status;
        result.ruleId = res.data.id;
        result.role = res.data.role;
        break;
      }
      case "delete-calendar": {
        if (!body.calendarId) {
          return NextResponse.json({ error: "missing_calendar" }, { status: 400 });
        }
        const res = await client.calendar.calendars.delete({ calendarId: body.calendarId });
        result.status = res.status;
        break;
      }
      case "subscribe-calendar": {
        if (!body.calendarId) {
          return NextResponse.json({ error: "missing_calendar" }, { status: 400 });
        }
        const res = await client.calendar.calendarList.insert({
          requestBody: { id: body.calendarId },
        });
        result.status = res.status;
        result.calendarId = res.data.id;
        result.summary = res.data.summary;
        result.accessRole = res.data.accessRole;
        break;
      }
      case "unsubscribe-calendar": {
        if (!body.calendarId) {
          return NextResponse.json({ error: "missing_calendar" }, { status: 400 });
        }
        const res = await client.calendar.calendarList.delete({ calendarId: body.calendarId });
        result.status = res.status;
        break;
      }
      case "list-my-calendars": {
        const res = await client.calendar.calendarList.list({ maxResults: 50 });
        result.status = res.status;
        result.count = res.data.items?.length ?? 0;
        result.calendars = res.data.items?.map((c) => ({
          id: c.id,
          summary: c.summary,
          accessRole: c.accessRole,
        }));
        break;
      }
      case "run-owner-scenario": {
        if (!body.guestEmail) {
          return NextResponse.json({ error: "missing_guest_email" }, { status: 400 });
        }
        const steps: Record<string, unknown>[] = [];
        // 1) Create calendar
        const created = await client.calendar.calendars.insert({
          requestBody: { summary: body.calendarSummary ?? "PoC v2.9.0 Auto" },
        });
        const calendarId = created.data.id as string;
        steps.push({ step: "create", status: created.status, calendarId });

        // 2) First acl.insert as reader (sendNotifications:false)
        const acl1 = await client.calendar.acl.insert({
          calendarId,
          sendNotifications: false,
          requestBody: {
            scope: { type: "user", value: body.guestEmail },
            role: "reader",
          },
        });
        steps.push({
          step: "acl-insert-1st",
          status: acl1.status,
          ruleId: acl1.data.id,
          role: acl1.data.role,
        });

        // 3) Second acl.insert with same email+role (duplicate test)
        const acl2Result = await client.calendar.acl
          .insert({
            calendarId,
            sendNotifications: false,
            requestBody: {
              scope: { type: "user", value: body.guestEmail },
              role: "reader",
            },
          })
          .then((r) => ({
            step: "acl-insert-2nd",
            status: r.status,
            ruleId: r.data.id,
            role: r.data.role,
            observation: r.data.id === acl1.data.id ? "same-rule-id" : "different-rule-id",
          }))
          .catch((err) => ({
            step: "acl-insert-2nd",
            status: getStatus(err),
            error: classifyError(err).reason,
          }));
        steps.push(acl2Result);

        // 4) acl.list to see actual stored rules
        const listed = await client.calendar.acl.list({ calendarId });
        const guestRules = listed.data.items?.filter(
          (r) => r.scope?.type === "user" && r.scope?.value === body.guestEmail
        );
        steps.push({
          step: "acl-list",
          totalRules: listed.data.items?.length ?? 0,
          guestRuleCount: guestRules?.length ?? 0,
          guestRules: guestRules?.map((r) => ({ id: r.id, role: r.role })),
        });

        // 5) acl.patch role reader → writer
        const patched = await client.calendar.acl
          .patch({
            calendarId,
            ruleId: `user:${body.guestEmail}`,
            sendNotifications: false,
            requestBody: { role: "writer" },
          })
          .then((r) => ({ step: "acl-patch-role", status: r.status, newRole: r.data.role }))
          .catch((err) => ({
            step: "acl-patch-role",
            status: getStatus(err),
            error: classifyError(err).reason,
          }));
        steps.push(patched);

        result.calendarId = calendarId;
        result.steps = steps;
        result.note =
          "Copy calendarId to guest account and run 'run-guest-scenario'. After verification run 'delete-calendar' to cleanup.";
        break;
      }
      case "run-guest-scenario": {
        if (!body.calendarId) {
          return NextResponse.json({ error: "missing_calendar" }, { status: 400 });
        }
        const steps: Record<string, unknown>[] = [];

        // 1) Subscribe via calendarList.insert
        const sub = await client.calendar.calendarList
          .insert({ requestBody: { id: body.calendarId } })
          .then((r) => ({
            step: "calendarList-insert",
            status: r.status,
            accessRole: r.data.accessRole,
            summary: r.data.summary,
          }))
          .catch((err) => ({
            step: "calendarList-insert",
            status: getStatus(err),
            error: classifyError(err).reason,
          }));
        steps.push(sub);

        // 2) List my calendars to confirm appears
        const listed = await client.calendar.calendarList.list({ maxResults: 50 });
        const found = listed.data.items?.find((c) => c.id === body.calendarId);
        steps.push({
          step: "calendarList-list",
          totalCalendars: listed.data.items?.length ?? 0,
          found: Boolean(found),
          foundAccessRole: found?.accessRole,
        });

        // 3) Attempt events.list on shared calendar (verifies read path)
        const events = await client.calendar.events
          .list({ calendarId: body.calendarId, maxResults: 5 })
          .then((r) => ({
            step: "events-list",
            status: r.status,
            count: r.data.items?.length ?? 0,
          }))
          .catch((err) => ({
            step: "events-list",
            status: getStatus(err),
            error: classifyError(err).reason,
          }));
        steps.push(events);

        result.steps = steps;
        break;
      }
      default:
        return NextResponse.json({ error: `unknown_action:${action}` }, { status: 400 });
    }
  } catch (err) {
    const { reason } = classifyError(err);
    return NextResponse.json(
      {
        ...result,
        error: reason,
        errorStatus: getStatus(err),
        errorMessage: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  result.durationMs = Date.now() - started;
  return NextResponse.json(result);
}

export async function GET() {
  const blocked = assertPocEnabled();
  if (blocked) return blocked;
  return NextResponse.json({
    name: "PoC v2.9.0 — Google Calendar Share Flow",
    actions: [
      "whoami",
      "create-calendar",
      "insert-acl",
      "list-acl",
      "patch-acl-role",
      "delete-calendar",
      "subscribe-calendar",
      "unsubscribe-calendar",
      "list-my-calendars",
      "run-owner-scenario",
      "run-guest-scenario",
    ],
  });
}
