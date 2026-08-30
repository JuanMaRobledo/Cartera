import { describe, expect, it } from "vitest";
import { isIbkrActivityStatement, parseIbkrStatement } from "./ibkr";

const SAMPLE_STATEMENT = [
  "Statement,Header,Field Name,Field Value",
  "Statement,Data,BrokerName,Interactive Brokers",
  "Statement,Data,Period,\"January 1, 2024 - December 31, 2024\"",
  "Trades,Header,DataDiscriminator,Asset Category,Currency,Symbol,Date/Time,Quantity,T. Price,C. Price,Proceeds,Comm/Fee,Basis,Realized P/L,MTM P/L,Code",
  "Trades,Data,Order,Stocks,USD,AAPL,\"2024-01-10, 10:30:00\",10,190,195,-1900,-1,1901,0,50,O",
  "Trades,Data,Order,Stocks,USD,AAPL,\"2024-06-05, 11:00:00\",-5,195,195,975,-1,952.5,21.5,0,C",
  "Trades,Data,Order,Stocks,EUR,SAP,\"2024-02-01, 09:15:00\",20,150,150,-3000,-4,3004,0,0,O",
  "Dividends,Header,Currency,Date,Description,Amount",
  "Dividends,Data,USD,2024-08-15,AAPL(US0378331005) CASH DIVIDEND USD 0.24 PER SHARE (Ordinary Dividend),15",
  "Withholding Tax,Header,Currency,Date,Description,Amount",
  "Withholding Tax,Data,USD,2024-08-15,AAPL(US0378331005) CASH DIVIDEND USD 0.24 PER SHARE - US TAX,-2.25",
  "Deposits & Withdrawals,Header,Currency,Settle Date,Description,Amount",
  "Deposits & Withdrawals,Data,USD,2023-06-01,ELECTRONIC FUND TRANSFER,20000",
  "Deposits & Withdrawals,Data,USD,2024-09-01,WIRE TRANSFER OUT,-500",
  "Interest,Header,Currency,Date,Description,Amount",
  "Interest,Data,USD,2024-07-01,USD CREDIT INTEREST FOR JUN-2024,3.2",
  "Fees,Header,Currency,Date,Description,Amount",
  "Fees,Data,USD,2024-03-01,MONTHLY ACTIVITY FEE,-10",
].join("\n");

describe("isIbkrActivityStatement", () => {
  it("detecta un extracto de actividad de IBKR", () => {
    expect(isIbkrActivityStatement(SAMPLE_STATEMENT)).toBe(true);
  });

  it("no confunde un CSV genérico con un extracto de IBKR", () => {
    expect(isIbkrActivityStatement("type,date,ticker,quantity,price,currency\nBUY,2024-01-01,AAPL,1,100,USD")).toBe(
      false,
    );
  });
});

describe("parseIbkrStatement", () => {
  const { rows, warnings } = parseIbkrStatement(SAMPLE_STATEMENT);

  it("no genera advertencias con un extracto bien formado", () => {
    expect(warnings).toHaveLength(0);
  });

  it("convierte una fila de Trades con cantidad positiva en BUY", () => {
    const buy = rows.find((r) => r.sourceSection === "IBKR: Operaciones" && r.date === "2024-01-10");
    expect(buy).toMatchObject({
      type: "BUY",
      ticker: "AAPL",
      currencyCode: "USD",
      quantity: 10,
      price: 190,
      commission: 1,
    });
  });

  it("convierte una fila de Trades con cantidad negativa en SELL y usa el valor absoluto", () => {
    const sell = rows.find((r) => r.sourceSection === "IBKR: Operaciones" && r.date === "2024-06-05");
    expect(sell).toMatchObject({ type: "SELL", ticker: "AAPL", quantity: 5, price: 195, commission: 1 });
  });

  it("respeta la moneda de cada operación de forma independiente (multi-moneda)", () => {
    const sap = rows.find((r) => r.ticker === "SAP");
    expect(sap).toMatchObject({ type: "BUY", currencyCode: "EUR", quantity: 20, price: 150 });
  });

  it("extrae el ticker de la descripción de un dividendo", () => {
    const dividend = rows.find((r) => r.sourceSection === "IBKR: Dividendos");
    expect(dividend).toMatchObject({ type: "DIVIDEND", ticker: "AAPL", currencyCode: "USD", amount: 15 });
  });

  it("convierte la retención de impuestos en un gasto (FEE) en valor absoluto", () => {
    const tax = rows.find((r) => r.sourceSection === "IBKR: Retención de impuestos");
    expect(tax).toMatchObject({ type: "FEE", ticker: "AAPL", amount: 2.25 });
  });

  it("distingue depósitos (monto positivo) de retiros (monto negativo)", () => {
    const deposit = rows.find((r) => r.notes === "ELECTRONIC FUND TRANSFER");
    const withdrawal = rows.find((r) => r.notes === "WIRE TRANSFER OUT");
    expect(deposit).toMatchObject({ type: "DEPOSIT", amount: 20000 });
    expect(withdrawal).toMatchObject({ type: "WITHDRAWAL", amount: 500 });
  });

  it("mapea intereses de crédito como INTEREST", () => {
    const interest = rows.find((r) => r.sourceSection === "IBKR: Intereses");
    expect(interest).toMatchObject({ type: "INTEREST", amount: 3.2, currencyCode: "USD" });
  });

  it("mapea comisiones/gastos de cuenta como FEE sin activo asociado", () => {
    const fee = rows.find((r) => r.sourceSection === "IBKR: Comisiones y gastos");
    expect(fee).toMatchObject({ type: "FEE", ticker: null, amount: 10 });
  });

  it("ignora secciones de resumen sin filas de datos reales", () => {
    expect(rows.every((r) => r.currencyCode !== "")).toBe(true);
  });
});
