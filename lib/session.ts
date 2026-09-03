import crypto from "node:crypto";
import { env } from "@/lib/env";

const secret = env.SESSION_SECRET;
const sign = (value: string) => crypto.createHmac("sha256", secret).update(value).digest("base64url");

export function createSession(userId: number) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 2592000000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSession(value?: string) {
  try {
    if (!value) return null;
    const parts = value.split(".");
    if (parts.length !== 2) return null;
    const expected = sign(parts[0]);
    const actual = Buffer.from(parts[1]);
    const expectedBuffer = Buffer.from(expected);
    if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) return null;
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString()) as { userId?: number; exp?: number };
    return Number.isInteger(data.userId) && typeof data.exp === "number" && data.exp > Date.now() ? data.userId : null;
  } catch {
    return null;
  }
}
