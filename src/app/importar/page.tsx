"use client";

import { useEffect, useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS } from "@/lib/enums";

interface Account {
  id: string;
  name: string;
}

interface EnrichedRow {
  key: string;
  type: string;
  date: string;
  ticker: string | null;
  currencyCode: string;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  commission: number;
  notes: string;
  sourceSection: string;
  assetKnown: boolean;
  currencyKnown: boolean;
  currencyMismatch: boolean;
  fxRateToBase: number | null;
  ready: boolean;
  reason: string | null;
}

type Format = "auto" | "ibkr" | "yahoo" | "co-broker" | "generic";

const FORMAT_LABELS: Record<string, string> = {
  ibkr: "Interactive Brokers",
  yahoo: "Portafolio (efectivo + operaciones)",
  "co-broker": "Bróker colombiano (historial de órdenes)",
  generic: "plantilla genérica",
};

export default function ImportPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [format, setFormat] = useState<Format>("auto");
  const [fileName, setFileName] = useState("");
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);
  const [rows, setRows] = useState<EnrichedRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
  }, []);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setFileName(file.name);
    setParsing(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/imports/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text, format }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al analizar el archivo");
        return;
      }
      setDetectedFormat(data.format);
      setRows(data.rows);
      setWarnings(data.warnings ?? []);
      const initialSelection: Record<string, boolean> = {};
      for (const row of data.rows as EnrichedRow[]) initialSelection[row.key] = row.ready;
      setSelected(initialSelection);
    } catch {
      setError("No se pudo leer el archivo.");
    } finally {
      setParsing(false);
    }
  };

  const toggleRow = (key: string) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectedCount = rows.filter((r) => selected[r.key]).length;

  const commit = async () => {
    if (!accountId) {
      setError("Elegí una cuenta antes de importar.");
      return;
    }
    setError(null);
    setCommitting(true);
    try {
      const toImport = rows.filter((r) => selected[r.key]);
      const res = await fetch("/api/imports/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, rows: toImport }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al importar");
        return;
      }
      setResult(data);
      if (data.created > 0) {
        setRows([]);
        setSelected({});
      }
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar transacciones</h1>
        <p className="text-sm text-slate-500">
          Subí un CSV de Interactive Brokers (Transaction History o Activity Statement), de un portafolio con
          columnas de efectivo/operaciones, del historial de órdenes de un bróker colombiano, o un CSV con la{" "}
          <a href="/plantilla-cartera.csv" className="underline" download>
            plantilla de Cartera
          </a>{" "}
          para cualquier otro origen.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Cuenta destino</label>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
              <option value="">Elegir…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {accounts.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">Primero creá una cuenta en la sección Cuentas.</p>
            )}
          </div>
          <div>
            <label className="label">Formato del archivo</label>
            <select className="input" value={format} onChange={(e) => setFormat(e.target.value as Format)}>
              <option value="auto">Detectar automáticamente</option>
              <option value="ibkr">Interactive Brokers (Transaction History o Activity Statement)</option>
              <option value="yahoo">Portafolio con efectivo (columnas Trade Date/Purchase Price…)</option>
              <option value="co-broker">Bróker colombiano (historial de órdenes)</option>
              <option value="generic">Genérico (plantilla Cartera)</option>
            </select>
          </div>
          <div>
            <label className="label">Archivo CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="input"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        </div>
        {parsing && <p className="text-sm text-slate-500">Analizando {fileName}…</p>}
        {error && <p className="text-sm loss-text">{error}</p>}
        {result && (
          <p className="text-sm gain-text">
            Se importaron {result.created} transacciones{result.skipped > 0 ? `, se omitieron ${result.skipped}` : ""}
            .
          </p>
        )}
        {result && result.errors.length > 0 && (
          <ul className="list-disc pl-5 text-xs loss-text">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="card">
          <h2 className="mb-2 font-medium text-amber-800">Advertencias al leer el archivo</h2>
          <ul className="list-disc pl-5 text-sm text-amber-800">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">
              Vista previa ({FORMAT_LABELS[detectedFormat ?? "generic"] ?? detectedFormat}) — {selectedCount} de{" "}
              {rows.length} seleccionadas
            </h2>
            <button className="btn" onClick={commit} disabled={committing || selectedCount === 0 || !accountId}>
              {committing ? "Importando…" : `Importar ${selectedCount} transacciones`}
            </button>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th></th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Activo</th>
                <th>Cant. / Monto</th>
                <th>Moneda</th>
                <th>Comisión</th>
                <th>Origen</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={row.ready ? "" : "opacity-60"}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[row.key]}
                      disabled={!row.ready}
                      onChange={() => toggleRow(row.key)}
                    />
                  </td>
                  <td>{formatDate(row.date)}</td>
                  <td>{TRANSACTION_TYPE_LABELS[row.type as keyof typeof TRANSACTION_TYPE_LABELS] ?? row.type}</td>
                  <td>
                    {row.ticker ?? "—"}
                    {row.ticker && !row.assetKnown && (
                      <span className="ml-1 rounded bg-blue-50 px-1 text-xs text-blue-700">nuevo</span>
                    )}
                  </td>
                  <td>
                    {row.quantity != null && row.price != null
                      ? `${row.quantity} × ${formatMoney(row.price)}`
                      : row.amount != null
                        ? formatMoney(row.amount)
                        : "—"}
                  </td>
                  <td>
                    {row.currencyCode}
                    {!row.currencyKnown && <span className="ml-1 rounded bg-blue-50 px-1 text-xs text-blue-700">nueva</span>}
                  </td>
                  <td>{row.commission ? formatMoney(row.commission) : "—"}</td>
                  <td className="text-xs text-slate-500">{row.sourceSection}</td>
                  <td className="text-xs">
                    {row.ready ? <span className="gain-text">Lista</span> : <span className="loss-text">{row.reason}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.some((r) => !r.ready) && (
            <p className="mt-3 text-xs text-slate-500">
              Las filas marcadas en rojo necesitan que primero cargues la moneda y su tipo de cambio en{" "}
              <a href="/tipos-de-cambio" className="underline">
                Tipos de cambio
              </a>{" "}
              (o que resuelvas el conflicto de ticker/moneda en Activos), y luego subas el archivo de nuevo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
