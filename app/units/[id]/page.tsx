import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatIDR } from "@/lib/format";
import { DeleteUnitForm } from "./DeleteUnitForm";
import { SiteNav } from "@/app/site-nav";

export const metadata: Metadata = {
  title: "Detail Unit — Motostock",
};

export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

type SearchParams = {
  warning?: string;
};

const WARNING_MESSAGES: Record<string, string> = {
  chassis: "Nomor Rangka sudah terpakai pada unit lain.",
  license: "Plat sudah terpakai pada unit lain.",
};

export default async function UnitDetailPage({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { id } = await params;
  const { warning } = await searchParams;
  const warnings = (warning ?? "").split(",").filter((code) => code !== "");
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    notFound();
  }

  const unit = await prisma.unit.findUnique({ where: { id: numericId } });

  if (unit === null) {
    notFound();
  }

  const formatDate = (date: Date): string => date.toLocaleDateString("id-ID");

  const fields: { label: string; value: string }[] = [
    { label: "Merek", value: unit.brand },
    { label: "Model", value: unit.model },
    { label: "Tahun", value: unit.modelYear },
    { label: "Plat", value: unit.licensePlate },
    { label: "Warna", value: unit.color },
    { label: "Harga Beli", value: formatIDR(unit.buyPrice) },
    { label: "Biaya", value: formatIDR(unit.cost) },
    {
      label: "Harga Jual",
      value: unit.sellPrice === null ? "" : formatIDR(unit.sellPrice),
    },
    { label: "Tanggal Beli", value: formatDate(unit.dateBought) },
    {
      label: "Tanggal Jual",
      value: unit.dateSold === null ? "" : formatDate(unit.dateSold),
    },
    { label: "Sales Person", value: unit.salesPerson ?? "" },
    { label: "Nama di STNK", value: unit.nameOnRegistration ?? "" },
    { label: "Nomor Rangka", value: unit.chassisSerialNumber ?? "" },
    { label: "Nomor Mesin", value: unit.engineSerialNumber ?? "" },
    { label: "Dibeli Dari", value: unit.boughtFrom ?? "" },
    { label: "Catatan", value: unit.notes ?? "" },
  ];

  return (
    <>
      <SiteNav />
      <main className="inventory-shell">
        <h1 className="inventory-title">Detail Unit</h1>

        {warnings.length > 0 ? (
          <div className="unit-warning" role="alert">
            {warnings.map((code) => (
              <p key={code}>{WARNING_MESSAGES[code] ?? code}</p>
            ))}
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="unit-table detail-table">
            <tbody>
              {fields.map((field) => (
                <tr key={field.label}>
                  <th scope="row">{field.label}</th>
                  <td>{field.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="detail-actions">
          <a className="edit-button" href={`/units/${unit.id}/edit`}>
            Ubah
          </a>
          <DeleteUnitForm unitId={unit.id} />
        </div>
      </main>
    </>
  );
}
