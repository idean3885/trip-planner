/**
 * spec 025 (#417) — Apple iCloud CalDAV 자격증명 검증·저장 라우트.
 *
 * POST /api/v2/calendar/apple/validate
 *   body: { appleId: string, appPassword: string }
 *
 * 1. tsdav createDAVClient + fetchCalendars로 PROPFIND 검증
 * 2. 성공 시 AppleCalendarCredential upsert (AES-256-GCM 암호화)
 * 3. 실패 시 401(auth_invalid) / 502(transient_failure) 분류
 *
 * 본 라우트는 위자드 Step 3에서 호출. 성공 후 위자드는 connect 라우트로 진입.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAppleClient } from "@/lib/calendar/provider/apple-client";
import { encryptPassword } from "@/lib/calendar/provider/apple-crypto";
import { appleProvider } from "@/lib/calendar/provider/apple";

interface ValidateBody {
  appleId?: unknown;
  appPassword?: unknown;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: ValidateBody;
  try {
    body = (await req.json()) as ValidateBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const appleId = typeof body.appleId === "string" ? body.appleId.trim() : "";
  const appPassword =
    typeof body.appPassword === "string" ? body.appPassword.replace(/\s+/g, "") : "";
  if (!appleId || !appPassword) {
    return NextResponse.json(
      { error: "missing_fields", fields: ["appleId", "appPassword"] },
      { status: 400 },
    );
  }
  // 16자리 (Apple app-specific password format) 검증은 사용자 안내용 hint만 — Apple이 변경할
  // 가능성 대비 길이 강제 안 함. 401 응답으로 자연 실패하도록 둔다.

  let valid = false;
  let errorCode: string | null = null;
  try {
    const client = await createAppleClient({ appleId, appPassword });
    await client.fetchCalendars();
    valid = true;
  } catch (e) {
    errorCode = appleProvider.classifyError(e);
  }

  if (!valid) {
    return NextResponse.json(
      { valid: false, error: errorCode ?? "unknown" },
      { status: errorCode === "auth_invalid" ? 401 : 502 },
    );
  }

  const { ciphertext, iv } = encryptPassword(appPassword);
  await prisma.appleCalendarCredential.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      appleId,
      encryptedPassword: ciphertext,
      iv,
      lastValidatedAt: new Date(),
      lastError: null,
    },
    update: {
      appleId,
      encryptedPassword: ciphertext,
      iv,
      lastValidatedAt: new Date(),
      lastError: null,
    },
  });

  return NextResponse.json({ valid: true }, { status: 200 });
}
