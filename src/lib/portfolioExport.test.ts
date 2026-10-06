import { describe, expect, it } from "vitest";
import { computeCashBalances, computePortfolioSummary, computePositions, type AssetInfo, type RawTransaction } from "./portfolio";
import {
  exportPositions,
  holdingHistory,
  positionsCsv,
  toCsv,
  transactionsCsv,
  type PortfolioExport,
} from "./portfolioExport";

function tx(overrides: Partial<RawTransaction>): RawTransaction {
  return {
    id: Math.random().toString(36).slice(2),
    accountId: "ibkr",
    assetId: "a1",
    type: "BUY",
    date: new Date("2024-01-01"),
    quantity: null,
    price: null,
    currencyCode: "USD",
    fxRateToBase: 1,
    amount: null,
    commission: 0,
    commissionCurrency: null,
    ...overrides,
  };
}

const assets = new Map<string, AssetInfo>([
  ["a1", { id: "a1", ticker: "ADBE", name: "Adobe", assetType: "STOCK", currencyCode: "USD" }],
  ["a2", { id: "a2", ticker: "NKE", name: "Nike", assetType: "STOCK", currencyCode: "USD" }],
]);

const txs: RawTransaction[] = [
  // Primera tenencia de ADBE, cerrada por completo.
  tx({ date: new Date("2023-05-02"), quantity: 2, price: 400 }),
  tx({ type: "SELL", date: new Date("2023-09-01"), quantity: 2, price: 500 }),
  // Posición vigente: dos compras el mismo día de apertura, otra en otra cuenta.
  tx({ date: new Date("2025-12-03"), quantity: 1, price: 320 }),
  tx({ date: new Date("2025-12-03"), quantity: 3, price: 330 }),
  tx({ accountId: "hapi", date: new Date("2026-01-09"), quantity: 4, price: 250 }),
  tx({ type: "SELL", date: new Date("2026-02-01"), quantity: 1, price: 300 }),
  // NKE: comprada y vendida.
  tx({ assetId: "a2", date: new Date("2024-03-01"), quantity: 5, price: 100 }),
  tx({ assetId: "a2", type: "SELL", date: new Date("2024-06-01"), quantity: 5, price: 90 }),
];

describe("holdingHistory", () => {
  it("toma la apertura de la posición vigente, no la primera compra histórica", () => {
    const h = holdingHistory(txs, "a1");
    expect(h.firstBuyDate).toBe("2023-05-02");
    expect(h.openSince).toBe("2025-12-03");
    expect(h.openSincePrice).toBeCloseTo((320 + 3 * 330) / 4, 6);
    expect(h.buyDates).toEqual(["2025-12-03", "2026-01-09"]);
    expect(h.accountIds).toEqual(["hapi", "ibkr"]);
  });

  it("deja vacía la posición vigente de un activo cerrado", () => {
    const h = holdingHistory(txs, "a2");
    expect(h.firstBuyDate).toBe("2024-03-01");
    expect(h.openSince).toBeNull();
    expect(h.buyDates).toEqual([]);
  });
});

describe("exportPositions", () => {
  const quotes = new Map([
    ["a1", { price: 280, date: new Date("2026-10-05") }],
    ["a2", { price: 70, date: new Date("2026-10-05") }],
  ]);
  const positions = computePositions(txs, assets, quotes, new Map([["USD", 1]]));
  const { open, closed } = exportPositions(positions, txs);

  it("separa abiertas y cerradas, con costo promedio y ganancia sobre el costo", () => {
    expect(open.map((p) => p.ticker)).toEqual(["ADBE"]);
    expect(closed.map((p) => p.ticker)).toEqual(["NKE"]);
    const adbe = open[0];
    expect(adbe.quantity).toBeCloseTo(7, 6);
    expect(adbe.avgCostLocal).toBeCloseTo((320 + 990 + 1000) / 8, 6);
    expect(adbe.priceAsOf).toBe("2026-10-05");
    expect(adbe.weightPct).toBeCloseTo(1, 6);
    expect(adbe.unrealizedPctLocal).toBeCloseTo(280 / adbe.avgCostLocal - 1, 6);
    expect(adbe.openSince).toBe("2025-12-03");
  });

  it("genera CSV de posiciones (total y por cuenta) y de transacciones", () => {
    const data: PortfolioExport = {
      version: 1,
      generatedAt: "2026-10-06T00:00:00.000Z",
      baseCurrency: "USD",
      currentTrmToCop: null,
      fxRates: { USD: 1 },
      accounts: [
        { id: "ibkr", name: "Interactive Brokers", broker: null, kind: "BROKERAGE" },
        { id: "hapi", name: "Hapi", broker: null, kind: "BROKERAGE" },
      ],
      assets: [],
      positions: open,
      closedPositions: closed,
      byAccount: [{ accountId: "hapi", accountName: "Hapi", positions: open, cashBalances: [] }],
      cashBalances: computeCashBalances(txs, new Map([["USD", 1]])),
      summary: computePortfolioSummary(positions, []),
      transactions: [
        {
          id: "t1", date: "2025-12-03T00:00:00.000Z", accountId: "ibkr", accountName: "Interactive Brokers",
          assetId: "a1", ticker: "ADBE", type: "BUY", quantity: 1, price: 320, amount: null, currencyCode: "USD",
          fxRateToBase: 1, commission: 0, commissionCurrency: null, fxFromCurrency: null, fxFromAmount: null,
          fxToCurrency: null, fxToAmount: null, notes: 'compra "inicial", plan',
        },
      ],
    };
    const lines = positionsCsv(data).trim().split("\n");
    expect(lines[0].startsWith("account,ticker,name")).toBe(true);
    expect(lines[1].startsWith("TOTAL,ADBE,Adobe")).toBe(true);
    expect(lines[1].endsWith("Hapi Interactive Brokers")).toBe(true);
    expect(lines[2].startsWith("Hapi,ADBE")).toBe(true);
    expect(transactionsCsv(data)).toContain('"compra ""inicial"", plan"');
  });
});

describe("toCsv", () => {
  it("deja vacíos los nulos y cita solo lo necesario", () => {
    expect(toCsv(["a", "b"], [[null, "x,y"]])).toBe('a,b\n,"x,y"\n');
  });
});
