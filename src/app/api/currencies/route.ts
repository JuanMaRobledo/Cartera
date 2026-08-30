import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const currencies = await prisma.currency.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(currencies);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { code, name, symbol } = body;
  if (!code || !name || !symbol) {
    return NextResponse.json({ error: "code, name y symbol son requeridos" }, { status: 400 });
  }
  const currency = await prisma.currency.upsert({
    where: { code: String(code).toUpperCase() },
    update: { name, symbol },
    create: { code: String(code).toUpperCase(), name, symbol },
  });
  return NextResponse.json(currency, { status: 201 });
}
