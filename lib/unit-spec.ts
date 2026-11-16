import { parseDateOnly } from "@/lib/calendar";

/**
 * The Unit record spec: the single 16-entry field list that defines the
 * canonical Unit record and its CSV and form converters.
 *
 * Each entry is (field key, CSV header, user-facing label, type):
 *
 * - `key` names the Unit record property (canonical English, camelCase);
 * - `csvHeader` names the export/import column (matches the source spreadsheet);
 * - `label` is the Indonesian form label (`GLOSSARY.md`);
 * - `type` drives both the record's TypeScript type and the CSV ⇄ record
 *   conversion.
 *
 * The `type` vocabulary and what it means for an empty/absent raw value:
 *
 * | type                  | TS type       | empty →          |
 * | --------------------- | ------------- | ---------------- |
 * | `text-required`       | string        | error (missing)  |
 * | `text-required-upper` | string        | error (missing)  |
 * | `text`                | string        | "" (allowed)     |
 * | `text-upper`          | string        | "" (allowed)     |
 * | `text-null`           | string \| null| null             |
 * | `text-null-upper`     | string \| null| null             |
 * | `int`                 | number        | error (missing)  |
 * | `int-zero`            | number        | 0                |
 * | `int-null`            | number \| null| null             |
 * | `date`                | Date          | error (missing)  |
 * | `date-null`           | Date \| null  | null             |
 *
 * The `-upper` text types are normalized to uppercase; all text is
 * whitespace-collapsed. The CSV headers, CSV row parsing, form-field reading
 * and parsing, and the edit-form round-trip all derive from this one field
 * list.
 */

export type UnitFieldType =
  | "text-required"
  | "text-required-upper"
  | "text"
  | "text-upper"
  | "text-null"
  | "text-null-upper"
  | "int"
  | "int-zero"
  | "int-null"
  | "date"
  | "date-null";

export type UnitField = {
  key: UnitFieldKey;
  csvHeader: string;
  label: string;
  type: UnitFieldType;
};

export const UNIT_FIELDS = [
  {
    key: "brand",
    csvHeader: "Brand",
    label: "Merek",
    type: "text-required-upper",
  },
  {
    key: "model",
    csvHeader: "Model",
    label: "Model",
    type: "text-required-upper",
  },
  {
    key: "modelYear",
    csvHeader: "Year",
    label: "Tahun",
    type: "text-required",
  },
  {
    key: "licensePlate",
    csvHeader: "License Plate",
    label: "Plat",
    type: "text-required",
  },
  { key: "color", csvHeader: "Color", label: "Warna", type: "text-upper" },
  { key: "buyPrice", csvHeader: "Buy Price", label: "Harga Beli", type: "int" },
  { key: "cost", csvHeader: "Cost", label: "Biaya", type: "int-zero" },
  {
    key: "sellPrice",
    csvHeader: "Sell Price",
    label: "Harga Jual",
    type: "int-null",
  },
  {
    key: "dateBought",
    csvHeader: "Date Bought",
    label: "Tanggal Beli",
    type: "date",
  },
  {
    key: "dateSold",
    csvHeader: "Date Sold",
    label: "Tanggal Jual",
    type: "date-null",
  },
  {
    key: "salesPerson",
    csvHeader: "Sales Person",
    label: "Sales Person",
    type: "text-null-upper",
  },
  {
    key: "nameOnRegistration",
    csvHeader: "Name on Registration",
    label: "Nama di STNK",
    type: "text-null",
  },
  {
    key: "chassisSerialNumber",
    csvHeader: "Chassis Serial Number",
    label: "Nomor Rangka",
    type: "text-null",
  },
  {
    key: "engineSerialNumber",
    csvHeader: "Engine Serial Number",
    label: "Nomor Mesin",
    type: "text-null",
  },
  {
    key: "boughtFrom",
    csvHeader: "Bought From",
    label: "Dibeli Dari",
    type: "text-null",
  },
  { key: "notes", csvHeader: "Notes", label: "Catatan", type: "text-null" },
] as const;

export type UnitFieldKey = (typeof UNIT_FIELDS)[number]["key"];

type FieldValue<Type extends UnitFieldType> = Type extends
  "text-required" | "text-required-upper" | "text" | "text-upper"
  ? string
  : Type extends "text-null" | "text-null-upper"
    ? string | null
    : Type extends "int" | "int-zero"
      ? number
      : Type extends "int-null"
        ? number | null
        : Type extends "date"
          ? Date
          : Type extends "date-null"
            ? Date | null
            : never;

