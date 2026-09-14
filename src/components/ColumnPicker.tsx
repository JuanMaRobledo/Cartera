"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  defaultVisible: boolean;
  render: (row: T) => ReactNode;
}

/**
 * Guarda qué columnas están tildadas en localStorage, por tabla (storageKey),
 * para que la elección se recuerde entre visitas de este navegador. Se lee
 * en el inicializador perezoso de useState (no en un efecto) porque este
 * componente solo se monta del lado del cliente — la página que lo usa
 * muestra "Cargando…" durante el render de servidor y recién arma esta
 * tabla después de que los datos llegan por fetch en el navegador.
 */
export function useVisibleColumns<T>(storageKey: string, columns: ColumnDef<T>[]): [Set<string>, (key: string) => void] {
  const [visible, setVisible] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return new Set(JSON.parse(saved) as string[]);
    } catch {
      // localStorage puede fallar (modo privado, etc.) — usamos los valores por defecto.
    }
    return new Set(columns.filter((c) => c.defaultVisible).map((c) => c.key));
  });

  const toggle = (key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // no pasa nada si no se puede guardar la preferencia.
      }
      return next;
    });
  };

  return [visible, toggle];
}

export function ColumnPicker<T>({
  columns,
  visible,
  onToggle,
}: {
  columns: ColumnDef<T>[];
  visible: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button className="btn-secondary" onClick={() => setOpen((o) => !o)}>
        Columnas ⚙
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-medium text-slate-500">Elegí qué columnas ver</p>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {columns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={visible.has(c.key)} onChange={() => onToggle(c.key)} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
