import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAndCreateTransaction, TransactionValidationError } from "@/lib/transactions";
import type { ProposedRow } from "@/lib/imports/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { accountId, rows } = body as { accountId?: string; rows?: ProposedRow[] };
  if (!accountId || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "accountId y rows son requeridos" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 400 });

  let created = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      await prisma.currency.upsert({
        where: { code: row.currencyCode },
        update: {},
        create: { code: row.currencyCode, name: row.currencyCode, symbol: row.currencyCode },
      });

      let assetId: string | null = null;
      if (row.ticker && (row.type === "BUY" || row.type === "SELL" || row.type === "DIVIDEND" || row.type === "FEE")) {
        const existing = await prisma.asset.findFirst({ where: { ticker: row.ticker } });
        if (existing) {
          assetId = existing.id;
        } else {
          const createdAsset = await prisma.asset.create({
            data: { ticker: row.ticker, name: row.ticker, assetType: "STOCK", currencyCode: row.currencyCode },
          });
          assetId = createdAsset.id;
        }
      }

      await resolveAndCreateTransaction({
        accountId,
        assetId,
        type: row.type,
        date: new Date(row.date),
        quantity: row.quantity,
        price: row.price,
        currencyCode: row.currencyCode,
        amount: row.amount,
        commission: row.commission,
        notes: row.notes,
      });
      created += 1;
    } catch (err) {
      const message = err instanceof TransactionValidationError ? err.message : "Error desconocido";
      errors.push(`${row.date} ${row.type} ${row.ticker ?? ""}: ${message}`);
    }
  }

  return NextResponse.json({ created, skipped: rows.length - created, errors });
}
