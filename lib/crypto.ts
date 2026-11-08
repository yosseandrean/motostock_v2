// Runtime-agnostic helpers used by both the Node.js runtime and the Edge
// proxy runtime (no `node:` imports here). These back the signed session
// cookie and the shared-password comparison.

const encoder = new TextEncoder();

/** Base64url-encode a byte string that is already valid Latin-1. */
export function base64urlEncode(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64url-encode arbitrary bytes. */
export function base64urlEncodeBytes(input: Uint8Array): string {
  let binary = "";
  for (const byte of input) {
    binary += String.fromCharCode(byte);
  }
  return base64urlEncode(binary);
}

/** Decode a base64url string back to its original string. */
export function base64urlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * Constant-time comparison of two byte sequences, used for the session
 * signature and the shared password so that comparisons do not leak timing
 * information.
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/** UTF-8 encode a string for constant-time comparison. */
export function encodeUtf8(input: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(input);
}
