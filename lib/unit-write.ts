import { prisma } from "@/lib/prisma";
import {
  parseUnitForm,
  type UnitFormErrors,
  type UnitFormValues,
  type UnitRecord,
} from "@/lib/unit-spec";
import {
  parseSellForm,
  type SellFormErrors,
  type SellFormValues,
} from "@/lib/unit-sell";

export type UnitDuplicateWarning = "chassis" | "license";

/** The plain outcome of a Unit write, independent of HTTP redirects. */
export type UnitWriteResult =
  | {
      status: "created" | "updated";
      id: number;
      warnings: UnitDuplicateWarning[];
    }
  | { status: "sold" | "deleted"; id: number }
  | {
      status: "validation-error";
      errors: UnitFormErrors | SellFormErrors;
    }
  | { status: "not-found" };

/** The single lenient-identity duplicate check used by create and update. */
async function duplicateWarnings(
  data: Pick<UnitRecord, "chassisSerialNumber" | "licensePlate">,
  excludeId?: number
): Promise<UnitDuplicateWarning[]> {
  const warnings: UnitDuplicateWarning[] = [];
  if (data.chassisSerialNumber !== null) {
    const existing = await prisma.unit.findFirst({
      where: {
        chassisSerialNumber: data.chassisSerialNumber,
        NOT: excludeId === undefined ? undefined : { id: excludeId },
      },
      select: { id: true },
    });
    if (existing) {
      warnings.push("chassis");
    }
  }

  const existingPlate = await prisma.unit.findFirst({
    where: {
      licensePlate: data.licensePlate,
      NOT: excludeId === undefined ? undefined : { id: excludeId },
    },
    select: { id: true },
  });
  if (existingPlate) {
    warnings.push("license");
  }
  return warnings;
}

/** Whether the Unit targeted by an id-based write exists. */
async function unitExists(id: number): Promise<boolean> {
  const existing = await prisma.unit.findUnique({
    where: { id },
    select: { id: true },
  });
  return existing !== null;
}

/** Validate and create a Unit. */
export async function createUnit(
  values: UnitFormValues
): Promise<UnitWriteResult> {
  const parsed = parseUnitForm(values);
  if (!parsed.ok) {
    return { status: "validation-error", errors: parsed.errors };
  }

  const warnings = await duplicateWarnings(parsed.data);
  const unit = await prisma.unit.create({ data: parsed.data });
  return { status: "created", id: unit.id, warnings };
}

/** Validate and update an existing Unit. */
export async function updateUnit(
  id: number,
  values: UnitFormValues
): Promise<UnitWriteResult> {
  if (!(await unitExists(id))) {
    return { status: "not-found" };
  }

  const parsed = parseUnitForm(values);
  if (!parsed.ok) {
    return { status: "validation-error", errors: parsed.errors };
  }

  const warnings = await duplicateWarnings(parsed.data, id);
  await prisma.unit.update({ where: { id }, data: parsed.data });
  return { status: "updated", id, warnings };
}

/** Validate and mark an existing Unit Sold. */
export async function sellUnit(
  id: number,
  values: SellFormValues
): Promise<UnitWriteResult> {
  if (!(await unitExists(id))) {
    return { status: "not-found" };
  }

  const parsed = parseSellForm(values);
  if (!parsed.ok) {
    return { status: "validation-error", errors: parsed.errors };
  }

  await prisma.unit.update({ where: { id }, data: parsed.data });
  return { status: "sold", id };
}

/** Delete an existing Unit. */
export async function deleteUnit(id: number): Promise<UnitWriteResult> {
  if (!(await unitExists(id))) {
    return { status: "not-found" };
  }

  await prisma.unit.delete({ where: { id } });
  return { status: "deleted", id };
}
