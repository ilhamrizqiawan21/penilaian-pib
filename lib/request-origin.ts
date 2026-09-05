/** Next.js can normalize a loopback URL to localhost; Host retains the browser's address. */
export function hasValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    const expected = new URL(`${url.protocol}//${host}`);
    // Reject malformed Host values instead of interpreting them as a URL path or credentials.
    if (expected.host !== host || expected.username || expected.password) return false;
    return origin === expected.origin;
  } catch {
    return false;
  }
}

function isPrivateNetworkHost(hostname: string): boolean {
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return true;
  if (hostname.endsWith(".local")) return true;
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

/** Local Wi-Fi access uses HTTP, while public hostnames keep Secure cookies. */
export function useSecureSessionCookie(request: Request): boolean {
  const url = new URL(request.url);
  const browserUrl = new URL(`${url.protocol}//${request.headers.get("host") ?? url.host}`);
  return !(url.protocol === "http:" && isPrivateNetworkHost(browserUrl.hostname));
}
