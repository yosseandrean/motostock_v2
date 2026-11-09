import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { importInventoryCsv } from "@/lib/import";
import { externalOrigin } from "@/lib/request-url";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", externalOrigin(request)), 303);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.redirect(new URL("/import?error=missing", externalOrigin(request)), 303);
  }

  const report = await importInventoryCsv(await file.text());

  const url = new URL("/import", externalOrigin(request));
  url.searchParams.set("imported", String(report.imported));
  url.searchParams.set("skipped", String(report.skipped));
  url.searchParams.set("rejected", String(report.rejected));
  if (report.rejections.length > 0) {
    url.searchParams.set("rejections", JSON.stringify(report.rejections));
  }
  return NextResponse.redirect(url, 303);
}
