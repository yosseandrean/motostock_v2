import { prisma } from "@/lib/prisma";

/** Distinct, sorted Brand values from existing Units. */
export async function listBrands(): Promise<string[]> {
  const units = await prisma.unit.findMany({
    select: { brand: true },
    orderBy: { brand: "asc" },
  });
  return [...new Set(units.map((unit) => unit.brand))];
}

/** Distinct, sorted Model values from existing Units. */
export async function listModels(): Promise<string[]> {
  const units = await prisma.unit.findMany({
    select: { model: true },
    orderBy: { model: "asc" },
  });
  return [
    ...new Set(units.map((unit) => unit.model).filter((model) => model !== "")),
  ];
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
