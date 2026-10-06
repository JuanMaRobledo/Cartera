// Exportación completa de la cartera: arma un JSON autocontenido (cuentas,
// activos, posiciones consolidadas y por cuenta, efectivo, resumen,
// transacciones y tipos de cambio) y sus versiones CSV. Funciones puras: la
// ruta /api/export lee la base y delega aquí el armado.

import type { AssetPosition, CashBalance, PortfolioSummary, RawTransaction } from "./portfolio";

export const EXPORT_VERSION = 1;

export interface ExportAccount {
  id: string;
  name: string;
  broker: string | null;
  kind: string;
}

export interface ExportAsset {
  id: string;
  ticker: string;
  name: string;
  assetType: string;
  currencyCode: string;
  exchange: string | null;
  lastPrice: number | null;
  lastPriceDate: string | null;
}

export interface ExportTransaction {
  id: string;
  date: string;
  accountId: string;
  accountName: string | null;
  assetId: string | null;
  ticker: string | null;
  type: string;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  currencyCode: string;
  fxRateToBase: number;
  commission: number | null;
  commissionCurrency: string | null;
  fxFromCurrency: string | null;
  fxFromAmount: number | null;
  fxToCurrency: string | null;
  fxToAmount: number | null;
  notes: string | null;
}

/** Historial de compras de la posición vigente (desde la última vez que la cantidad llegó a cero). */
export interface HoldingHistory {
  firstBuyDate: string | null;
  openSince: string | null;
  openSincePrice: number | null;
  buyDates: string[];
  accountIds: string[];
}

export interface ExportPosition extends HoldingHistory {
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
  costBasisCop: number | null;
  avgPurchaseTrm: number | null;
  currentPriceLocal: number | null;
  priceAsOf: string | null;
  marketValueLocal: number | null;
  marketValueBase: number | null;
  marketValueCop: number | null;
  /** Peso en el valor de mercado (moneda base) de las posiciones abiertas del mismo grupo. */
  weightPct: number | null;
  unrealizedPnLLocal: number | null;
  unrealizedPnLBase: number | null;
  /** unrealizedPnLLocal / costBasisLocal: ganancia de la posición abierta en su moneda. */
  unrealizedPctLocal: number | null;
  realizedPnLLocal: number;
  realizedPnLBase: number;
  dividendsLocal: number;
  dividendsBase: number;
  feesLocal: number;
  feesBase: number;
  totalInvestedLocal: number;
  totalInvestedBase: number;
  totalReturnLocal: number;
  totalReturnBase: number;
  returnPctLocal: number | null;
  returnPct: number | null;
  totalFxPnLCop: number | null;
}

export interface ExportAccountBlock {
  accountId: string;
  accountName: string;
  positions: ExportPosition[];
  cashBalances: CashBalance[];
}

export interface PortfolioExport {
  version: number;
  generatedAt: string;
  baseCurrency: string;
  currentTrmToCop: number | null;
  fxRates: Record<string, number>;
  accounts: ExportAccount[];
  assets: ExportAsset[];
  /** Posiciones abiertas consolidadas (todas las cuentas). */
  positions: ExportPosition[];
  /** Activos que se tuvieron y ya se cerraron, con su resultado realizado. */
  closedPositions: ExportPosition[];
  byAccount: ExportAccountBlock[];
  cashBalances: CashBalance[];
  summary: PortfolioSummary;
  transactions: ExportTransaction[];
}

const QTY_EPSILON = 1e-9;

