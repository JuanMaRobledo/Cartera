import { describe, expect, it } from "vitest";
import { nextSort, sortRows } from "./sortRows";

const rows = [
  { ticker: "MSFT", value: 120 },
  { ticker: "aapl", value: null },
  { ticker: "Ádobe", value: 80 },
  { ticker: "KO", value: 200 },
];

describe("sortRows", () => {
  it("ordena números en ambos sentidos con los vacíos al final", () => {
    expect(sortRows(rows, (r) => r.value, "desc").map((r) => r.ticker)).toEqual(["KO", "MSFT", "Ádobe", "aapl"]);
    expect(sortRows(rows, (r) => r.value, "asc").map((r) => r.ticker)).toEqual(["Ádobe", "MSFT", "KO", "aapl"]);
  });

  it("ordena textos sin distinguir mayúsculas ni tildes", () => {
    expect(sortRows(rows, (r) => r.ticker, "asc").map((r) => r.ticker)).toEqual(["aapl", "Ádobe", "KO", "MSFT"]);
  });

  it("no modifica el arreglo original y respeta el orden ante empates", () => {
    const tied = [{ id: 1, v: 5 }, { id: 2, v: 5 }, { id: 3, v: 1 }];
    expect(sortRows(tied, (r) => r.v, "desc").map((r) => r.id)).toEqual([1, 2, 3]);
    expect(tied.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe("nextSort", () => {
  it("arranca en el sentido dado y alterna al repetir la columna", () => {
    const first = nextSort(null, "valorMercado", "desc");
    expect(first).toEqual({ key: "valorMercado", direction: "desc" });
    expect(nextSort(first, "valorMercado", "desc")).toEqual({ key: "valorMercado", direction: "asc" });
    expect(nextSort(first, "activo", "asc")).toEqual({ key: "activo", direction: "asc" });
  });
});
