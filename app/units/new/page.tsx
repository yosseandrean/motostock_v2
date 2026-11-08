import type { Metadata } from "next";
import { parseRecord, UnitForm } from "../unit-form";
import {
  listBoughtFrom,
  listBrands,
  listColors,
  listModels,
  listSalesPersons,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Tambah Unit — Motostock",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  errors?: string;
  values?: string;
};

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const errors = parseRecord(params.errors);
  const values = parseRecord(params.values);

  const [brands, models, colors, salesPersons, boughtFroms] = await Promise.all([
    listBrands(),
    listModels(),
    listColors(),
    listSalesPersons(),
    listBoughtFrom(),
  ]);

  return (
    <main className="inventory-shell">
      <header className="inventory-header">
        <h1 className="inventory-title">Tambah Unit</h1>
        <nav className="nav-links">
          <a className="nav-link" href="/">
            Inventori
          </a>
          <a className="nav-link" href="/checklist">
            Ceklis Data
          </a>
          <form action="/api/logout" method="post">
            <button type="submit" className="logout-button">
              Keluar
            </button>
          </form>
        </nav>
      </header>

      <UnitForm
        action="/api/units"
        values={values}
        errors={errors}
        brands={brands}
        models={models}
        colors={colors}
        salesPersons={salesPersons}
        boughtFroms={boughtFroms}
        submitLabel="Simpan"
        cancelHref="/"
      />
    </main>
  );
}
