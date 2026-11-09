import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatIDR, formatPercent } from "@/lib/format";
import {
  computeSalesSummary,
  parseDateOnly,
  resolvePeriod,
  SALES_PRESETS,
} from "@/lib/sales";
import type { SalesBreakdownRow, SalesPresetKey } from "@/lib/sales";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { SiteNav } from "@/app/site-nav";

export const metadata: Metadata = {
  title: "Dashboard Penjualan — Motostock",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  preset?: string;
  from?: string;
  to?: string;
};

function parsePreset(value: string | undefined): SalesPresetKey {
  return SALES_PRESETS.some((preset) => preset.key === value)
    ? (value as SalesPresetKey)
    : "this-month";
}

function BreakdownTable({
  label,
  rows,
}: {
  label: string;
  rows: SalesBreakdownRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="empty-state" role="status">
        Tidak ada data.
      </p>
    );
  }

  return (
    <div className="table-wrap">
      <table className="unit-table">
        <thead>
          <tr>
            <th scope="col">{label}</th>
            <th scope="col">Unit</th>
            <th scope="col">Pendapatan</th>
            <th scope="col">Laba Kotor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td>{row.count}</td>
              <td>{formatIDR(row.revenue)}</td>
              <td>{formatIDR(row.grossProfit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function SalesDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const preset = parsePreset(params.preset);
  const from = params.from ?? "";
  const to = params.to ?? "";
  const now = new Date();

  const customValid =
    preset === "custom" &&
    parseDateOnly(from) !== null &&
    parseDateOnly(to) !== null;
  // An incomplete Custom range falls back to This month rather than All time.
  const period = customValid
    ? resolvePeriod("custom", now, { from, to })
    : resolvePeriod(preset === "custom" ? "this-month" : preset, now);

  const units = await prisma.unit.findMany({
    select: {
      id: true,
      brand: true,
      model: true,
      salesPerson: true,
      buyPrice: true,
      cost: true,
      sellPrice: true,
      dateSold: true,
    },
  });
  const summary = computeSalesSummary(units, period);

  return (
    <>
      <SiteNav active="penjualan" />
      <main className="inventory-shell">
        <h1 className="inventory-title">Dashboard Penjualan</h1>

        <form className="filter-bar" action="/sales" method="get">
          <select
            className="field-input filter-status"
            name="preset"
            aria-label="Periode"
            defaultValue={preset}
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
              />
              <input
                className="field-input"
                type="date"
                name="to"
                aria-label="Sampai"
                defaultValue={to}
              />
            </>
          ) : null}
          <button type="submit" className="login-button">
            Terapkan
          </button>
        </form>

        <section className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Unit Terjual</span>
            <span className="summary-value">{summary.unitsSold}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Pendapatan</span>
            <span className="summary-value">{formatIDR(summary.revenue)}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Laba Kotor</span>
            <span className="summary-value">
              {formatIDR(summary.grossProfit)}
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Margin</span>
            <span className="summary-value">
              {summary.margin === null ? "—" : formatPercent(summary.margin)}
            </span>
          </div>
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Tren</h2>
          {summary.trend.length === 0 ? (
            <p className="empty-state" role="status">
              Tidak ada data.
            </p>
          ) : (
            <>
              <script
                type="application/json"
                id="sales-trend"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify(summary.trend),
                }}
              />
              <MonthlyTrendChart data={summary.trend} />
            </>
          )}
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Per Merek</h2>
          <BreakdownTable label="Merek" rows={summary.byBrand} />
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Per Model</h2>
          <BreakdownTable label="Model" rows={summary.byModel} />
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Per Sales Person</h2>
          <BreakdownTable label="Sales Person" rows={summary.bySalesPerson} />
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Penjualan Rugi</h2>
          {summary.losses.length === 0 ? (
            <p className="empty-state" role="status">
              Tidak ada penjualan rugi.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="unit-table">
                <thead>
                  <tr>
                    <th scope="col">Merek</th>
                    <th scope="col">Model</th>
                    <th scope="col">Harga Jual</th>
                    <th scope="col">Laba Kotor</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.losses.map((loss) => (
                    <tr key={loss.id}>
                      <td>
                        <a className="unit-link" href={`/units/${loss.id}`}>
                          {loss.brand}
                        </a>
                      </td>
                      <td>{loss.model}</td>
                      <td>{formatIDR(loss.sellPrice)}</td>
                      <td>
                        <span className="loss-value">
                          {formatIDR(loss.grossProfit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
