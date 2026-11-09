"use client";

import { useState } from "react";
import { formatIDR } from "@/lib/format";
import type { StaleUnit } from "@/lib/dashboard";
import { UnitDetailDialog } from "@/app/unit-detail-dialog";
import { ClickableUnitRow } from "@/app/unit-row";

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
              <th scope="col">Modal</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <ClickableUnitRow
                key={unit.id}
                unit={unit}
                onOpen={setSelectedId}
              >
                <td>{unit.brand}</td>
                <td>{unit.model}</td>
                <td>{unit.color}</td>
                <td>{unit.licensePlate}</td>
                <td>{unit.age}</td>
                <td>{formatIDR(unit.invested)}</td>
              </ClickableUnitRow>
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
