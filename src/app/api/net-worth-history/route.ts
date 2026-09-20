import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const snapshots = await prisma.netWorthSnapshot.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(snapshots);
}
