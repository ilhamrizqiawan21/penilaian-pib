import { env } from "@/lib/env";
const secret = env.SESSION_SECRET;

function decode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
}

export async function hasValidSession(value?: string) {
  try {
    if (!value) return false;
    const parts = value.split(".");
    if (parts.length !== 2) return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("HMAC", key, decode(parts[1]), new TextEncoder().encode(parts[0]))) return false;
    const data = JSON.parse(new TextDecoder().decode(decode(parts[0]))) as { userId?: number; exp?: number };
    return Number.isInteger(data.userId) && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
