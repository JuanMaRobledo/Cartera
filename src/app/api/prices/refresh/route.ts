import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchYahooQuotes } from "@/lib/yahooFinance";

export async function POST() {
  const assets = await prisma.asset.findMany({
    select: { id: true, ticker: true, exchange: true, assetType: true, currencyCode: true },
  });
  if (assets.length === 0) {
    return NextResponse.json({ updated: [], failed: [] });
  }

  const quotes = await fetchYahooQuotes(assets);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const updated: { assetId: string; ticker: string; price: number }[] = [];
  const failed: { assetId: string; ticker: string; symbol: string; error: string }[] = [];

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

  return NextResponse.json({ updated, failed });
}
