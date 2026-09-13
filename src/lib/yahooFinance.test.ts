import { describe, expect, it } from "vitest";
import { toYahooSymbol } from "./yahooFinance";

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
