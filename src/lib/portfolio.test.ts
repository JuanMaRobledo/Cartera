import { describe, expect, it } from "vitest";
import {
  computeCashBalances,
  computeNetWorthBase,
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
    accountId: "acc1",
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
    expect(p.returnPctLocal).toBeCloseTo(0.1, 6); // rendimiento del activo en EUR
    expect(p.returnPct).toBeCloseTo(0.05, 6); // rendimiento para la cartera en USD, incluyendo FX
  });
});

describe("computePositions - efecto USD/COP por TRM histórica", () => {
  it("muestra pérdida cambiaria cuando la TRM actual es menor que la de compra", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "BUY", quantity: 10, price: 100, trmToCop: 4000 }),
    ];
    const quotes = new Map<string, LatestQuote>([["a1", { price: 100, date: new Date("2024-06-01") }]]);

    const [p] = computePositions(txs, assets, quotes, new Map([["USD", 1]]), 3800);

    expect(p.costBasisCop).toBeCloseTo(4_000_000, 6);
    expect(p.avgPurchaseTrm).toBeCloseTo(4000, 6);
    expect(p.marketValueCop).toBeCloseTo(3_800_000, 6);
    expect(p.unrealizedFxPnLCop).toBeCloseTo(-200_000, 6);
    expect(p.totalFxPnLCop).toBeCloseTo(-200_000, 6);
  });

  it("pondera la TRM de varias compras por el costo USD de cada lote", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "BUY", date: new Date("2024-01-01"), quantity: 10, price: 100, trmToCop: 4000 }),
      tx({ type: "BUY", date: new Date("2024-02-01"), quantity: 10, price: 100, trmToCop: 4200 }),
    ];
    const quotes = new Map<string, LatestQuote>([["a1", { price: 100, date: new Date("2024-06-01") }]]);

    const [p] = computePositions(txs, assets, quotes, new Map([["USD", 1]]), 3900);

    expect(p.avgPurchaseTrm).toBeCloseTo(4100, 6);
    expect(p.costBasisCop).toBeCloseTo(8_200_000, 6);
    expect(p.unrealizedFxPnLCop).toBeCloseTo(-400_000, 6);
  });

  it("separa el movimiento del activo del efecto del dólar", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "BUY", quantity: 10, price: 100, trmToCop: 4000 }),
    ];
    const quotes = new Map<string, LatestQuote>([["a1", { price: 110, date: new Date("2024-06-01") }]]);

    const [p] = computePositions(txs, assets, quotes, new Map([["USD", 1]]), 3800);

    // Ganancia del activo: USD 100 × 3.800 = COP 380.000.
    // Pérdida cambiaria sobre el costo de USD 1.000: (3.800 - 4.000) × 1.000 = -COP 200.000.
    // Resultado conjunto en COP: +180.000.
    expect(p.unrealizedPnLLocal).toBeCloseTo(100, 6);
    expect(p.unrealizedFxPnLCop).toBeCloseTo(-200_000, 6);
    expect(p.marketValueCop! - p.costBasisCop!).toBeCloseTo(180_000, 6);
  });

  it("marca el cálculo como incompleto si falta la TRM histórica", () => {
    const assets = new Map([["a1", asset()]]);
    const quotes = new Map<string, LatestQuote>([["a1", { price: 100, date: new Date("2024-06-01") }]]);

    const [p] = computePositions(
      [tx({ type: "BUY", quantity: 10, price: 100, trmToCop: null })],
      assets,
      quotes,
      new Map([["USD", 1]]),
      3900,
    );

    expect(p.trmCoverageComplete).toBe(false);
    expect(p.avgPurchaseTrm).toBeNull();
    expect(p.totalFxPnLCop).toBeNull();
  });
});

