import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { BasicPasteView } from "@/components/BasicPasteView";
import { PasswordGate } from "@/components/PasswordGate";
import { authCookieName, verifyUnlockToken } from "@/lib/auth-cookie";
import { getDb } from "@/lib/db";
import { getPaste, getPasteLockInfo } from "@/lib/paste";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function PastePage({ params }: PageProps) {
  const { id } = await params;
  if (!id || id.length > 64) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName(id))?.value;
  const unlocked = verifyUnlockToken(id, token);

  const result = getPaste(getDb(), id, { unlocked });

  if (!result.ok) {
    if (result.locked) {
      const info = getPasteLockInfo(getDb(), id);
      if (!info.ok) notFound();
      return <PasswordGate pasteId={id} />;
    }
    notFound();
  }

  const { paste } = result;
  return (
    <BasicPasteView
      id={paste.id}
      rawContent={paste.rawContent}
      metadata={paste.metadata}
      createdAt={paste.createdAt}
      expiresAt={paste.expiresAt}
    />
  );
}
