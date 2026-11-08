import type { Metadata } from "next";
import { BrandModelFields } from "./BrandModelFields";
import {
  listBoughtFrom,
  listBrands,
  listColors,
  listModels,
  listSalesPersons,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Tambah Unit — Motostock",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  errors?: string;
  values?: string;
};

function parseRecord(raw: string | undefined): Record<string, string> {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

function errorFor(
  errors: Record<string, string>,
  field: string,
): string | undefined {
  return errors[field];
}

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const errors = parseRecord(params.errors);
  const values = parseRecord(params.values);

  const [brands, models, colors, salesPersons, boughtFroms] = await Promise.all([
    listBrands(),
    listModels(),
    listColors(),
    listSalesPersons(),
    listBoughtFrom(),
  ]);

  return (
    <main className="inventory-shell">
      <header className="inventory-header">
        <h1 className="inventory-title">Tambah Unit</h1>
        <nav className="nav-links">
          <a className="nav-link" href="/">
            Inventori
          </a>
          <form action="/api/logout" method="post">
            <button type="submit" className="logout-button">
              Keluar
            </button>
          </form>
        </nav>
      </header>

      <form action="/api/units" method="post" className="unit-form">
        <div className="form-grid">
          <BrandModelFields
            brands={brands}
            models={models}
            initialBrand={values.brand ?? ""}
            initialModel={values.model ?? ""}
            brandError={errorFor(errors, "brand")}
            modelError={errorFor(errors, "model")}
          />

          <label className="field-label" htmlFor="modelYear">
            Tahun
          </label>
          <input
            id="modelYear"
            name="modelYear"
            type="text"
            inputMode="numeric"
            className="field-input"
            defaultValue={values.modelYear ?? ""}
            required
            aria-invalid={errorFor(errors, "modelYear") ? true : undefined}
          />
          {errorFor(errors, "modelYear") ? (
            <p className="field-error" role="alert">
              {errorFor(errors, "modelYear")}
            </p>
          ) : null}

          <label className="field-label" htmlFor="licensePlate">
            Plat
          </label>
          <input
            id="licensePlate"
            name="licensePlate"
            type="text"
            className="field-input"
            defaultValue={values.licensePlate ?? ""}
            required
            aria-invalid={errorFor(errors, "licensePlate") ? true : undefined}
          />
          {errorFor(errors, "licensePlate") ? (
            <p className="field-error" role="alert">
              {errorFor(errors, "licensePlate")}
            </p>
          ) : null}

          <label className="field-label" htmlFor="color">
            Warna
          </label>
          <select
            id="color"
            name="color"
            className="field-input"
            defaultValue={values.color ?? ""}
          >
            <option value="">—</option>
            {colors.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="buyPrice">
            Harga Beli
          </label>
          <input
            id="buyPrice"
            name="buyPrice"
            type="text"
            inputMode="numeric"
            className="field-input"
            defaultValue={values.buyPrice ?? ""}
            required
            aria-invalid={errorFor(errors, "buyPrice") ? true : undefined}
          />
          {errorFor(errors, "buyPrice") ? (
            <p className="field-error" role="alert">
              {errorFor(errors, "buyPrice")}
            </p>
          ) : null}

          <label className="field-label" htmlFor="cost">
            Biaya
          </label>
          <input
            id="cost"
            name="cost"
            type="text"
            inputMode="numeric"
            className="field-input"
            defaultValue={values.cost ?? ""}
            aria-invalid={errorFor(errors, "cost") ? true : undefined}
          />
          {errorFor(errors, "cost") ? (
            <p className="field-error" role="alert">
              {errorFor(errors, "cost")}
            </p>
          ) : null}

          <label className="field-label" htmlFor="sellPrice">
            Harga Jual
          </label>
          <input
            id="sellPrice"
            name="sellPrice"
            type="text"
            inputMode="numeric"
            className="field-input"
            defaultValue={values.sellPrice ?? ""}
            aria-invalid={errorFor(errors, "sellPrice") ? true : undefined}
          />
          {errorFor(errors, "sellPrice") ? (
            <p className="field-error" role="alert">
              {errorFor(errors, "sellPrice")}
            </p>
          ) : null}

          <label className="field-label" htmlFor="dateBought">
            Tanggal Beli
          </label>
          <input
            id="dateBought"
            name="dateBought"
            type="date"
            className="field-input"
            defaultValue={values.dateBought ?? ""}
            required
            aria-invalid={errorFor(errors, "dateBought") ? true : undefined}
          />
          {errorFor(errors, "dateBought") ? (
            <p className="field-error" role="alert">
              {errorFor(errors, "dateBought")}
            </p>
          ) : null}

          <label className="field-label" htmlFor="dateSold">
            Tanggal Jual
          </label>
          <input
            id="dateSold"
            name="dateSold"
            type="date"
            className="field-input"
            defaultValue={values.dateSold ?? ""}
            aria-invalid={errorFor(errors, "dateSold") ? true : undefined}
          />
          {errorFor(errors, "dateSold") ? (
            <p className="field-error" role="alert">
              {errorFor(errors, "dateSold")}
            </p>
          ) : null}

          <label className="field-label" htmlFor="salesPerson">
            Sales Person
          </label>
          <select
            id="salesPerson"
            name="salesPerson"
            className="field-input"
            defaultValue={values.salesPerson ?? ""}
          >
            <option value="">—</option>
            {salesPersons.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="nameOnRegistration">
            Nama di STNK
          </label>
          <input
            id="nameOnRegistration"
            name="nameOnRegistration"
            type="text"
            className="field-input"
            defaultValue={values.nameOnRegistration ?? ""}
          />

          <label className="field-label" htmlFor="chassisSerialNumber">
            Nomor Rangka
          </label>
          <input
            id="chassisSerialNumber"
            name="chassisSerialNumber"
            type="text"
            className="field-input"
            defaultValue={values.chassisSerialNumber ?? ""}
          />

          <label className="field-label" htmlFor="engineSerialNumber">
            Nomor Mesin
          </label>
          <input
            id="engineSerialNumber"
            name="engineSerialNumber"
            type="text"
            className="field-input"
            defaultValue={values.engineSerialNumber ?? ""}
          />

          <label className="field-label" htmlFor="boughtFrom">
            Dibeli Dari
          </label>
          <input
            id="boughtFrom"
            name="boughtFrom"
            type="text"
            className="field-input"
            list="bought-from-options"
            defaultValue={values.boughtFrom ?? ""}
          />
          <datalist id="bought-from-options">
            {boughtFroms.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </datalist>

          <label className="field-label" htmlFor="notes">
            Catatan
          </label>
          <textarea
            id="notes"
            name="notes"
            className="field-input field-textarea"
            defaultValue={values.notes ?? ""}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="login-button">
            Simpan
          </button>
          <a className="nav-link" href="/">
            Batal
          </a>
        </div>
      </form>
    </main>
  );
}
