import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { GITHUB_OAUTH_AUTHORIZE, GITHUB_SCOPE } from "@/lib/github";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Redirect to GitHub's authorize page with a CSRF `state` stored in session. */
export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID not configured" },
      { status: 500 },
    );
  }

  const callbackUrl =
    process.env.OAUTH_CALLBACK_URL ??
    new URL("/api/auth/callback", req.nextUrl.origin).toString();

  const state = randomBytes(16).toString("hex");
  const session = await getSession();
  session.oauthState = state;
  await session.save();

  const authorize = new URL(GITHUB_OAUTH_AUTHORIZE);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl);
  authorize.searchParams.set("scope", GITHUB_SCOPE);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "true");

  return NextResponse.redirect(authorize.toString());
}
