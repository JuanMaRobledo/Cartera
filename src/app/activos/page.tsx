"use client";

import { useEffect, useState } from "react";
import { ASSET_TYPES } from "@/lib/enums";
import { searchReferenceStocks, type ReferenceStock } from "@/lib/reference/stocks";

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

// Nombre/símbolo por defecto al crear automáticamente una moneda que todavía
// no existe (porque el usuario eligió una acción de la lista de referencia).
const CURRENCY_DEFAULTS: Record<string, { name: string; symbol: string }> = {
  USD: { name: "Dólar estadounidense", symbol: "US$" },
  COP: { name: "Peso colombiano", symbol: "COL$" },
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [form, setForm] = useState({ ticker: "", name: "", assetType: "STOCK", currencyCode: "", exchange: "" });
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ReferenceStock[]>([]);
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

  const ensureCurrency = async (code: string) => {
    if (currencies.some((c) => c.code === code)) return;
    const defaults = CURRENCY_DEFAULTS[code] ?? { name: code, symbol: code };
    const res = await fetch("/api/currencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, ...defaults }),
    });
    if (res.ok) {
      const created = await res.json();
      setCurrencies((prev) => [...prev, created]);
    }
  };

  const pickSuggestion = async (stock: ReferenceStock) => {
    await ensureCurrency(stock.currencyCode);
    setForm({
      ticker: stock.ticker,
      name: stock.name,
      assetType: "STOCK",
      currencyCode: stock.currencyCode,
      exchange: stock.exchange,
    });
    setSearch(`${stock.ticker} — ${stock.name}`);
    setSuggestions([]);
  };

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
    setSearch("");
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

      <div className="card relative">
        <label className="label">Buscar acción o ETF de EE.UU. o Colombia (opcional)</label>
        <input
          className="input"
          placeholder="Ej: Apple, AAPL, Ecopetrol…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSuggestions(searchReferenceStocks(e.target.value));
          }}
        />
        <p className="mt-1 text-xs text-slate-500">
          Lista de referencia con los principales tickers — si el tuyo no aparece, completá el formulario de abajo a
          mano.
        </p>
        {suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {suggestions.map((s) => (
              <li key={`${s.ticker}-${s.exchange}`}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                  onClick={() => pickSuggestion(s)}
                >
                  <span className="font-medium">{s.ticker}</span> — {s.name}
                  <span className="ml-1 text-xs text-slate-500">
                    ({s.exchange}, {s.currencyCode})
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
