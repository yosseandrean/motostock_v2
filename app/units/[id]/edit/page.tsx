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
import { SiteNav } from "@/app/site-nav";
import { DeleteUnitForm } from "../DeleteUnitForm";

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
  warning?: string;
};

const WARNING_MESSAGES: Record<string, string> = {
  chassis: "Nomor Rangka sudah terpakai pada unit lain.",
  license: "Plat sudah terpakai pada unit lain.",
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
  const warnings = (query.warning ?? "")
    .split(",")
    .filter((code) => code !== "");

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
      submitted.sellPrice ??
      (unit.sellPrice === null ? "" : String(unit.sellPrice)),
    dateBought: submitted.dateBought ?? formatDateOnly(unit.dateBought),
    dateSold:
      submitted.dateSold ??
      (unit.dateSold === null ? "" : formatDateOnly(unit.dateSold)),
    salesPerson: submitted.salesPerson ?? unit.salesPerson ?? "",
    nameOnRegistration:
      submitted.nameOnRegistration ?? unit.nameOnRegistration ?? "",
    chassisSerialNumber:
      submitted.chassisSerialNumber ?? unit.chassisSerialNumber ?? "",
    engineSerialNumber:
      submitted.engineSerialNumber ?? unit.engineSerialNumber ?? "",
    boughtFrom: submitted.boughtFrom ?? unit.boughtFrom ?? "",
    notes: submitted.notes ?? unit.notes ?? "",
  };

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
        <h1 className="inventory-title">Ubah Unit</h1>

        {warnings.length > 0 ? (
          <div className="unit-warning" role="alert">
            {warnings.map((code) => (
              <p key={code}>{WARNING_MESSAGES[code] ?? code}</p>
            ))}
          </div>
        ) : null}

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
          cancelHref="/"
        />

        <div className="detail-actions">
          <DeleteUnitForm unitId={unit.id} />
        </div>
      </main>
    </>
  );
}
