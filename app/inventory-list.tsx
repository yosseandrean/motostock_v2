"use client";

import { useEffect, useMemo, useState } from "react";
import { formatIDR } from "@/lib/format";
import {
  filterUnits,
  grossProfit,
  invested,
  isSold,
  parseUnitStatus,
  statusLabel,
} from "@/lib/unit";
import type { InventoryUnit, UnitStatus } from "@/lib/unit";
import { UnitDetailDialog } from "@/app/unit-detail-dialog";
import { ClickableUnitRow } from "@/app/unit-row";

const HEADERS = [
  "Status",
  "Merek",
  "Model",
  "Tahun",
  "Plat",
  "Modal",
  "Harga Jual",
  "Laba Kotor",
  "Tanggal Beli",
  "Tanggal Jual",
  "Sales Person",
] as const;

const NUMERIC_HEADERS = new Set([
  "Tahun",
  "Modal",
  "Harga Jual",
  "Laba Kotor",
]);

/**
 * The live inventory list. The server page passes every serialized Unit; this
 * component owns the debounced search and Status filter in browser state, so
 * typing or changing the dropdown re-renders the table without a submit.
 */
export function InventoryList({ units }: { units: InventoryUnit[] }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<UnitStatus | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const visibleUnits = useMemo(
    () => filterUnits(units, { query: debouncedQuery, status }),
    [units, debouncedQuery, status],
  );

  return (
    <>
      <div className="inventory-header">
        <h1 className="inventory-title">Inventori</h1>
        <a className="edit-button" href="/units/new">
          Tambah Unit
        </a>
      </div>

      <div className="filter-bar">
        <input
          className="field-input filter-search"
          type="search"
          placeholder="Cari Merek, Model, Plat, Nomor Rangka, Sales"
          aria-label="Cari unit"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="field-input filter-status"
          aria-label="Status"
          value={status ?? ""}
          onChange={(event) => setStatus(parseUnitStatus(event.target.value))}
        >
          <option value="">Semua status</option>
          <option value="stok">Stok</option>
          <option value="terjual">Terjual</option>
        </select>
      </div>

      {visibleUnits.length === 0 ? (
        <p className="empty-state" role="status">
          Belum ada unit. Unit yang ditambahkan akan muncul di sini.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="unit-table">
            <thead>
              <tr>
                {HEADERS.map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className={NUMERIC_HEADERS.has(header) ? "num" : undefined}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleUnits.map((unit) => {
                const profit = grossProfit(unit);
                return (
                  <ClickableUnitRow
                    key={unit.id}
                    unit={unit}
                    onOpen={setSelectedId}
                  >
                    <td>
                      <span
                        className={
                          isSold(unit)
                            ? "status-badge status-badge--terjual"
                            : "status-badge status-badge--stok"
                        }
                      >
                        {statusLabel(unit)}
                      </span>
                    </td>
                    <td>{unit.brand}</td>
                    <td>{unit.model}</td>
                    <td className="num">{unit.modelYear}</td>
                    <td>{unit.licensePlate}</td>
                    <td className="num">
                      <span
                        title={`Harga Beli ${formatIDR(unit.buyPrice)} · Biaya ${formatIDR(unit.cost)}`}
                        tabIndex={0}
                      >
                        {formatIDR(invested(unit))}
                      </span>
                    </td>
                    <td className="num">
                      {unit.sellPrice === null
                        ? "—"
                        : formatIDR(unit.sellPrice)}
                    </td>
                    <td className="num">
                      {profit === null ? "—" : formatIDR(profit)}
                    </td>
                    <td>{unit.dateBoughtLabel}</td>
                    <td>{unit.dateSoldLabel ?? "—"}</td>
                    <td>{unit.salesPerson ?? "—"}</td>
                  </ClickableUnitRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UnitDetailDialog
        unitId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
