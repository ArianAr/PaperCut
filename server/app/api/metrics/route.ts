import { NextResponse } from "next/server";
import { getMetrics, isMetricsEnabled } from "@/lib/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opt-in process counters for operators (scraping / health dashboards).
 * Returns 404 when PAPERCUT_METRICS is not enabled.
 * Never includes paste bodies, client IPs, or rate-limit keys.
 */
export async function GET() {
  if (!isMetricsEnabled()) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const snap = getMetrics().snapshot();
  return NextResponse.json(
    {
      ok: true,
      service: "papercut",
      ...snap,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
