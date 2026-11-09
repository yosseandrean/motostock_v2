import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listSalesPersons } from "@/lib/catalog";
import { dateOnlyWib } from "@/lib/unit-sell";
import { parseRecord } from "../../unit-form";
import { SellFields } from "../../sell-fields";
import { SiteNav } from "@/app/site-nav";

export const metadata: Metadata = {
  title: "Jual Unit — Motostock",
};

export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

type SearchParams = {
  errors?: string;
  values?: string;
};

export default async function SellUnitPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const errors = parseRecord(query.errors);
  const submitted = parseRecord(query.values);

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound();
  }

  const unit = await prisma.unit.findUnique({ where: { id: numericId } });
  if (unit === null) {
    notFound();
  }

  const salesPersons = await listSalesPersons();

  // Submitted values (from a validation round-trip) win over the defaults.
  const values = {
    sellPrice: submitted.sellPrice ?? "",
    dateSold: submitted.dateSold ?? dateOnlyWib(new Date()),
    salesPerson: submitted.salesPerson ?? unit.salesPerson ?? "",
  };

  return (
    <>
      <SiteNav />
      <main className="inventory-shell">
        <h1 className="inventory-title">Jual Unit</h1>
        <p className="text-grafit-400">
          {`${unit.brand} ${unit.model} · ${unit.licensePlate}`}
        </p>

        <form
          action={`/api/units/${unit.id}/sell`}
          method="post"
          className="unit-form"
        >
          <div className="form-grid">
            <SellFields
              values={values}
              errors={errors}
              salesPersons={salesPersons}
              requireSellPriceAndDate
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="login-button">
              Jual
            </button>
            <a className="nav-link" href="/">
              Batal
            </a>
          </div>
        </form>
      </main>
    </>
  );
}
