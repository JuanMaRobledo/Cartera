import { NextResponse } from "next/server";
import {
  getAssetsMap,
  getBaseCurrency,
  getLatestFxRates,
  getLatestQuotes,
  getLatestTrm,
  getRawTransactions,
} from "@/lib/data";
import { computeCashBalances, computePortfolioSummary, computePositions } from "@/lib/portfolio";

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get("accountId") ?? undefined;
  const [baseCurrency, transactions, assets, quotes, fxRates, latestTrm] = await Promise.all([
    getBaseCurrency(),
    getRawTransactions(accountId),
    getAssetsMap(),
    getLatestQuotes(),
    getLatestFxRates(),
    getLatestTrm(),
  ]);

  const positions = computePositions(transactions, assets, quotes, fxRates, latestTrm?.value ?? null);
  const cashBalances = computeCashBalances(transactions, fxRates);
  const summary = computePortfolioSummary(positions, cashBalances);

  return NextResponse.json({ baseCurrency, positions, cashBalances, summary });
}
