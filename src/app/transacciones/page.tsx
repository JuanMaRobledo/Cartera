"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS } from "@/lib/enums";

interface Transaction {
  id: string;
  type: string;
  date: string;
  quantity: number | null;
  price: number | null;
  currencyCode: string;
  fxRateToBase: number;
  amount: number | null;
  commission: number | null;
  notes: string | null;
  account: { name: string };
  asset: { ticker: string } | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const load = () => fetch("/api/transactions").then((r) => r.json()).then(setTransactions);

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transacciones</h1>
        <Link href="/transacciones/nueva" className="btn">
          Nueva transacción
        </Link>
      </div>

      <div className="card overflow-x-auto">
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no cargaste transacciones.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cuenta</th>
                <th>Activo</th>
                <th>Cantidad</th>
                <th>Precio / Monto</th>
                <th>Moneda</th>
                <th>TC a base</th>
                <th>Comisión</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.date)}</td>
                  <td>{TRANSACTION_TYPE_LABELS[t.type as keyof typeof TRANSACTION_TYPE_LABELS] ?? t.type}</td>
                  <td>{t.account.name}</td>
                  <td>{t.asset?.ticker ?? "—"}</td>
                  <td>{t.quantity ?? "—"}</td>
                  <td>
                    {t.price != null
                      ? formatMoney(t.price, t.currencyCode)
                      : t.amount != null
                        ? formatMoney(t.amount, t.currencyCode)
                        : "—"}
                  </td>
                  <td>{t.currencyCode}</td>
                  <td>{t.fxRateToBase}</td>
                  <td>{t.commission ? formatMoney(t.commission, t.currencyCode) : "—"}</td>
                  <td>
                    <button className="text-xs loss-text" onClick={() => remove(t.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
