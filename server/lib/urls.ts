import { getPublicUrl } from "./env";

/**
 * Resolve the public paste URL for API responses.
 * Prefers PAPERCUT_PUBLIC_URL, else request origin.
 */
export function buildPasteUrl(id: string, requestUrl: string): string {
  const configured = getPublicUrl();
  if (configured) {
    return `${configured}/paste/${id}`;
  }
  const origin = new URL(requestUrl).origin;
  return `${origin}/paste/${id}`;
}
