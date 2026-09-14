// Lógica compartida entre los botones manuales ("Actualizar precios",
// "Obtener TRM del día") y el cron diario de Vercel, para no duplicarla.
import { prisma } from "./prisma";
import { fetchYahooQuotes } from "./yahooFinance";
import { computeFxRateFromTrm, fetchTrm } from "./trm";

export interface PriceRefreshResult {
  updated: { assetId: string; ticker: string; price: number }[];
  failed: { assetId: string; ticker: string; symbol: string; error: string }[];
}

export async function refreshPrices(): Promise<PriceRefreshResult> {
  const assets = await prisma.asset.findMany({
    select: { id: true, ticker: true, exchange: true, assetType: true, currencyCode: true },
  });
  if (assets.length === 0) return { updated: [], failed: [] };

  const quotes = await fetchYahooQuotes(assets);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const updated: PriceRefreshResult["updated"] = [];
  const failed: PriceRefreshResult["failed"] = [];

  for (const quote of quotes) {
    const asset = assets.find((a) => a.id === quote.assetId)!;
    if (quote.price == null) {
      failed.push({ assetId: asset.id, ticker: asset.ticker, symbol: quote.symbol, error: quote.error ?? "sin datos" });
      continue;
    }
    await prisma.priceSnapshot.upsert({
      where: { assetId_date: { assetId: asset.id, date: today } },
      update: { price: quote.price, source: "YAHOO" },
      create: { assetId: asset.id, date: today, price: quote.price, source: "YAHOO" },
    });
    updated.push({ assetId: asset.id, ticker: asset.ticker, price: quote.price });
  }

  return { updated, failed };
}

export type TrmRefreshResult =
  | { ok: true; trm: number; currencyCode: string }
  | { ok: false; error: string };

export async function refreshTrmToday(): Promise<TrmRefreshResult> {
  const trm = await fetchTrm();
  if (!trm) return { ok: false, error: "No se pudo obtener la TRM del día." };

  const settings = await prisma.setting.findUnique({ where: { id: 1 } });
  const baseCurrency = settings?.baseCurrency ?? "USD";

  const target = computeFxRateFromTrm(baseCurrency, trm.value);
  if (!target) {
    return {
      ok: false,
      error: `La TRM es el tipo de cambio USD/COP; con moneda base ${baseCurrency} no hay nada para actualizar.`,
    };
  }

  const currency = await prisma.currency.findUnique({ where: { code: target.currencyCode } });
  if (!currency) {
    return { ok: false, error: `Cargá la moneda ${target.currencyCode} en Monedas antes de actualizar la TRM.` };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.fxRate.upsert({
    where: { currencyCode_date: { currencyCode: target.currencyCode, date: today } },
    update: { rate: target.rate, source: "TRM" },
    create: { currencyCode: target.currencyCode, date: today, rate: target.rate, source: "TRM" },
  });

  return { ok: true, trm: trm.value, currencyCode: target.currencyCode };
}
