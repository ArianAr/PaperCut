import { NextResponse } from "next/server";
import { purgeExpiredPastes } from "@/lib/cleanup";
import { getDb } from "@/lib/db";
import { pastes } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness for Docker and orchestrators.
 * Does not return paste contents or client metadata.
 */
export async function GET() {
  try {
    const db = getDb();
    // Lightweight query to confirm SQLite is usable
    db.select({ id: pastes.id }).from(pastes).limit(1).all();
    const purged = purgeExpiredPastes(db);

    return NextResponse.json(
      {
        ok: true,
        service: "papercut",
        version: process.env.npm_package_version ?? "unknown",
        purgedExpired: purged,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { ok: false, service: "papercut", error: "unhealthy" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
