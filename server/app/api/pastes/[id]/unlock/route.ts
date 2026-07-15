import { NextResponse } from "next/server";
import {
  authCookieName,
  createUnlockToken,
  unlockCookieOptions,
} from "@/lib/auth-cookie";
import { getDb } from "@/lib/db";
import { recordMetric } from "@/lib/metrics";
import { unlockPaste } from "@/lib/paste";
import {
  MAX_PASSWORD_LENGTH,
  validatePasswordInput,
} from "@/lib/password";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/rate-limit";
import {
  UNLOCK_MAX_BODY_BYTES,
  readJsonBodyWithLimit,
} from "@/lib/request-body";

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

  const parsed = await readJsonBodyWithLimit<{ password?: unknown }>(
    request,
    UNLOCK_MAX_BODY_BYTES,
    {
      exceedMessage: `request body exceeds maximum size of ${UNLOCK_MAX_BODY_BYTES} bytes`,
    },
  );
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status },
    );
  }
  const body = parsed.value;

  if (typeof body.password !== "string" || body.password.length === 0) {
    return NextResponse.json(
      { error: "password is required" },
      { status: 400 },
    );
  }

  const pwCheck = validatePasswordInput(body.password);
  if (!pwCheck.ok) {
    return NextResponse.json(
      {
        error:
          body.password.length > MAX_PASSWORD_LENGTH
            ? pwCheck.error
            : "password is required",
      },
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
