"use client";

/**
 * spec 025 (#417, hotfix v2.11.5) — Apple iCloud CalDAV 연결 단일 화면.
 *
 * 4단계 stepper(v2.11.0) → 단일 화면 + collapsible 가이드 + prefill +
 * dash 자동 포맷팅 + toast 완료(2026-04-28 사용자 피드백 — 4단계 허들 큼).
 *
 * 진입:
 *  - 신규: prefill된 이메일(session.user.email) + 빈 암호 → 16자리 입력 → "연결"
 *  - 재인증(`?apple_reauth=1`): Apple ID 필드 disabled + 새 16자리만 받기, 캘린더
 *    재생성 0회
 */

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface AppleConnectWizardProps {
  tripId: number;
  /** 사용자 세션 이메일 — Apple ID에 자동 prefill. 사용자가 수정 가능. */
  prefillEmail?: string;
  /** 재인증 모드 — true면 Apple ID 필드 disabled + 캘린더 재생성 안 함. */
  reauth?: boolean;
}

/**
 * connect 라우트의 에러 코드를 사용자가 읽을 수 있는 한국어로 매핑.
 */
function mapConnectError(
  code: string | undefined,
  data: { currentProvider?: string; reason?: string },
): string {
  switch (code) {
    case "already_linked_other_provider":
      return data.currentProvider === "GOOGLE"
        ? "이 여행은 이미 구글 캘린더에 연결되어 있습니다. 기존 구글 패널에서 해제 후 다시 시도해 주세요."
        : "이 여행은 이미 다른 캘린더에 연결되어 있습니다. 기존 연결을 해제 후 다시 시도해 주세요.";
    case "owner_only":
      return "주인만 캘린더를 연결할 수 있습니다.";
    case "not_a_member":
      return "이 여행의 동행자만 진행할 수 있습니다.";
    case "trip_not_found":
      return "여행 정보를 찾을 수 없습니다.";
    case "apple_not_authenticated":
      return "Apple 자격증명이 만료되었습니다. 다시 시도해 주세요.";
    case "calendar_create_failed":
      return `iCloud 캘린더 생성에 실패했습니다. 잠시 후 다시 시도해 주세요. (${data.reason ?? "unknown"})`;
    default:
      return code
        ? `캘린더 연결에 실패했습니다 (${code})`
        : "캘린더 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

/**
 * Apple 16자리 앱 암호의 표준 표기는 `xxxx-xxxx-xxxx-xxxx`. 사용자가 어떻게
 * 입력하든(공백·dash 혼재) 영문/숫자만 추려서 4자리마다 dash로 재구성.
 * 검증·저장은 dash 제거 후 16자만.
 */
function formatAppPassword(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return cleaned.replace(/(.{4})(?=.)/g, "$1-");
}

export default function AppleConnectWizard({
  tripId,
  prefillEmail,
  reauth = false,
}: AppleConnectWizardProps) {
  const router = useRouter();
  const [appleId, setAppleId] = useState(prefillEmail ?? "");
  const [appPassword, setAppPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidateError(null);
    setSubmitting(true);
    try {
      // dash 제거하고 16자만 보냄 (백엔드는 \s+만 strip하므로 dash 사전 제거 필요).
      const cleanPassword = appPassword.replace(/[^a-zA-Z0-9]/g, "");
      const validateRes = await fetch("/api/v2/calendar/apple/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId, appPassword: cleanPassword }),
      });
      if (validateRes.status === 401) {
        setValidateError(
          "암호가 잘못되었습니다 — appleid.apple.com에서 폐기·재발급 후 다시 시도해 주세요.",
        );
        return;
      }
      if (!validateRes.ok) {
        const data = await validateRes.json().catch(() => ({}));
        setValidateError(`검증에 실패했습니다 (${data.error ?? validateRes.status})`);
        return;
      }

      if (reauth) {
        toast.success("Apple 자격증명이 갱신되었습니다.");
        router.push(`/trips/${tripId}`);
        router.refresh();
        return;
      }

      const connectRes = await fetch(
        `/api/v2/trips/${tripId}/calendar/apple/connect`,
        { method: "POST" },
      );
      const connectData = await connectRes.json().catch(() => ({}));
      if (!connectRes.ok) {
        setValidateError(mapConnectError(connectData.error, connectData));
        return;
      }
      toast.success(
        `Apple 캘린더 "${connectData.link?.calendarName ?? "trip-planner"}"가 생성되었습니다. iPhone Calendar 앱에서 곧 표시됩니다.`,
      );
      if (connectData.manualAclGuidance) {
        toast.info(connectData.manualAclGuidance);
      }
      router.push(`/trips/${tripId}`);
      router.refresh();
    } catch (e) {
      setValidateError(
        e instanceof Error ? e.message : "네트워크 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-xl space-y-5 p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Apple 캘린더 연결</h2>
        <p className="text-sm text-muted-foreground">
          Apple ID에 2단계 인증(2FA)이 활성화되어 있어야 하고,{" "}
          <a
            href="https://appleid.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            appleid.apple.com
          </a>
          에서 16자리 앱 전용 암호가 필요합니다.
        </p>
        <button
          type="button"
          onClick={() => setGuideOpen((o) => !o)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {guideOpen ? "▾ 발급 가이드 닫기" : "▸ 발급 가이드 보기"}
        </button>
      </header>

      {guideOpen && (
        <section className="space-y-3 rounded-md border border-dashed border-input bg-muted/30 p-3 text-sm">
          <ol className="list-inside list-decimal space-y-1 text-xs">
            <li>
              appleid.apple.com 로그인 → &ldquo;로그인 및 보안&rdquo; →{" "}
              &ldquo;앱 암호&rdquo; → &ldquo;만들기&rdquo;
            </li>
            <li>
              라벨 <code>trip-planner</code> 입력
            </li>
            <li>표시된 16자리 암호 복사 (한 번만 표시되니 즉시 입력)</li>
          </ol>
          <div className="grid grid-cols-3 gap-2">
            <figure>
              <Image
                src="/research/apple-caldav-screenshots/step-4-create-button.png"
                alt="앱 암호 만들기 버튼"
                width={300}
                height={200}
                className="rounded border"
              />
            </figure>
            <figure>
              <Image
                src="/research/apple-caldav-screenshots/step-5-label.png"
                alt="라벨 입력"
                width={300}
                height={200}
                className="rounded border"
              />
            </figure>
            <figure>
              <Image
                src="/research/apple-caldav-screenshots/step-6-password.png"
                alt="16자리 암호 표시"
                width={300}
                height={200}
                className="rounded border"
              />
            </figure>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ 16자리 암호는 한 번만 표시됩니다. 분실 시 폐기 후 재발급이 필요합니다.
            본 서버는 입력값을 AES-256-GCM으로 암호화해 보관합니다.
          </p>
        </section>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="apple-id">Apple ID (이메일)</Label>
          <Input
            id="apple-id"
            type="email"
            value={appleId}
            onChange={(e) => setAppleId(e.target.value)}
            placeholder="you@icloud.com"
            autoComplete="username"
            disabled={submitting || reauth}
            required
          />
          {reauth && (
            <p className="text-xs text-muted-foreground">
              재인증 모드 — Apple ID는 변경할 수 없습니다.
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="app-password">앱 전용 암호 (16자리)</Label>
          <Input
            id="app-password"
            type="text"
            inputMode="text"
            value={appPassword}
            onChange={(e) => setAppPassword(formatAppPassword(e.target.value))}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            autoComplete="off"
            spellCheck={false}
            autoFocus={!!prefillEmail || reauth}
            disabled={submitting}
            required
          />
          <p className="text-xs text-muted-foreground">
            appleid.apple.com에서 발급한 16자리 앱 전용 암호. 일반 Apple ID 비밀번호
            아님. 입력 시 자동으로 4자리마다 dash로 정렬됩니다.
          </p>
        </div>
        {validateError && (
          <p className="text-sm text-destructive" role="alert">
            {validateError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="submit"
            disabled={
              submitting ||
              !appleId.trim() ||
              appPassword.replace(/[^a-zA-Z0-9]/g, "").length !== 16
            }
          >
            {submitting ? "검증 중…" : reauth ? "재인증" : "검증 후 연결"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
