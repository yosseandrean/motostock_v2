import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { verifySharedPassword } from "@/lib/password";
import { externalOrigin } from "@/lib/request-url";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");

  if (!verifySharedPassword(password)) {
    return NextResponse.redirect(new URL("/login?error=1", externalOrigin(request)), 303);
  }

  const token = await createSessionToken();
  const response = NextResponse.redirect(new URL("/", externalOrigin(request)), 303);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
