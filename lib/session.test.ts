import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSession, readSession } from "./session";

function token(payload: { userId: number; exp: number }) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", "development-only-secret-change-me").update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

describe("session", () => {
  it("membaca session valid", () => expect(readSession(createSession(7))).toBe(7));
  it("menolak cookie malformed dan signature salah", () => {
    expect(readSession("bukan-session")).toBeNull();
    expect(readSession(`${createSession(7)}x`)).toBeNull();
  });
  it("menolak session yang sudah kedaluwarsa", () => expect(readSession(token({ userId: 7, exp: Date.now() - 1 }))).toBeNull());
});
