"use client";

import { SALES_PRESETS } from "@/lib/sales";
import type { SalesPresetKey } from "@/lib/sales";

/**
 * GET filter bar for the sales dashboard. Each change auto-submits the form
 * (via `requestSubmit`), navigating to `/sales` with the new query params so
 * the server page re-resolves the period. No "Terapkan" button is needed.
 */
export function PeriodFilter({
  preset,
  from,
  to,
}: {
  preset: SalesPresetKey;
  from: string;
  to: string;
}) {
  return (
    <form className="filter-bar" action="/sales" method="get">
      <select
        className="field-input filter-status"
        name="preset"
        aria-label="Periode"
        defaultValue={preset}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {SALES_PRESETS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      {preset === "custom" ? (
        <>
          <input
            className="field-input"
            type="date"
            name="from"
            aria-label="Dari"
            defaultValue={from}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          />
          <input
            className="field-input"
            type="date"
            name="to"
            aria-label="Sampai"
            defaultValue={to}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          />
        </>
      ) : null}
    </form>
  );
}
