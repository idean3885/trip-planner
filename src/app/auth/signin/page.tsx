import { signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const redirectTo = callbackUrl || "/";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-heading-lg font-bold text-surface-900">
            우리의 여행
          </h1>
          <p className="text-body-md text-surface-500">
            로그인하고 여행 일정을 관리하세요
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-surface-900 px-4 py-3 text-body-md font-medium text-white transition-colors hover:bg-surface-700"
          >
            Google 계정으로 로그인
          </button>
        </form>
      </div>
    </div>
  );
}
