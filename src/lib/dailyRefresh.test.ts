import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), upsert: vi.fn(), quotes: vi.fn() }));
vi.mock("./prisma", () => ({ prisma: { asset: { findMany: mocks.findMany }, priceSnapshot: { upsert: mocks.upsert } } }));
vi.mock("./yahooFinance", () => ({ fetchYahooQuotes: mocks.quotes }));
import { refreshPrices } from "./dailyRefresh";

beforeEach(() => { vi.clearAllMocks(); mocks.findMany.mockResolvedValue([{ id: "a", ticker: "AAPL" }]); });
describe("persistencia de la fecha de mercado", () => {
  it("usa el día informado por el proveedor como clave y fecha del snapshot", async () => {
    mocks.quotes.mockResolvedValue([{ assetId: "a", symbol: "AAPL", price: 100, priceDate: "2026-10-09", error: null }]);
    const result = await refreshPrices();
    const date = new Date("2026-10-09T00:00:00.000Z");
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { assetId_date: { assetId: "a", date } },
      update: { price: 100, source: "YAHOO" },
      create: { assetId: "a", date, price: 100, source: "YAHOO" },
    });
    expect(result.updated).toHaveLength(1);
  });
  it("no escribe un precio sin fecha", async () => {
    mocks.quotes.mockResolvedValue([{ assetId: "a", symbol: "AAPL", price: 100, priceDate: null, error: "sin fecha" }]);
    const result = await refreshPrices();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(result.failed).toHaveLength(1);
  });
});
