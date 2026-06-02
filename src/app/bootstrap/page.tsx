/**
 * spec 030 T005 — install.sh 의 OAuth listener 가 브라우저로 열어 사용자
 * 인증 + PAT 자동 발급을 받는 페이지. 세션 미인증 시 /auth/signin 로
 * 보내고 redirect back. 인증되면 자동 PAT 발급 → localhost listener 로 redirect.
 *
 * 보안: `port` 는 1024 이상 65535 이하 정수만 허용. `state` 는 listener 가
 * 생성한 nonce 로 callback 검증용. PAT 평문은 본 페이지 응답에서만 한 번
 * 노출되고 fragment(#) 로 redirect 해 서버 로그·referrer 에 남지 않는다.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-helpers";
import { createPAT } from "@/lib/token-helpers";

function isValidPort(s: string): boolean {
  if (!/^\d+$/.test(s)) return false;
  const n = parseInt(s, 10);
  return n >= 1024 && n <= 65535;
}

function isValidState(s: string): boolean {
  // 32 hex char nonce
  return /^[a-f0-9]{32}$/i.test(s);
}

async function deviceLabelFromHeaders(): Promise<string> {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  let label = "MCP bootstrap";
  if (/Macintosh|Mac OS X/i.test(ua)) label = "macOS bootstrap";
  else if (/Windows/i.test(ua)) label = "Windows bootstrap";
  else if (/Linux/i.test(ua)) label = "Linux bootstrap";
  const stamp = new Date().toISOString().slice(0, 10);
  return `${label} (${stamp})`;
}

interface SP {
  port?: string;
  state?: string;
}

export default async function BootstrapPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const port = sp.port ?? "";
  const state = sp.state ?? "";

  if (!isValidPort(port) || !isValidState(state)) {
    return (
      <PageShell title="잘못된 요청">
        <p className="text-muted-foreground text-sm">
          install 흐름 외부에서 직접 열린 페이지입니다. install 스크립트를 다시
          실행해 주세요.
        </p>
      </PageShell>
    );
  }

  const session = await getSession();
  if (!session?.user?.id) {
    const callbackUrl = `/bootstrap?port=${port}&state=${state}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 인증 OK — PAT 발급 + localhost listener 로 redirect (fragment).
  const label = await deviceLabelFromHeaders();
  const pat = await createPAT(session.user.id, label, null);
  const target = `http://127.0.0.1:${port}/callback#token=${encodeURIComponent(
    pat.rawToken,
  )}&state=${encodeURIComponent(state)}`;

  return (
    <PageShell title="MCP 등록 준비 완료">
      <p className="text-muted-foreground text-sm">
        install 스크립트가 자동으로 등록을 마칩니다. 이 창은 닫아도 됩니다.
      </p>
      <noscript>
        <p className="mt-2 text-sm">
          자동 진행이 안 되면 아래 링크를 직접 눌러주세요.{" "}
          <a className="text-foreground underline" href={target}>
            install 스크립트로 돌아가기
          </a>
        </p>
      </noscript>
      <script
        // 클라이언트에서 fragment 포함 navigation. SSR 응답에 토큰 평문이
        // 들어가는 길은 노출 회피를 위해 fragment 사용 — server log/referrer
        // 모두 token 미노출.
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(target)});`,
        }}
      />
    </PageShell>
  );
}

function PageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}
