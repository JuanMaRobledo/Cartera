"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS, type TransactionType } from "@/lib/enums";

interface Account {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  ticker: string;
  name: string;
  currencyCode: string;
}

interface Currency {
  code: string;
}

const NEEDS_ASSET: TransactionType[] = ["BUY", "SELL", "DIVIDEND", "FEE"];
const NEEDS_QTY_PRICE: TransactionType[] = ["BUY", "SELL"];
const NEEDS_AMOUNT: TransactionType[] = ["DIVIDEND", "INTEREST", "FEE", "DEPOSIT", "WITHDRAWAL"];

export default function NewTransactionPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    accountId: "",
    assetId: "",
    type: "BUY" as TransactionType,
    date: new Date().toISOString().slice(0, 10),
    quantity: "",
    price: "",
    currencyCode: "",
    fxRateToBase: "",
    amount: "",
    commission: "",
    fxFromCurrency: "",
    fxFromAmount: "",
    fxToCurrency: "",
    fxToAmount: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    fetch("/api/assets").then((r) => r.json()).then(setAssets);
    fetch("/api/currencies").then((r) => r.json()).then(setCurrencies);
  }, []);

  const selectAsset = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    setForm((prev) => ({ ...prev, assetId, currencyCode: asset ? asset.currencyCode : prev.currencyCode }));
  };

  const showAsset = NEEDS_ASSET.includes(form.type);
  const showQtyPrice = NEEDS_QTY_PRICE.includes(form.type);
  const showAmount = NEEDS_AMOUNT.includes(form.type);
  const showFxConvert = form.type === "FX_CONVERT";
  const showCurrency = !showFxConvert;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        accountId: form.accountId,
        assetId: showAsset ? form.assetId || null : null,
        type: form.type,
        date: form.date,
        notes: form.notes || null,
        commission: form.commission ? Number(form.commission) : 0,
        fxRateToBase: form.fxRateToBase ? Number(form.fxRateToBase) : undefined,
        currencyCode: showFxConvert ? form.fxFromCurrency : form.currencyCode,
      };
      if (showQtyPrice) {
        payload.quantity = Number(form.quantity);
        payload.price = Number(form.price);
      }
      if (showAmount) {
        payload.amount = Number(form.amount);
      }
      if (showFxConvert) {
        payload.fxFromCurrency = form.fxFromCurrency;
        payload.fxFromAmount = Number(form.fxFromAmount);
        payload.fxToCurrency = form.fxToCurrency;
        payload.fxToAmount = Number(form.fxToAmount);
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      <form onSubmit={submit} className="card space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Tipo</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })}
            >
              {TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TRANSACTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cuenta</label>
            <select
              className="input"
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              required
            >
              <option value="">Elegir…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
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

        {showAsset && (
          <div>
            <label className="label">Activo</label>
            <select
              className="input"
              value={form.assetId}
              onChange={(e) => selectAsset(e.target.value)}
              required={form.type === "BUY" || form.type === "SELL"}
            >
              <option value="">{form.type === "FEE" ? "Sin activo (gasto de cuenta)" : "Elegir…"}</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.ticker} — {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showQtyPrice && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad</label>
              <input
                type="number"
                step="any"
                className="input"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Precio por unidad</label>
              <input
                type="number"
                step="any"
                className="input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
          </div>
        )}

        {showAmount && (
          <div>
            <label className="label">
              Monto {form.type === "DIVIDEND" ? "(total del dividendo, antes de comisión/retención)" : ""}
            </label>
            <input
              type="number"
              step="any"
              className="input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
        )}

        {showCurrency && (
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
        )}

        {showFxConvert && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Desde moneda</label>
              <select
                className="input"
                value={form.fxFromCurrency}
                onChange={(e) => setForm({ ...form, fxFromCurrency: e.target.value })}
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
              <label className="label">Monto que sale</label>
              <input
                type="number"
                step="any"
                className="input"
                value={form.fxFromAmount}
                onChange={(e) => setForm({ ...form, fxFromAmount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Hacia moneda</label>
              <select
                className="input"
                value={form.fxToCurrency}
                onChange={(e) => setForm({ ...form, fxToCurrency: e.target.value })}
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
              <label className="label">Monto que entra</label>
              <input
                type="number"
                step="any"
                className="input"
                value={form.fxToAmount}
                onChange={(e) => setForm({ ...form, fxToAmount: e.target.value })}
                required
              />
            </div>
            <p className="col-span-2 text-xs text-slate-500">
              La diferencia entre este tipo de cambio efectivo y el tipo de cambio de mercado de ese día es el costo
              real del cambio de moneda (spread/comisión bancaria).
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Comisión (en la moneda de la transacción)</label>
            <input
              type="number"
              step="any"
              className="input"
              value={form.commission}
              onChange={(e) => setForm({ ...form, commission: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Tipo de cambio a moneda base (opcional)</label>
            <input
              type="number"
              step="any"
              className="input"
              placeholder="Se autocompleta si lo dejás vacío"
              value={form.fxRateToBase}
              onChange={(e) => setForm({ ...form, fxRateToBase: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        {error && <p className="text-sm loss-text">{error}</p>}

        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar transacción"}
        </button>
      </form>
    </div>
  );
}
