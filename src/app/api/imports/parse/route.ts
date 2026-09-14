import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAssetsMap, getFxRateNear } from "@/lib/data";
import { detectAndParse, type ImportFormatOption } from "@/lib/imports";
import { buildExistingSignatures, transactionSignature } from "@/lib/imports/duplicates";

export async function POST(request: Request) {
  const body = await request.json();
  const { csv, format, accountId } = body as { csv?: string; format?: ImportFormatOption; accountId?: string };
  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "Falta el contenido del archivo (csv)" }, { status: 400 });
  }

  const parsed = detectAndParse(csv, format);
  if (parsed.rows.length === 0) {
    return NextResponse.json(
      { format: parsed.format, rows: [], warnings: parsed.warnings.length ? parsed.warnings : ["No se encontraron transacciones para importar."] },
      { status: 200 },
    );
  }

  const [assets, currencyRows, existingTx] = await Promise.all([
    getAssetsMap(),
    prisma.currency.findMany({ select: { code: true } }),
    accountId
      ? prisma.transaction.findMany({ where: { accountId }, include: { asset: true } })
      : Promise.resolve([]),
  ]);
  const assetsByTicker = new Map([...assets.values()].map((a) => [a.ticker.toUpperCase(), a]));
  const currencyCodes = new Set(currencyRows.map((c) => c.code));
  const existingSignatures = buildExistingSignatures(
    existingTx.map((t) => ({ type: t.type, date: t.date, quantity: t.quantity, price: t.price, amount: t.amount, ticker: t.asset?.ticker ?? null })),
  );

  const rows = await Promise.all(
    parsed.rows.map(async (row) => {
      const existingAsset = row.ticker ? assetsByTicker.get(row.ticker) : undefined;
      const currencyKnown = currencyCodes.has(row.currencyCode);
      const validDate = !Number.isNaN(new Date(row.date).getTime());
      const fxRateToBase = currencyKnown && validDate ? await getFxRateNear(row.currencyCode, new Date(row.date)) : null;
      const currencyMismatch = !!existingAsset && existingAsset.currencyCode !== row.currencyCode;
      const duplicate =
        accountId != null &&
        existingSignatures.has(
          transactionSignature({
            type: row.type,
            ticker: row.ticker,
            date: row.date,
            quantity: row.quantity,
            price: row.price,
            amount: row.amount,
          }),
        );

      let reason: string | null = null;
      if (!validDate) reason = "Fecha inválida";
      else if (currencyMismatch) reason = `${row.ticker} ya existe en ${existingAsset!.currencyCode}, no en ${row.currencyCode}`;
      else if (fxRateToBase == null) reason = `Sin tipo de cambio para ${row.currencyCode} cerca de esa fecha`;

      return {
        ...row,
        assetKnown: !!existingAsset,
        currencyKnown,
        currencyMismatch,
        fxRateToBase,
        ready: reason == null,
        reason,
        duplicate,
      };
    }),
  );

  return NextResponse.json({ format: parsed.format, rows, warnings: parsed.warnings });
}
