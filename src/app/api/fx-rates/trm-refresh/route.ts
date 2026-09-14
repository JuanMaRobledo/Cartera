import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeFxRateFromTrm, fetchTrm } from "@/lib/trm";

export async function POST() {
  const trm = await fetchTrm();
  if (!trm) {
    return NextResponse.json({ error: "No se pudo obtener la TRM del día." }, { status: 502 });
  }

  const settings = await prisma.setting.findUnique({ where: { id: 1 } });
  const baseCurrency = settings?.baseCurrency ?? "USD";

  const target = computeFxRateFromTrm(baseCurrency, trm.value);
  if (!target) {
    return NextResponse.json(
      { error: `La TRM es el tipo de cambio USD/COP; con moneda base ${baseCurrency} no hay nada para actualizar.` },
      { status: 400 },
    );
  }

  const currency = await prisma.currency.findUnique({ where: { code: target.currencyCode } });
  if (!currency) {
    return NextResponse.json(
      { error: `Cargá la moneda ${target.currencyCode} en Monedas antes de actualizar la TRM.` },
      { status: 400 },
    );
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const fxRate = await prisma.fxRate.upsert({
    where: { currencyCode_date: { currencyCode: target.currencyCode, date: today } },
    update: { rate: target.rate, source: "TRM" },
    create: { currencyCode: target.currencyCode, date: today, rate: target.rate, source: "TRM" },
  });

  return NextResponse.json({ trm: trm.value, fxRate });
}
