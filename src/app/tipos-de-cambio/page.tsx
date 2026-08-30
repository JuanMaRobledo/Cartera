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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tipos de cambio</h1>
        <p className="text-sm text-slate-500">
          1 unidad de la moneda = tantas unidades de la moneda base ({baseCurrency}). Cargá el tipo de cambio real que
          usaste ese día (con el costo del cambio ya incluido si corresponde) para que la conversión a la moneda base
          sea exacta.
        </p>
      </div>

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
