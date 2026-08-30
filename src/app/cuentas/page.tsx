"use client";

import { useEffect, useState } from "react";
import { ACCOUNT_KINDS } from "@/lib/enums";

interface Account {
  id: string;
  name: string;
  broker: string | null;
  kind: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState({ name: "", broker: "", kind: "BROKERAGE" });
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch("/api/accounts").then((r) => r.json()).then(setAccounts);

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Error al guardar");
      return;
    }
    setForm({ name: "", broker: "", kind: "BROKERAGE" });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cuentas</h1>

      <form onSubmit={submit} className="card grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            placeholder="Cuenta IBKR USD"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Broker / banco</label>
          <input
            className="input"
            placeholder="Interactive Brokers"
            value={form.broker}
            onChange={(e) => setForm({ ...form, broker: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {ACCOUNT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
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
              <th>Nombre</th>
              <th>Broker</th>
              <th>Tipo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td className="font-medium">{a.name}</td>
                <td>{a.broker ?? "—"}</td>
                <td>{a.kind}</td>
                <td>
                  <button className="text-xs loss-text" onClick={() => remove(a.id)}>
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
