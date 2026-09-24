import { describe, expect, it } from "vitest";
import { computeFxRateFromTrm, parseTrmResponse, resolveTrmNear } from "./trm";

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

describe("resolveTrmNear", () => {
  const points = [
    { date: new Date("2024-01-02T00:00:00Z"), value: 3900 },
    { date: new Date("2024-01-05T00:00:00Z"), value: 4000 },
    { date: new Date("2024-01-10T00:00:00Z"), value: 4100 },
  ];

  it("usa la última TRM vigente en o antes del día de compra", () => {
    expect(resolveTrmNear(points, new Date("2024-01-08T12:00:00Z"))).toBe(4000);
  });

  it("usa el primer dato disponible si el histórico empieza después de la compra", () => {
    expect(resolveTrmNear(points, new Date("2024-01-01T00:00:00Z"))).toBe(3900);
  });

  it("no inventa una TRM si el dato disponible está demasiado lejos de la compra", () => {
    expect(resolveTrmNear(points, new Date("2023-01-01T00:00:00Z"))).toBeNull();
    expect(resolveTrmNear(points, new Date("2024-02-01T00:00:00Z"))).toBeNull();
  });

  it("devuelve null cuando no hay histórico", () => {
    expect(resolveTrmNear([], new Date("2024-01-01T00:00:00Z"))).toBeNull();
  });
});
