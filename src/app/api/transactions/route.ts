import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAndCreateTransaction, TransactionValidationError } from "@/lib/transactions";

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

  try {
    const transaction = await resolveAndCreateTransaction({
      accountId,
      assetId,
      type,
      date: new Date(date),
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
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    if (err instanceof TransactionValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
