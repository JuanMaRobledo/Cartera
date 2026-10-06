import { NextResponse, type NextRequest } from "next/server";
import { isValidExportToken, isValidSession, SESSION_COOKIE } from "@/lib/auth";
import {
  getAssetsMap,
  getBaseCurrency,
  getLatestFxRates,
  getLatestQuotes,
  getLatestTrm,
  getRawTransactions,
} from "@/lib/data";
import { computeCashBalances, computePortfolioSummary, computePositions } from "@/lib/portfolio";
import {
  EXPORT_VERSION,
  exportPositions,
  isoDate,
  positionsCsv,
  transactionsCsv,
  type PortfolioExport,
} from "@/lib/portfolioExport";
import { prisma } from "@/lib/prisma";

// Exportación de solo lectura de toda la cartera. Esta ruta está fuera del
// matcher de src/proxy.ts para aceptar, además de la sesión normal,
// "Authorization: Bearer $EXPORT_TOKEN" desde scripts; por eso valida aquí
// las dos formas de acceso.
function authorize(request: NextRequest): NextResponse | null {
  if (isValidExportToken(request.headers.get("authorization"))) return null;
  if (process.env.NODE_ENV === "production" && !process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "El acceso privado no está configurado" }, { status: 503 });
  }
  if (isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return null;
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

async function buildExport(): Promise<PortfolioExport> {
  const [baseCurrency, transactions, assets, quotes, fxRates, latestTrm, accounts, assetRows, ledger] =
    await Promise.all([
      getBaseCurrency(),
      getRawTransactions(),
      getAssetsMap(),
      getLatestQuotes(),
      getLatestFxRates(),
      getLatestTrm(),
      prisma.account.findMany({ orderBy: { name: "asc" } }),
      prisma.asset.findMany({ orderBy: { ticker: "asc" } }),
      prisma.transaction.findMany({
        orderBy: [{ date: "asc" }, { id: "asc" }],
        include: { account: { select: { name: true } }, asset: { select: { ticker: true } } },
      }),
    ]);
  const trm = latestTrm?.value ?? null;

  const positions = computePositions(transactions, assets, quotes, fxRates, trm);
  const cashBalances = computeCashBalances(transactions, fxRates);
  const { open, closed } = exportPositions(positions, transactions);

  const byAccount = accounts.map((account) => {
    const accountTxs = transactions.filter((t) => t.accountId === account.id);
    const accountPositions = computePositions(accountTxs, assets, quotes, fxRates, trm);
    return {
      accountId: account.id,
      accountName: account.name,
      positions: exportPositions(accountPositions, accountTxs).open,
      cashBalances: computeCashBalances(accountTxs, fxRates),
    };
  });

  return {
    version: EXPORT_VERSION,
    generatedAt: new Date().toISOString(),
    baseCurrency,
    currentTrmToCop: trm,
    fxRates: Object.fromEntries([...fxRates.entries()].sort(([a], [b]) => a.localeCompare(b))),
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, broker: a.broker, kind: a.kind })),
    assets: assetRows.map((a) => ({
      id: a.id,
      ticker: a.ticker,
      name: a.name,
      assetType: a.assetType,
      currencyCode: a.currencyCode,
      exchange: a.exchange,
      lastPrice: quotes.get(a.id)?.price ?? null,
      lastPriceDate: isoDate(quotes.get(a.id)?.date),
    })),
    positions: open,
    closedPositions: closed,
    byAccount,
    cashBalances,
    summary: computePortfolioSummary(positions, cashBalances),
    transactions: ledger.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      accountId: t.accountId,
      accountName: t.account?.name ?? null,
      assetId: t.assetId,
      ticker: t.asset?.ticker ?? null,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      amount: t.amount,
      currencyCode: t.currencyCode,
      fxRateToBase: t.fxRateToBase,
      commission: t.commission,
      commissionCurrency: t.commissionCurrency,
      fxFromCurrency: t.fxFromCurrency,
      fxFromAmount: t.fxFromAmount,
      fxToCurrency: t.fxToCurrency,
      fxToAmount: t.fxToAmount,
      notes: t.notes,
    })),
  };
}

/**
 * GET /api/export                          → JSON completo
 * GET /api/export?format=csv&table=positions     → posiciones abiertas (total y por cuenta)
 * GET /api/export?format=csv&table=transactions  → todas las transacciones
 * Con ?download=1 se responde como archivo adjunto.
 */
export async function GET(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const format = params.get("format") ?? "json";
  const table = params.get("table") ?? "positions";
  if (format !== "json" && format !== "csv") {
    return NextResponse.json({ error: "format debe ser json o csv" }, { status: 400 });
  }
  if (format === "csv" && table !== "positions" && table !== "transactions") {
    return NextResponse.json({ error: "table debe ser positions o transactions" }, { status: 400 });
  }

  const data = await buildExport();
  const day = data.generatedAt.slice(0, 10);
  const attachment = params.get("download") === "1";
  const headers: Record<string, string> = { "Cache-Control": "no-store" };

  if (format === "csv") {
    const csv = table === "positions" ? positionsCsv(data) : transactionsCsv(data);
    const name = table === "positions" ? "posiciones" : "transacciones";
    headers["Content-Type"] = "text/csv; charset=utf-8";
    if (attachment) headers["Content-Disposition"] = `attachment; filename="cartera-${name}-${day}.csv"`;
    return new Response("﻿" + csv, { headers });
  }

  if (attachment) headers["Content-Disposition"] = `attachment; filename="cartera-completa-${day}.json"`;
  return NextResponse.json(data, { headers });
}
