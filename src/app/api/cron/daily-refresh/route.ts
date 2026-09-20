import { NextResponse } from "next/server";
import { refreshPrices, refreshTrmToday, snapshotNetWorth } from "@/lib/dailyRefresh";

// Vercel invoca esta ruta según el horario de vercel.json, con
// "Authorization: Bearer $CRON_SECRET" — hay que definir CRON_SECRET como
// variable de entorno en Vercel para que este chequeo tenga sentido; sin
// ella, cualquiera podría disparar la actualización llamando a la URL.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const [prices, trm] = await Promise.all([refreshPrices(), refreshTrmToday()]);
  // Corre después, no en paralelo: necesita los precios/TRM ya actualizados
  // arriba para que la foto del patrimonio neto de hoy sea correcta.
  const netWorth = await snapshotNetWorth();
  return NextResponse.json({ prices, trm, netWorth });
}