describe("computePositions - posiciones cortas", () => {
  it("vender sin tener el activo abre un corto (ya no se recorta la cantidad)", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [tx({ type: "SELL", quantity: 10, price: 100, commission: 1 })];
    const [p] = computePositions(txs, assets, new Map(), new Map());
    expect(p.quantity).toBeCloseTo(-10, 6);
    // "costo" de un corto = precio de equilibrio para recomprar; la comisión
    // pagada al vender reduce lo recibido, así que baja ese precio: (1000-1)/10.
    expect(p.avgCostLocal).toBeCloseTo(99.9, 6);
  });

  it("cubrir más barato que el precio de venta en corto da ganancia realizada", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "SELL", date: new Date("2024-01-01"), quantity: 10, price: 100, commission: 1 }),
      tx({ type: "BUY", date: new Date("2024-02-01"), quantity: 10, price: 80, commission: 1 }),
    ];
    const [p] = computePositions(txs, assets, new Map(), new Map());
    expect(p.quantity).toBeCloseTo(0, 6);
    // vendiste en 1000-1=999, recompraste en 800+1=801 -> ganancia 198
    expect(p.realizedPnLLocal).toBeCloseTo(198, 6);
  });

  it("cubrir más caro que el precio de venta en corto da pérdida realizada", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "SELL", date: new Date("2024-01-01"), quantity: 10, price: 100 }),
      tx({ type: "BUY", date: new Date("2024-02-01"), quantity: 10, price: 120 }),
    ];
    const [p] = computePositions(txs, assets, new Map(), new Map());
    expect(p.realizedPnLLocal).toBeCloseTo(-200, 6); // vendiste en 1000, recompraste en 1200
  });

  it("valúa una posición corta abierta: gana cuando el precio baja", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [tx({ type: "SELL", quantity: 10, price: 100 })];
    const quotes = new Map<string, LatestQuote>([["a1", { price: 70, date: new Date("2024-06-01") }]]);
    const [p] = computePositions(txs, assets, quotes, new Map([["USD", 1]]));
    expect(p.marketValueLocal).toBeCloseTo(-700, 6); // pasivo: se deben 10 acciones a 70
    expect(p.unrealizedPnLLocal).toBeCloseTo(300, 6); // vendidas a 100, valen 70 -> ganancia 300
  });

  it("valúa una posición corta abierta: pierde cuando el precio sube", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [tx({ type: "SELL", quantity: 10, price: 100 })];
    const quotes = new Map<string, LatestQuote>([["a1", { price: 130, date: new Date("2024-06-01") }]]);
    const [p] = computePositions(txs, assets, quotes, new Map([["USD", 1]]));
    expect(p.unrealizedPnLLocal).toBeCloseTo(-300, 6);
  });

  it("una compra que sobrepasa un corto lo cierra y abre una posición larga (cruce de cero)", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "SELL", date: new Date("2024-01-01"), quantity: 5, price: 100 }), // corto de 5 a 100
      tx({ type: "BUY", date: new Date("2024-02-01"), quantity: 8, price: 90 }), // cubre 5 y compra 3 de largo
    ];
    const [p] = computePositions(txs, assets, new Map(), new Map());
    expect(p.quantity).toBeCloseTo(3, 6); // terminó largo en 3
    expect(p.avgCostLocal).toBeCloseTo(90, 6); // las 3 que quedan largas, compradas a 90
    expect(p.realizedPnLLocal).toBeCloseTo(50, 6); // cerró el corto: vendió 5 a 100, cubrió 5 a 90 -> +50
  });

  it("una venta que sobrepasa una posición larga la cierra y abre un corto (cruce de cero)", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "BUY", date: new Date("2024-01-01"), quantity: 5, price: 90 }),
      tx({ type: "SELL", date: new Date("2024-02-01"), quantity: 8, price: 100 }), // vende las 5 largas y abre corto de 3
    ];
    const [p] = computePositions(txs, assets, new Map(), new Map());
    expect(p.quantity).toBeCloseTo(-3, 6);
    expect(p.avgCostLocal).toBeCloseTo(100, 6); // las 3 cortas, a 100
    expect(p.realizedPnLLocal).toBeCloseTo(50, 6); // cerró el largo: compró 5 a 90, vendió 5 a 100 -> +50
  });

  it("separa desempeño local y efecto cambiario en un corto multi-moneda", () => {
    // Corto en EUR cuando 1 EUR = 1.10 USD; el EUR se deprecia a 1.00 USD sin
    // cambio de precio en EUR -> toda la ganancia es efecto cambiario.
    const eurAsset = asset({ id: "a2", ticker: "SAP", currencyCode: "EUR" });
    const assets = new Map([["a2", eurAsset]]);
    const txs: RawTransaction[] = [
      tx({ assetId: "a2", type: "SELL", currencyCode: "EUR", fxRateToBase: 1.1, quantity: 10, price: 100 }),
      tx({ assetId: "a2", type: "BUY", currencyCode: "EUR", fxRateToBase: 1.0, quantity: 10, price: 100 }),
    ];
    const [p] = computePositions(txs, assets, new Map(), new Map());
    expect(p.realizedPnLLocal).toBeCloseTo(0, 6);
    expect(p.realizedLocalPerformanceBase).toBeCloseTo(0, 6);
    // vendiste en corto por 1000 EUR a 1.10 -> 1100 USD de "crédito"; cubriste por 1000 EUR a 1.00 -> costó 1000 USD.
    expect(p.realizedPnLBase).toBeCloseTo(100, 6);
    expect(p.realizedFxEffectBase).toBeCloseTo(100, 6);
  });
});

