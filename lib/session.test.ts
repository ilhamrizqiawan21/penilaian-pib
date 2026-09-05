import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => {
  return {
    env: {
      SESSION_SECRET: "test-secret-for-testing-only",
      DATABASE_URL: "file:./pib.sqlite",
    }
  };
});

import { createSession, readSession } from "@/lib/session";

describe("session", () => {
  it("membaca session valid", () => {
    expect(readSession(createSession(7))).toBe(7);
  });

  it("menolak cookie malformed dan signature salah", () => {
    expect(readSession("bukan-session")).toBeNull();
    expect(readSession(`${createSession(7)}x`)).toBeNull();
  });

  it("menolak session yang sudah kedaluwarsa", () => {
    const payload = Buffer.from(JSON.stringify({ userId: 7, exp: Date.now() - 1 })).toString("base64url");
    const signature = crypto.createHmac("sha256", "test-secret-for-testing-only").update(payload).digest("base64url");
    const expiredToken = `${payload}.${signature}`;
    expect(readSession(expiredToken)).toBeNull();
  });
});
