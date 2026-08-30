import { describe, expect, it } from "vitest";
import {
  computeCashBalances,
  computePortfolioSummary,
  computePositions,
  xirr,
  type AssetInfo,
  type LatestQuote,
  type RawTransaction,
} from "./portfolio";

function asset(overrides: Partial<AssetInfo> = {}): AssetInfo {
  return { id: "a1", ticker: "AAPL", name: "Apple", assetType: "STOCK", currencyCode: "USD", ...overrides };
}

function tx(overrides: Partial<RawTransaction>): RawTransaction {
  return {
    id: Math.random().toString(36).slice(2),
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

describe("computePositions - same currency as base", () => {
  it("computa costo promedio ponderado y ganancia realizada en una venta parcial", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "BUY", date: new Date("2024-01-01"), quantity: 10, price: 100, commission: 5 }),
      tx({ type: "BUY", date: new Date("2024-02-01"), quantity: 10, price: 120, commission: 5 }),
      // avg cost = (1005 + 1205) / 20 = 110.5
      tx({ type: "SELL", date: new Date("2024-03-01"), quantity: 5, price: 150, commission: 2 }),
    ];

    const positions = computePositions(txs, assets, new Map(), new Map());
    expect(positions).toHaveLength(1);
    const p = positions[0];

    expect(p.avgCostLocal).toBeCloseTo(110.5, 6);
    expect(p.quantity).toBeCloseTo(15, 6);
    expect(p.costBasisLocal).toBeCloseTo(110.5 * 15, 6);

    // proceeds = 5*150 - 2 = 748; cost = 5*110.5 = 552.5; pnl = 195.5
    expect(p.realizedPnLLocal).toBeCloseTo(195.5, 6);
    expect(p.realizedPnLBase).toBeCloseTo(195.5, 6); // fxRate=1
    expect(p.realizedFxEffectBase).toBeCloseTo(0, 6);
  });

  it("valúa la posición abierta al precio actual y separa no realizada", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [tx({ type: "BUY", quantity: 10, price: 100, commission: 0 })];
    const quotes = new Map<string, LatestQuote>([["a1", { price: 130, date: new Date("2024-06-01") }]]);
    const fx = new Map([["USD", 1]]);

    const [p] = computePositions(txs, assets, quotes, fx);
    expect(p.marketValueLocal).toBeCloseTo(1300, 6);
    expect(p.unrealizedPnLLocal).toBeCloseTo(300, 6);
    expect(p.unrealizedPnLBase).toBeCloseTo(300, 6);
    expect(p.unrealizedFxEffectBase).toBeCloseTo(0, 6);
  });
});

describe("computePositions - multi-currency: verdadera rentabilidad", () => {
  it("descompone la ganancia realizada en desempeño local vs. efecto cambiario", () => {
    // Activo en EUR, cartera en USD. Compra cuando 1 EUR = 1.00 USD,
    // vende cuando el EUR se fortalece a 1 EUR = 1.20 USD, sin cambio de precio en EUR.
    const eurAsset = asset({ id: "a2", ticker: "SAP", currencyCode: "EUR" });
    const assets = new Map([["a2", eurAsset]]);
    const txs: RawTransaction[] = [
      tx({ assetId: "a2", type: "BUY", currencyCode: "EUR", fxRateToBase: 1.0, quantity: 10, price: 100 }),
      tx({ assetId: "a2", type: "SELL", currencyCode: "EUR", fxRateToBase: 1.2, quantity: 10, price: 100 }),
    ];

    const [p] = computePositions(txs, assets, new Map(), new Map());

    // En EUR no hubo ganancia (compró y vendió a 100), pero en USD sí por el FX.
    expect(p.realizedPnLLocal).toBeCloseTo(0, 6);
    expect(p.realizedLocalPerformanceBase).toBeCloseTo(0, 6);
    // costBase = 1000*1.0 = 1000; proceedsBase = 1000*1.2 = 1200 -> ganancia 200, toda cambiaria.
    expect(p.realizedPnLBase).toBeCloseTo(200, 6);
    expect(p.realizedFxEffectBase).toBeCloseTo(200, 6);
  });

  it("separa desempeño local y efecto cambiario cuando ambos se mueven", () => {
    const eurAsset = asset({ id: "a3", ticker: "MC", currencyCode: "EUR" });
    const assets = new Map([["a3", eurAsset]]);
    const txs: RawTransaction[] = [
      tx({ assetId: "a3", type: "BUY", currencyCode: "EUR", fxRateToBase: 1.1, quantity: 10, price: 100 }),
    ];
    // El activo sube 10% en EUR (100 -> 110) y el EUR se deprecia a 1.05 USD.
    const quotes = new Map<string, LatestQuote>([["a3", { price: 110, date: new Date("2024-06-01") }]]);
    const fxRates = new Map([["EUR", 1.05]]);

    const [p] = computePositions(txs, assets, quotes, fxRates);

    expect(p.unrealizedPnLLocal).toBeCloseTo(100, 6); // 10 * (110-100)
    // Desempeño local valuado al fx actual: 100 * 1.05 = 105
    expect(p.unrealizedLocalPerformanceBase).toBeCloseTo(105, 6);
    // marketValueBase = 1100*1.05=1155; costBasisBase=1000*1.1=1100 -> unrealizedBase=55
    expect(p.unrealizedPnLBase).toBeCloseTo(55, 6);
    // efecto cambiario = 55 - 105 = -50 (perdimos por la depreciación del EUR sobre el capital invertido)
    expect(p.unrealizedFxEffectBase).toBeCloseTo(-50, 6);
    expect(p.unrealizedLocalPerformanceBase! + p.unrealizedFxEffectBase!).toBeCloseTo(p.unrealizedPnLBase!, 6);
  });
});

