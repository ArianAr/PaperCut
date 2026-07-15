import { NextResponse } from "next/server";
import { purgeExpiredPastes } from "@/lib/cleanup";
import { getDb } from "@/lib/db";
import { recordMetric } from "@/lib/metrics";
import { createPaste } from "@/lib/paste";
import {
  checkRateLimit,
  clientKeyFromRequest,
} from "@/lib/rate-limit";
import { getMaxPasteSize } from "@/lib/env";
import {
  JSON_CREATE_OVERHEAD_BYTES,
  readBodyWithLimit,
  readJsonBodyWithLimit,
} from "@/lib/request-body";
import { buildPasteUrl } from "@/lib/urls";

export const runtime = "nodejs";

interface CreateBody {
  content?: unknown;
  expire?: unknown;
  password?: unknown;
}

async function rateLimitCreate(request: Request) {
  const rate = await checkRateLimit(
    "create",
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
  return null;
}

function createResponse(
  request: Request,
  result: ReturnType<typeof createPaste>,
) {
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

/**
 * Create a paste.
 * - `application/json` — classic `{ content, expire?, password? }`
 * - `text/plain` (or octet-stream) — stream body as content; optional headers
 *   `X-PaperCut-Expire`, `X-PaperCut-Password` for large stdin without JSON wrap
 */
export async function POST(request: Request) {
  const limited = await rateLimitCreate(request);
  if (limited) return limited;

  const contentType = request.headers.get("content-type") ?? "";
  const db = getDb();
  purgeExpiredPastes(db);
  const max = getMaxPasteSize();

  // Streaming / raw body path (CLI large stdin)
  if (
    contentType.includes("text/plain") ||
    contentType.includes("application/octet-stream")
  ) {
    const buf = await readBodyWithLimit(request, max, {
      exceedMessage: `content exceeds MAX_PASTE_SIZE (${max} bytes)`,
    });
    if (!buf.ok) {
      return NextResponse.json({ error: buf.error }, { status: buf.status });
    }
    const expire = request.headers.get("x-papercut-expire") ?? undefined;
    const password = request.headers.get("x-papercut-password") ?? undefined;
    const result = createPaste(db, {
      content: buf.text,
      expire: expire || undefined,
      password: password || undefined,
    });
    return createResponse(request, result);
  }

  // JSON path: hard byte limit before parse (content + wrapper overhead)
  const jsonMax = max + JSON_CREATE_OVERHEAD_BYTES;
  const parsed = await readJsonBodyWithLimit<CreateBody>(request, jsonMax, {
    exceedMessage: `request body exceeds maximum size of ${jsonMax} bytes`,
  });
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status },
    );
  }
  const body = parsed.value;

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

  const result = createPaste(db, {
    content: body.content,
    expire: body.expire as string | undefined,
    password: body.password as string | undefined,
  });

  return createResponse(request, result);
}
