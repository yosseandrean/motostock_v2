import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Read the session token out of a Request's Cookie header. */
export function getSessionTokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return undefined;
  }
  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      return valueParts.join("=");
    }
  }
  return undefined;
}

/** Whether the request carries a valid, unexpired session token. */
export async function isAuthenticated(request: Request): Promise<boolean> {
  return verifySessionToken(getSessionTokenFromRequest(request));
}
