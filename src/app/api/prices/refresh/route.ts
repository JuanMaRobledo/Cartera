import { NextResponse } from "next/server";
import { refreshPrices, snapshotNetWorth } from "@/lib/dailyRefresh";

export async function POST() {
  const result = await refreshPrices();
  await snapshotNetWorth();
  return NextResponse.json(result);
}