describe("computePositions - arrastre de coma flotante al cerrar", () => {
  it("una posición liquidada en varias ventas parciales queda en cantidad exactamente 0, no en un residuo ínfimo", () => {
    // 100 - 33.1 - 33.1 - 33.8 no da exactamente 0 en aritmética de punto
    // flotante (da ~7.1e-15) — sin el guard contra ese arrastre, ese resto
    // se interpretaba como abrir una posición corta fantasma en la última venta.
    const txs: RawTransaction[] = [
      tx({ type: "BUY", quantity: 100, price: 10 }),
      tx({ type: "SELL", quantity: 33.1, price: 11 }),
      tx({ type: "SELL", quantity: 33.1, price: 11 }),
      tx({ type: "SELL", quantity: 33.8, price: 11 }),
    ];
    const [p] = computePositions(txs, new Map([["a1", asset()]]), new Map(), new Map());
    expect(p.quantity).toBe(0);
    expect(p.costBasisLocal).toBe(0);
    expect(p.avgCostLocal).toBe(0);
  });
});

describe("computePositions - retorno %", () => {
  it("returnPct usa el capital total invertido, no el costo actual, para una posición cerrada", () => {
    const assets = new Map([["a1", asset()]]);
    const txs: RawTransaction[] = [
      tx({ type: "BUY", date: new Date("2024-01-01"), quantity: 10, price: 100 }),
      tx({ type: "SELL", date: new Date("2024-06-01"), quantity: 10, price: 120 }),
    ];
    const [p] = computePositions(txs, assets, new Map(), new Map());
    expect(p.quantity).toBe(0); // cerrada: costBasisBase queda en 0
    expect(p.totalInvestedBase).toBeCloseTo(1000, 6); // pero el capital invertido no se pierde
    expect(p.totalReturnBase).toBeCloseTo(200, 6);
    expect(p.returnPctLocal).toBeCloseTo(0.2, 6);
    expect(p.returnPct).toBeCloseTo(0.2, 6);
  });

  it("returnPct es null si nunca se invirtió capital en el activo (p. ej. solo un dividendo cargado a mano)", () => {
    const assets = new Map([["a1", asset()]]);
    const [p] = computePositions([tx({ type: "DIVIDEND", amount: 50 })], assets, new Map(), new Map());
    expect(p.totalInvestedBase).toBe(0);
    expect(p.totalReturnBase).toBeCloseTo(50, 6);
    expect(p.returnPctLocal).toBeNull();
    expect(p.returnPct).toBeNull();
  });
});

