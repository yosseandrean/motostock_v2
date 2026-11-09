"use client";

import type { ReactNode } from "react";

type UnitRowUnit = {
  id: number;
  brand: string;
  model: string;
};

/**
 * A clickable table row that opens the Unit detail dialog for the row's Unit.
 * Shared by the tables that surface an affected Unit (Inventori, Dashboard,
 * Penjualan, checklist) so the Enter/Space keyboard interaction stays in one
 * place instead of being repeated per table.
 */
export function ClickableUnitRow({
  unit,
  onOpen,
  children,
}: {
  unit: UnitRowUnit;
  onOpen: (id: number) => void;
  children: ReactNode;
}) {
  return (
    <tr
      className="unit-row"
      role="button"
      tabIndex={0}
      aria-label={`Detail ${unit.brand} ${unit.model}`}
      onClick={() => onOpen(unit.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(unit.id);
        }
      }}
    >
      {children}
    </tr>
  );
}
