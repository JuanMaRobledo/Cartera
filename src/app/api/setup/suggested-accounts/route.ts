import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SUGGESTED_ACCOUNTS, SUGGESTED_CURRENCIES } from "@/lib/suggestedSetup";

// Crea las monedas y cuentas sugeridas para la cartera (IBKR, Hapi, Binance,
// Trii Colombia, Fiducuenta) si todavía no existen. No pisa ni duplica nada:
// las monedas se upsertean por código y las cuentas se saltean si ya hay una
// con el mismo nombre (sin importar mayúsculas/minúsculas).
export async function POST() {
  for (const currency of SUGGESTED_CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
  }

  const existing = await prisma.account.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map((a) => a.name.trim().toLowerCase()));

  const created: string[] = [];
  const skipped: string[] = [];
  for (const account of SUGGESTED_ACCOUNTS) {
    if (existingNames.has(account.name.toLowerCase())) {
      skipped.push(account.name);
      continue;
    }
    await prisma.account.create({
      data: { name: account.name, broker: account.broker, kind: account.kind },
    });
    created.push(account.name);
  }

  return NextResponse.json({ created, skipped, currencies: SUGGESTED_CURRENCIES.map((c) => c.code) });
}
