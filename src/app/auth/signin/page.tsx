import { signIn } from "@/auth";

/**
 * Auth.js가 signin 페이지로 보낼 수 있는 error 코드 → 사용자 안내 문구.
 * https://authjs.dev/reference/errors
 *
 * 사용자가 Google 동의 화면에서 취소하면 Google이 `iss` 없는 error 응답을 보내
 * Auth.js가 Configuration 에러로 승격한다. UX 관점에서 취소는 에러가 아니므로
 * "로그인을 취소했다"는 맥락 안내로 치환.
 */
const ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: "로그인을 취소했습니다. 다시 시도하려면 아래 버튼을 눌러 주세요.",
  OAuthSignin: "로그인 요청을 처리할 수 없었습니다. 다시 시도해 주세요.",
  AccessDenied: "로그인 권한이 없습니다. 관리자에게 문의하거나 다시 시도해 주세요.",
  Verification: "인증 링크가 만료되었거나 이미 사용되었습니다.",
  Configuration:
    "로그인을 취소했거나, 중간에 문제가 발생했습니다. 다시 시도해 주세요.",
  Default: "로그인 중 문제가 발생했습니다. 다시 시도해 주세요.",
};

function errorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.Default;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; stale?: string; error?: string }>;
}) {
  const { callbackUrl, stale, error } = await searchParams;
  const redirectTo = callbackUrl || "/";
  const errorNotice = errorMessage(error);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            우리의 여행
          </h1>
          <p className="text-sm text-muted-foreground">
            로그인하고 여행 일정을 관리하세요
          </p>
        </div>
        {stale === "1" && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
            이전 세션이 유효하지 않아 자동으로 정리했습니다. 다시 로그인해 주세요.
          </div>
        )}
        {errorNotice && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
            {errorNotice}
          </div>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-foreground px-4 py-3 text-base font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Google 계정으로 로그인
          </button>
        </form>
      </div>
    </div>
  );
}
