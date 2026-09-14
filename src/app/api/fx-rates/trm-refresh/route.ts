import { NextResponse } from "next/server";
import { refreshTrmToday } from "@/lib/dailyRefresh";

export async function POST() {
  const result = await refreshTrmToday();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ trm: result.trm, currencyCode: result.currencyCode });
}
