import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ASSET_TYPES } from "@/lib/enums";

export async function GET() {
  const assets = await prisma.asset.findMany({ orderBy: { ticker: "asc" }, include: { currency: true } });
  return NextResponse.json(assets);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { ticker, name, assetType, currencyCode, exchange } = body;
  if (!ticker || !name || !currencyCode) {
    return NextResponse.json({ error: "ticker, name y currencyCode son requeridos" }, { status: 400 });
  }
  if (assetType && !ASSET_TYPES.includes(assetType)) {
    return NextResponse.json({ error: `assetType inválido: ${assetType}` }, { status: 400 });
  }
  const currency = await prisma.currency.findUnique({ where: { code: currencyCode } });
  if (!currency) return NextResponse.json({ error: `Moneda desconocida: ${currencyCode}` }, { status: 400 });

  const asset = await prisma.asset.create({
    data: {
      ticker: String(ticker).toUpperCase(),
      name,
      assetType: assetType ?? "STOCK",
      currencyCode,
      exchange: exchange || null,
    },
  });
  return NextResponse.json(asset, { status: 201 });
}
