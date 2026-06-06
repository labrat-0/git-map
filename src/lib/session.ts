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
  throw new Error(
    "[session] SESSION_SECRET env var is missing or shorter than 32 characters. " +
    "Set it in .env.local (dev) or via `fly secrets set SESSION_SECRET=...` (prod)."
  );
}

export const sessionOptions: SessionOptions = {
  password,
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
