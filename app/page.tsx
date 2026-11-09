import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import {
  filterUnits,
  grossProfit,
  invested,
  isSold,
  statusLabel,
} from "@/lib/unit";
import type { UnitStatus } from "@/lib/unit";
import { SiteNav } from "@/app/site-nav";

export const metadata: Metadata = {
  title: "Inventori — Motostock",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  status?: string;
};

const HEADERS = [
  "Merek",
  "Model",
  "Tahun",
  "Plat",
  "Status",
  "Harga Beli",
  "Harga Jual",
  "Tanggal Beli",
  "Tanggal Jual",
  "Sales Person",
  "Invested",
  "Gross Profit",
] as const;

const NUMERIC_HEADERS = new Set([
  "Tahun",
  "Harga Beli",
  "Harga Jual",
  "Invested",
  "Gross Profit",
]);

function parseStatus(value: string | undefined): UnitStatus | undefined {
  return value === "stok" || value === "terjual" ? value : undefined;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = parseStatus(params.status);

  const allUnits = await prisma.unit.findMany({
    orderBy: { dateBought: "desc" },
  });
  const units = filterUnits(allUnits, { query, status });
  const hasFilter = query !== "" || status !== undefined;

  return (
    <>
      <SiteNav active="inventori" />
      <main className="inventory-shell">
        <h1 className="inventory-title">Inventori</h1>

        <form className="filter-bar" action="/" method="get">
          <input
            className="field-input filter-search"
            name="q"
            type="search"
            placeholder="Cari Merek, Model, Plat, Nomor Rangka, Sales"
            aria-label="Cari unit"
            defaultValue={query}
          />
          <select
            className="field-input filter-status"
            name="status"
            aria-label="Status"
            defaultValue={status ?? ""}
          >
            <option value="">Semua status</option>
            <option value="stok">Stok</option>
            <option value="terjual">Terjual</option>
          </select>
          <button type="submit" className="login-button">
            Cari
          </button>
          {hasFilter ? (
            <a className="nav-link" href="/">
              Reset
            </a>
          ) : null}
        </form>

        {units.length === 0 ? (
          <p className="empty-state" role="status">
            Belum ada unit. Unit yang ditambahkan akan muncul di sini.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="unit-table">
              <thead>
                <tr>
                  {HEADERS.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className={NUMERIC_HEADERS.has(header) ? "num" : undefined}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => {
                  const profit = grossProfit(unit);
                  return (
                    <tr key={unit.id}>
                      <td>
                        <a className="unit-link" href={`/units/${unit.id}`}>
                          {unit.brand}
                        </a>
                      </td>
                      <td>{unit.model}</td>
                      <td className="num">{unit.modelYear}</td>
                      <td>{unit.licensePlate}</td>
                      <td>
                        <span
                          className={
                            isSold(unit)
                              ? "status-badge status-badge--terjual"
                              : "status-badge status-badge--stok"
                          }
                        >
                          {statusLabel(unit)}
                        </span>
                      </td>
                      <td className="num">{formatIDR(unit.buyPrice)}</td>
                      <td className="num">
                        {unit.sellPrice === null
                          ? "—"
                          : formatIDR(unit.sellPrice)}
                      </td>
                      <td>{unit.dateBought.toLocaleDateString("id-ID")}</td>
                      <td>
                        {unit.dateSold === null
                          ? "—"
                          : unit.dateSold.toLocaleDateString("id-ID")}
                      </td>
                      <td>{unit.salesPerson ?? "—"}</td>
                      <td className="num">{formatIDR(invested(unit))}</td>
                      <td className="num">
                        {profit === null ? "—" : formatIDR(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
