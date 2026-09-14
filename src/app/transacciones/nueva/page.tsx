"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionForm, buildTransactionPayload, emptyTransactionForm } from "@/components/TransactionForm";

export default function NewTransactionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyTransactionForm);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
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

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nueva transacción</h1>
      <TransactionForm
        form={form}
        setForm={setForm}
        onSubmit={submit}
        submitting={submitting}
        submitLabel="Guardar transacción"
        error={error}
      />
    </div>
  );
}
