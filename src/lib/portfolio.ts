// Motor de cálculo de cartera: costo promedio ponderado, ganancias/pérdidas
// realizadas y no realizadas, y la descomposición de la rentabilidad en
// "desempeño del activo en su moneda" vs. "efecto del tipo de cambio".
//
// Convención de tipo de cambio: fxRateToBase significa que 1 unidad de la
// moneda de la transacción equivale a `fxRateToBase` unidades de la moneda
// base de la cartera (ej. si la base es USD y currencyCode es EUR con
// fxRateToBase=1.08, entonces 1 EUR = 1.08 USD ese día).
//
// Posiciones cortas: `quantity` es una cantidad con signo. Una serie de
// BUY/SELL que cruza cero se interpreta como cerrar la posición existente y
// abrir una en la dirección contraria (vender más de lo que se tiene abre o
// extiende un corto; comprar más de lo que se debe lo cierra y puede dejar
// una posición larga). `avgCostLocal`/`avgCostBase` son siempre magnitudes
// positivas (el precio promedio al que se abrió la posición actual, larga o
// corta); `costBasisLocal`/`costBasisBase` son `|quantity| * avgCost`.

import type { TransactionType } from "./enums";

export interface RawTransaction {
  id: string;
  accountId: string;
  assetId: string | null;
  type: TransactionType;
  date: Date;
  quantity: number | null;
  price: number | null;
  currencyCode: string;
  fxRateToBase: number;
  amount: number | null;
  commission: number | null;
  commissionCurrency: string | null;
  fxFromCurrency?: string | null;
  fxFromAmount?: number | null;
  fxToCurrency?: string | null;
  fxToAmount?: number | null;
}

export interface AssetInfo {
  id: string;
  ticker: string;
  name: string;
  assetType: string;
  currencyCode: string;
}

export interface LatestQuote {
  price: number;
  date: Date;
}

export interface RealizedLot {
  transactionId: string;
  date: Date;
  quantity: number;
  proceedsLocal: number;
  costLocal: number;
  realizedPnLLocal: number;
  proceedsBase: number;
  costBase: number;
  realizedPnLBase: number;
  localPerformanceBase: number;
  fxEffectBase: number;
}

export interface AssetPosition {
  assetId: string;
  ticker: string;
  name: string;
  assetType: string;
  currencyCode: string;

  quantity: number;
  avgCostLocal: number;
  avgCostBase: number;
  costBasisLocal: number;
  costBasisBase: number;

  currentPriceLocal: number | null;
  currentFxRate: number | null;
  priceAsOf: Date | null;
  marketValueLocal: number | null;
  marketValueBase: number | null;

  unrealizedPnLLocal: number | null;
  unrealizedPnLBase: number | null;
  unrealizedLocalPerformanceBase: number | null;
  unrealizedFxEffectBase: number | null;

  realizedPnLLocal: number;
  realizedPnLBase: number;
  realizedLocalPerformanceBase: number;
  realizedFxEffectBase: number;

  dividendsLocal: number;
  dividendsBase: number;
  feesBase: number;

  totalReturnBase: number;
  totalReturnLocalPerformanceBase: number;
  totalReturnFxEffectBase: number;

  lots: RealizedLot[];
}

function emptyPosition(asset: AssetInfo): AssetPosition {
  return {
    assetId: asset.id,
    ticker: asset.ticker,
    name: asset.name,
    assetType: asset.assetType,
    currencyCode: asset.currencyCode,
    quantity: 0,
    avgCostLocal: 0,
    avgCostBase: 0,
    costBasisLocal: 0,
    costBasisBase: 0,
    currentPriceLocal: null,
    currentFxRate: null,
    priceAsOf: null,
    marketValueLocal: null,
    marketValueBase: null,
    unrealizedPnLLocal: null,
    unrealizedPnLBase: null,
    unrealizedLocalPerformanceBase: null,
    unrealizedFxEffectBase: null,
    realizedPnLLocal: 0,
    realizedPnLBase: 0,
    realizedLocalPerformanceBase: 0,
    realizedFxEffectBase: 0,
    dividendsLocal: 0,
    dividendsBase: 0,
    feesBase: 0,
    totalReturnBase: 0,
    totalReturnLocalPerformanceBase: 0,
    totalReturnFxEffectBase: 0,
    lots: [],
  };
}

