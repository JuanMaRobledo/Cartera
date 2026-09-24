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
  const searchParams = new URL(request.url).searchParams;
  const accountIds = (searchParams.get("accountIds") ?? searchParams.get("accountId") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const [baseCurrency, transactions, assets, quotes, fxRates, latestTrm] = await Promise.all([
    getBaseCurrency(),
    getRawTransactions(accountIds),
    getAssetsMap(),
    getLatestQuotes(),
    getLatestFxRates(),
    getLatestTrm(),
  ]);

  const positions = computePositions(transactions, assets, quotes, fxRates, latestTrm?.value ?? null);
  const cashBalances = computeCashBalances(transactions, fxRates);
  const summary = computePortfolioSummary(positions, cashBalances);

  return NextResponse.json({
    baseCurrency,
    currentTrmToCop: latestTrm?.value ?? null,
    positions,
    cashBalances,
    summary,
  });
}
