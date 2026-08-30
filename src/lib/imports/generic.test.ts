import { describe, expect, it } from "vitest";
import { isGenericTemplate, parseGenericTemplate } from "./generic";

const SAMPLE_CSV = [
  "type,date,ticker,quantity,price,currency,amount,commission,notes",
  "BUY,2024-01-15,AAPL,10,190.5,USD,,1,Compra inicial",
  "DIVIDEND,2024-08-15,AAPL,,,USD,15,,Dividendo trimestral",
  "DEPOSIT,2024-01-01,,,,USD,5000,,Depósito inicial",
  "RARO,2024-01-01,,,,USD,1,,Tipo inválido",
].join("\n");

describe("isGenericTemplate", () => {
  it("reconoce la plantilla propia de Cartera", () => {
    expect(isGenericTemplate(SAMPLE_CSV)).toBe(true);
  });

  it("no confunde un extracto de IBKR con la plantilla genérica", () => {
    expect(isGenericTemplate("Trades,Header,Currency,Symbol\nTrades,Data,USD,AAPL")).toBe(false);
  });
});

describe("parseGenericTemplate", () => {
  const { rows, warnings } = parseGenericTemplate(SAMPLE_CSV);

  it("parsea una compra con cantidad y precio", () => {
    expect(rows.find((r) => r.type === "BUY")).toMatchObject({
      ticker: "AAPL",
      quantity: 10,
      price: 190.5,
      currencyCode: "USD",
      commission: 1,
    });
  });

  it("parsea un dividendo con monto total", () => {
    expect(rows.find((r) => r.type === "DIVIDEND")).toMatchObject({ ticker: "AAPL", amount: 15 });
  });

  it("parsea un depósito sin activo", () => {
    expect(rows.find((r) => r.type === "DEPOSIT")).toMatchObject({ ticker: null, amount: 5000 });
  });

  it("reporta como advertencia una fila con tipo desconocido y la omite", () => {
    expect(warnings.some((w) => w.includes("desconocido"))).toBe(true);
    expect(rows.some((r) => r.notes === "Tipo inválido")).toBe(false);
  });

  it("devuelve una advertencia si faltan las columnas esperadas", () => {
    const result = parseGenericTemplate("foo,bar\n1,2");
    expect(result.rows).toHaveLength(0);
    expect(result.warnings[0]).toMatch(/columnas esperadas/);
  });
});
