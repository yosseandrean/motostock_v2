import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import { parseImportRow, unitRecordToCsvRow } from "@/lib/inventory-csv";
import type { UnitRecord } from "@/lib/inventory-csv";

export type ImportReport = {
  imported: number;
  skipped: number;
  rejected: number;
  rejections: { line: number; reason: string }[];
};

/**
 * Import a CSV into Units (append mode).
 *
 * - The first row is the header and is skipped.
 * - Rows whose Chassis Serial Number already exists are skipped as duplicates.
 * - Rows without a Chassis Serial Number that exactly duplicate an existing
 *   row are skipped too (so the CSV backup round-trips).
 * - Invalid rows are rejected with a reason; safe normalization only is
 *   applied (trim, whitespace collapse, uppercase Brand/Model/Color/Sales Person).
 */
export async function importInventoryCsv(text: string): Promise<ImportReport> {
  const report: ImportReport = {
    imported: 0,
    skipped: 0,
    rejected: 0,
    rejections: [],
  };

  // Snapshot the existing inventory once; the dedupe rules run against the
  // pre-existing state (append mode), not against other rows in this file.
  const existing = await prisma.unit.findMany();
  const existingChassis = new Set<string>();
  const existingNoChassisKeys = new Set<string>();
  for (const unit of existing) {
    if (unit.chassisSerialNumber) {
      existingChassis.add(unit.chassisSerialNumber);
    } else {
      existingNoChassisKeys.add(JSON.stringify(unitRecordToCsvRow(unit)));
    }
  }

  const rows = parseCsv(text);
  const toCreate: UnitRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const line = i + 1; // 1-based line number, including the header.
    const parsed = parseImportRow(rows[i]);
    if (!parsed.ok) {
      report.rejected += 1;
      report.rejections.push({ line, reason: parsed.reason });
      continue;
    }

    const { data } = parsed;
    if (data.chassisSerialNumber) {
      if (existingChassis.has(data.chassisSerialNumber)) {
        report.skipped += 1;
        continue;
      }
    } else if (existingNoChassisKeys.has(JSON.stringify(unitRecordToCsvRow(data)))) {
      report.skipped += 1;
      continue;
    }

    toCreate.push(data);
  }

  if (toCreate.length > 0) {
    await prisma.unit.createMany({ data: toCreate });
  }
  report.imported = toCreate.length;

  return report;
}
