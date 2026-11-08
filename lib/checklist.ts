/**
 * Data-issues checklist computations: nine anomaly categories, each listing
 * the affected Units so the owner can clean them up by hand. Nothing here
 * mutates data — it only reads.
 *
 * Kept as pure functions so the checklist page and its tests share one source
 * of truth, matching the dashboard and sales modules.
 */

import { ageInDays, isStale } from "@/lib/dashboard";
import { formatIDR } from "@/lib/format";
import { grossProfit, isSold } from "@/lib/unit";

/** The nine anomaly categories, in the order they are shown. */
export const CHECKLIST_CATEGORY_KEYS = [
  "empty-chassis",
  "duplicate-chassis",
  "duplicate-license-plate",
  "missing-sales-person",
  "missing-color",
  "missing-name-on-registration",
  "case-split-sales-person",
  "loss-making-sales",
  "stale-units",
] as const;

export type ChecklistCategoryKey = (typeof CHECKLIST_CATEGORY_KEYS)[number];

/** The fields the checklist reads from a Unit. */
export type ChecklistUnit = {
  id: number;
  brand: string;
  model: string;
  licensePlate: string;
  color: string;
  buyPrice: number;
  cost: number;
  sellPrice: number | null;
  dateBought: Date;
  salesPerson: string | null;
  nameOnRegistration: string | null;
  chassisSerialNumber: string | null;
};

/** One affected Unit inside a category, with a category-specific detail. */
export type ChecklistItem = {
  id: number;
  brand: string;
  model: string;
  licensePlate: string;
  detail: string;
};

export type ChecklistCategory = {
  key: ChecklistCategoryKey;
  items: ChecklistItem[];
};

/** Whether an optional text field is empty (null, empty, or whitespace). */
function isEmpty(value: string | null): boolean {
  return value === null || value.trim() === "";
}

function byId(a: ChecklistItem, b: ChecklistItem): number {
  return a.id - b.id;
}

function toItem(unit: ChecklistUnit, detail: string): ChecklistItem {
  return {
    id: unit.id,
    brand: unit.brand,
    model: unit.model,
    licensePlate: unit.licensePlate,
    detail,
  };
}

/**
 * Group Units by a string key and return the groups shared by more than one
 * Unit, sorted by key. A null key skips the Unit (e.g. an empty optional
 * field is a different anomaly, not a duplicate).
 */
function findDuplicates(
  units: readonly ChecklistUnit[],
  keyFor: (unit: ChecklistUnit) => string | null,
): { value: string; units: ChecklistUnit[] }[] {
  const groups = new Map<string, ChecklistUnit[]>();
  for (const unit of units) {
    const key = keyFor(unit);
    if (key === null) {
      continue;
    }
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [unit]);
    } else {
      group.push(unit);
    }
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, group]) => ({ value, units: group }));
}

/**
 * Aggregate the data-issues checklist from a list of Units.
 *
 * Every category is computed independently, so a Unit may appear in several
 * categories at once. Categories with no affected Units are omitted.
 */
export function computeChecklist(
  units: readonly ChecklistUnit[],
  now: Date,
): ChecklistCategory[] {
  const categories: ChecklistCategory[] = [];

  // Empty Chassis Serial Number.
  const emptyChassis = units
    .filter((unit) => isEmpty(unit.chassisSerialNumber))
    .map((unit) => toItem(unit, ""))
    .sort(byId);
  if (emptyChassis.length > 0) {
    categories.push({ key: "empty-chassis", items: emptyChassis });
  }

  // Duplicate Chassis Serial Number (same non-empty value on several Units).
  const duplicateChassis = findDuplicates(units, (unit) =>
    isEmpty(unit.chassisSerialNumber) ? null : (unit.chassisSerialNumber as string),
  ).flatMap(({ value, units: group }) =>
    group.map((unit) => toItem(unit, value)).sort(byId),
  );
  if (duplicateChassis.length > 0) {
    categories.push({ key: "duplicate-chassis", items: duplicateChassis });
  }

  // Duplicate License Plate.
  const duplicatePlates = findDuplicates(units, (unit) =>
    unit.licensePlate.trim(),
  ).flatMap(({ value, units: group }) =>
    group.map((unit) => toItem(unit, value)).sort(byId),
  );
  if (duplicatePlates.length > 0) {
    categories.push({ key: "duplicate-license-plate", items: duplicatePlates });
  }

  // Missing Sales Person on Sold Units.
  const missingSalesPerson = units
    .filter((unit) => isSold(unit) && isEmpty(unit.salesPerson))
    .map((unit) => toItem(unit, ""))
    .sort(byId);
  if (missingSalesPerson.length > 0) {
    categories.push({
      key: "missing-sales-person",
      items: missingSalesPerson,
    });
  }

  // Missing Color.
  const missingColor = units
    .filter((unit) => isEmpty(unit.color))
    .map((unit) => toItem(unit, ""))
    .sort(byId);
  if (missingColor.length > 0) {
    categories.push({ key: "missing-color", items: missingColor });
  }

  // Missing Name on Registration.
  const missingName = units
    .filter((unit) => isEmpty(unit.nameOnRegistration))
    .map((unit) => toItem(unit, ""))
    .sort(byId);
  if (missingName.length > 0) {
    categories.push({
      key: "missing-name-on-registration",
      items: missingName,
    });
  }

  // Case splits in Sales Person: the same name written with different casing.
  const salesPersonGroups = new Map<string, ChecklistUnit[]>();
  for (const unit of units) {
    if (isEmpty(unit.salesPerson)) {
      continue;
    }
    const key = (unit.salesPerson as string).trim().toLowerCase();
    const group = salesPersonGroups.get(key);
    if (group === undefined) {
      salesPersonGroups.set(key, [unit]);
    } else {
      group.push(unit);
    }
  }
  const caseSplits: ChecklistItem[] = [];
  for (const [key, group] of [...salesPersonGroups.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const variants = new Set(group.map((unit) => (unit.salesPerson as string).trim()));
    if (variants.size > 1) {
      caseSplits.push(
        ...group
          .map((unit) => toItem(unit, (unit.salesPerson as string).trim()))
          .sort(byId),
      );
    }
  }
  if (caseSplits.length > 0) {
    categories.push({ key: "case-split-sales-person", items: caseSplits });
  }

  // Loss-making sales: Sold Units whose Gross Profit is below zero.
  const losses = units
    .filter((unit) => isSold(unit))
    .map((unit) => ({
      unit,
      profit: grossProfit(unit) as number,
    }))
    .filter(({ profit }) => profit < 0)
    .sort((a, b) => a.profit - b.profit || a.unit.id - b.unit.id)
    .map(({ unit, profit }) => toItem(unit, formatIDR(profit)));
  if (losses.length > 0) {
    categories.push({ key: "loss-making-sales", items: losses });
  }

  // Stale Units: In Stock Units whose Age exceeds the stale threshold.
  const stale = units
    .filter((unit) => !isSold(unit))
    .map((unit) => ({ unit, age: ageInDays(unit.dateBought, now) }))
    .filter(({ age }) => isStale(age))
    .sort((a, b) => b.age - a.age || a.unit.id - b.unit.id)
    .map(({ unit, age }) => toItem(unit, `${age} hari`));
  if (stale.length > 0) {
    categories.push({ key: "stale-units", items: stale });
  }

  return categories;
}
