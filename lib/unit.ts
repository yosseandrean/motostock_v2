/**
 * Read-side Unit helpers: derived Status, money computations, and list
 * search/filter. Kept as pure functions so the list page and its tests share
 * one source of truth.
 */

export type UnitStatus = "stok" | "terjual";

/** The fields the list and its filters read from a Unit. */
export type UnitLike = {
  brand: string;
  model: string;
  modelYear: string;
  licensePlate: string;
  chassisSerialNumber: string | null;
  salesPerson: string | null;
  buyPrice: number;
  cost: number;
  sellPrice: number | null;
};

export type UnitFilter = {
  query?: string;
  status?: UnitStatus;
};

/**
 * A Unit serialized for the client inventory list. Date labels are preformatted
 * server-side so the client renders plain strings instead of parsing Dates.
 */
export type InventoryUnit = UnitLike & {
  id: number;
  dateBoughtLabel: string;
  dateSoldLabel: string | null;
};

/** A Unit is Sold once it has a Sell Price; otherwise it is In Stock. */
export function isSold(unit: Pick<UnitLike, "sellPrice">): boolean {
  return unit.sellPrice !== null;
}

/** Invested is the total money put into a Unit: Buy Price plus Cost. */
export function invested(unit: Pick<UnitLike, "buyPrice" | "cost">): number {
  return unit.buyPrice + unit.cost;
}

/** Gross Profit is Sell Price minus Invested, for a Sold Unit. */
export function grossProfit(
  unit: Pick<UnitLike, "buyPrice" | "cost" | "sellPrice">,
): number | null {
  return unit.sellPrice === null ? null : unit.sellPrice - invested(unit);
}

/** The derived Status as the Indonesian label shown in the UI. */
export function statusLabel(unit: Pick<UnitLike, "sellPrice">): string {
  return isSold(unit) ? "Terjual" : "Tersedia";
}

/** Parse an incoming status filter value; undefined when invalid. */
export function parseUnitStatus(
  value: string | undefined,
): UnitStatus | undefined {
  return value === "stok" || value === "terjual" ? value : undefined;
}

/**
 * Filter a list of Units by a free-text query (matched against Brand, Model,
 * License Plate, Chassis Serial Number and Sales Person) and an optional
 * derived Status. Matching is case-insensitive.
 */
export function filterUnits<T extends UnitLike>(
  units: readonly T[],
  filter: UnitFilter,
): T[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  const status = filter.status;

  return units.filter((unit) => {
    if (status === "stok" && isSold(unit)) {
      return false;
    }
    if (status === "terjual" && !isSold(unit)) {
      return false;
    }

    if (query === "") {
      return true;
    }

    const haystacks = [
      unit.brand,
      unit.model,
      unit.licensePlate,
      unit.chassisSerialNumber ?? "",
      unit.salesPerson ?? "",
    ];
    return haystacks.some((value) => value.toLowerCase().includes(query));
  });
}
