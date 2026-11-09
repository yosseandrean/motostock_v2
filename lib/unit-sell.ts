import { collapseWhitespace, normalizeUpperCase } from "@/lib/inventory-csv";
import { parseDateOnly, parseOptionalInt } from "@/lib/unit-form-parse";
import { WIB_OFFSET_MS } from "@/lib/sales";

/** The three raw string values submitted by the sell form. */
export type SellFormValues = {
  sellPrice: string;
  dateSold: string;
  salesPerson: string;
};

/** The normalized, validated fields ready to mark a Unit Sold. */
export type SellFormData = {
  sellPrice: number;
  dateSold: Date;
  salesPerson: string | null;
};

export type SellFormErrors = Partial<Record<keyof SellFormValues, string>>;

export type SellFormResult =
  | { ok: true; data: SellFormData }
  | { ok: false; errors: SellFormErrors };

/** Read the three raw string fields out of a submitted FormData. */
export function readSellForm(formData: FormData): SellFormValues {
  return {
    sellPrice: String(formData.get("sellPrice") ?? ""),
    dateSold: String(formData.get("dateSold") ?? ""),
    salesPerson: String(formData.get("salesPerson") ?? ""),
  };
}

/**
 * Parse and validate the sell form. Both Sell Price and Date Sold are required
 * for a sale; Sales Person is optional and case-normalized like the edit form.
 */
export function parseSellForm(values: SellFormValues): SellFormResult {
  const errors: SellFormErrors = {};

  const sellPriceRaw = collapseWhitespace(values.sellPrice);
  const sellPriceParsed = parseOptionalInt(sellPriceRaw);
  let sellPrice: number | null = null;
  if (sellPriceRaw === "") {
    errors.sellPrice = "Harga Jual wajib diisi";
  } else if (sellPriceParsed === "invalid") {
    errors.sellPrice = "Harga Jual harus angka";
  } else {
    sellPrice = sellPriceParsed as number;
  }

  const dateSoldRaw = collapseWhitespace(values.dateSold);
  let dateSold: Date | null = null;
  if (dateSoldRaw === "") {
    errors.dateSold = "Tanggal Jual wajib diisi";
  } else {
    const parsed = parseDateOnly(dateSoldRaw);
    if (parsed === "invalid") {
      errors.dateSold = "Tanggal Jual tidak valid";
    } else {
      dateSold = parsed;
    }
  }

  const salesPersonNormalized = normalizeUpperCase(values.salesPerson);
  const salesPerson =
    salesPersonNormalized === "" ? null : salesPersonNormalized;

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      sellPrice: sellPrice as number,
      dateSold: dateSold as Date,
      salesPerson,
    },
  };
}

/** The WIB calendar date of `now`, as a `YYYY-MM-DD` string. */
export function dateOnlyWib(now: Date): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}
