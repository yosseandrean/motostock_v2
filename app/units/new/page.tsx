import type { Metadata } from "next";
import { parseRecord, UnitForm } from "../unit-form";
import {
  listBoughtFrom,
  listBrands,
  listColors,
  listModels,
  listSalesPersons,
} from "@/lib/catalog";
import { SiteNav } from "@/app/site-nav";

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

  const [brands, models, colors, salesPersons, boughtFroms] = await Promise.all(
    [
      listBrands(),
      listModels(),
      listColors(),
      listSalesPersons(),
      listBoughtFrom(),
    ],
  );

  return (
    <>
      <SiteNav />
      <main className="inventory-shell">
        <h1 className="inventory-title">Tambah Unit</h1>

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
    </>
  );
}
