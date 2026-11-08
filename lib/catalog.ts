import { prisma } from "@/lib/prisma";

export type BrandModel = { brand: string; model: string };

/** Distinct, sorted Brand values from existing Units. */
export async function listBrands(): Promise<string[]> {
  const units = await prisma.unit.findMany({
    select: { brand: true },
    orderBy: { brand: "asc" },
  });
  return [...new Set(units.map((unit) => unit.brand))];
}

/** Distinct (Brand, Model) pairs from existing Units, sorted. */
export async function listModels(): Promise<BrandModel[]> {
  const units = await prisma.unit.findMany({
    select: { brand: true, model: true },
    orderBy: [{ brand: "asc" }, { model: "asc" }],
  });
  const seen = new Set<string>();
  const result: BrandModel[] = [];
  for (const unit of units) {
    const key = `${unit.brand}\u0000${unit.model}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ brand: unit.brand, model: unit.model });
    }
  }
  return result;
}

/** Distinct, sorted, non-empty Color values from existing Units. */
export async function listColors(): Promise<string[]> {
  const units = await prisma.unit.findMany({
    select: { color: true },
    orderBy: { color: "asc" },
  });
  return [...new Set(units.map((unit) => unit.color).filter((color) => color !== ""))];
}

/** Distinct, sorted Sales Person values (case-normalized) from existing Units. */
export async function listSalesPersons(): Promise<string[]> {
  const units = await prisma.unit.findMany({
    select: { salesPerson: true },
    orderBy: { salesPerson: "asc" },
  });
  return [
    ...new Set(
      units
        .map((unit) => unit.salesPerson)
        .filter((person): person is string => person !== null && person !== ""),
    ),
  ];
}

/** Distinct, sorted Bought From values for de-duplication suggestions. */
export async function listBoughtFrom(): Promise<string[]> {
  const units = await prisma.unit.findMany({
    select: { boughtFrom: true },
    orderBy: { boughtFrom: "asc" },
  });
  return [
    ...new Set(
      units
        .map((unit) => unit.boughtFrom)
        .filter((source): source is string => source !== null && source !== ""),
    ),
  ];
}
