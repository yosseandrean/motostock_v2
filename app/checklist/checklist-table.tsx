"use client";

import { useState } from "react";
import type { ChecklistItem } from "@/lib/checklist";
import { UnitDetailDialog } from "@/app/unit-detail-dialog";
import { ClickableUnitRow } from "@/app/unit-row";

/**
 * One data-issue category table on the checklist page. The server page passes
 * the serialized affected Units; this component owns the selected Unit in
 * browser state so a row click opens the detail dialog instead of navigating
 * to a detail page.
 */
export function ChecklistTable({ items }: { items: ChecklistItem[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      <div className="table-wrap">
        <table className="unit-table">
          <thead>
            <tr>
              <th scope="col">Merek</th>
              <th scope="col">Model</th>
              <th scope="col">Plat</th>
              <th scope="col">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ClickableUnitRow
                key={item.id}
                unit={item}
                onOpen={setSelectedId}
              >
                <td>{item.brand}</td>
                <td>{item.model}</td>
                <td>{item.licensePlate}</td>
                <td>{item.detail === "" ? "—" : item.detail}</td>
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
