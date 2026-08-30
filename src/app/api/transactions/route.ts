import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TRANSACTION_TYPES } from "@/lib/enums";
import { getFxRateNear } from "@/lib/data";

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
    include: { asset: true, account: true, currency: true },
  });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    accountId,
    assetId,
    type,
    date,
    quantity,
    price,
    currencyCode,
    fxRateToBase,
    amount,
    commission,
    commissionCurrency,
    fxFromCurrency,
    fxFromAmount,
    fxToCurrency,
    fxToAmount,
    notes,
  } = body;

  if (!accountId || !type || !date || !currencyCode) {
    return NextResponse.json({ error: "accountId, type, date y currencyCode son requeridos" }, { status: 400 });
  }
  if (!TRANSACTION_TYPES.includes(type)) {
    return NextResponse.json({ error: `type inválido: ${type}` }, { status: 400 });
  }
  if ((type === "BUY" || type === "SELL") && !assetId) {
    return NextResponse.json({ error: `${type} requiere assetId` }, { status: 400 });
  }
  if ((type === "BUY" || type === "SELL") && (quantity == null || price == null)) {
    return NextResponse.json({ error: `${type} requiere quantity y price` }, { status: 400 });
  }
  if (type === "FX_CONVERT" && (!fxFromCurrency || fxFromAmount == null || !fxToCurrency || fxToAmount == null)) {
    return NextResponse.json(
      { error: "FX_CONVERT requiere fxFromCurrency, fxFromAmount, fxToCurrency y fxToAmount" },
      { status: 400 },
    );
  }

  const txDate = new Date(date);
  const resolvedFxRate = fxRateToBase ?? (await getFxRateNear(currencyCode, txDate));
  if (resolvedFxRate == null) {
    return NextResponse.json(
      { error: `No hay tipo de cambio para ${currencyCode} cerca de ${date}. Cargá uno en /fx-rates o enviá fxRateToBase.` },
      { status: 400 },
    );
  }

  const transaction = await prisma.transaction.create({
    data: {
      accountId,
      assetId: assetId || null,
      type,
      date: txDate,
      quantity: quantity ?? null,
      price: price ?? null,
      currencyCode,
      fxRateToBase: resolvedFxRate,
      amount: amount ?? null,
      commission: commission ?? 0,
      commissionCurrency: commissionCurrency || null,
      fxFromCurrency: fxFromCurrency || null,
      fxFromAmount: fxFromAmount ?? null,
      fxToCurrency: fxToCurrency || null,
      fxToAmount: fxToAmount ?? null,
      notes: notes || null,
    },
  });
  return NextResponse.json(transaction, { status: 201 });
}
