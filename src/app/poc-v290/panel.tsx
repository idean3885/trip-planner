"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LogEntry {
  at: string;
  action: string;
  data: unknown;
}

type Action =
  | "whoami"
  | "run-owner-scenario"
  | "run-guest-scenario"
  | "delete-calendar"
  | "unsubscribe-calendar"
  | "list-my-calendars"
  | "list-acl";

async function call(body: Record<string, unknown>) {
  const res = await fetch("/api/poc/v290", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { httpStatus: res.status, body: json };
}

export function PocPanel() {
  const [calendarId, setCalendarId] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState<Action | null>(null);

  const append = useCallback((action: string, data: unknown) => {
    setLog((prev) => [
      { at: new Date().toISOString(), action, data },
      ...prev,
    ]);
  }, []);

  const run = useCallback(
    async (action: Action, extra: Record<string, unknown> = {}) => {
      setBusy(action);
      try {
        const { httpStatus, body } = await call({ action, ...extra });
        append(action, { httpStatus, ...(body as Record<string, unknown>) });
        if (
          action === "run-owner-scenario" &&
          typeof (body as { calendarId?: string }).calendarId === "string"
        ) {
          setCalendarId((body as { calendarId: string }).calendarId);
        }
      } finally {
        setBusy(null);
      }
    },
    [append]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. 내 상태</CardTitle>
          <CardDescription>
            로그인한 계정 정보 + calendar scope 부여 여부 확인. 시작 전에 한 번 누릅니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => run("whoami")}
            disabled={busy !== null}
          >
            whoami
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. 오너 시나리오 (계정 A)</CardTitle>
          <CardDescription>
            (create-calendar) + (acl.insert 1차/2차) + (acl.list) + (acl.patch role 변경)을 자동 실행.
            완료 후 calendarId가 화면에 채워집니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="guest-email">게스트 이메일 (계정 B)</Label>
            <Input
              id="guest-email"
              placeholder="guest@gmail.com"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => run("run-owner-scenario", { guestEmail })}
              disabled={busy !== null || !guestEmail}
            >
              Run owner scenario
            </Button>
            <Button
              variant="outline"
              onClick={() => run("list-acl", { calendarId })}
              disabled={busy !== null || !calendarId}
            >
              list-acl
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. 게스트 시나리오 (계정 B)</CardTitle>
          <CardDescription>
            오너 시나리오에서 얻은 calendarId를 붙여넣고 실행. (calendarList.insert) + (calendarList.list) +
            (events.list) 자동 실행. 로그아웃 후 계정 B로 다시 로그인해 실행하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="calendar-id">calendarId</Label>
            <Input
              id="calendar-id"
              placeholder="abc...@group.calendar.google.com"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => run("run-guest-scenario", { calendarId })}
              disabled={busy !== null || !calendarId}
            >
              Run guest scenario
            </Button>
            <Button
              variant="outline"
              onClick={() => run("list-my-calendars")}
              disabled={busy !== null}
            >
              list-my-calendars
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. 정리 (Cleanup)</CardTitle>
          <CardDescription>
            PoC 종료 후 양쪽 계정에서 실행. 오너: delete-calendar. 게스트: unsubscribe-calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={() => run("delete-calendar", { calendarId })}
              disabled={busy !== null || !calendarId}
            >
              delete-calendar (오너)
            </Button>
            <Button
              variant="secondary"
              onClick={() => run("unsubscribe-calendar", { calendarId })}
              disabled={busy !== null || !calendarId}
            >
              unsubscribe (게스트)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log (최신 순)</CardTitle>
          <CardDescription>
            복사해서 research 문서에 붙여넣기. 실측 결과는 자동 타임스탬프 포함.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <p className="text-muted-foreground text-sm">아직 실행 내역 없음</p>
          ) : (
            <pre className="bg-muted max-h-[480px] overflow-auto rounded p-3 text-xs">
              {JSON.stringify(log, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
