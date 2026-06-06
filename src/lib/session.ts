import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  /** GitHub OAuth access token — server-only, never sent to the client. */
  token?: string;
  login?: string;
  avatarUrl?: string;
  /** Transient CSRF value for the OAuth round-trip. */
  oauthState?: string;
}

const password = process.env.SESSION_SECRET;
if (!password || password.length < 32) {
  // Fail loud in dev; on Fly this comes from `fly secrets set SESSION_SECRET=...`.
  console.warn(
    "[session] SESSION_SECRET missing or <32 chars. Set it in .env.local (dev) or fly secrets (prod).",
  );
}

export const sessionOptions: SessionOptions = {
  password: password ?? "dev-only-insecure-password-change-me-32chars",
  cookieName: "gitmap_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
