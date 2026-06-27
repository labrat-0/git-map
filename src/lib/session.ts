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

const SESSION_COOKIE: Pick<SessionOptions, "cookieName" | "cookieOptions"> = {
  cookieName: "gitmap_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "[session] SESSION_SECRET env var is missing or shorter than 32 characters. " +
      "Set it in .env.local — generate one with `openssl rand -hex 32`."
    );
  }
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, { ...SESSION_COOKIE, password });
}
