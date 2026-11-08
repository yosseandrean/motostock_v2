import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import {
  filterUnits,
  grossProfit,
  invested,
  statusLabel,
} from "@/lib/unit";
import type { UnitStatus } from "@/lib/unit";

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
    <main className="inventory-shell">
      <header className="inventory-header">
        <h1 className="inventory-title">Inventori</h1>
        <nav className="nav-links">
          <a className="nav-link" href="/dashboard">
            Dashboard
          </a>
          <a className="nav-link" href="/sales">
            Penjualan
          </a>
          <a className="nav-link" href="/checklist">
            Ceklis Data
          </a>
          <a className="nav-link" href="/units/new">
            Tambah Unit
          </a>
          <a className="nav-link" href="/import">
            Impor CSV
          </a>
          <a className="nav-link" href="/api/export">
            Ekspor CSV
          </a>
          <form action="/api/logout" method="post">
            <button type="submit" className="logout-button">
              Keluar
            </button>
          </form>
        </nav>
      </header>

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
                  <th key={header} scope="col">
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
                    <td>{unit.modelYear}</td>
                    <td>{unit.licensePlate}</td>
                    <td>{statusLabel(unit)}</td>
                    <td>{formatIDR(unit.buyPrice)}</td>
                    <td>
                      {unit.sellPrice === null ? "—" : formatIDR(unit.sellPrice)}
                    </td>
                    <td>{unit.dateBought.toLocaleDateString("id-ID")}</td>
                    <td>
                      {unit.dateSold === null
                        ? "—"
                        : unit.dateSold.toLocaleDateString("id-ID")}
                    </td>
                    <td>{unit.salesPerson ?? "—"}</td>
                    <td>{formatIDR(invested(unit))}</td>
                    <td>{profit === null ? "—" : formatIDR(profit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
