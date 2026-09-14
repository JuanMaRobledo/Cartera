"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

interface Currency {
  code: string;
}

interface FxRate {
  id: string;
  currencyCode: string;
  date: string;
  rate: number;
  source: string;
}

export default function FxRatesPage() {
  const [rates, setRates] = useState<FxRate[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [form, setForm] = useState({ currencyCode: "", date: "", rate: "" });
  const [error, setError] = useState<string | null>(null);
  const [refreshingTrm, setRefreshingTrm] = useState(false);
  const [trmMsg, setTrmMsg] = useState<string | null>(null);
  const [backfillRange, setBackfillRange] = useState({ from: "", to: "" });
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);

  const load = () => {
    fetch("/api/fx-rates").then((r) => r.json()).then(setRates);
    fetch("/api/currencies").then((r) => r.json()).then(setCurrencies);
    fetch("/api/settings").then((r) => r.json()).then((s) => setBaseCurrency(s.baseCurrency));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/fx-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rate: Number(form.rate) }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Error al guardar");
      return;
    }
    setForm({ currencyCode: "", date: "", rate: "" });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/fx-rates/${id}`, { method: "DELETE" });
    load();
  };

  const refreshTrm = async () => {
    setRefreshingTrm(true);
    setTrmMsg(null);
    try {
      const res = await fetch("/api/fx-rates/trm-refresh", { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        setTrmMsg(result.error ?? "No se pudo obtener la TRM del día.");
        return;
      }
      setTrmMsg(`TRM de hoy: 1 USD = ${result.trm.toLocaleString("es-CO")} COP.`);
      await load();
    } finally {
      setRefreshingTrm(false);
    }
  };

  const backfillTrm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const res = await fetch("/api/fx-rates/trm-backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backfillRange),
      });
      const result = await res.json();
      if (!res.ok) {
        setBackfillMsg(result.error ?? "No se pudo cargar el histórico de TRM.");
        return;
      }
      setBackfillMsg(`Se cargaron ${result.upserted} fecha(s) de TRM para ${result.currencyCode}.`);
      await load();
    } finally {
      setBackfilling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tipos de cambio</h1>
          <p className="text-sm text-slate-500">
            1 unidad de la moneda = tantas unidades de la moneda base ({baseCurrency}). Cargá el tipo de cambio real
            que usaste ese día (con el costo del cambio ya incluido si corresponde) para que la conversión a la
            moneda base sea exacta.
          </p>
        </div>
        <div className="text-right">
          <button className="btn-secondary" onClick={refreshTrm} disabled={refreshingTrm}>
            {refreshingTrm ? "Consultando…" : "Obtener TRM del día"}
          </button>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            Trae la TRM oficial (USD/COP) publicada por la Superintendencia Financiera y carga el tipo de cambio de
            hoy automáticamente. Solo aplica si tu moneda base es USD o COP.
          </p>
          {trmMsg && <p className="mt-1 max-w-xs text-xs text-slate-600">{trmMsg}</p>}
        </div>
      </div>

      <form onSubmit={backfillTrm} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-4">
          <h2 className="font-medium">Histórico de TRM</h2>
          <p className="text-sm text-slate-500">
            Para importar transacciones viejas en COP hace falta el tipo de cambio de esa época, no solo el de hoy.
            Cargá acá un rango de fechas y trae la TRM oficial de cada día en que cambió, para todo ese período.
          </p>
        </div>
        <div>
          <label className="label">Desde</label>
          <input
            type="date"
            className="input"
            value={backfillRange.from}
            onChange={(e) => setBackfillRange({ ...backfillRange, from: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input
            type="date"
            className="input"
            value={backfillRange.to}
            onChange={(e) => setBackfillRange({ ...backfillRange, to: e.target.value })}
            required
          />
        </div>
        <div className="flex items-end">
          <button className="btn-secondary w-full" type="submit" disabled={backfilling}>
            {backfilling ? "Cargando…" : "Cargar histórico de TRM"}
          </button>
        </div>
        {backfillMsg && <p className="text-sm text-slate-600 sm:col-span-4">{backfillMsg}</p>}
      </form>

      <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Moneda</label>
          <select
            className="input"
            value={form.currencyCode}
            onChange={(e) => setForm({ ...form, currencyCode: e.target.value })}
            required
          >
            <option value="">Elegir…</option>
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Fecha</label>
          <input
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Tipo de cambio (1 moneda = X {baseCurrency})</label>
          <input
            type="number"
            step="any"
            className="input"
            value={form.rate}
            onChange={(e) => setForm({ ...form, rate: e.target.value })}
            required
          />
        </div>
        <div className="flex items-end">
          <button className="btn w-full" type="submit">
            Guardar
          </button>
        </div>
      </form>
      {error && <p className="loss-text text-sm">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Moneda</th>
              <th>Fecha</th>
              <th>Tipo de cambio</th>
              <th>Origen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.currencyCode}</td>
                <td>{formatDate(r.date)}</td>
                <td>{r.rate}</td>
                <td>{r.source}</td>
                <td>
                  <button className="text-xs loss-text" onClick={() => remove(r.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
