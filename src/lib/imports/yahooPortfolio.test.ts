import { describe, expect, it } from "vitest";
import { isYahooPortfolio, parseYahooPortfolio } from "./yahooPortfolio";

const HEADER =
  "Symbol,Current Price,Date,Time,Change,Open,High,Low,Volume,Trade Date,Purchase Price,Quantity,Commission,High Limit,Low Limit,Comment,Transaction Type";

const SAMPLE = [
  HEADER,
  "$$CASH_TX,,,,,,,,,20251127,,200.0,,,,,DEPOSIT",
  "$$CASH_TX,,,,,,,,,20260131,,10.68,,,,,FEE",
  "DUOL,157.85,2026/09/02,16:00 EDT,-0.91999817,156.1,158.4654,154.3,1300099,20260220,112.29,2.67153,0.05,,,,BUY",
  "FISV,51.98,2026/09/02,16:00 EDT,0.31000137,51.73,53.0974,51.56,5530482,20260126,67.09,4.58238,0.12,,,,SELL",
].join("\n");

const CRYPTO_SAMPLE = [
  HEADER,
  "$$CASH_TX,,,,,,,,,20251119,,789.38,,,,,DEPOSIT",
  "BTC-USD,77300.37,2026/09/02,21:15 UTC,133.77344,77395.89,77719.54,76391.16,27656589312,20260701,58483.89,0.007375,,,,,BUY",
].join("\n");

describe("isYahooPortfolio", () => {
  it("detecta el formato por sus columnas", () => {
    expect(isYahooPortfolio(SAMPLE)).toBe(true);
  });

  it("no confunde la plantilla genérica con este formato", () => {
    expect(isYahooPortfolio("type,date,ticker,quantity,price,currency\nBUY,2024-01-01,AAPL,1,100,USD")).toBe(false);
  });
});

describe("parseYahooPortfolio", () => {
  it("parsea depósitos y comisiones de $$CASH_TX", () => {
    const { rows, warnings } = parseYahooPortfolio(SAMPLE);
    expect(warnings).toHaveLength(0);
    expect(rows.find((r) => r.type === "DEPOSIT")).toMatchObject({ amount: 200, ticker: null, currencyCode: "USD" });
    expect(rows.find((r) => r.type === "FEE")).toMatchObject({ amount: 10.68, ticker: null });
  });

  it("parsea compras y ventas usando Trade Date/Purchase Price/Quantity", () => {
    const { rows } = parseYahooPortfolio(SAMPLE);
    expect(rows.find((r) => r.type === "BUY")).toMatchObject({
      ticker: "DUOL",
      date: "2026-02-20",
      quantity: 2.67153,
      price: 112.29,
      commission: 0.05,
    });
    expect(rows.find((r) => r.type === "SELL")).toMatchObject({ ticker: "FISV", quantity: 4.58238, price: 67.09 });
  });

  it("asume USD también para cripto (BTC-USD)", () => {
    const { rows, warnings } = parseYahooPortfolio(CRYPTO_SAMPLE);
    expect(warnings).toHaveLength(0);
    expect(rows.find((r) => r.ticker === "BTC-USD")).toMatchObject({
      type: "BUY",
      quantity: 0.007375,
      price: 58483.89,
      currencyCode: "USD",
    });
  });
});
