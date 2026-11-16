"use client";

import { useEffect, useState } from "react";
import { formatIDR } from "@/lib/format";
import { formatDateDisplay } from "@/lib/calendar";
import { UNIT_FIELDS } from "@/lib/unit-spec";
import type { UnitField, UnitRecordJson } from "@/lib/unit-spec";

/** A Unit as returned by GET /api/units/[id]. Dates arrive as ISO strings. */
type UnitDetail = UnitRecordJson;

/** Render one field value as the dialog displays it, from the field's type. */
function formatValue(field: UnitField, value: string | number | null): string {
  switch (field.type) {
    case "int":
    case "int-zero":
      return formatIDR(value as number);
    case "int-null":
      return value === null ? "" : formatIDR(value as number);
    case "date":
      return formatDateDisplay(new Date(value as string));
    case "date-null":
      return value === null ? "" : formatDateDisplay(new Date(value as string));
    default:
      return value === null ? "" : String(value);
  }
}

/**
 * The loaded detail view: every Unit field (derived from the field list) plus
 * the Ubah link and, for an In Stock Unit, the Jual link to the sell form.
 */
function UnitDetailView({
  unit,
  unitId,
}: {
  unit: UnitDetail;
  unitId: number;
}) {
  const fields = UNIT_FIELDS.map((field) => ({
    label: field.label,
    value: formatValue(field, unit[field.key]),
  }));

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
