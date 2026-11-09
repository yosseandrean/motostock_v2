import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { exportCsvFilename, exportInventoryCsv } from "@/lib/export";
import { externalOrigin } from "@/lib/request-url";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", externalOrigin(request)), 303);
  }

  const csv = await exportInventoryCsv();
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportCsvFilename(new Date())}"`,
    },
  });
}
