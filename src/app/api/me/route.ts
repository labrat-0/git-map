import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Current user (never exposes the token). 401 when signed out. */
export async function GET() {
  const session = await getSession();
  if (!session.token || !session.login) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    login: session.login,
    avatarUrl: session.avatarUrl ?? null,
  });
}
