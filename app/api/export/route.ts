import { exportCsvFilename, exportInventoryCsv } from "@/lib/export";
import { withAuthenticatedRequest } from "@/lib/route-plumbing";

export async function GET(request: Request) {
  return withAuthenticatedRequest(request, async () => {
    const csv = await exportInventoryCsv();
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportCsvFilename(new Date())}"`,
      },
    });
  });
}
