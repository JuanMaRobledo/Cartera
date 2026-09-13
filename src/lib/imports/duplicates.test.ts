import { describe, expect, it } from "vitest";
import { buildExistingSignatures, transactionSignature } from "./duplicates";

describe("transactionSignature", () => {
  it("genera la misma firma para una operación equivalente sin importar la hora del Date", () => {
    const a = transactionSignature({
      type: "BUY",
      ticker: "aapl",
      date: "2024-01-10T00:00:00.000Z",
      quantity: 10,
      price: 190,
      amount: null,
    });
    const b = transactionSignature({
      type: "BUY",
      ticker: "AAPL",
      date: "2024-01-10",
      quantity: 10,
      price: 190,
      amount: null,
    });
    expect(a).toBe(b);
  });

  it("distingue por tipo, ticker, fecha, cantidad, precio o monto", () => {
    const base = { type: "BUY" as const, ticker: "AAPL", date: "2024-01-10", quantity: 10, price: 190, amount: null };
    const sig = transactionSignature(base);
    expect(transactionSignature({ ...base, type: "SELL" })).not.toBe(sig);
    expect(transactionSignature({ ...base, ticker: "MSFT" })).not.toBe(sig);
    expect(transactionSignature({ ...base, date: "2024-01-11" })).not.toBe(sig);
    expect(transactionSignature({ ...base, quantity: 11 })).not.toBe(sig);
    expect(transactionSignature({ ...base, price: 191 })).not.toBe(sig);
  });
});

describe("buildExistingSignatures", () => {
  it("detecta como duplicado una fila que coincide con una transacción existente", () => {
    const existing = buildExistingSignatures([
      { type: "BUY", date: new Date("2024-01-10"), quantity: 10, price: 190, amount: null, ticker: "AAPL" },
      { type: "DEPOSIT", date: new Date("2024-01-01"), quantity: null, price: null, amount: 5000, ticker: null },
    ]);
    expect(
      existing.has(
        transactionSignature({ type: "BUY", ticker: "AAPL", date: "2024-01-10", quantity: 10, price: 190, amount: null }),
      ),
    ).toBe(true);
    expect(
      existing.has(
        transactionSignature({ type: "DEPOSIT", ticker: null, date: "2024-01-01", quantity: null, price: null, amount: 5000 }),
      ),
    ).toBe(true);
    expect(
      existing.has(
        transactionSignature({ type: "SELL", ticker: "AAPL", date: "2024-01-10", quantity: 10, price: 190, amount: null }),
      ),
    ).toBe(false);
  });
});
