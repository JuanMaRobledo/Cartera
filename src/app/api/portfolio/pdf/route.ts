import { renderToBuffer } from "@react-pdf/renderer";
import {
  getAssetsMap,
  getBaseCurrency,
  getLatestFxRates,
  getLatestQuotes,
  getLatestTrm,
  getRawTransactions,
} from "@/lib/data";
import { computeCashBalances, computePortfolioSummary, computePositions } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { PortfolioReport } from "@/lib/pdf/PortfolioReport";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const accountIds = (searchParams.get("accountIds") ?? searchParams.get("accountId") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const [baseCurrency, transactions, assets, quotes, fxRates, latestTrm, accounts] = await Promise.all([
    getBaseCurrency(),
    getRawTransactions(accountIds),
    getAssetsMap(),
    getLatestQuotes(),
    getLatestFxRates(),
    getLatestTrm(),
    accountIds.length > 0 ? prisma.account.findMany({ where: { id: { in: accountIds } } }) : [],
  ]);

  const positions = computePositions(transactions, assets, quotes, fxRates, latestTrm?.value ?? null);
  const cashBalances = computeCashBalances(transactions, fxRates);
  const summary = computePortfolioSummary(positions, cashBalances);

  const buffer = await renderToBuffer(
    PortfolioReport({
      baseCurrency,
      accountName: accounts.length > 0 ? accounts.map((account) => account.name).join(", ") : null,
      positions,
      summary,
    }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cartera-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
