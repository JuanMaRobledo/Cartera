import { NextResponse } from "next/server";
import {
  getAssetsMap,
  getBaseCurrency,
  getLatestFxRates,
  getLatestQuotes,
  getRawTransactions,
} from "@/lib/data";
import { computeCashBalances, computePortfolioSummary, computePositions } from "@/lib/portfolio";

export async function GET() {
  const [baseCurrency, transactions, assets, quotes, fxRates] = await Promise.all([
    getBaseCurrency(),
    getRawTransactions(),
    getAssetsMap(),
    getLatestQuotes(),
    getLatestFxRates(),
  ]);

  const positions = computePositions(transactions, assets, quotes, fxRates);
  const cashBalances = computeCashBalances(transactions, fxRates);
  const summary = computePortfolioSummary(positions, cashBalances);

  return NextResponse.json({ baseCurrency, positions, cashBalances, summary });
}
