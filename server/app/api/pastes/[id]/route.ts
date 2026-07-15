import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  authCookieName,
  verifyUnlockToken,
} from "@/lib/auth-cookie";
import { getDb } from "@/lib/db";
import { getPaste } from "@/lib/paste";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName(id))?.value;
  const unlocked = verifyUnlockToken(id, token);

  const result = getPaste(getDb(), id, { unlocked });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.locked ? { locked: true } : {}),
      },
      { status: result.status },
    );
  }

  const { paste } = result;
  return NextResponse.json({
    id: paste.id,
    rawContent: paste.rawContent,
    createdAt: paste.createdAt,
    expiresAt: paste.expiresAt,
    isEncrypted: paste.isEncrypted,
    metadata: paste.metadata,
  });
}
