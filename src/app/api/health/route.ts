import { NextResponse } from "next/server";

// Fly health check target.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, service: "git-map" });
}
