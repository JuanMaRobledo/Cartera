import { renderToBuffer } from "@react-pdf/renderer";
import {
  getAssetsMap,
  getBaseCurrency,
  getLatestFxRates,
  getLatestQuotes,
  getRawTransactions,
} from "@/lib/data";
import { computeCashBalances, computePortfolioSummary, computePositions } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { PortfolioReport } from "@/lib/pdf/PortfolioReport";

export async function GET(request: Request) {
  const accountId = new URL(request.url).searchParams.get("accountId") ?? undefined;
  const [baseCurrency, transactions, assets, quotes, fxRates, account] = await Promise.all([
    getBaseCurrency(),
    getRawTransactions(accountId),
    getAssetsMap(),
    getLatestQuotes(),
    getLatestFxRates(),
    accountId ? prisma.account.findUnique({ where: { id: accountId } }) : null,
  ]);

  const positions = computePositions(transactions, assets, quotes, fxRates);
  const cashBalances = computeCashBalances(transactions, fxRates);
  const summary = computePortfolioSummary(positions, cashBalances);

  const buffer = await renderToBuffer(
    PortfolioReport({ baseCurrency, accountName: account?.name ?? null, positions, summary }),
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cartera-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
