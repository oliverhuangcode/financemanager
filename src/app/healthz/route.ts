import { NextResponse } from "next/server";

/** Liveness check for Dokploy/Uptime Kuma. No auth, no database. */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