/** The canonical Unit record, derived field-by-field from `UNIT_FIELDS`. */
export type UnitRecord = {
  [F in (typeof UNIT_FIELDS)[number] as F["key"]]: FieldValue<F["type"]>;
};

type WireValue<Type extends UnitFieldType> = Type extends "date"
  ? string
  : Type extends "date-null"
    ? string | null
    : FieldValue<Type>;

/** A UnitRecord as serialized to JSON: dates are ISO strings, not `Date`s. */
export type UnitRecordJson = {
  [F in (typeof UNIT_FIELDS)[number] as F["key"]]: WireValue<F["type"]>;
};

/** The 16 raw string values submitted by the create/edit Unit form. */
export type UnitFormValues = Record<UnitFieldKey, string>;

export type UnitFormErrors = Partial<Record<UnitFieldKey, string>>;

export type UnitFormResult =
  { ok: true; data: UnitRecord } | { ok: false; errors: UnitFormErrors };

/** The 16 CSV headers in order, derived from the field spec. */
export const CSV_HEADERS: string[] = UNIT_FIELDS.map(
  (field) => field.csvHeader
);

export const CSV_COLUMN_COUNT = CSV_HEADERS.length;

/** Parse a whole-IDR integer, or null for empty, or "invalid". */
export function parseOptionalInt(value: string): number | null | "invalid" {
  if (value === "") {
    return null;
  }
  return /^\d+$/.test(value) ? Number(value) : "invalid";
}

/** Trim and collapse runs of whitespace into a single space. */
export function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Safe normalization for fields that are upper-cased by policy. */
export function normalizeUpperCase(value: string): string {
  return collapseWhitespace(value).toUpperCase();
}

function isUpper(type: UnitFieldType): boolean {
  return (
    type === "text-required-upper" ||
    type === "text-upper" ||
    type === "text-null-upper"
  );
}

function normalizeText(value: string, type: UnitFieldType): string {
  return isUpper(type) ? value.toUpperCase() : value;
}

/** The canonical English field name, derived from the camelCase key. */
function fieldLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^[a-z]/, (char) => char.toUpperCase());
}

/** `YYYY-MM-DD` for a date, independent of the server's local timezone. */
function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type UnitFieldValue = string | number | Date | null;
type UnitFieldError = "missing" | "invalid";

type FieldParseResult =
  { ok: true; value: UnitFieldValue } | { ok: false; error: UnitFieldError };

function parseDateField(raw: string): FieldParseResult {
  const parsed = parseDateOnly(raw);
  return parsed === "invalid" || parsed === null
    ? { ok: false, error: "invalid" }
    : { ok: true, value: parsed };
}

function parseIntField(raw: string): FieldParseResult {
  const parsed = parseOptionalInt(raw);
  return parsed === "invalid" || parsed === null
    ? { ok: false, error: "invalid" }
    : { ok: true, value: parsed };
}

function parseField(field: UnitField, raw: string): FieldParseResult {
  const collapsed = collapseWhitespace(raw);

  switch (field.type) {
    case "text-required":
    case "text-required-upper": {
      const value = normalizeText(collapsed, field.type);
      return value === ""
        ? { ok: false, error: "missing" }
        : { ok: true, value };
    }
    case "text":
    case "text-upper":
      return { ok: true, value: normalizeText(collapsed, field.type) };
    case "text-null":
    case "text-null-upper":
      return {
        ok: true,
        value: collapsed === "" ? null : normalizeText(collapsed, field.type),
      };
    case "int":
      return collapsed === ""
        ? { ok: false, error: "missing" }
        : parseIntField(collapsed);
    case "int-zero":
      return collapsed === ""
        ? { ok: true, value: 0 }
        : parseIntField(collapsed);
    case "int-null":
      return collapsed === ""
        ? { ok: true, value: null }
        : parseIntField(collapsed);
    case "date":
      return collapsed === ""
        ? { ok: false, error: "missing" }
        : parseDateField(collapsed);
    case "date-null":
      return collapsed === ""
        ? { ok: true, value: null }
        : parseDateField(collapsed);
  }
}

export type ImportRowResult =
  { ok: true; data: UnitRecord } | { ok: false; reason: string };

