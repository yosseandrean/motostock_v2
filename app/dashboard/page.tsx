import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import { computeDashboard } from "@/lib/dashboard";
import type { AgingBucketKey, BreakdownRow } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Dashboard Inventori — Motostock",
};

export const dynamic = "force-dynamic";

const AGING_BUCKET_LABELS: Record<AgingBucketKey, string> = {
  "under-30": "Kurang dari 30 hari",
  "30-60": "30–60 hari",
  "60-90": "60–90 hari",
  "over-90": "Lebih dari 90 hari",
};

function BreakdownTable({
  label,
  rows,
}: {
  label: string;
  rows: BreakdownRow[];
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
            <th scope="col">Invested</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td>{row.count}</td>
              <td>{formatIDR(row.invested)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function InventoryDashboardPage() {
  const units = await prisma.unit.findMany({
    select: {
      id: true,
      brand: true,
      model: true,
      color: true,
      licensePlate: true,
      buyPrice: true,
      cost: true,
      sellPrice: true,
      dateBought: true,
    },
  });
  const dashboard = computeDashboard(units, new Date());

  return (
    <main className="inventory-shell">
      <header className="inventory-header">
        <h1 className="inventory-title">Dashboard Inventori</h1>
        <nav className="nav-links">
          <a className="nav-link" href="/">
            Inventori
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

      <section className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Unit Stok</span>
          <span className="summary-value">{dashboard.inStockCount}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Invested</span>
          <span className="summary-value">
            {formatIDR(dashboard.totalInvested)}
          </span>
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Umur Stok</h2>
        <div className="table-wrap">
          <table className="unit-table">
            <thead>
              <tr>
                <th scope="col">Kelompok</th>
                <th scope="col">Unit</th>
                <th scope="col">Invested</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.agingBuckets.map((bucket) => (
                <tr key={bucket.key}>
                  <td>{AGING_BUCKET_LABELS[bucket.key]}</td>
                  <td>{bucket.count}</td>
                  <td>{formatIDR(bucket.invested)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Unit Stale</h2>
        {dashboard.staleUnits.length === 0 ? (
          <p className="empty-state" role="status">
            Tidak ada unit stale.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="unit-table">
              <thead>
                <tr>
                  <th scope="col">Merek</th>
                  <th scope="col">Model</th>
                  <th scope="col">Warna</th>
                  <th scope="col">Plat</th>
                  <th scope="col">Umur (hari)</th>
                  <th scope="col">Invested</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.staleUnits.map((stale) => (
                  <tr key={stale.id}>
                    <td>
                      <a className="unit-link" href={`/units/${stale.id}`}>
                        {stale.brand}
                      </a>
                    </td>
                    <td>{stale.model}</td>
                    <td>{stale.color}</td>
                    <td>{stale.licensePlate}</td>
                    <td>{stale.age}</td>
                    <td>{formatIDR(stale.invested)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Per Merek</h2>
        <BreakdownTable label="Merek" rows={dashboard.byBrand} />
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Per Model</h2>
        <BreakdownTable label="Model" rows={dashboard.byModel} />
      </section>
    </main>
  );
}
