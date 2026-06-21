import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/cli — 레거시 CLI 인증 진입점 (#794 정리).
 *
 * spec 007 에서 도입한 query 전달 흐름(`?token=`)을 폐기하고, fragment 전달
 * 흐름인 `/bootstrap` 으로 영구 위임한다. 모든 1차 소비자(install.sh·MCP·
 * auth-login)는 이미 `/bootstrap` 을 직접 사용한다. 본 라우트는 과거 직접 호출
 * 하위호환을 위한 thin alias 로만 남으며, **PAT 를 직접 발급하지 않는다**
 * (토큰 URL query 노출 0). `port`/`state` 는 비밀이 아니므로 그대로 보존해
 * `/bootstrap` 으로 넘긴다.
 */
export function GET(request: NextRequest) {
  const { search } = request.nextUrl;
  return NextResponse.redirect(new URL(`/bootstrap${search}`, request.url));
}
