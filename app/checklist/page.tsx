import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { computeChecklist } from "@/lib/checklist";
import type { ChecklistCategoryKey } from "@/lib/checklist";
import { SiteNav } from "@/app/site-nav";
import { ChecklistTable } from "./checklist-table";

export const metadata: Metadata = {
  title: "Data Bermasalah — Motostock",
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
        <h1 className="inventory-title">Data Bermasalah</h1>

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
              <ChecklistTable items={category.items} />
            </section>
          ))
        )}
      </main>
    </>
  );
}
