import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { externalOrigin } from "@/lib/request-url";
import type { UnitWriteResult } from "@/lib/unit-write";

type AuthenticatedHandler = (origin: string) => Promise<Response>;

type UnitRouteContext = {
  params: Promise<{ id: string }>;
};

type AuthenticatedUnitHandler = (
  id: number,
  origin: string
) => Promise<Response>;

type ValidationRedirect = {
  path: string;
  values: Record<string, string>;
};

/** Run a route handler only for an authenticated request. */
export async function withAuthenticatedRequest(
  request: Request,
  handler: AuthenticatedHandler
): Promise<Response> {
  const origin = externalOrigin(request);
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", origin), 303);
  }
  return handler(origin);
}

/** Run a Unit route handler after the auth and positive-integer id guards. */
export async function withAuthenticatedUnitRequest(
  request: Request,
  context: UnitRouteContext,
  handler: AuthenticatedUnitHandler
): Promise<Response> {
  return withAuthenticatedRequest(request, async (origin) => {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return new NextResponse("Not found", { status: 404 });
    }
    return handler(numericId, origin);
  });
}

/** Map a plain Unit write result to the route's HTTP response. */
export function unitWriteRedirect(
  origin: string,
  result: UnitWriteResult,
  validation?: ValidationRedirect
): Response {
  switch (result.status) {
    case "not-found":
      return new NextResponse("Not found", { status: 404 });
    case "validation-error": {
      if (validation === undefined) {
        throw new Error("Validation redirect details are required");
      }
      const url = new URL(validation.path, origin);
      url.searchParams.set("errors", JSON.stringify(result.errors));
      url.searchParams.set("values", JSON.stringify(validation.values));
      return NextResponse.redirect(url, 303);
    }
    case "created": {
      const url = new URL(`/units/${result.id}/edit`, origin);
      if (result.warnings.length > 0) {
        url.searchParams.set("warning", result.warnings.join(","));
      }
      return NextResponse.redirect(url, 303);
    }
    case "updated": {
      if (result.warnings.length > 0) {
        const url = new URL(`/units/${result.id}/edit`, origin);
        url.searchParams.set("warning", result.warnings.join(","));
        return NextResponse.redirect(url, 303);
      }
      return NextResponse.redirect(new URL("/", origin), 303);
    }
    case "sold":
    case "deleted":
      return NextResponse.redirect(new URL("/", origin), 303);
  }
}
