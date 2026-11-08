import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { exportInventoryCsv } from "@/lib/export";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const csv = await exportInventoryCsv();
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="inventory.csv"',
    },
  });
}
