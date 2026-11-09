"use client";

import { useState } from "react";
import { formatIDR } from "@/lib/format";
import type { SalesLoss } from "@/lib/sales";
import { UnitDetailDialog } from "@/app/unit-detail-dialog";
import { ClickableUnitRow } from "@/app/unit-row";

/**
 * The Penjualan "Penjualan Rugi" table. The server page passes the serialized
 * loss rows; this component owns the selected Unit in browser state so a row
 * click opens the detail dialog instead of navigating to a detail page.
 */
export function LossTable({ losses }: { losses: SalesLoss[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      <div className="table-wrap">
        <table className="unit-table">
          <thead>
            <tr>
              <th scope="col">Merek</th>
              <th scope="col">Model</th>
              <th scope="col">Harga Jual</th>
              <th scope="col">Laba Kotor</th>
            </tr>
          </thead>
          <tbody>
            {losses.map((loss) => (
              <ClickableUnitRow
                key={loss.id}
                unit={loss}
                onOpen={setSelectedId}
              >
                <td>{loss.brand}</td>
                <td>{loss.model}</td>
                <td>{formatIDR(loss.sellPrice)}</td>
                <td>
                  <span className="loss-value">
                    {formatIDR(loss.grossProfit)}
                  </span>
                </td>
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
