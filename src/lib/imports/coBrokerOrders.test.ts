import { describe, expect, it } from "vitest";
import { isCoBrokerOrders, parseCoBrokerOrders } from "./coBrokerOrders";

const HEADER =
  "Fecha y hora,Símbolo de la acción,Tipo de orden,Estado,Acciones completadas,Acciones pendientes,Precio por acción,Total invertido,Valor comisión,Total estimado";

const SAMPLE = [
  HEADER,
  '"15 may 2026, 10:40 a. m.",EIMICO,Venta,Cancelado,0,0,265040,4240640,0,4240640',
  '"15 may 2026, 10:31 a. m.",NUCO,Compra,Aprobado,44,0,45840,2016960,7437.5,2024397.5',
  '"1 abr 2026, 11:41 a. m.",EIMICO,Venta,Aprobado,10/26,0,190000,1900000,7437.5,1892562.5',
  '"3 mar 2026, 12:00 p. m.",TERPEL,Compra,Aprobado,71/139,0,18000,1278000,7437.5,1285437.5',
  '"1 mar 2026, 8:22 a. m.",IUESCO,Compra,Cancelado,0,64,43860,2807040,0,2807040',
].join("\n");

describe("isCoBrokerOrders", () => {
  it("detecta el formato por sus columnas en español", () => {
    expect(isCoBrokerOrders(SAMPLE)).toBe(true);
  });

  it("no confunde otro CSV con este formato", () => {
    expect(isCoBrokerOrders("type,date,ticker\nBUY,2024-01-01,AAPL")).toBe(false);
  });
});

describe("parseCoBrokerOrders", () => {
  const { rows, warnings } = parseCoBrokerOrders(SAMPLE);

  it("descarta las órdenes canceladas", () => {
    expect(rows.some((r) => r.ticker === "EIMICO" && r.type === "SELL" && r.price === 265040)).toBe(false);
    expect(rows.some((r) => r.ticker === "IUESCO")).toBe(false);
  });

  it("parsea una orden totalmente ejecutada", () => {
    expect(rows.find((r) => r.ticker === "NUCO")).toMatchObject({
      type: "BUY",
      date: "2026-05-15",
      quantity: 44,
      price: 45840,
      commission: 7437.5,
      currencyCode: "COP",
    });
  });

  it("toma la cantidad ejecutada (no la solicitada) en una orden parcial", () => {
    expect(rows.find((r) => r.ticker === "EIMICO")).toMatchObject({ type: "SELL", quantity: 10, price: 190000 });
    expect(rows.find((r) => r.ticker === "TERPEL")).toMatchObject({ type: "BUY", quantity: 71, price: 18000 });
  });

  it("no genera advertencias para un archivo bien formado", () => {
    expect(warnings).toHaveLength(0);
  });
});
