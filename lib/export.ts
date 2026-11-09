import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { CSV_HEADERS, unitRecordToCsvRow } from "@/lib/inventory-csv";
import { dateOnlyWib } from "@/lib/unit-sell";

/** `inventory-<YYYY-MM-DD>.csv` for the export date in WIB (UTC+7). */
export function exportCsvFilename(now: Date): string {
  return `inventory-${dateOnlyWib(now)}.csv`;
}

/** Export the full inventory as CSV with the original 16 columns in order. */
export async function exportInventoryCsv(): Promise<string> {
  const units = await prisma.unit.findMany({ orderBy: { id: "asc" } });
  const headerRow: string[] = [...CSV_HEADERS];
  const rows = [headerRow, ...units.map(unitRecordToCsvRow)];
  return toCsv(rows);
}
