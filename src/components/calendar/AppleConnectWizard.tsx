"use client";

/**
 * spec 025 (#417) — Apple iCloud CalDAV 연결 위자드.
 *
 * 4단계 stepper:
 *  Step 1 — 사전 안내 (2FA 활성 + 패스키 또는 비밀번호 인증 가능 여부)
 *  Step 2 — appleid.apple.com 외부 링크 + 가이드 (캡쳐 3장)
 *  Step 3 — Apple ID + 16자리 앱 암호 입력 + /validate 호출
 *  Step 4 — connectAppleCalendar 결과 + 첫 sync 안내
 *
 * 한 컴포넌트에 모든 단계 — Step 별 분리 컴포넌트 분해는 후속 회차에서 검토.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

type WizardStep = 1 | 2 | 3 | 4;

/**
 * connect 라우트의 에러 코드를 사용자가 읽을 수 있는 한국어로 매핑.
 * 코드 그대로 노출되면 의미 전달 실패(2026-04-28 사용자 피드백).
 */
function mapConnectError(
  code: string | undefined,
  data: { currentProvider?: string; reauthUrl?: string; reason?: string },
): string {
  switch (code) {
    case "already_linked_other_provider":
      return data.currentProvider === "GOOGLE"
        ? "이 여행은 이미 구글 캘린더에 연결되어 있습니다. 기존 구글 캘린더 패널에서 연결 해제 후 다시 시도해 주세요."
        : "이 여행은 이미 다른 캘린더에 연결되어 있습니다. 기존 연결을 해제 후 다시 시도해 주세요.";
    case "owner_only":
      return "주인만 캘린더를 연결할 수 있습니다.";
    case "not_a_member":
      return "이 여행의 동행자만 진행할 수 있습니다.";
    case "trip_not_found":
      return "여행 정보를 찾을 수 없습니다.";
    case "apple_not_authenticated":
      return "Apple 자격증명이 만료되었거나 누락되었습니다. 위자드 처음부터 다시 시도해 주세요.";
    case "calendar_create_failed":
      return `iCloud 캘린더 생성에 실패했습니다. 잠시 후 다시 시도해 주세요. (${data.reason ?? "unknown"})`;
    default:
      return code
        ? `캘린더 연결에 실패했습니다 (${code})`
        : "캘린더 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

interface AppleConnectWizardProps {
  tripId: number;
  /** 위자드 종료 시 호출. UI는 모달 또는 별도 페이지 둘 다 지원. */
  onClose?: () => void;
  /** 재인증 모드 — true면 Step 3부터 시작, 캘린더 재생성 안 함. */
  reauth?: boolean;
}

export default function AppleConnectWizard({
  tripId,
  onClose,
  reauth = false,
}: AppleConnectWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(reauth ? 3 : 1);
  const [appleId, setAppleId] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [connectResult, setConnectResult] = useState<{
    calendarName?: string | null;
    manualAclGuidance?: string;
  } | null>(null);

  async function handleValidate() {
    setValidateError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v2/calendar/apple/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appleId, appPassword }),
      });
      if (res.status === 401) {
        setValidateError(
          "암호가 잘못되었습니다 — appleid.apple.com에서 폐기·재발급 후 다시 시도해 주세요.",
        );
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setValidateError(`검증에 실패했습니다 (${data.error ?? res.status})`);
        return;
      }

      if (reauth) {
        toast.success("Apple 자격증명이 갱신되었습니다.");
        onClose?.();
        router.refresh();
        return;
      }

      // 정상 흐름: Step 4로 이동하면서 connect 호출
      const connectRes = await fetch(
        `/api/v2/trips/${tripId}/calendar/apple/connect`,
        { method: "POST" },
      );
      const connectData = await connectRes.json().catch(() => ({}));
      if (!connectRes.ok) {
        const code = connectData.error as string | undefined;
        const msg = mapConnectError(code, connectData);
        setValidateError(msg);
        return;
      }
      setConnectResult({
        calendarName: connectData.link?.calendarName ?? null,
        manualAclGuidance: connectData.manualAclGuidance,
      });
      setStep(4);
    } catch (e) {
      setValidateError(
        e instanceof Error ? e.message : "네트워크 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const stepLabels = [
    "1. 사전 확인",
    "2. 앱 암호 발급",
    "3. 입력 · 검증",
    "4. 연결 완료",
  ];

  return (
    <Card className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">Apple 캘린더 연결</h2>
        <ol className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as WizardStep;
            const active = n === step;
            const done = n < step;
            return (
              <li
                key={label}
                className={
                  active
                    ? "rounded bg-primary px-2 py-1 font-medium text-primary-foreground"
                    : done
                      ? "rounded px-2 py-1 line-through opacity-60"
                      : "rounded px-2 py-1"
                }
              >
                {label}
              </li>
            );
          })}
        </ol>
      </header>

      {step === 1 && (
        <section className="space-y-4">
          <h3 className="font-medium">사전 확인</h3>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>Apple ID에 <strong>2단계 인증(2FA)</strong>이 활성화되어 있어야 합니다.</li>
            <li>패스키 또는 비밀번호 어느 쪽으로 로그인하든 무관합니다.</li>
            <li>
              본 흐름은 Apple의{" "}
              <strong>앱 전용 암호(app-specific password)</strong>를 발급받아 사용합니다.
              일반 Apple ID 비밀번호는 입력하지 않습니다.
            </li>
          </ul>
          <div className="flex justify-end gap-2">
            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                취소
              </Button>
            )}
            <Button onClick={() => setStep(2)}>다음</Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h3 className="font-medium">앱 전용 암호 발급</h3>
          <ol className="list-inside list-decimal space-y-2 text-sm">
            <li>
              <a
                href="https://appleid.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                appleid.apple.com
              </a>
              에 로그인 → &ldquo;로그인 및 보안&rdquo; → &ldquo;앱 암호&rdquo;.
            </li>
            <li>&ldquo;앱 암호 만들기&rdquo; 버튼을 클릭합니다.</li>
            <li>라벨에 <code>trip-planner</code>를 입력합니다.</li>
            <li>Apple이 표시한 16자리 암호를 복사합니다 (XXXX-XXXX-XXXX-XXXX 형태).</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-3">
            <figure className="space-y-1">
              <Image
                src="/research/apple-caldav-screenshots/step-4-create-button.png"
                alt="앱 암호 만들기 버튼"
                width={300}
                height={200}
                className="rounded border"
              />
              <figcaption className="text-xs text-muted-foreground">
                &ldquo;만들기&rdquo; 버튼
              </figcaption>
            </figure>
            <figure className="space-y-1">
              <Image
                src="/research/apple-caldav-screenshots/step-5-label.png"
                alt="라벨 입력"
                width={300}
                height={200}
                className="rounded border"
              />
              <figcaption className="text-xs text-muted-foreground">
                라벨 trip-planner
              </figcaption>
            </figure>
            <figure className="space-y-1">
              <Image
                src="/research/apple-caldav-screenshots/step-6-password.png"
                alt="16자리 암호 표시"
                width={300}
                height={200}
                className="rounded border"
              />
              <figcaption className="text-xs text-muted-foreground">
                16자리 암호 복사
              </figcaption>
            </figure>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ Apple은 이 16자리 암호를 한 번만 보여줍니다. 잃어버리면 폐기 후 재발급해야 합니다.
            저희 서버는 이 값을 AES-256-GCM으로 암호화해 보관합니다.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              이전
            </Button>
            <Button onClick={() => setStep(3)}>다음</Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h3 className="font-medium">자격증명 입력</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="apple-id">Apple ID (이메일)</Label>
              <Input
                id="apple-id"
                type="email"
                value={appleId}
                onChange={(e) => setAppleId(e.target.value)}
                placeholder="you@icloud.com"
                autoComplete="username"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="app-password">앱 전용 암호 (16자리)</Label>
              <Input
                id="app-password"
                type="password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                autoComplete="current-password"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                appleid.apple.com에서 발급한 16자리 앱 전용 암호. 일반 Apple ID 비밀번호 아님.
              </p>
            </div>
            {validateError && (
              <p className="text-sm text-destructive" role="alert">
                {validateError}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {!reauth && (
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                disabled={submitting}
              >
                이전
              </Button>
            )}
            <Button
              onClick={handleValidate}
              disabled={submitting || !appleId || !appPassword}
            >
              {submitting ? "검증 중…" : reauth ? "재인증" : "검증 후 연결"}
            </Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <h3 className="font-medium">연결 완료</h3>
          <p className="text-sm">
            Apple 캘린더 <strong>{connectResult?.calendarName ?? "trip-planner"}</strong>가
            iCloud에 생성되었습니다. iPhone Calendar 앱에서 곧 표시됩니다(동기화에 수십 초 소요).
          </p>
          {connectResult?.manualAclGuidance && (
            <div className="rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-sm">
              <p className="font-medium">동행자에게 캘린더 공유 안내</p>
              <p className="mt-1">{connectResult.manualAclGuidance}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Apple은 trip-planner가 자동으로 멤버를 초대할 수 없는 구조입니다.
                Calendar 앱 → 본 캘린더 → 캘린더 공유에서 직접 초대해 주세요.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                onClose?.();
                router.refresh();
              }}
            >
              닫기
            </Button>
          </div>
        </section>
      )}
    </Card>
  );
}
