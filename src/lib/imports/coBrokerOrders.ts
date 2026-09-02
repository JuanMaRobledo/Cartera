// Parser para el historial de órdenes de apps de trading colombianas con
// columnas "Fecha y hora,Símbolo de la acción,Tipo de orden,Estado,Acciones
// completadas,Acciones pendientes,Precio por acción,Total invertido,Valor
// comisión,Total estimado". Solo importamos órdenes con Estado "Aprobado"
// (las "Cancelado" nunca se ejecutaron). No hay columna de moneda: asumimos
// COP, la moneda de la Bolsa de Valores de Colombia.
import { parseCsv } from "./csv";
import { normalizeSpanishDate } from "./dates";
import type { ProposedRow } from "./types";

const ASSUMED_CURRENCY = "COP";

function toNumber(v: string | undefined): number | null {
  if (v == null) return null;
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// "44" -> 44 ; "32/32" (todo ejecutado) o "10/26" (parcial) -> toma lo ejecutado.
function parseFilledQuantity(v: string | undefined): number | null {
  if (v == null) return null;
  const [filled] = v.trim().split("/");
  return toNumber(filled);
}

export function isCoBrokerOrders(text: string): boolean {
  const firstLine = (parseCsv(text)[0] ?? []).join(",");
  return firstLine.includes("Símbolo de la acción") && firstLine.includes("Estado") && firstLine.includes("Tipo de orden");
}

export function parseCoBrokerOrders(text: string): { rows: ProposedRow[]; warnings: string[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], warnings: ["El archivo está vacío."] };

  const header = table[0].map((h) => h.trim());
  const idx = {
    date: header.indexOf("Fecha y hora"),
    symbol: header.indexOf("Símbolo de la acción"),
    orderType: header.indexOf("Tipo de orden"),
    status: header.indexOf("Estado"),
    filled: header.indexOf("Acciones completadas"),
    price: header.indexOf("Precio por acción"),
    commission: header.indexOf("Valor comisión"),
  };
  if (Object.values(idx).some((i) => i === -1)) {
    return { rows: [], warnings: ["Faltan columnas esperadas del historial de órdenes."] };
  }

  const rows: ProposedRow[] = [];
  const warnings: string[] = [];

  table.slice(1).forEach((line, i) => {
    const rowNum = i + 2;
    const status = (line[idx.status] ?? "").trim().toLowerCase();
    if (status !== "aprobado") return; // canceladas/pendientes: nunca se ejecutaron.

    const symbol = (line[idx.symbol] ?? "").trim().toUpperCase();
    const orderType = (line[idx.orderType] ?? "").trim().toLowerCase();
    const type = orderType === "compra" ? "BUY" : orderType === "venta" ? "SELL" : null;
    if (!type) {
      warnings.push(`Fila ${rowNum}: tipo de orden "${line[idx.orderType]}" no reconocido, se omite.`);
      return;
    }

    const date = normalizeSpanishDate(line[idx.date]);
    const quantity = parseFilledQuantity(line[idx.filled]);
    const price = toNumber(line[idx.price]);
    const commission = toNumber(line[idx.commission]) ?? 0;

    if (!date || !symbol || quantity == null || quantity === 0 || price == null) {
      warnings.push(`Fila ${rowNum}: orden aprobada pero con datos incompletos (${symbol || "?"}), se omite.`);
      return;
    }

    rows.push({
      key: `co-broker-${rowNum}`,
      type,
      date,
      ticker: symbol,
      currencyCode: ASSUMED_CURRENCY,
      quantity,
      price,
      amount: null,
      commission,
      notes: "Importado de historial de órdenes",
      sourceSection: "Bróker colombiano: órdenes",
    });
  });

  return { rows, warnings };
}
