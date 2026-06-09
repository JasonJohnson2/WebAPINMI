export interface AuthEnv {
  SITE_PASSWORD?: string;
}

export const COOKIE_NAME = "auth";
export const SESSION_SECONDS = 60 * 60 * 24;

const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bytesToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const b = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(b)) return new Uint8Array(0);
    bytes[i] = b;
  }
  return bytes;
}

async function hmacHex(key: CryptoKey, data: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToHex(sig);
}

export async function signToken(secret: string, expiryUnixSeconds: number): Promise<string> {
  const key = await importKey(secret);
  const mac = await hmacHex(key, String(expiryUnixSeconds));
  return `${expiryUnixSeconds}.${mac}`;
}

export async function verifyToken(secret: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const expStr = token.substring(0, dot);
  const macHex = token.substring(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= 0) return false;
  if (Math.floor(Date.now() / 1000) >= exp) return false;

  const macBytes = hexToBytes(macHex);
  if (macBytes.length === 0) return false;

  const key = await importKey(secret);
  return crypto.subtle.verify("HMAC", key, macBytes, encoder.encode(expStr));
}

export async function passwordMatches(expected: string, candidate: string): Promise<boolean> {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const compareKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("constant-time-compare-v1"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const expectedMac = await crypto.subtle.sign("HMAC", compareKey, encoder.encode(expected));
  return crypto.subtle.verify("HMAC", compareKey, expectedMac, encoder.encode(candidate));
}

export function buildSetCookie(token: string, maxAgeSeconds: number): string {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  return attrs.join("; ");
}

export function buildClearCookie(): string {
  const attrs = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  return attrs.join("; ");
}

export function readAuthCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.substring(0, eq).trim();
    if (name === COOKIE_NAME) {
      return part.substring(eq + 1).trim();
    }
  }
  return null;
}

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}
