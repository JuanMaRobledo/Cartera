import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const prices = await prisma.priceSnapshot.findMany({ orderBy: { date: "desc" }, include: { asset: true } });
  return NextResponse.json(prices);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { assetId, date, price, source } = body;
  if (!assetId || !date || price == null) {
    return NextResponse.json({ error: "assetId, date y price son requeridos" }, { status: 400 });
  }
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return NextResponse.json({ error: "Activo no encontrado" }, { status: 400 });

  const snapshot = await prisma.priceSnapshot.upsert({
    where: { assetId_date: { assetId, date: new Date(date) } },
    update: { price, source: source ?? "MANUAL" },
    create: { assetId, date: new Date(date), price, source: source ?? "MANUAL" },
  });
  return NextResponse.json(snapshot, { status: 201 });
}
