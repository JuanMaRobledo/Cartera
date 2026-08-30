"use client";

import { useEffect, useState } from "react";

interface Currency {
  code: string;
  name: string;
}

export default function SettingsPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [baseCurrency, setBaseCurrency] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/currencies").then((r) => r.json()).then(setCurrencies);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setBaseCurrency(s.baseCurrency));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseCurrency }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Error al guardar");
      return;
    }
    setSaved(true);
  };

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>
      <form onSubmit={submit} className="card space-y-3">
        <div>
          <label className="label">Moneda base de la cartera</label>
          <select className="input" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
            <option value="">Elegir…</option>
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Todos los cálculos de rentabilidad, costo y valor de mercado se muestran convertidos a esta moneda.
          </p>
        </div>
        <button className="btn" type="submit">
          Guardar
        </button>
        {saved && <p className="text-sm gain-text">Guardado.</p>}
        {error && <p className="text-sm loss-text">{error}</p>}
      </form>
    </div>
  );
}
