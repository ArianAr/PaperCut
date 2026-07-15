import { NextResponse } from "next/server";
import {
  authCookieName,
  createUnlockToken,
  unlockCookieOptions,
} from "@/lib/auth-cookie";
import { getDb } from "@/lib/db";
import { recordMetric } from "@/lib/metrics";
import { unlockPaste } from "@/lib/paste";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Key by paste + client so brute force is limited per paste without logging IPs
  const rateKey = `unlock:${id}:${clientKeyFromRequest(request)}`;
  const rate = await checkRateLimit("unlock", rateKey);
  if (!rate.allowed) {
    recordMetric("rate_limited");
    return NextResponse.json(
      { error: "Too many unlock attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.password !== "string" || body.password.length === 0) {
    return NextResponse.json(
      { error: "password is required" },
      { status: 400 },
    );
  }

  const result = unlockPaste(getDb(), id, body.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  recordMetric("unlocks_ok");
  const token = createUnlockToken(id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName(id), token, unlockCookieOptions());
  return response;
}
