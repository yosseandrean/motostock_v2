import { constantTimeEqual, encodeUtf8 } from "@/lib/crypto";

const DEV_PASSWORD = "motostock";

function getSharedPassword(): string {
  const password = process.env.SHARED_PASSWORD;
  if (password) {
    return password;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SHARED_PASSWORD is not set");
  }
  return DEV_PASSWORD;
}

/** Compare an entered password against the configured shared password. */
export function verifySharedPassword(input: string): boolean {
  return constantTimeEqual(encodeUtf8(input), encodeUtf8(getSharedPassword()));
}
