export type SellFieldsValues = {
  sellPrice: string;
  dateSold: string;
  salesPerson: string;
};

function errorFor(
  errors: Record<string, string>,
  field: string,
): string | undefined {
  return errors[field];
}

/**
 * The three sell-related fields (Harga Jual, Tanggal Jual, Sales Person with
 * the historical Sales Person datalist and per-field errors), shared by the
 * create/edit Unit form and the dedicated sell form.
 */
export function SellFields({
  values,
  errors,
  salesPersons,
  requireSellPriceAndDate = false,
}: {
  values: SellFieldsValues;
  errors: Record<string, string>;
  salesPersons: string[];
  requireSellPriceAndDate?: boolean;
}) {
  return (
    <>
      <label className="field-label" htmlFor="sellPrice">
        Harga Jual
      </label>
      <input
        id="sellPrice"
        name="sellPrice"
        type="text"
        inputMode="numeric"
        className="field-input"
        defaultValue={values.sellPrice}
        required={requireSellPriceAndDate || undefined}
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
        defaultValue={values.dateSold}
        required={requireSellPriceAndDate || undefined}
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
        defaultValue={values.salesPerson}
      />
      <datalist id="sales-person-options">
        {salesPersons.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </datalist>
    </>
  );
}
