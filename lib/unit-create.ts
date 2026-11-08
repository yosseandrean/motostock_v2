import { collapseWhitespace, normalizeUpperCase } from "@/lib/inventory-csv";

/** The 16 raw string values submitted by the create/edit Unit form. */
export type UnitFormValues = {
  brand: string;
  model: string;
  modelYear: string;
  licensePlate: string;
  color: string;
  buyPrice: string;
  cost: string;
  sellPrice: string;
  dateBought: string;
  dateSold: string;
  salesPerson: string;
  nameOnRegistration: string;
  chassisSerialNumber: string;
  engineSerialNumber: string;
  boughtFrom: string;
  notes: string;
};

/** The normalized, validated fields ready to be persisted as a Unit. */
export type UnitCreateData = {
  brand: string;
  model: string;
  modelYear: string;
  licensePlate: string;
  color: string;
  buyPrice: number;
  cost: number;
  sellPrice: number | null;
  dateBought: Date;
  dateSold: Date | null;
  salesPerson: string | null;
  nameOnRegistration: string | null;
  chassisSerialNumber: string | null;
  engineSerialNumber: string | null;
  boughtFrom: string | null;
  notes: string | null;
};

export type UnitFormErrors = Partial<Record<keyof UnitFormValues, string>>;

export type UnitFormResult =
  | { ok: true; data: UnitCreateData }
  | { ok: false; errors: UnitFormErrors };

/** Read the 16 raw string fields out of a submitted FormData. */
export function readUnitForm(formData: FormData): UnitFormValues {
  const read = (name: string): string => String(formData.get(name) ?? "");
  return {
    brand: read("brand"),
    model: read("model"),
    modelYear: read("modelYear"),
    licensePlate: read("licensePlate"),
    color: read("color"),
    buyPrice: read("buyPrice"),
    cost: read("cost"),
    sellPrice: read("sellPrice"),
    dateBought: read("dateBought"),
    dateSold: read("dateSold"),
    salesPerson: read("salesPerson"),
    nameOnRegistration: read("nameOnRegistration"),
    chassisSerialNumber: read("chassisSerialNumber"),
    engineSerialNumber: read("engineSerialNumber"),
    boughtFrom: read("boughtFrom"),
    notes: read("notes"),
  };
}

const INTEGER_RE = /^\d+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MODEL_YEAR_RE = /^\d{4}$/;

/** Parse `YYYY-MM-DD` as a UTC-midnight Date, or null for empty, or "invalid". */
function parseDateOnly(value: string): Date | null | "invalid" {
  if (value === "") {
    return null;
  }
  const match = DATE_RE.exec(value);
  if (!match) {
    return "invalid";
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "invalid";
  }
  return date;
}

/** Parse a whole-IDR integer, or null for empty, or "invalid". */
function parseOptionalInt(value: string): number | null | "invalid" {
  if (value === "") {
    return null;
  }
  return INTEGER_RE.test(value) ? Number(value) : "invalid";
}

/** Collapse whitespace and map an empty string to null (free text). */
function optionalText(value: string): string | null {
  const collapsed = collapseWhitespace(value);
  return collapsed === "" ? null : collapsed;
}

/**
 * Parse, normalize and validate the 16 raw form fields.
 *
 * Safe normalization only, matching the CSV import: trim/collapse whitespace
 * and uppercase Brand, Model, Color and Sales Person; preserve case for names
 * and free text. Required fields are Brand, Model, Model Year, License Plate,
 * Buy Price and Date Bought. Sell Price and Date Sold are a pair: both filled
 * (Sold) or both empty (In Stock); a half-pair is a validation error.
 */
