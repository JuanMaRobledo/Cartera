import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionValidationError, validateTransactionInput } from "@/lib/transactions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction) {
    return NextResponse.json({ error: "Transacción no encontrada" }, { status: 404 });
  }
  return NextResponse.json(transaction);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  if (!accountId || !type || !date || !currencyCode || fxRateToBase == null) {
    return NextResponse.json(
      { error: "accountId, type, date, currencyCode y fxRateToBase son requeridos" },
      { status: 400 },
    );
  }

  try {
    validateTransactionInput({
      assetId,
      type,
      quantity,
      price,
      fxFromCurrency,
      fxFromAmount,
      fxToCurrency,
      fxToAmount,
    });
    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        accountId,
        assetId: assetId || null,
        type,
        date: new Date(date),
        quantity: quantity ?? null,
        price: price ?? null,
        currencyCode,
        fxRateToBase: Number(fxRateToBase),
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
    return NextResponse.json(transaction);
  } catch (err) {
    if (err instanceof TransactionValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