describe("dividendos y comisiones", () => {
  it("suma dividendos netos de comisión/retención al total return", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "BUY", quantity: 10, price: 100 }),
      tx({ type: "DIVIDEND", amount: 20, commission: 3, date: new Date("2024-04-01") }),
    ];
    const [p] = computePositions(txs, assets, new Map(), new Map());
    expect(p.dividendsLocal).toBeCloseTo(17, 6);
    expect(p.dividendsBase).toBeCloseTo(17, 6);
    expect(p.totalReturnBase).toBeCloseTo(17, 6); // sin precio actual, unrealized = 0
  });
});

describe("computeCashBalances", () => {
  it("mueve efectivo entre monedas en un FX_CONVERT", () => {
    const txs: RawTransaction[] = [
      tx({ assetId: null, type: "DEPOSIT", currencyCode: "USD", amount: 1000 }),
      tx({
        assetId: null,
        type: "FX_CONVERT",
        currencyCode: "USD",
        fxFromCurrency: "USD",
        fxFromAmount: 500,
        fxToCurrency: "EUR",
        fxToAmount: 460,
      }),
    ];
    const balances = computeCashBalances(txs, new Map([["USD", 1], ["EUR", 1.1]]));
    const usd = balances.find((b) => b.currencyCode === "USD")!;
    const eur = balances.find((b) => b.currencyCode === "EUR")!;
    expect(usd.balance).toBeCloseTo(500, 6);
    expect(eur.balance).toBeCloseTo(460, 6);
    expect(eur.balanceBase).toBeCloseTo(506, 6);
  });
});

describe("computePortfolioSummary", () => {
  it("agrega posiciones y efectivo", () => {
    const assets = new Map([["a1", asset()]]);
    const quotes = new Map<string, LatestQuote>([["a1", { price: 130, date: new Date() }]]);
    const positions = computePositions(
      [tx({ type: "BUY", quantity: 10, price: 100 })],
      assets,
      quotes,
      new Map([["USD", 1]]),
    );
    const cash = computeCashBalances([tx({ assetId: null, type: "DEPOSIT", amount: 200 })], new Map([["USD", 1]]));
    const summary = computePortfolioSummary(positions, cash);
    expect(summary.totalMarketValueBase).toBeCloseTo(1300, 6);
    expect(summary.totalCashBase).toBeCloseTo(200, 6);
    expect(summary.positionsMissingPrice).toBe(0);
  });
});

describe("xirr", () => {
  it("calcula ~10% para un depósito y un retiro un año después", () => {
    const rate = xirr([
      { date: new Date("2023-01-01"), amount: -1000 },
      { date: new Date("2024-01-01"), amount: 1100 },
    ]);
    expect(rate).not.toBeNull();
    expect(rate!).toBeCloseTo(0.1, 1);
  });
});
