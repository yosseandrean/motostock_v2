"use client";

import { useState } from "react";
import { formatIDR } from "@/lib/format";
import type { StaleUnit } from "@/lib/dashboard";
import { UnitDetailDialog } from "@/app/unit-detail-dialog";

/**
 * The Dashboard "Unit Stale" table. The server page passes the serialized
 * stale rows; this component owns the selected Unit in browser state so a row
 * click opens the detail dialog instead of navigating to a detail page.
 */
export function UnitStaleTable({ units }: { units: StaleUnit[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      <div className="table-wrap">
        <table className="unit-table">
          <thead>
            <tr>
              <th scope="col">Merek</th>
              <th scope="col">Model</th>
              <th scope="col">Warna</th>
              <th scope="col">Plat</th>
              <th scope="col">Umur (hari)</th>
              <th scope="col">Invested</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr
                key={unit.id}
                className="unit-row"
                role="button"
                tabIndex={0}
                aria-label={`Detail ${unit.brand} ${unit.model}`}
                onClick={() => setSelectedId(unit.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(unit.id);
                  }
                }}
              >
                <td>{unit.brand}</td>
                <td>{unit.model}</td>
                <td>{unit.color}</td>
                <td>{unit.licensePlate}</td>
                <td>{unit.age}</td>
                <td>{formatIDR(unit.invested)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <UnitDetailDialog
        unitId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
