import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchYahooQuotes, toYahooSymbol } from "./yahooFinance";

afterEach(() => vi.unstubAllGlobals());

describe("fecha de la cotización", () => {
  const assets = [{ id: "1", ticker: "AAPL", exchange: "NASDAQ", assetType: "STOCK" }];
  const reply = (meta: Record<string, unknown>) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ chart: { result: [{ meta }] } }),
    }));
  };

  it("conserva el día del proveedor aunque la consulta sea posterior", async () => {
    reply({ regularMarketPrice: 100, regularMarketTime: Date.parse("2026-10-09T20:00:00Z") / 1000, currency: "USD" });
    expect((await fetchYahooQuotes(assets))[0]).toMatchObject({ price: 100, priceDate: "2026-10-09", error: null });
  });

  it("rechaza un precio sin timestamp en lugar de fecharlo hoy", async () => {
    reply({ regularMarketPrice: 100, currency: "USD" });
    expect((await fetchYahooQuotes(assets))[0]).toMatchObject({ price: null, priceDate: null, error: "sin fecha de cotización" });
  });

  it.each([0, -1, NaN, Infinity])("rechaza precio inválido %s", async price => {
    reply({ regularMarketPrice: price, regularMarketTime: 1791576000 });
    expect((await fetchYahooQuotes(assets))[0].price).toBeNull();
  });
});

describe("toYahooSymbol", () => {
  it("usa el ticker tal cual para acciones/ETFs de EE.UU.", () => {
    expect(toYahooSymbol({ id: "1", ticker: "AAPL", exchange: "NASDAQ", assetType: "STOCK" })).toBe("AAPL");
    expect(toYahooSymbol({ id: "1", ticker: "VOO", exchange: "NYSE Arca", assetType: "ETF" })).toBe("VOO");
  });

  it("usa el ticker tal cual para cripto (ya incluye -USD)", () => {
    expect(toYahooSymbol({ id: "1", ticker: "BTC-USD", exchange: null, assetType: "CRYPTO" })).toBe("BTC-USD");
  });

  it("agrega el sufijo .CL para activos de la BVC (incluye CDIs)", () => {
    expect(toYahooSymbol({ id: "1", ticker: "ECOPETROL", exchange: "BVC", assetType: "STOCK" })).toBe("ECOPETROL.CL");
    expect(toYahooSymbol({ id: "1", ticker: "MSFTCO", exchange: "BVC", assetType: "STOCK" })).toBe("MSFTCO.CL");
  });

  it("sin bolsa conocida, usa el ticker tal cual", () => {
    expect(toYahooSymbol({ id: "1", ticker: "XYZ", exchange: null, assetType: "STOCK" })).toBe("XYZ");
  });
});
