import { NextResponse } from "next/server";
import { purgeExpiredPastes } from "@/lib/cleanup";
import { getDb } from "@/lib/db";
import { recordMetric } from "@/lib/metrics";
import { createPaste } from "@/lib/paste";
import {
  clientKeyFromRequest,
  getCreateRateLimiter,
} from "@/lib/rate-limit";
import { buildPasteUrl } from "@/lib/urls";

export const runtime = "nodejs";

interface CreateBody {
  content?: unknown;
  expire?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  const rate = getCreateRateLimiter().attempt(
    `create:${clientKeyFromRequest(request)}`,
  );
  if (!rate.allowed) {
    recordMetric("rate_limited");
    return NextResponse.json(
      { error: "Too many pastes created. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.content !== "string") {
    return NextResponse.json(
      { error: "content must be a string" },
      { status: 400 },
    );
  }

  if (body.expire != null && typeof body.expire !== "string") {
    return NextResponse.json(
      { error: "expire must be a string when provided" },
      { status: 400 },
    );
  }

  if (body.password != null && typeof body.password !== "string") {
    return NextResponse.json(
      { error: "password must be a string when provided" },
      { status: 400 },
    );
  }

  const db = getDb();
  purgeExpiredPastes(db);

  const result = createPaste(db, {
    content: body.content,
    expire: body.expire as string | undefined,
    password: body.password as string | undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  recordMetric("pastes_created");
  const url = buildPasteUrl(result.id, request.url);

  return NextResponse.json(
    {
      id: result.id,
      url,
      expiresAt: result.expiresAt,
      metadata: result.metadata,
    },
    { status: 201 },
  );
}
