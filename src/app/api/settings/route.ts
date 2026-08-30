import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const setting = await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, baseCurrency: "USD" },
  });
  return NextResponse.json(setting);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { baseCurrency } = body;
  if (!baseCurrency) return NextResponse.json({ error: "baseCurrency es requerido" }, { status: 400 });
  const currency = await prisma.currency.findUnique({ where: { code: baseCurrency } });
  if (!currency) return NextResponse.json({ error: `Moneda desconocida: ${baseCurrency}` }, { status: 400 });

  const setting = await prisma.setting.upsert({
    where: { id: 1 },
    update: { baseCurrency },
    create: { id: 1, baseCurrency },
  });
  return NextResponse.json(setting);
}
