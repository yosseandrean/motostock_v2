import { collapseWhitespace, normalizeUpperCase } from "@/lib/inventory-csv";
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

const INTEGER_RE = /^\d+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

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
  let sellPrice: number | null = null;
  if (sellPriceRaw === "") {
    errors.sellPrice = "Harga Jual wajib diisi";
  } else if (!INTEGER_RE.test(sellPriceRaw)) {
    errors.sellPrice = "Harga Jual harus angka";
  } else {
    sellPrice = Number(sellPriceRaw);
  }

  const dateSoldRaw = collapseWhitespace(values.dateSold);
  let dateSold: Date | null = null;
  if (dateSoldRaw === "") {
    errors.dateSold = "Tanggal Jual wajib diisi";
  } else {
    const match = DATE_RE.exec(dateSoldRaw);
    if (!match) {
      errors.dateSold = "Tanggal Jual tidak valid";
    } else {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
      ) {
        errors.dateSold = "Tanggal Jual tidak valid";
      } else {
        dateSold = date;
      }
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
