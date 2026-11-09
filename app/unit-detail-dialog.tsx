"use client";

import { useEffect, useState } from "react";
import { formatIDR } from "@/lib/format";

/** A Unit as returned by GET /api/units/[id]. Dates arrive as ISO strings. */
type UnitDetail = {
  id: number;
  brand: string;
  model: string;
  modelYear: string;
  licensePlate: string;
  color: string;
  buyPrice: number;
  cost: number;
  sellPrice: number | null;
  dateBought: string;
  dateSold: string | null;
  salesPerson: string | null;
  nameOnRegistration: string | null;
  chassisSerialNumber: string | null;
  engineSerialNumber: string | null;
  boughtFrom: string | null;
  notes: string | null;
};

function formatDate(value: string | null): string {
  return value === null ? "" : new Date(value).toLocaleDateString("id-ID");
}

/**
 * The loaded detail view: every Unit field plus the Ubah link and, for an
 * In Stock Unit, the Jual link to the sell form.
 */
function UnitDetailView({
  unit,
  unitId,
}: {
  unit: UnitDetail;
  unitId: number;
}) {
  const fields = [
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
    { label: "Tanggal Jual", value: formatDate(unit.dateSold) },
    { label: "Sales Person", value: unit.salesPerson ?? "" },
    { label: "Nama di STNK", value: unit.nameOnRegistration ?? "" },
    { label: "Nomor Rangka", value: unit.chassisSerialNumber ?? "" },
    { label: "Nomor Mesin", value: unit.engineSerialNumber ?? "" },
    { label: "Dibeli Dari", value: unit.boughtFrom ?? "" },
    { label: "Catatan", value: unit.notes ?? "" },
  ];

  return (
    <>
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
      <div className="detail-actions">
        {unit.sellPrice === null ? (
          <a className="edit-button" href={`/units/${unitId}/sell`}>
            Jual
          </a>
        ) : null}
        <a className="edit-button" href={`/units/${unitId}/edit`}>
          Ubah
        </a>
      </div>
    </>
  );
}

/**
 * Floating detail dialog for a Unit. It fetches the full Unit from the API on
 * open (the list only carries the subset of fields it renders), so the detail
 * can show every field. `unitId === null` keeps it fully closed and renders
 * nothing.
 */
export function UnitDetailDialog({
  unitId,
  onClose,
}: {
  unitId: number | null;
  onClose: () => void;
}) {
  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (unitId === null) {
      return;
    }

    let cancelled = false;
    setUnit(null);
    setError(false);

    fetch(`/api/units/${unitId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return (await response.json()) as UnitDetail;
      })
      .then((detail) => {
        if (!cancelled) {
          setUnit(detail);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [unitId]);

  if (unitId === null) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Detail Unit"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <h2 className="dialog-title">Detail Unit</h2>
          <button type="button" className="dialog-close" onClick={onClose}>
            Tutup
          </button>
        </div>

        {error ? (
          <p className="dialog-error" role="alert">
            Gagal memuat detail unit.
          </p>
        ) : unit === null ? (
          <p className="dialog-loading">Memuat…</p>
        ) : (
          <UnitDetailView unit={unit} unitId={unitId} />
        )}
      </div>
    </div>
  );
}
