import {
  base64urlDecode,
  base64urlEncode,
  base64urlEncodeBytes,
  constantTimeEqual,
  encodeUtf8,
} from "@/lib/crypto";

export const SESSION_COOKIE = "motostock_session";

/** 30 days, matching the shared-password session lifetime in the spec. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const DEV_SECRET = "dev-secret-do-not-use-in-production";

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set");
  }
  return DEV_SECRET;
}

async function hmac(payload: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encodeUtf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encodeUtf8(payload));
  return new Uint8Array(signature);
}

interface SessionPayload {
  exp: number;
}

/**
 * Create a signed session token that expires in 30 days.
 *
 * `now` is injectable for tests.
 */
export async function createSessionToken(now: number = Date.now()): Promise<string> {
  const payload = base64urlEncode(
    JSON.stringify({ exp: now + SESSION_MAX_AGE_SECONDS * 1000 }),
  );
  const signature = base64urlEncodeBytes(await hmac(payload, getSessionSecret()));
  return `${payload}.${signature}`;
}

/**
 * Verify a session token: the signature must be valid for the current secret
 * and the expiry must be in the future.
 *
 * `now` and `secret` are injectable for tests.
 */
export async function verifySessionToken(
  token: string | null | undefined,
  now: number = Date.now(),
  secret: string = getSessionSecret(),
): Promise<boolean> {
  if (!token) {
    return false;
  }

  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) {
    return false;
  }

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = base64urlEncodeBytes(await hmac(payload, secret));
  if (!constantTimeEqual(encodeUtf8(signature), encodeUtf8(expected))) {
    return false;
  }

  try {
    const parsed = JSON.parse(base64urlDecode(payload)) as Partial<SessionPayload>;
    return typeof parsed.exp === "number" && parsed.exp > now;
  } catch {
    return false;
  }
}
