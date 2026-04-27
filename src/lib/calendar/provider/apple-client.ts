/**
 * spec 025 (#417) — tsdav 단일 진입점.
 *
 * 라우트·service·provider는 직접 `tsdav`를 import하지 않는다. 향후 라이브러리 변경 시
 * 본 wrapper만 교체하면 된다.
 *
 * Apple iCloud는 Basic Auth + app-specific password만 허용 (POC #345 측정).
 */

import { createDAVClient } from "tsdav";

const ICLOUD_SERVER_URL = "https://caldav.icloud.com";

/** Apple ID + 앱 암호로 DAVClient를 생성한다. 401은 첫 호출(account discovery)에서 즉시 발생. */
export async function createAppleClient(args: {
  appleId: string;
  appPassword: string;
}): Promise<Awaited<ReturnType<typeof createDAVClient>>> {
  return createDAVClient({
    serverUrl: ICLOUD_SERVER_URL,
    credentials: {
      username: args.appleId,
      password: args.appPassword,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
}

/** 본 모듈에서 다른 모듈로 노출하는 클라이언트 타입. */
export type AppleDAVClient = Awaited<ReturnType<typeof createAppleClient>>;
