"use client";

import { useEffect, useState } from "react";

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [form, setForm] = useState({ code: "", name: "", symbol: "" });
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch("/api/currencies").then((r) => r.json()).then(setCurrencies);

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/currencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Error al guardar");
      return;
    }
    setForm({ code: "", name: "", symbol: "" });
    load();
  };

  const remove = async (code: string) => {
    await fetch(`/api/currencies/${code}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Monedas</h1>

      <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Código (ISO 4217)</label>
          <input
            className="input"
            placeholder="USD"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            maxLength={3}
            required
          />
        </div>
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            placeholder="Dólar estadounidense"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Símbolo</label>
          <input
            className="input"
            placeholder="US$"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            required
          />
        </div>
        <div className="flex items-end">
          <button className="btn w-full" type="submit">
            Agregar
          </button>
        </div>
      </form>
      {error && <p className="loss-text text-sm">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Símbolo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {currencies.map((c) => (
              <tr key={c.code}>
                <td className="font-medium">{c.code}</td>
                <td>{c.name}</td>
                <td>{c.symbol}</td>
                <td>
                  <button className="text-xs loss-text" onClick={() => remove(c.code)}>
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
