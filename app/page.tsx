import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";

export const metadata: Metadata = {
  title: "Inventori — Motostock",
};

export const dynamic = "force-dynamic";

const HEADERS = [
  "Merek",
  "Model",
  "Tahun",
  "Plat",
  "Warna",
  "Harga Beli",
  "Biaya",
  "Harga Jual",
  "Tanggal Beli",
  "Status",
] as const;

export default async function InventoryPage() {
  const units = await prisma.unit.findMany({
    orderBy: { dateBought: "desc" },
  });

  return (
    <main className="inventory-shell">
      <header className="inventory-header">
        <h1 className="inventory-title">Inventori</h1>
        <nav className="nav-links">
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
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td>{unit.brand}</td>
                  <td>{unit.model}</td>
                  <td>{unit.modelYear}</td>
                  <td>{unit.licensePlate}</td>
                  <td>{unit.color}</td>
                  <td>{formatIDR(unit.buyPrice)}</td>
                  <td>{formatIDR(unit.cost)}</td>
                  <td>{unit.sellPrice === null ? "—" : formatIDR(unit.sellPrice)}</td>
                  <td>{unit.dateBought.toLocaleDateString("id-ID")}</td>
                  <td>{unit.sellPrice === null ? "Stok" : "Terjual"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
