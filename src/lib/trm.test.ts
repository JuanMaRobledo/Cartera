import { describe, expect, it } from "vitest";
import { computeFxRateFromTrm, parseTrmResponse } from "./trm";

describe("parseTrmResponse", () => {
  it("toma el valor de la primera fila (la más reciente por vigenciadesde DESC)", () => {
    const rows = [
      { valor: "3072.27", vigenciadesde: "2026-09-12T00:00:00.000", vigenciahasta: "2026-09-14T00:00:00.000" },
      { valor: "3101.0", vigenciadesde: "2026-09-11T00:00:00.000", vigenciahasta: "2026-09-11T00:00:00.000" },
    ];
    expect(parseTrmResponse(rows)).toEqual({
      value: 3072.27,
      validFrom: "2026-09-12T00:00:00.000",
      validUntil: "2026-09-14T00:00:00.000",
    });
  });

  it("devuelve null si la respuesta viene vacía o no es un array", () => {
    expect(parseTrmResponse([])).toBeNull();
    expect(parseTrmResponse(null)).toBeNull();
    expect(parseTrmResponse({ error: "not found" })).toBeNull();
  });

  it("devuelve null si el valor no es un número válido", () => {
    expect(parseTrmResponse([{ valor: "no-es-un-numero" }])).toBeNull();
    expect(parseTrmResponse([{ valor: "0" }])).toBeNull();
  });
});

describe("computeFxRateFromTrm", () => {
  it("con base USD, guarda el FxRate de COP como el inverso de la TRM", () => {
    expect(computeFxRateFromTrm("USD", 4000)).toEqual({ currencyCode: "COP", rate: 1 / 4000 });
  });

  it("con base COP, guarda el FxRate de USD directamente como la TRM", () => {
    expect(computeFxRateFromTrm("COP", 4000)).toEqual({ currencyCode: "USD", rate: 4000 });
  });

  it("con cualquier otra moneda base, no hay nada para actualizar", () => {
    expect(computeFxRateFromTrm("EUR", 4000)).toBeNull();
  });
});