describe("computePortfolioSummary - retorno por moneda", () => {
  it("agrupa el retorno local de cada moneda por separado, sin mezclar el efecto cambiario", () => {
    const usdAsset = asset({ id: "a1", ticker: "AAPL", currencyCode: "USD" });
    const copAsset = asset({ id: "a2", ticker: "ECOPETROL", currencyCode: "COP" });
    const assets = new Map([
      ["a1", usdAsset],
      ["a2", copAsset],
    ]);
    const txs: RawTransaction[] = [
      tx({
        assetId: "a1",
        type: "BUY",
        currencyCode: "USD",
        fxRateToBase: 1,
        quantity: 10,
        price: 100,
        trmToCop: 4000,
      }),
      tx({ assetId: "a2", type: "BUY", currencyCode: "COP", fxRateToBase: 0.00025, quantity: 1000, price: 1000 }),
    ];
    const quotes = new Map<string, LatestQuote>([
      ["a1", { price: 110, date: new Date() }], // +10% en USD
      ["a2", { price: 1200, date: new Date() }], // +20% en COP
    ]);
    const fx = new Map([
      ["USD", 1],
      ["COP", 0.00025],
    ]);
    const positions = computePositions(txs, assets, quotes, fx, 3900);
    const summary = computePortfolioSummary(positions, []);

    const usd = summary.returnByCurrency.find((c) => c.currencyCode === "USD")!;
    const cop = summary.returnByCurrency.find((c) => c.currencyCode === "COP")!;
    expect(usd.marketValueLocal).toBeCloseTo(1100, 6);
    expect(usd.costBasisLocal).toBeCloseTo(1000, 6);
    expect(usd.totalReturnLocal).toBeCloseTo(100, 6);
    expect(usd.returnPct).toBeCloseTo(0.1, 6);
    expect(cop.marketValueLocal).toBeCloseTo(1_200_000, 6);
    expect(cop.costBasisLocal).toBeCloseTo(1_000_000, 6);
    expect(cop.totalReturnLocal).toBeCloseTo(200_000, 6);
    expect(cop.returnPct).toBeCloseTo(0.2, 6);
    expect(summary.usdCopFx?.avgPurchaseTrm).toBeCloseTo(4000, 6);
    expect(summary.usdCopFx?.currentTrmToCop).toBeCloseTo(3900, 6);
    expect(summary.usdCopFx?.unrealizedFxPnLCop).toBeCloseTo(-100_000, 6);
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
    expect(summary.totalDebtBase).toBe(0);
    expect(summary.positionsMissingPrice).toBe(0);
  });

  it("separa la deuda del efectivo y no la incorpora al precio de coste", () => {
    const assets = new Map([["a1", asset()]]);
    const positions = computePositions(
      [tx({ type: "BUY", quantity: 10, price: 100 })],
      assets,
      new Map([["a1", { price: 120, date: new Date() }]]),
      new Map([["USD", 1]]),
    );
    const cash = computeCashBalances(
      [tx({ assetId: null, type: "WITHDRAWAL", amount: 300 })],
      new Map([["USD", 1]]),
    );

    const summary = computePortfolioSummary(positions, cash);

    expect(summary.totalCashBase).toBe(0);
    expect(summary.totalDebtBase).toBeCloseTo(300, 6);
    expect(summary.totalCostBase).toBeCloseTo(1000, 6);
  });
});

describe("computeNetWorthBase", () => {
  it("resta la deuda una sola vez, no la mezcla con el efectivo disponible", () => {
    expect(
      computeNetWorthBase({ totalMarketValueBase: 10000, totalCashBase: 500, totalDebtBase: 300 }),
    ).toBeCloseTo(10200, 6);
  });

  it("da negativo si la deuda supera mercado + efectivo", () => {
    expect(
      computeNetWorthBase({ totalMarketValueBase: 100, totalCashBase: 0, totalDebtBase: 500 }),
    ).toBeCloseTo(-400, 6);
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
