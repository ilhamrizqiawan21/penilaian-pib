import { describe, expect, it } from "vitest";
import { hasValidOrigin, useSecureSessionCookie } from "./request-origin";

function request(origin?: string, host = "127.0.0.1:3000", url = "http://localhost:3000/api/auth/login") {
  return new Request(url, { headers: { host, ...(origin ? { origin } : {}) } });
}

describe("request origin", () => {
  it("accepts the browser Host when Next.js normalizes the loopback URL", () => {
    expect(hasValidOrigin(request("http://127.0.0.1:3000"))).toBe(true);
    expect(hasValidOrigin(request("http://localhost:3000", "localhost:3000"))).toBe(true);
  });
  it("rejects a different host, port, protocol or opaque origin", () => {
    for (const origin of ["http://evil.example", "http://127.0.0.1:3001", "https://127.0.0.1:3000", "null", "http://localhost:3000"]) {
      expect(hasValidOrigin(request(origin))).toBe(false);
    }
  });
  it("rejects malformed hosts and ignores untrusted forwarded hosts", () => {
    expect(hasValidOrigin(request("http://evil.example", "127.0.0.1:3000@evil.example"))).toBe(false);
    const req = request("http://evil.example");
    req.headers.set("x-forwarded-host", "evil.example");
    expect(hasValidOrigin(req)).toBe(false);
  });
  it("supports requests without Origin and falls back to URL when Host is absent", () => {
    expect(hasValidOrigin(request())).toBe(true);
    expect(hasValidOrigin(new Request("http://localhost:3000", {headers: {origin: "http://localhost:3000"}}))).toBe(true);
  });
});

describe("session cookie transport", () => {
  it("allows HTTP on loopback and private Wi-Fi while securing public hosts", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      expect(useSecureSessionCookie(new Request(`http://${host}:3000`))).toBe(false);
      expect(useSecureSessionCookie(new Request(`https://${host}:3000`))).toBe(true);
    }
    for (const host of ["10.0.0.4", "172.16.0.4", "172.31.255.4", "192.168.100.245"]) {
      expect(useSecureSessionCookie(new Request(`http://${host}:3000`))).toBe(false);
      expect(useSecureSessionCookie(request(undefined, `${host}:3000`))).toBe(false);
    }
    expect(useSecureSessionCookie(request(undefined, "pib.local:3000"))).toBe(false);
    expect(useSecureSessionCookie(new Request("http://172.32.0.4:3000"))).toBe(true);
    expect(useSecureSessionCookie(new Request("http://example.com"))).toBe(true);
  });
});
