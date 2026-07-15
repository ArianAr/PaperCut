import { NextResponse } from "next/server";
import {
  authCookieName,
  createUnlockToken,
  unlockCookieOptions,
} from "@/lib/auth-cookie";
import { getDb } from "@/lib/db";
import { unlockPaste } from "@/lib/paste";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
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

  const token = createUnlockToken(id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookieName(id), token, unlockCookieOptions());
  return response;
}
