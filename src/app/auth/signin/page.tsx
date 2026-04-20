import { signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; stale?: string }>;
}) {
  const { callbackUrl, stale } = await searchParams;
  const redirectTo = callbackUrl || "/";

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
