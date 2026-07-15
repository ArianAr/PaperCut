import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createPaste } from "@/lib/paste";
import { buildPasteUrl } from "@/lib/urls";

export const runtime = "nodejs";

interface CreateBody {
  content?: unknown;
  expire?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
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

  const result = createPaste(getDb(), {
    content: body.content,
    expire: body.expire as string | undefined,
    password: body.password as string | undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

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
