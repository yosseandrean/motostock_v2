import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { CSV_HEADERS, unitRecordToCsvRow } from "@/lib/inventory-csv";
import { WIB_OFFSET_MS } from "@/lib/sales";

/** `inventory-<YYYY-MM-DD>.csv` for the export date in WIB (UTC+7). */
export function exportCsvFilename(now: Date): string {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const year = wib.getUTCFullYear();
  const month = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const day = String(wib.getUTCDate()).padStart(2, "0");
  return `inventory-${year}-${month}-${day}.csv`;
}

/** Export the full inventory as CSV with the original 16 columns in order. */
export async function exportInventoryCsv(): Promise<string> {
  const units = await prisma.unit.findMany({ orderBy: { id: "asc" } });
  const headerRow: string[] = [...CSV_HEADERS];
  const rows = [headerRow, ...units.map(unitRecordToCsvRow)];
  return toCsv(rows);
}
