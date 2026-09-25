export type SortDirection = "asc" | "desc";
export type SortValue = number | string | null | undefined;

export interface SortState {
  key: string;
  direction: SortDirection;
}

/**
 * Ordena una copia de `rows` según el valor que devuelve `getValue`.
 * Números de menor a mayor (o al revés), textos alfabéticamente en español
 * (sin distinguir mayúsculas ni tildes) y los vacíos (null/undefined/NaN)
 * siempre al final, en cualquiera de los dos sentidos: un activo sin precio
 * no debería aparecer primero al ordenar por precio de mayor a menor. Ante
 * un empate se respeta el orden original.
 */
export function sortRows<T>(rows: T[], getValue: (row: T) => SortValue, direction: SortDirection): T[] {
  const sign = direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((a, b) => {
      const aEmpty = isEmpty(a.value);
      const bEmpty = isEmpty(b.value);
      if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1;
      const cmp =
        typeof a.value === "number" && typeof b.value === "number"
          ? a.value - b.value
          : String(a.value).localeCompare(String(b.value), "es", { sensitivity: "base", numeric: true });
      return cmp !== 0 ? sign * cmp : a.index - b.index;
    })
    .map((item) => item.row);
}

/** Primer clic en una columna: textos A→Z, números de mayor a menor. Clic en la misma columna: invierte. */
export function nextSort(current: SortState | null, key: string, firstDirection: SortDirection): SortState {
  if (current?.key === key) return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  return { key, direction: firstDirection };
}

function isEmpty(value: SortValue): boolean {
  return value == null || (typeof value === "number" && Number.isNaN(value));
}
