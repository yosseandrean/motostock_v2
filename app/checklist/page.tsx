import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { computeChecklist } from "@/lib/checklist";
import type { ChecklistCategoryKey } from "@/lib/checklist";

export const metadata: Metadata = {
  title: "Ceklis Data — Motostock",
};

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<ChecklistCategoryKey, string> = {
  "empty-chassis": "Nomor Rangka Kosong",
  "duplicate-chassis": "Nomor Rangka Duplikat",
  "duplicate-license-plate": "Plat Duplikat",
  "missing-sales-person": "Sales Person Kosong pada Unit Terjual",
  "missing-color": "Warna Kosong",
  "missing-name-on-registration": "Nama di STNK Kosong",
  "case-split-sales-person": "Sales Person Beda Kapital",
  "loss-making-sales": "Penjualan Rugi",
  "stale-units": "Unit Stale",
};

export default async function ChecklistPage() {
  const units = await prisma.unit.findMany({
    select: {
      id: true,
      brand: true,
      model: true,
      licensePlate: true,
      color: true,
      buyPrice: true,
      cost: true,
      sellPrice: true,
      dateBought: true,
      salesPerson: true,
      nameOnRegistration: true,
      chassisSerialNumber: true,
    },
  });
  const categories = computeChecklist(units, new Date());

  return (
    <main className="inventory-shell">
      <header className="inventory-header">
        <h1 className="inventory-title">Ceklis Data</h1>
        <nav className="nav-links">
          <a className="nav-link" href="/">
            Inventori
          </a>
          <a className="nav-link" href="/dashboard">
            Dashboard
          </a>
          <a className="nav-link" href="/sales">
            Penjualan
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

      <p className="import-hint">
        Daftar masalah data ditemukan tanpa mengubah data apa pun. Buka unit untuk
        memperbaiki satu per satu.
      </p>

      {categories.length === 0 ? (
        <p className="empty-state" role="status">
          Tidak ada masalah data.
        </p>
      ) : (
        categories.map((category) => (
          <section className="dashboard-section" key={category.key}>
            <h2 className="section-title">
              {CATEGORY_LABELS[category.key]}{" "}
              <span className="checklist-count">{category.items.length}</span>
            </h2>
            <div className="table-wrap">
              <table className="unit-table">
                <thead>
                  <tr>
                    <th scope="col">Merek</th>
                    <th scope="col">Model</th>
                    <th scope="col">Plat</th>
                    <th scope="col">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {category.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <a className="unit-link" href={`/units/${item.id}`}>
                          {item.brand}
                        </a>
                      </td>
                      <td>{item.model}</td>
                      <td>{item.licensePlate}</td>
                      <td>{item.detail === "" ? "—" : item.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </main>
  );
}
