import { prisma } from "./prisma";
import type { AssetInfo, LatestQuote, RawTransaction } from "./portfolio";

export async function getBaseCurrency(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  return setting?.baseCurrency ?? "USD";
}

/** Último tipo de cambio conocido por moneda (1 unidad de la moneda = N moneda base). La moneda base siempre vale 1. */
export async function getLatestFxRates(): Promise<Map<string, number>> {
  const baseCurrency = await getBaseCurrency();
  const rates = await prisma.fxRate.findMany({ orderBy: { date: "desc" } });
  const map = new Map<string, number>();
  for (const r of rates) {
    if (!map.has(r.currencyCode)) map.set(r.currencyCode, r.rate);
  }
  map.set(baseCurrency, 1);
  return map;
}

/** Tipo de cambio vigente en o antes de una fecha dada (o el más antiguo disponible si no hay uno anterior). */
export async function getFxRateNear(currencyCode: string, date: Date): Promise<number | null> {
  const baseCurrency = await getBaseCurrency();
  if (currencyCode === baseCurrency) return 1;

  const onOrBefore = await prisma.fxRate.findFirst({
    where: { currencyCode, date: { lte: date } },
    orderBy: { date: "desc" },
  });
  if (onOrBefore) return onOrBefore.rate;

  const earliestAfter = await prisma.fxRate.findFirst({
    where: { currencyCode, date: { gt: date } },
    orderBy: { date: "asc" },
  });
  return earliestAfter?.rate ?? null;
}

export async function getLatestQuotes(): Promise<Map<string, LatestQuote>> {
  const snapshots = await prisma.priceSnapshot.findMany({ orderBy: { date: "desc" } });
  const map = new Map<string, LatestQuote>();
  for (const s of snapshots) {
    if (!map.has(s.assetId)) map.set(s.assetId, { price: s.price, date: s.date });
  }
  return map;
}

export async function getAssetsMap(): Promise<Map<string, AssetInfo>> {
  const assets = await prisma.asset.findMany();
  return new Map(
    assets.map((a) => [
      a.id,
      { id: a.id, ticker: a.ticker, name: a.name, assetType: a.assetType, currencyCode: a.currencyCode },
    ]),
  );
}

export async function getRawTransactions(): Promise<RawTransaction[]> {
  const txs = await prisma.transaction.findMany({ orderBy: { date: "asc" } });
  return txs.map((t) => ({
    id: t.id,
    assetId: t.assetId,
    type: t.type as RawTransaction["type"],
    date: t.date,
    quantity: t.quantity,
    price: t.price,
    currencyCode: t.currencyCode,
    fxRateToBase: t.fxRateToBase,
    amount: t.amount,
    commission: t.commission,
    commissionCurrency: t.commissionCurrency,
    fxFromCurrency: t.fxFromCurrency,
    fxFromAmount: t.fxFromAmount,
    fxToCurrency: t.fxToCurrency,
    fxToAmount: t.fxToAmount,
  }));
}
