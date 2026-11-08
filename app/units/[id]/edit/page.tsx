import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateOnly } from "@/lib/inventory-csv";
import { parseRecord, UnitForm } from "../../unit-form";
import {
  listBoughtFrom,
  listBrands,
  listColors,
  listModels,
  listSalesPersons,
} from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Ubah Unit — Motostock",
};

export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

type SearchParams = {
  errors?: string;
  values?: string;
};

export default async function EditUnitPage({
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

  // Submitted values (from a validation round-trip) win over the stored ones.
  const values = {
    brand: submitted.brand ?? unit.brand,
    model: submitted.model ?? unit.model,
    modelYear: submitted.modelYear ?? unit.modelYear,
    licensePlate: submitted.licensePlate ?? unit.licensePlate,
    color: submitted.color ?? unit.color,
    buyPrice: submitted.buyPrice ?? String(unit.buyPrice),
    cost: submitted.cost ?? String(unit.cost),
    sellPrice:
      submitted.sellPrice ?? (unit.sellPrice === null ? "" : String(unit.sellPrice)),
    dateBought: submitted.dateBought ?? formatDateOnly(unit.dateBought),
    dateSold:
      submitted.dateSold ?? (unit.dateSold === null ? "" : formatDateOnly(unit.dateSold)),
    salesPerson: submitted.salesPerson ?? (unit.salesPerson ?? ""),
    nameOnRegistration: submitted.nameOnRegistration ?? (unit.nameOnRegistration ?? ""),
    chassisSerialNumber: submitted.chassisSerialNumber ?? (unit.chassisSerialNumber ?? ""),
    engineSerialNumber: submitted.engineSerialNumber ?? (unit.engineSerialNumber ?? ""),
    boughtFrom: submitted.boughtFrom ?? (unit.boughtFrom ?? ""),
    notes: submitted.notes ?? (unit.notes ?? ""),
  };

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
        <h1 className="inventory-title">Ubah Unit</h1>
        <nav className="nav-links">
          <a className="nav-link" href="/">
            Inventori
          </a>
          <a className="nav-link" href={`/units/${unit.id}`}>
            Detail
          </a>
          <form action="/api/logout" method="post">
            <button type="submit" className="logout-button">
              Keluar
            </button>
          </form>
        </nav>
      </header>

      <UnitForm
        action={`/api/units/${unit.id}`}
        values={values}
        errors={errors}
        brands={brands}
        models={models}
        colors={colors}
        salesPersons={salesPersons}
        boughtFroms={boughtFroms}
        submitLabel="Simpan Perubahan"
        cancelHref={`/units/${unit.id}`}
      />
    </main>
  );
}