export function isoDate(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Compras de la posición vigente de un activo a partir de sus BUY/SELL. */
export function holdingHistory(transactions: RawTransaction[], assetId: string): HoldingHistory {
  const trades = transactions
    .filter((t) => t.assetId === assetId && (t.type === "BUY" || t.type === "SELL"))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let quantity = 0;
  let openIndex: number | null = null;
  trades.forEach((t, index) => {
    const qty = Math.abs(t.quantity ?? 0);
    if (t.type === "BUY") {
      if (quantity <= QTY_EPSILON) openIndex = index;
      quantity += qty;
    } else {
      quantity -= qty;
      if (quantity <= QTY_EPSILON) quantity = Math.max(quantity, 0);
    }
  });

  const firstBuy = trades.find((t) => t.type === "BUY");
  if (quantity <= QTY_EPSILON || openIndex == null) {
    return { firstBuyDate: isoDate(firstBuy?.date), openSince: null, openSincePrice: null, buyDates: [], accountIds: [] };
  }

  const current = trades.slice(openIndex);
  const openSince = isoDate(current[0].date)!;
  const sameDayBuys = current.filter((t) => t.type === "BUY" && isoDate(t.date) === openSince);
  const qty = sameDayBuys.reduce((s, t) => s + Math.abs(t.quantity ?? 0), 0);
  const value = sameDayBuys.reduce((s, t) => s + Math.abs(t.quantity ?? 0) * (t.price ?? 0), 0);

  return {
    firstBuyDate: isoDate(firstBuy?.date),
    openSince,
    openSincePrice: qty > 0 ? value / qty : null,
    buyDates: [...new Set(current.filter((t) => t.type === "BUY").map((t) => isoDate(t.date)!))].sort(),
    accountIds: [...new Set(current.map((t) => t.accountId))].sort(),
  };
}

export function toExportPosition(
  position: AssetPosition,
  transactions: RawTransaction[],
  totalOpenMarketValueBase: number,
): ExportPosition {
  return {
    assetId: position.assetId,
    ticker: position.ticker,
    name: position.name,
    assetType: position.assetType,
    currencyCode: position.currencyCode,
    quantity: position.quantity,
    avgCostLocal: position.avgCostLocal,
    avgCostBase: position.avgCostBase,
    costBasisLocal: position.costBasisLocal,
    costBasisBase: position.costBasisBase,
    costBasisCop: position.costBasisCop,
    avgPurchaseTrm: position.avgPurchaseTrm,
    currentPriceLocal: position.currentPriceLocal,
    priceAsOf: isoDate(position.priceAsOf),
    marketValueLocal: position.marketValueLocal,
    marketValueBase: position.marketValueBase,
    marketValueCop: position.marketValueCop,
    weightPct:
      position.quantity !== 0 && position.marketValueBase != null && totalOpenMarketValueBase > 0
        ? position.marketValueBase / totalOpenMarketValueBase
        : null,
    unrealizedPnLLocal: position.unrealizedPnLLocal,
    unrealizedPnLBase: position.unrealizedPnLBase,
    unrealizedPctLocal:
      position.unrealizedPnLLocal != null && position.costBasisLocal > 0
        ? position.unrealizedPnLLocal / position.costBasisLocal
        : null,
    realizedPnLLocal: position.realizedPnLLocal,
    realizedPnLBase: position.realizedPnLBase,
    dividendsLocal: position.dividendsLocal,
    dividendsBase: position.dividendsBase,
    feesLocal: position.feesLocal,
    feesBase: position.feesBase,
    totalInvestedLocal: position.totalInvestedLocal,
    totalInvestedBase: position.totalInvestedBase,
    totalReturnLocal: position.totalReturnLocal,
    totalReturnBase: position.totalReturnBase,
    returnPctLocal: position.returnPctLocal,
    returnPct: position.returnPct,
    totalFxPnLCop: position.totalFxPnLCop,
    ...holdingHistory(transactions, position.assetId),
  };
}

/** Separa abiertas y cerradas y agrega pesos e historial de compras. */
export function exportPositions(
  positions: AssetPosition[],
  transactions: RawTransaction[],
): { open: ExportPosition[]; closed: ExportPosition[] } {
  const isOpen = (p: AssetPosition) => Math.abs(p.quantity) > QTY_EPSILON;
  const totalOpen = positions.filter(isOpen).reduce((s, p) => s + (p.marketValueBase ?? 0), 0);
  const all = positions.map((p) => toExportPosition(p, transactions, totalOpen));
  return {
    open: all.filter((p) => Math.abs(p.quantity) > QTY_EPSILON),
    closed: all.filter((p) => Math.abs(p.quantity) <= QTY_EPSILON),
  };
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const text = Array.isArray(value) ? value.join(" ") : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

const POSITION_COLUMNS: (keyof ExportPosition)[] = [
  "ticker",
  "name",
  "assetType",
  "currencyCode",
  "quantity",
  "avgCostLocal",
  "costBasisLocal",
  "currentPriceLocal",
  "priceAsOf",
  "marketValueLocal",
  "marketValueBase",
  "weightPct",
  "unrealizedPnLLocal",
  "unrealizedPctLocal",
  "realizedPnLLocal",
  "dividendsLocal",
  "feesLocal",
  "totalReturnLocal",
  "returnPctLocal",
  "avgPurchaseTrm",
  "costBasisCop",
  "marketValueCop",
  "totalFxPnLCop",
  "firstBuyDate",
  "openSince",
  "openSincePrice",
  "buyDates",
];

const TRANSACTION_COLUMNS: (keyof ExportTransaction)[] = [
  "date",
  "accountName",
  "ticker",
  "type",
  "quantity",
  "price",
  "amount",
  "currencyCode",
  "fxRateToBase",
  "commission",
  "commissionCurrency",
  "fxFromCurrency",
  "fxFromAmount",
  "fxToCurrency",
  "fxToAmount",
  "notes",
  "id",
];

/** Una fila por posición abierta y cuenta; la columna "account" vale "TOTAL" en las consolidadas. */
export function positionsCsv(data: PortfolioExport): string {
  const accountNames = new Map(data.accounts.map((a) => [a.id, a.name]));
  const rows: unknown[][] = data.positions.map((p) => [
    "TOTAL",
    ...POSITION_COLUMNS.map((c) => p[c]),
    p.accountIds.map((id) => accountNames.get(id) ?? id),
  ]);
  for (const block of data.byAccount) {
    for (const p of block.positions) {
      rows.push([block.accountName, ...POSITION_COLUMNS.map((c) => p[c]), [block.accountName]]);
    }
  }
  return toCsv(["account", ...POSITION_COLUMNS, "accounts"], rows);
}

export function transactionsCsv(data: PortfolioExport): string {
  return toCsv(
    TRANSACTION_COLUMNS,
    data.transactions.map((t) => TRANSACTION_COLUMNS.map((c) => t[c])),
  );
}
