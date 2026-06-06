import { NextResponse, type NextRequest } from "next/server";
import { Octokit } from "@octokit/rest";
import { GITHUB_OAUTH_TOKEN } from "@/lib/github";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Exchange the OAuth code for a token (server-side), then persist the session. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const session = await getSession();

  // CSRF: state must match the value we issued in /login.
  if (!code || !state || state !== session.oauthState) {
    session.oauthState = undefined;
    await session.save();
    return NextResponse.redirect(new URL("/?error=oauth_state", req.nextUrl.origin));
  }
  session.oauthState = undefined;

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "GitHub OAuth env not configured" },
      { status: 500 },
    );
  }

  const tokenRes = await fetch(GITHUB_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenJson.access_token) {
    return NextResponse.redirect(new URL("/?error=oauth_token", req.nextUrl.origin));
  }

  // Look up the authenticated user for display.
  const octokit = new Octokit({ auth: tokenJson.access_token });
  const { data: user } = await octokit.rest.users.getAuthenticated();

  session.token = tokenJson.access_token;
  session.login = user.login;
  session.avatarUrl = user.avatar_url;
  await session.save();

  return NextResponse.redirect(new URL("/", req.nextUrl.origin));
}
