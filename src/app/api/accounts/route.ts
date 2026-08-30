import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_KINDS } from "@/lib/enums";

export async function GET() {
  const accounts = await prisma.account.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, broker, kind } = body;
  if (!name) return NextResponse.json({ error: "name es requerido" }, { status: 400 });
  if (kind && !ACCOUNT_KINDS.includes(kind)) {
    return NextResponse.json({ error: `kind inválido: ${kind}` }, { status: 400 });
  }
  const account = await prisma.account.create({ data: { name, broker, kind: kind ?? "BROKERAGE" } });
  return NextResponse.json(account, { status: 201 });
}