/**
 * Calcula la posición de cada activo aplicando costo promedio ponderado
 * (promediación de costos) y separando, en cada venta y en la valuación
 * abierta, cuánto del resultado en moneda base proviene del desempeño del
 * activo en su propia moneda y cuánto del movimiento del tipo de cambio.
 */
export function computePositions(
  transactions: RawTransaction[],
  assets: Map<string, AssetInfo>,
  latestQuotes: Map<string, LatestQuote>,
  latestFxRates: Map<string, number>,
): AssetPosition[] {
  const positions = new Map<string, AssetPosition>();
  const byAsset = new Map<string, RawTransaction[]>();

  for (const tx of transactions) {
    if (!tx.assetId) continue;
    if (tx.type !== "BUY" && tx.type !== "SELL" && tx.type !== "DIVIDEND" && tx.type !== "FEE") continue;
    if (!byAsset.has(tx.assetId)) byAsset.set(tx.assetId, []);
    byAsset.get(tx.assetId)!.push(tx);
  }

  for (const [assetId, txs] of byAsset) {
    const asset = assets.get(assetId);
    if (!asset) continue;
    const sorted = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const position = emptyPosition(asset);

    for (const tx of sorted) {
      const commission = tx.commission ?? 0;

      if (tx.type === "BUY" || tx.type === "SELL") {
        const tradeQty = tx.quantity ?? 0;
        const price = tx.price ?? 0;
        if (tradeQty <= 0) continue;

        const qtyBefore = position.quantity;
        const dirBefore = Math.sign(qtyBefore);
        const dirTrade = tx.type === "BUY" ? 1 : -1;

        // Si la operación va en contra de la posición existente, primero
        // cierra hasta `|qtyBefore|` unidades; lo que sobre abre/extiende
        // una posición nueva en la dirección de la operación (posiblemente
        // cruzando de largo a corto o viceversa en una sola transacción).
        let closingQty = 0;
        let openingQty = tradeQty;
        if (dirBefore !== 0 && dirBefore !== dirTrade) {
          closingQty = Math.min(tradeQty, Math.abs(qtyBefore));
          openingQty = tradeQty - closingQty;
          // Cuando qtyBefore ya venía con arrastre de coma flotante de ventas
          // parciales anteriores, un cierre "exacto" puede dejar un resto
          // ínfimo en openingQty (p. ej. 1.77e-15) que de otro modo abriría
          // una posición fantasma en la dirección de la operación.
          if (openingQty <= 1e-9) openingQty = 0;
        }

        if (closingQty > 0) {
          const closingCommission = commission * (closingQty / tradeQty);
          const S = dirBefore; // dirección que se cierra: +1 posición larga, -1 corta
          const realizedPnLLocal = S * closingQty * (price - position.avgCostLocal) - closingCommission;
          const realizedPnLBase =
            S * closingQty * (price * tx.fxRateToBase - position.avgCostBase) - closingCommission * tx.fxRateToBase;
          const localPerformanceBase = realizedPnLLocal * tx.fxRateToBase;
          const fxEffectBase = realizedPnLBase - localPerformanceBase;

          // proceedsLocal/costLocal son solo para el detalle informativo del lote.
          const proceedsLocal = S > 0 ? closingQty * price - closingCommission : closingQty * position.avgCostLocal;
          const costLocal = S > 0 ? closingQty * position.avgCostLocal : closingQty * price + closingCommission;

          position.quantity += S > 0 ? -closingQty : closingQty;
          position.costBasisLocal -= closingQty * position.avgCostLocal;
          position.costBasisBase -= closingQty * position.avgCostBase;
          if (Math.abs(position.quantity) <= 1e-9) {
            position.quantity = 0;
            position.costBasisLocal = 0;
            position.costBasisBase = 0;
          }

          position.realizedPnLLocal += realizedPnLLocal;
          position.realizedPnLBase += realizedPnLBase;
          position.realizedLocalPerformanceBase += localPerformanceBase;
          position.realizedFxEffectBase += fxEffectBase;

          position.lots.push({
            transactionId: tx.id,
            date: tx.date,
            quantity: closingQty,
            proceedsLocal,
            costLocal,
            realizedPnLLocal,
            proceedsBase: proceedsLocal * tx.fxRateToBase,
            costBase: costLocal * tx.fxRateToBase,
            realizedPnLBase,
            localPerformanceBase,
            fxEffectBase,
          });
        }

        if (openingQty > 0) {
          const openingCommission = commission * (openingQty / tradeQty);
          // Al comprar (abrir/extender un largo) la comisión suma al costo;
          // al vender (abrir/extender un corto) reduce lo efectivamente
          // recibido, así que baja el precio de equilibrio para recomprar.
          const addedBasisLocal =
            dirTrade > 0 ? openingQty * price + openingCommission : openingQty * price - openingCommission;
          position.quantity += dirTrade * openingQty;
          position.costBasisLocal += addedBasisLocal;
          position.costBasisBase += addedBasisLocal * tx.fxRateToBase;
        }

        if (Math.abs(position.quantity) <= 1e-9) {
          position.quantity = 0;
          position.costBasisLocal = 0;
          position.costBasisBase = 0;
        }

        const absQty = Math.abs(position.quantity);
        position.avgCostLocal = absQty > 0 ? position.costBasisLocal / absQty : 0;
        position.avgCostBase = absQty > 0 ? position.costBasisBase / absQty : 0;
      } else if (tx.type === "DIVIDEND") {
        const gross = tx.amount ?? (tx.quantity ?? 0) * (tx.price ?? 0);
        const dividendLocal = gross - commission;
        position.dividendsLocal += dividendLocal;
        position.dividendsBase += dividendLocal * tx.fxRateToBase;
      } else if (tx.type === "FEE") {
        const feeLocal = tx.amount ?? commission;
        position.feesBase += feeLocal * tx.fxRateToBase;
      }
    }

    const quote = latestQuotes.get(assetId);
    const fxRate = latestFxRates.get(asset.currencyCode);
    if (quote && fxRate !== undefined && position.quantity !== 0) {
      position.currentPriceLocal = quote.price;
      position.currentFxRate = fxRate;
      position.priceAsOf = quote.date;
      position.marketValueLocal = position.quantity * quote.price;
      position.marketValueBase = position.marketValueLocal * fxRate;
      // Generalizado para posiciones cortas (quantity < 0): cuando el precio
      // baja por debajo del promedio al que se abrió el corto, la ganancia
      // es positiva.
      position.unrealizedPnLLocal = position.quantity * (quote.price - position.avgCostLocal);
      position.unrealizedPnLBase = position.quantity * (quote.price * fxRate - position.avgCostBase);
      position.unrealizedLocalPerformanceBase = position.unrealizedPnLLocal * fxRate;
      position.unrealizedFxEffectBase = position.unrealizedPnLBase - position.unrealizedLocalPerformanceBase;
    }

    position.totalReturnBase =
      position.realizedPnLBase + (position.unrealizedPnLBase ?? 0) + position.dividendsBase - position.feesBase;
    position.totalReturnLocalPerformanceBase =
      position.realizedLocalPerformanceBase +
      (position.unrealizedLocalPerformanceBase ?? 0) +
      position.dividendsBase -
      position.feesBase;
    position.totalReturnFxEffectBase = position.realizedFxEffectBase + (position.unrealizedFxEffectBase ?? 0);

    positions.set(assetId, position);
  }

  return [...positions.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export interface CashBalance {
  currencyCode: string;
  balance: number;
  balanceBase: number | null;
}

/** Ledger simple de efectivo por moneda a partir de depósitos, retiros, compras/ventas, dividendos, intereses, comisiones y cambios de moneda. */
export function computeCashBalances(
  transactions: RawTransaction[],
  latestFxRates: Map<string, number>,
): CashBalance[] {
  const balances = new Map<string, number>();
  const add = (ccy: string, amt: number) => balances.set(ccy, (balances.get(ccy) ?? 0) + amt);

  for (const tx of transactions) {
    const commission = tx.commission ?? 0;
    switch (tx.type) {
      case "DEPOSIT":
        add(tx.currencyCode, tx.amount ?? 0);
        break;
      case "WITHDRAWAL":
        add(tx.currencyCode, -(tx.amount ?? 0));
        break;
      case "BUY":
        add(tx.currencyCode, -((tx.quantity ?? 0) * (tx.price ?? 0) + commission));
        break;
      case "SELL":
        add(tx.currencyCode, (tx.quantity ?? 0) * (tx.price ?? 0) - commission);
        break;
      case "DIVIDEND":
      case "INTEREST":
        add(tx.currencyCode, (tx.amount ?? (tx.quantity ?? 0) * (tx.price ?? 0)) - commission);
        break;
      case "FEE":
        add(tx.currencyCode, -(tx.amount ?? commission));
        break;
      case "FX_CONVERT":
        if (tx.fxFromCurrency && tx.fxFromAmount != null) add(tx.fxFromCurrency, -tx.fxFromAmount);
        if (tx.fxToCurrency && tx.fxToAmount != null) add(tx.fxToCurrency, tx.fxToAmount);
        break;
    }
  }

  return [...balances.entries()]
    .map(([currencyCode, balance]) => {
      const rate = latestFxRates.get(currencyCode);
      return { currencyCode, balance, balanceBase: rate !== undefined ? balance * rate : null };
    })
    .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}

export interface PortfolioSummary {
  totalMarketValueBase: number;
  totalCostBase: number;
  totalUnrealizedBase: number;
  totalRealizedBase: number;
  totalDividendsBase: number;
  totalFeesBase: number;
  totalCashBase: number;
  totalReturnBase: number;
  totalReturnLocalPerformanceBase: number;
  totalReturnFxEffectBase: number;
  positionsMissingPrice: number;
}

export function computePortfolioSummary(positions: AssetPosition[], cashBalances: CashBalance[]): PortfolioSummary {
  let totalMarketValueBase = 0;
  let totalCostBase = 0;
  let totalUnrealizedBase = 0;
  let totalRealizedBase = 0;
  let totalDividendsBase = 0;
  let totalFeesBase = 0;
  let totalReturnBase = 0;
  let totalReturnLocalPerformanceBase = 0;
  let totalReturnFxEffectBase = 0;
  let positionsMissingPrice = 0;

  for (const p of positions) {
    if (p.quantity !== 0 && p.marketValueBase == null) positionsMissingPrice += 1;
    totalMarketValueBase += p.marketValueBase ?? 0;
    totalCostBase += p.costBasisBase;
    totalUnrealizedBase += p.unrealizedPnLBase ?? 0;
    totalRealizedBase += p.realizedPnLBase;
    totalDividendsBase += p.dividendsBase;
    totalFeesBase += p.feesBase;
    totalReturnBase += p.totalReturnBase;
    totalReturnLocalPerformanceBase += p.totalReturnLocalPerformanceBase;
    totalReturnFxEffectBase += p.totalReturnFxEffectBase;
  }

  const totalCashBase = cashBalances.reduce((sum, c) => sum + (c.balanceBase ?? 0), 0);

  return {
    totalMarketValueBase,
    totalCostBase,
    totalUnrealizedBase,
    totalRealizedBase,
    totalDividendsBase,
    totalFeesBase,
    totalCashBase,
    totalReturnBase,
    totalReturnLocalPerformanceBase,
    totalReturnFxEffectBase,
    positionsMissingPrice,
  };
}

export interface CashFlow {
  date: Date;
  amount: number; // negativo = dinero que sale del bolsillo del inversor hacia la cartera
}

/** TIR (XIRR) por Newton-Raphson con respaldo de bisección. Devuelve tasa anualizada o null si no converge. */
export function xirr(cashFlows: CashFlow[], guess = 0.1): number | null {
  const flows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (flows.length < 2) return null;
  const t0 = flows[0].date.getTime();
  const years = flows.map((f) => (f.date.getTime() - t0) / (365 * 24 * 3600 * 1000));

  const npv = (rate: number) => flows.reduce((sum, f, i) => sum + f.amount / Math.pow(1 + rate, years[i]), 0);
  const dnpv = (rate: number) =>
    flows.reduce((sum, f, i) => (years[i] === 0 ? sum : sum - (years[i] * f.amount) / Math.pow(1 + rate, years[i] + 1)), 0);

  let rate = guess;
  for (let i = 0; i < 100; i++) {
    const value = npv(rate);
    const deriv = dnpv(rate);
    if (Math.abs(deriv) < 1e-12) break;
    const next = rate - value / deriv;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-7) return next;
    rate = next;
  }

  // Respaldo: bisección en un rango amplio.
  let lo = -0.999;
  let hi = 10;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (Number.isNaN(fLo) || Number.isNaN(fHi) || fLo * fHi > 0) return Number.isFinite(rate) ? rate : null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}
