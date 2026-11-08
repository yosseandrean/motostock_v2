"use client";

import { useState } from "react";

export type BrandModel = { brand: string; model: string };

/**
 * Brand and Model selects, with Model filtered by the chosen Brand.
 * The selected values are submitted as `brand` and `model` form fields.
 */
export function BrandModelFields({
  brands,
  models,
  initialBrand = "",
  initialModel = "",
  brandError,
  modelError,
}: {
  brands: string[];
  models: BrandModel[];
  initialBrand?: string;
  initialModel?: string;
  brandError?: string;
  modelError?: string;
}) {
  const [brand, setBrand] = useState(initialBrand);
  const [model, setModel] = useState(initialModel);

  const modelsForBrand =
    brand === "" ? [] : models.filter((entry) => entry.brand === brand);

  function handleBrandChange(nextBrand: string) {
    setBrand(nextBrand);
    setModel("");
  }

  return (
    <>
      <label className="field-label" htmlFor="brand">
        Merek
      </label>
      <select
        id="brand"
        name="brand"
        className="field-input"
        value={brand}
        onChange={(event) => handleBrandChange(event.target.value)}
        required
        aria-invalid={brandError ? true : undefined}
      >
        <option value="">— Pilih Merek —</option>
        {brands.map((entry) => (
          <option key={entry} value={entry}>
            {entry}
          </option>
        ))}
      </select>
      {brandError ? (
        <p className="field-error" role="alert">
          {brandError}
        </p>
      ) : null}

      <label className="field-label" htmlFor="model">
        Model
      </label>
      <select
        id="model"
        name="model"
        className="field-input"
        value={model}
        onChange={(event) => setModel(event.target.value)}
        required
        disabled={brand === ""}
        aria-invalid={modelError ? true : undefined}
      >
        <option value="">{brand === "" ? "Pilih Merek dulu" : "— Pilih Model —"}</option>
        {modelsForBrand.map(({ brand: entryBrand, model: entryModel }) => (
          <option key={`${entryBrand}\u0000${entryModel}`} value={entryModel} data-brand={entryBrand}>
            {entryModel}
          </option>
        ))}
      </select>
      {modelError ? (
        <p className="field-error" role="alert">
          {modelError}
        </p>
      ) : null}
    </>
  );
}