export function parseUnitForm(values: UnitFormValues): UnitFormResult {
  const errors: UnitFormErrors = {};

  const brand = normalizeUpperCase(values.brand);
  const model = normalizeUpperCase(values.model);
  const modelYear = collapseWhitespace(values.modelYear);
  const licensePlate = collapseWhitespace(values.licensePlate);
  const color = normalizeUpperCase(values.color);
  const salesPersonNormalized = normalizeUpperCase(values.salesPerson);
  const salesPerson = salesPersonNormalized === "" ? null : salesPersonNormalized;
  const nameOnRegistration = optionalText(values.nameOnRegistration);
  const chassisSerialNumber = optionalText(values.chassisSerialNumber);
  const engineSerialNumber = optionalText(values.engineSerialNumber);
  const boughtFrom = optionalText(values.boughtFrom);
  const notes = optionalText(values.notes);

  if (brand === "") {
    errors.brand = "Merek wajib diisi";
  }
  if (model === "") {
    errors.model = "Model wajib diisi";
  }
  if (modelYear === "") {
    errors.modelYear = "Tahun wajib diisi";
  } else if (
    !MODEL_YEAR_RE.test(modelYear) ||
    Number(modelYear) < 1900 ||
    Number(modelYear) > 2100
  ) {
    errors.modelYear = "Tahun tidak valid";
  }
  if (licensePlate === "") {
    errors.licensePlate = "Plat wajib diisi";
  }

  const buyPriceRaw = collapseWhitespace(values.buyPrice);
  let buyPrice: number | null = null;
  if (buyPriceRaw === "") {
    errors.buyPrice = "Harga Beli wajib diisi";
  } else if (!INTEGER_RE.test(buyPriceRaw)) {
    errors.buyPrice = "Harga Beli harus angka";
  } else {
    buyPrice = Number(buyPriceRaw);
  }

  const costParsed = parseOptionalInt(collapseWhitespace(values.cost));
  let cost = 0;
  if (costParsed === "invalid") {
    errors.cost = "Biaya harus angka";
  } else if (costParsed !== null) {
    cost = costParsed;
  }

  const sellPriceParsed = parseOptionalInt(collapseWhitespace(values.sellPrice));
  let sellPrice: number | null = null;
  if (sellPriceParsed === "invalid") {
    errors.sellPrice = "Harga Jual harus angka";
  } else if (sellPriceParsed !== null) {
    sellPrice = sellPriceParsed;
  }

  const dateBoughtRaw = collapseWhitespace(values.dateBought);
  let dateBought: Date | null = null;
  if (dateBoughtRaw === "") {
    errors.dateBought = "Tanggal Beli wajib diisi";
  } else {
    const parsed = parseDateOnly(dateBoughtRaw);
    if (parsed === "invalid") {
      errors.dateBought = "Tanggal Beli tidak valid";
    } else {
      dateBought = parsed;
    }
  }

  const dateSoldRaw = collapseWhitespace(values.dateSold);
  const dateSoldParsed = parseDateOnly(dateSoldRaw);
  let dateSold: Date | null = null;
  if (dateSoldParsed === "invalid") {
    errors.dateSold = "Tanggal Jual tidak valid";
  } else {
    dateSold = dateSoldParsed;
  }

  // Sell Price and Date Sold are a pair: both or neither.
  if (sellPrice !== null && dateSold === null && dateSoldRaw === "") {
    errors.dateSold = "Tanggal Jual wajib diisi bersama Harga Jual";
  }
  if (sellPrice === null && dateSold !== null && sellPriceRawIsEmpty(values.sellPrice)) {
    errors.sellPrice = "Harga Jual wajib diisi bersama Tanggal Jual";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      brand,
      model,
      modelYear,
      licensePlate,
      color,
      buyPrice: buyPrice as number,
      cost,
      sellPrice,
      dateBought: dateBought as Date,
      dateSold,
      salesPerson,
      nameOnRegistration,
      chassisSerialNumber,
      engineSerialNumber,
      boughtFrom,
      notes,
    },
  };
}

function sellPriceRawIsEmpty(value: string): boolean {
  return collapseWhitespace(value) === "";
}
