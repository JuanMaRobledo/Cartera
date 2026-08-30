import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rates = await prisma.fxRate.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(rates);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { currencyCode, date, rate, source } = body;
  if (!currencyCode || !date || rate == null) {
    return NextResponse.json({ error: "currencyCode, date y rate son requeridos" }, { status: 400 });
  }
  const currency = await prisma.currency.findUnique({ where: { code: currencyCode } });
  if (!currency) return NextResponse.json({ error: `Moneda desconocida: ${currencyCode}` }, { status: 400 });

  const fxRate = await prisma.fxRate.upsert({
    where: { currencyCode_date: { currencyCode, date: new Date(date) } },
    update: { rate, source: source ?? "MANUAL" },
    create: { currencyCode, date: new Date(date), rate, source: source ?? "MANUAL" },
  });
  return NextResponse.json(fxRate, { status: 201 });
}
