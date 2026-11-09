import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { computeChecklist } from "@/lib/checklist";
import type { ChecklistCategoryKey } from "@/lib/checklist";
import { SiteNav } from "@/app/site-nav";

export const metadata: Metadata = {
  title: "Ceklis Data — Motostock",
};

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<ChecklistCategoryKey, string> = {
  "empty-chassis": "Nomor Rangka Kosong",
  "duplicate-chassis": "Nomor Rangka Duplikat",
  "duplicate-license-plate": "Plat Duplikat",
  "missing-color": "Warna Kosong",
  "missing-name-on-registration": "Nama di STNK Kosong",
  "case-split-sales-person": "Sales Person Beda Kapital",
};

export default async function ChecklistPage() {
  const units = await prisma.unit.findMany({
    select: {
      id: true,
      brand: true,
      model: true,
      licensePlate: true,
      color: true,
      salesPerson: true,
      nameOnRegistration: true,
      chassisSerialNumber: true,
    },
  });
  const categories = computeChecklist(units);

  return (
    <>
      <SiteNav active="ceklis" />
      <main className="inventory-shell">
        <h1 className="inventory-title">Ceklis Data</h1>

        <p className="import-hint">
          Daftar masalah data ditemukan tanpa mengubah data apa pun. Buka unit
          untuk memperbaiki satu per satu.
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
    </>
  );
}
