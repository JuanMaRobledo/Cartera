import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAssetsMap, getFxRateNear } from "@/lib/data";
import { detectAndParse, type ImportFormatOption } from "@/lib/imports";

export async function POST(request: Request) {
  const body = await request.json();
  const { csv, format } = body as { csv?: string; format?: ImportFormatOption };
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

  const [assets, currencyRows] = await Promise.all([
    getAssetsMap(),
    prisma.currency.findMany({ select: { code: true } }),
  ]);
  const assetsByTicker = new Map([...assets.values()].map((a) => [a.ticker.toUpperCase(), a]));
  const currencyCodes = new Set(currencyRows.map((c) => c.code));

  const rows = await Promise.all(
    parsed.rows.map(async (row) => {
      const existingAsset = row.ticker ? assetsByTicker.get(row.ticker) : undefined;
      const currencyKnown = currencyCodes.has(row.currencyCode);
      const validDate = !Number.isNaN(new Date(row.date).getTime());
      const fxRateToBase = currencyKnown && validDate ? await getFxRateNear(row.currencyCode, new Date(row.date)) : null;
      const currencyMismatch = !!existingAsset && existingAsset.currencyCode !== row.currencyCode;

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
      };
    }),
  );

  return NextResponse.json({ format: parsed.format, rows, warnings: parsed.warnings });
}
