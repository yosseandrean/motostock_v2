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

const HEADERS = [
  "Merek",
  "Model",
  "Tahun",
  "Plat",
  "Status",
  "Harga Beli",
  "Harga Jual",
  "Tanggal Beli",
  "Tanggal Jual",
  "Sales Person",
  "Invested",
  "Gross Profit",
] as const;

const NUMERIC_HEADERS = new Set([
  "Tahun",
  "Harga Beli",
  "Harga Jual",
  "Invested",
  "Gross Profit",
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

  const hasFilter = query !== "" || status !== undefined;

  function resetFilters() {
    setQuery("");
    setDebouncedQuery("");
    setStatus(undefined);
  }

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
        {hasFilter ? (
          <button
            type="button"
            className="nav-link cursor-pointer"
            onClick={resetFilters}
          >
            Reset
          </button>
        ) : null}
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
                  <tr key={unit.id}>
                    <td>
                      <a className="unit-link" href={`/units/${unit.id}`}>
                        {unit.brand}
                      </a>
                    </td>
                    <td>{unit.model}</td>
                    <td className="num">{unit.modelYear}</td>
                    <td>{unit.licensePlate}</td>
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
                    <td className="num">{formatIDR(unit.buyPrice)}</td>
                    <td className="num">
                      {unit.sellPrice === null
                        ? "—"
                        : formatIDR(unit.sellPrice)}
                    </td>
                    <td>{unit.dateBoughtLabel}</td>
                    <td>{unit.dateSoldLabel ?? "—"}</td>
                    <td>{unit.salesPerson ?? "—"}</td>
                    <td className="num">{formatIDR(invested(unit))}</td>
                    <td className="num">
                      {profit === null ? "—" : formatIDR(profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
