import { NextResponse } from "next/server";
import { refreshPrices, refreshTrmToday, snapshotNetWorth } from "@/lib/dailyRefresh";

export async function POST() {
  const [result, trm] = await Promise.all([refreshPrices(), refreshTrmToday()]);
  await snapshotNetWorth();
  return NextResponse.json({ ...result, trm });
}
