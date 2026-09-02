import { describe, expect, it } from "vitest";
import { isIbkrTransactionHistory, parseIbkrTransactionHistory } from "./ibkrTransactionHistory";

// Estructura real del reporte "Transaction History" de IBKR con cuenta en
// español: los rótulos de Statement/Summary están traducidos, pero la
// sección de transacciones y sus valores de "Transaction Type" quedan en
// inglés — por eso el parser no depende de traducir esas etiquetas.
const SAMPLE = [
  "Statement,Header,Nombre del campo,Valor del campo",
  "Statement,Data,Title,Transaction History",
  'Statement,Data,Period,"Agosto 22, 2026 - Agosto 28, 2026"',
  "Summary,Header,Nombre del campo,Valor del campo",
  "Summary,Data,Divisa base,USD",
  "Summary,Data,Efectivo inicial,-5541.537276248",
  "Transaction History,Header,Date,Account,Description,Transaction Type,Symbol,Quantity,Price,Price Currency,Gross Amount ,Commission,Net Amount",
  "Transaction History,Data,2026-08-20,Cuenta X,\"MSFT Compra\",Buy,MSFT,5,410.5,USD,-2052.5,-1,-2053.5",
  "Transaction History,Data,2026-08-21,Cuenta X,\"AAPL Venta\",Sell,AAPL,3,232,USD,696,-1,695",
  "Transaction History,Data,2026-08-25,Cuenta X,NVO(US6701002056) Dividendo en efectivo USD 0.579193 por acción (Dividendo ordinario),Dividend,NVO,-,-,-,11.82,-,11.82",
  "Transaction History,Data,2026-08-25,Cuenta X,NVO(US6701002056) Dividendo en efectivo USD 0.579193 por acción - DK Impuestos,Foreign Tax Withholding,NVO,-,-,-,-3.19,-,-3.19",
  "Transaction History,Data,2026-08-25,Cuenta X,NVO(US6701002056) Dividendo en efectivo USD 0.579193 por acción - FEE,Other Fee,NVO,-,-,-,-0.31,-,-0.31",
  "Transaction History,Data,2026-08-26,Cuenta X,ELECTRONIC FUND TRANSFER,Electronic Fund Transfer,-,-,-,-,500,-,500",
  "Transaction History,Data,2026-08-27,Cuenta X,BROKER INTEREST RECEIVED,Broker Interest Received,-,-,-,-,0.42,-,0.42",
  "Transaction History,Data,2026-08-28,Cuenta X,ALGUN TIPO RARO,Corporate Action Adjustment,-,-,-,-,1,-,1",
  "Transaction History,Data,2026-07-01,Cuenta X,NKE(US6541061031) Pago en Lugar de Dividendo (in Lieu) (Dividendo ordinario),Payment in Lieu,NKE,-,-,-,0.41,-,0.41",
  "Transaction History,Data,2026-07-02,Cuenta X,NKE(US6541061031) Pago en Lugar de Dividendo (in Lieu) - Reversión,Payment in Lieu,NKE,-,-,-,-0.41,-,-0.41",
  "Transaction History,Data,2026-08-05,Cuenta X,USD Interés deudor para Jul-2026,Debit Interest,-,-,-,-,-12.56,-,-12.56",
].join("\n");

describe("isIbkrTransactionHistory", () => {
  it("detecta el reporte aunque el resto esté en español", () => {
    expect(isIbkrTransactionHistory(SAMPLE)).toBe(true);
  });

  it("no confunde un CSV genérico con este formato", () => {
    expect(isIbkrTransactionHistory("type,date,ticker\nBUY,2024-01-01,AAPL")).toBe(false);
  });
});

describe("parseIbkrTransactionHistory", () => {
  const { rows, warnings } = parseIbkrTransactionHistory(SAMPLE);

  it("parsea una compra usando Quantity/Price/Price Currency directamente", () => {
    expect(rows.find((r) => r.type === "BUY")).toMatchObject({
      ticker: "MSFT",
      quantity: 5,
      price: 410.5,
      currencyCode: "USD",
      commission: 1,
    });
  });

  it("parsea una venta", () => {
    expect(rows.find((r) => r.type === "SELL")).toMatchObject({ ticker: "AAPL", quantity: 3, price: 232 });
  });

  it("parsea un dividendo y extrae la moneda de la descripción", () => {
    const dividend = rows.find((r) => r.type === "DIVIDEND");
    expect(dividend).toMatchObject({ ticker: "NVO", amount: 11.82, currencyCode: "USD" });
  });

  it("mapea Foreign Tax Withholding y Other Fee como gastos ligados al activo", () => {
    const tax = rows.find((r) => r.notes.includes("DK Impuestos"));
    const fee = rows.find((r) => r.notes.includes("- FEE"));
    expect(tax).toMatchObject({ type: "FEE", ticker: "NVO", amount: 3.19 });
    expect(fee).toMatchObject({ type: "FEE", ticker: "NVO", amount: 0.31 });
  });

  it("clasifica Electronic Fund Transfer como depósito o retiro según el signo", () => {
    expect(rows.find((r) => r.notes === "ELECTRONIC FUND TRANSFER")).toMatchObject({
      type: "DEPOSIT",
      amount: 500,
      ticker: null,
    });
  });

  it("mapea Broker Interest Received como interés", () => {
    expect(rows.find((r) => r.notes === "BROKER INTEREST RECEIVED")).toMatchObject({ type: "INTEREST", amount: 0.42 });
  });

  it("avisa y omite un tipo de transacción no reconocido en vez de adivinar", () => {
    expect(rows.some((r) => r.notes === "ALGUN TIPO RARO")).toBe(false);
    expect(warnings.some((w) => w.includes("Corporate Action Adjustment"))).toBe(true);
  });

  it('mapea Debit Interest (sin símbolo, Symbol="-") como gasto sin ticker, no con ticker "-"', () => {
    const debitInterest = rows.find((r) => r.notes.includes("Interés deudor"));
    expect(debitInterest).toMatchObject({ type: "FEE", amount: 12.56, ticker: null });
  });

  it("mapea Payment in Lieu como dividendo y preserva el signo de una reversión", () => {
    const paymentInLieu = rows.filter((r) => r.notes.includes("Pago en Lugar"));
    expect(paymentInLieu).toHaveLength(2);
    expect(paymentInLieu[0]).toMatchObject({ type: "DIVIDEND", ticker: "NKE", amount: 0.41 });
    expect(paymentInLieu[1]).toMatchObject({ type: "DIVIDEND", ticker: "NKE", amount: -0.41 });
    const netDividend = paymentInLieu.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    expect(netDividend).toBeCloseTo(0, 6);
  });
});
