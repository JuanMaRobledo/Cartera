import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeFxRateFromTrm, fetchTrmHistory } from "@/lib/trm";

// Carga en lote el histórico de TRM entre dos fechas: una fila de FxRate por
// cada día en que la TRM cambió de valor (no un día calendario), suficiente
// para que getFxRateNear() resuelva correctamente cualquier fecha del rango
// aunque no haya una fila exacta para ese día.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { from, to } = body as { from?: string; to?: string };
  if (!from || !to) {
    return NextResponse.json({ error: "from y to (YYYY-MM-DD) son requeridos" }, { status: 400 });
  }

  const history = await fetchTrmHistory(from, to);
  if (history.length === 0) {
    return NextResponse.json({ error: "No se pudo obtener el histórico de TRM para ese rango." }, { status: 502 });
  }

  const settings = await prisma.setting.findUnique({ where: { id: 1 } });
  const baseCurrency = settings?.baseCurrency ?? "USD";

  const first = computeFxRateFromTrm(baseCurrency, history[0].value);
  if (!first) {
    return NextResponse.json(
      { error: `La TRM es el tipo de cambio USD/COP; con moneda base ${baseCurrency} no hay nada para actualizar.` },
      { status: 400 },
    );
  }

  const currency = await prisma.currency.findUnique({ where: { code: first.currencyCode } });
  if (!currency) {
    return NextResponse.json(
      { error: `Cargá la moneda ${first.currencyCode} en Monedas antes de cargar el histórico de TRM.` },
      { status: 400 },
    );
  }

  let upserted = 0;
  for (const point of history) {
    const target = computeFxRateFromTrm(baseCurrency, point.value)!;
    const date = new Date(point.validFrom.slice(0, 10));
    await prisma.fxRate.upsert({
      where: { currencyCode_date: { currencyCode: target.currencyCode, date } },
      update: { rate: target.rate, source: "TRM" },
      create: { currencyCode: target.currencyCode, date, rate: target.rate, source: "TRM" },
    });
    upserted += 1;
  }

  return NextResponse.json({ currencyCode: first.currencyCode, upserted });
}
