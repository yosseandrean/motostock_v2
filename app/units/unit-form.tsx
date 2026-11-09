export type FormFieldMap = Record<string, string>;

export type UnitFormProps = {
  action: string;
  values: FormFieldMap;
  errors: FormFieldMap;
  brands: string[];
  models: string[];
  colors: string[];
  salesPersons: string[];
  boughtFroms: string[];
  submitLabel: string;
  cancelHref: string;
};

/** Parse the `errors`/`values` search params shared by the new and edit pages. */
export function parseRecord(raw: string | undefined): Record<string, string> {
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

/**
 * The 16-field Unit form, shared by the create and edit pages. Validation and
 * normalization live in `parseUnitForm` (see lib/unit-create.ts); this
 * component only renders fields, catalogs, and any errors/values passed in.
 */
export function UnitForm({
  action,
  values,
  errors,
  brands,
  models,
  colors,
  salesPersons,
  boughtFroms,
  submitLabel,
  cancelHref,
}: UnitFormProps) {
  return (
    <form action={action} method="post" className="unit-form">
      <div className="form-grid">
        <label className="field-label" htmlFor="brand">
          Merek
        </label>
        <input
          id="brand"
          name="brand"
          type="text"
          className="field-input"
          list="brand-options"
          defaultValue={values.brand ?? ""}
          required
          aria-invalid={errorFor(errors, "brand") ? true : undefined}
        />
        <datalist id="brand-options">
          {brands.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </datalist>
        {errorFor(errors, "brand") ? (
          <p className="field-error" role="alert">
            {errorFor(errors, "brand")}
          </p>
        ) : null}

        <label className="field-label" htmlFor="model">
          Model
        </label>
        <input
          id="model"
          name="model"
          type="text"
          className="field-input"
          list="model-options"
          defaultValue={values.model ?? ""}
          required
          aria-invalid={errorFor(errors, "model") ? true : undefined}
        />
        <datalist id="model-options">
          {models.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </datalist>
        {errorFor(errors, "model") ? (
          <p className="field-error" role="alert">
            {errorFor(errors, "model")}
          </p>
        ) : null}

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
        <input
          id="color"
          name="color"
          type="text"
          className="field-input"
          list="color-options"
          defaultValue={values.color ?? ""}
        />
        <datalist id="color-options">
          {colors.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </datalist>

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
        <input
          id="salesPerson"
          name="salesPerson"
          type="text"
          className="field-input"
          list="sales-person-options"
          defaultValue={values.salesPerson ?? ""}
        />
        <datalist id="sales-person-options">
          {salesPersons.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </datalist>
      </div>

      <div className="form-actions">
        <button type="submit" className="login-button">
          {submitLabel}
        </button>
        <a className="nav-link" href={cancelHref}>
          Batal
        </a>
      </div>
    </form>
  );
}
