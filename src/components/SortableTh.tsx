"use client";

import { useState } from "react";
import { nextSort, type SortDirection, type SortState } from "@/lib/sortRows";

/**
 * Orden elegido para una tabla, recordado en localStorage (por tabla,
 * storageKey) igual que las columnas visibles de ColumnPicker. null = orden
 * original de la API.
 */
export function useSortState(storageKey: string): [SortState | null, (key: string, first: SortDirection) => void] {
  const [sort, setSort] = useState<SortState | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as SortState;
    } catch {
      // Sin localStorage se arranca con el orden original.
    }
    return null;
  });

  const toggle = (key: string, first: SortDirection) => {
    setSort((prev) => {
      const next = nextSort(prev, key, first);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // No pasa nada si no se puede guardar la preferencia.
      }
      return next;
    });
  };

  return [sort, toggle];
}

/** Encabezado de columna que ordena la tabla al hacer clic. */
export function SortableTh({
  label,
  columnKey,
  sort,
  firstDirection,
  onSort,
}: {
  label: string;
  columnKey: string;
  sort: SortState | null;
  firstDirection: SortDirection;
  onSort: (key: string, first: SortDirection) => void;
}) {
  const active = sort?.key === columnKey;
  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  return (
    <th aria-sort={ariaSort}>
      <button
        type="button"
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-[#314a35]"
        onClick={() => onSort(columnKey, firstDirection)}
        title={`Ordenar por ${label}`}
      >
        {label}
        <span aria-hidden="true" className={active ? "text-[#314a35]" : "opacity-30"}>
          {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
