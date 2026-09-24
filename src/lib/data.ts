import { prisma } from "./prisma";
import type { AssetInfo, LatestQuote, RawTransaction } from "./portfolio";
import { resolveTrmNear, type TrmPoint } from "./trm";

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

/** Histórico normalizado como TRM directa: 1 USD = N COP. */
export async function getTrmHistory(): Promise<TrmPoint[]> {
  const baseCurrency = await getBaseCurrency();
  if (baseCurrency !== "USD" && baseCurrency !== "COP") return [];

  const currencyCode = baseCurrency === "USD" ? "COP" : "USD";
  const rates = await prisma.fxRate.findMany({
    where: { currencyCode },
    orderBy: { date: "asc" },
  });

  return rates
    .map((rate) => ({
      date: rate.date,
      value: baseCurrency === "USD" ? 1 / rate.rate : rate.rate,
    }))
    .filter((point) => Number.isFinite(point.value) && point.value > 0);
}

export async function getLatestTrm(): Promise<TrmPoint | null> {
  const history = await getTrmHistory();
  const value = resolveTrmNear(history, new Date());
  if (value == null) return null;
  return { date: history.at(-1)?.date ?? new Date(), value };
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

export async function getRawTransactions(accountIds?: string | string[]): Promise<RawTransaction[]> {
  const selectedAccountIds = Array.isArray(accountIds) ? accountIds.filter(Boolean) : accountIds ? [accountIds] : [];
  const [txs, trmHistory] = await Promise.all([
    prisma.transaction.findMany({
      where: selectedAccountIds.length > 0 ? { accountId: { in: selectedAccountIds } } : undefined,
      orderBy: { date: "asc" },
    }),
    getTrmHistory(),
  ]);
  return txs.map((t) => ({
    id: t.id,
    accountId: t.accountId,
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
    trmToCop:
      t.currencyCode === "USD" || t.currencyCode === "COP"
        ? resolveTrmNear(trmHistory, t.date)
        : null,
  }));
}
