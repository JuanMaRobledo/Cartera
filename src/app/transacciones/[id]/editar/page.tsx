"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  TransactionForm,
  buildTransactionPayload,
  emptyTransactionForm,
  type TransactionFormValues,
} from "@/components/TransactionForm";
import type { TransactionType } from "@/lib/enums";

interface TransactionRecord {
  accountId: string;
  assetId: string | null;
  type: TransactionType;
  date: string;
  quantity: number | null;
  price: number | null;
  currencyCode: string;
  fxRateToBase: number;
  amount: number | null;
  commission: number | null;
  fxFromCurrency: string | null;
  fxFromAmount: number | null;
  fxToCurrency: string | null;
  fxToAmount: number | null;
  notes: string | null;
}

const numToStr = (n: number | null | undefined) => (n == null ? "" : String(n));

function toFormValues(t: TransactionRecord): TransactionFormValues {
  return {
    accountId: t.accountId,
    assetId: t.assetId ?? "",
    type: t.type,
    date: t.date.slice(0, 10),
    quantity: numToStr(t.quantity),
    price: numToStr(t.price),
    currencyCode: t.currencyCode,
    fxRateToBase: numToStr(t.fxRateToBase),
    amount: numToStr(t.amount),
    commission: numToStr(t.commission),
    fxFromCurrency: t.fxFromCurrency ?? "",
    fxFromAmount: numToStr(t.fxFromAmount),
    fxToCurrency: t.fxToCurrency ?? "",
    fxToAmount: numToStr(t.fxToAmount),
    notes: t.notes ?? "",
  };
}

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<TransactionFormValues>(emptyTransactionForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/transactions/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar la transacción");
        return r.json();
      })
      .then((t: TransactionRecord) => setForm(toFormValues(t)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildTransactionPayload(form)),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "Error al guardar");
        return;
      }
      router.push("/transacciones");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar transacción</h1>
      <TransactionForm
        form={form}
        setForm={setForm}
        onSubmit={submit}
        submitting={submitting}
        submitLabel="Guardar cambios"
        error={error}
      />
    </div>
  );
}