function fieldToString(
  field: UnitField,
  value: string | number | Date | null
): string {
  switch (field.type) {
    case "date":
      return formatDateOnly(value as Date);
    case "date-null":
      return value === null ? "" : formatDateOnly(value as Date);
    case "int":
    case "int-zero":
      return String(value as number);
    case "int-null":
      return value === null ? "" : String(value as number);
    default:
      return value === null ? "" : String(value);
  }
}

/** Serialize a Unit record to the 16 CSV columns in the original order. */
export function unitRecordToCsvRow(record: UnitRecord): string[] {
  return UNIT_FIELDS.map((field) =>
    fieldToString(field, record[field.key] as string | number | Date | null)
  );
}

/** Serialize a Unit record to the 16 raw form input strings. */
export function unitRecordToFormValues(record: UnitRecord): UnitFormValues {
  return Object.fromEntries(
    UNIT_FIELDS.map((field) => [
      field.key,
      fieldToString(field, record[field.key] as string | number | Date | null),
    ])
  ) as UnitFormValues;
}

/** Parse and normalize one raw CSV row into a Unit record, or a rejection. */
export function parseImportRow(raw: string[]): ImportRowResult {
  if (raw.length !== CSV_COLUMN_COUNT) {
    return {
      ok: false,
      reason: `expected ${CSV_COLUMN_COUNT} columns, got ${raw.length}`,
    };
  }

  const record: Record<string, string | number | Date | null> = {};
  for (let i = 0; i < UNIT_FIELDS.length; i++) {
    const field = UNIT_FIELDS[i];
    const parsed = parseField(field, raw[i]);
    if (!parsed.ok) {
      return {
        ok: false,
        reason: `${parsed.error} ${fieldLabel(field.key)}`,
      };
    }
    record[field.key] = parsed.value;
  }

  return { ok: true, data: record as unknown as UnitRecord };
}

/** Read the 16 raw string fields out of a submitted FormData. */
export function readUnitForm(formData: FormData): UnitFormValues {
  return Object.fromEntries(
    UNIT_FIELDS.map((field) => [
      field.key,
      String(formData.get(field.key) ?? ""),
    ])
  ) as UnitFormValues;
}

const MODEL_YEAR_RE = /^\d{4}$/;

function formFieldError(field: UnitField, error: UnitFieldError): string {
  if (error === "missing") {
    return `${field.label} wajib diisi`;
  }
  return field.type === "date" || field.type === "date-null"
    ? `${field.label} tidak valid`
    : `${field.label} harus angka`;
}

/**
 * Parse, normalize and validate the 16 raw form fields, deriving the parsing
 * from the field list. Safe normalization matches the CSV import: trim/collapse
 * whitespace and uppercase Brand, Model, Color and Sales Person. The field type
 * drives required-ness and shape; the form adds the Model Year shape rule and
 * the Sell Price / Date Sold pair rule.
 */
export function parseUnitForm(values: UnitFormValues): UnitFormResult {
  const errors: UnitFormErrors = {};
  const record = {} as Record<string, UnitFieldValue>;

  for (const field of UNIT_FIELDS) {
    const parsed = parseField(field, values[field.key] ?? "");
    if (!parsed.ok) {
      errors[field.key] = formFieldError(field, parsed.error);
    } else {
      record[field.key] = parsed.value;
    }
  }

  const modelYear = record.modelYear;
  if (errors.modelYear === undefined && typeof modelYear === "string") {
    const year = Number(modelYear);
    if (!MODEL_YEAR_RE.test(modelYear) || year < 1900 || year > 2100) {
      errors.modelYear = "Tahun tidak valid";
    }
  }

  const sellPriceRaw = collapseWhitespace(values.sellPrice ?? "");
  const dateSoldRaw = collapseWhitespace(values.dateSold ?? "");
  const sellPrice = (record.sellPrice as number | null) ?? null;
  const dateSold = (record.dateSold as Date | null) ?? null;

  // Sell Price and Date Sold are a pair: both or neither.
  if (sellPrice !== null && dateSold === null && dateSoldRaw === "") {
    errors.dateSold = "Tanggal Jual wajib diisi bersama Harga Jual";
  }
  if (sellPrice === null && dateSold !== null && sellPriceRaw === "") {
    errors.sellPrice = "Harga Jual wajib diisi bersama Tanggal Jual";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: record as unknown as UnitRecord };
}
