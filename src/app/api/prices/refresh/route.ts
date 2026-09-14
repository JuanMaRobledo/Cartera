import { NextResponse } from "next/server";
import { refreshPrices } from "@/lib/dailyRefresh";

export async function POST() {
  const result = await refreshPrices();
  return NextResponse.json(result);
}
