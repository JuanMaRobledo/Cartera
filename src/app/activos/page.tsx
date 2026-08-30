"use client";

import { useEffect, useState } from "react";
import { ASSET_TYPES } from "@/lib/enums";

interface Currency {
  code: string;
}

interface Asset {
  id: string;
  ticker: string;
  name: string;
  assetType: string;
  currencyCode: string;
  exchange: string | null;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [form, setForm] = useState({ ticker: "", name: "", assetType: "STOCK", currencyCode: "", exchange: "" });
  const [priceForm, setPriceForm] = useState<Record<string, { date: string; price: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [priceMsg, setPriceMsg] = useState<string | null>(null);

  const load = () => {
    fetch("/api/assets").then((r) => r.json()).then(setAssets);
    fetch("/api/currencies").then((r) => r.json()).then(setCurrencies);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Error al guardar");
      return;
    }
    setForm({ ticker: "", name: "", assetType: "STOCK", currencyCode: "", exchange: "" });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    load();
  };

  const submitPrice = async (assetId: string) => {
    setPriceMsg(null);
    const entry = priceForm[assetId];
    if (!entry?.price) return;
    const res = await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        date: entry.date || new Date().toISOString().slice(0, 10),
        price: Number(entry.price),
      }),
    });
    if (res.ok) {
      setPriceMsg("Precio actualizado.");
      setPriceForm((prev) => ({ ...prev, [assetId]: { date: "", price: "" } }));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Activos</h1>

      <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div>
          <label className="label">Ticker</label>
          <input
            className="input"
            placeholder="AAPL"
            value={form.ticker}
            onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
            required
          />
        </div>
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            placeholder="Apple Inc."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select
            className="input"
            value={form.assetType}
            onChange={(e) => setForm({ ...form, assetType: e.target.value })}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Moneda de cotización</label>
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
          <label className="label">Mercado (opcional)</label>
          <input
            className="input"
            placeholder="NASDAQ"
            value={form.exchange}
            onChange={(e) => setForm({ ...form, exchange: e.target.value })}
          />
        </div>
        <div className="sm:col-span-5">
          <button className="btn" type="submit">
            Agregar activo
          </button>
        </div>
      </form>
      {error && <p className="loss-text text-sm">{error}</p>}
      {currencies.length === 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Primero cargá al menos una moneda en la sección Monedas.
        </p>
      )}

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">Cargar precio actual</h2>
        {priceMsg && <p className="mb-2 text-sm gain-text">{priceMsg}</p>}
        <table className="table-base">
          <thead>
            <tr>
              <th>Activo</th>
              <th>Moneda</th>
              <th>Fecha</th>
              <th>Precio</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">
                  {a.ticker} — {a.name}
                </td>
                <td>{a.currencyCode}</td>
                <td>
                  <input
                    type="date"
                    className="input"
                    value={priceForm[a.id]?.date ?? ""}
                    onChange={(e) =>
                      setPriceForm((prev) => ({
                        ...prev,
                        [a.id]: { date: e.target.value, price: prev[a.id]?.price ?? "" },
                      }))
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="any"
                    className="input"
                    value={priceForm[a.id]?.price ?? ""}
                    onChange={(e) =>
                      setPriceForm((prev) => ({
                        ...prev,
                        [a.id]: { date: prev[a.id]?.date ?? "", price: e.target.value },
                      }))
                    }
                  />
                </td>
                <td>
                  <button className="btn-secondary" onClick={() => submitPrice(a.id)}>
                    Guardar
                  </button>
                </td>
                <td>
                  <button className="text-xs loss-text" onClick={() => remove(a.id)}>
                    Eliminar activo
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
