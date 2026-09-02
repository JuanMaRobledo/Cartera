// Parser del reporte "Transaction History" de Interactive Brokers (Reportes
// → Historial de transacciones). A diferencia del "Activity Statement", trae
// una única tabla y la columna "Transaction Type" usa un vocabulario fijo en
// inglés (Dividend, Foreign Tax Withholding, Other Fee, Buy, Sell…) sin
// importar el idioma configurado en la cuenta — por eso es más confiable
// para importar que el Activity Statement, cuyos nombres de sección sí se
// traducen.
import { parseCsv } from "./csv";
import type { ProposedRow } from "./types";
import type { TransactionType } from "../enums";

function get(fieldMap: Record<string, string>, ...names: string[]): string | undefined {
  for (const name of names) {
    for (const key of Object.keys(fieldMap)) {
      if (key.toLowerCase() === name.toLowerCase()) return fieldMap[key];
    }
  }
  return undefined;
}

function toNumber(v: string | undefined): number | null {
  if (v == null) return null;
  const trimmed = v.trim();
  if (trimmed === "" || trimmed === "-") return null;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function isIbkrTransactionHistory(text: string): boolean {
  return /^Transaction History,Header,/m.test(text);
}

function findBaseCurrency(table: string[][]): string {
  for (const line of table) {
    if (line[0]?.trim() === "Summary" && line[1]?.trim() === "Data") {
      const label = (line[2] ?? "").toLowerCase();
      if (label.includes("divisa base") || label.includes("base currency")) {
        return (line[3] ?? "USD").trim().toUpperCase();
      }
    }
  }
  return "USD";
}

interface TypeMapping {
  type: TransactionType;
  isTrade?: boolean;
  signDependent?: { positive: TransactionType; negative: TransactionType };
}

const EXACT_TYPE_MAP: Record<string, TypeMapping> = {
  buy: { type: "BUY", isTrade: true },
  sell: { type: "SELL", isTrade: true },
  dividend: { type: "DIVIDEND" },
  "payment in lieu": { type: "DIVIDEND" },
  "payment in lieu of dividend": { type: "DIVIDEND" },
  "foreign tax withholding": { type: "FEE" },
  "withholding tax": { type: "FEE" },
  "other fee": { type: "FEE" },
  fee: { type: "FEE" },
  "commission adjustment": { type: "FEE" },
  deposit: { type: "DEPOSIT" },
  "cash deposit": { type: "DEPOSIT" },
  withdrawal: { type: "WITHDRAWAL" },
  "cash withdrawal": { type: "WITHDRAWAL" },
  "electronic fund transfer": { type: "DEPOSIT", signDependent: { positive: "DEPOSIT", negative: "WITHDRAWAL" } },
  "broker interest received": { type: "INTEREST" },
  "credit interest": { type: "INTEREST" },
  "broker interest paid": { type: "FEE" },
  "debit interest": { type: "FEE" },
};

// Las filas que no son operaciones no traen columna de moneda propia; IBKR
// suele mencionar la moneda del monto por acción en la descripción, siempre
// como "XXX <número>" (ej. "USD 0.579193 por acción", "USD Interés deudor").
// Si no encontramos ese patrón, asumimos la divisa base de la cuenta.
function currencyFromDescription(description: string, fallback: string): string {
  const match = description.match(/\b([A-Z]{3})\s+\d/);
  return match ? match[1] : fallback;
}

function classifyType(raw: string, netAmount: number): TypeMapping | null {
  const normalized = raw.trim().toLowerCase();
  if (EXACT_TYPE_MAP[normalized]) return EXACT_TYPE_MAP[normalized];

  if (normalized.includes("dividend") || normalized.includes("in lieu")) return { type: "DIVIDEND" };
  if (normalized.includes("interest")) {
    return { type: netAmount >= 0 ? "INTEREST" : "FEE" };
  }
  if (normalized.includes("fee") || normalized.includes("tax") || normalized.includes("commission")) {
    return { type: "FEE" };
  }
  if (normalized.includes("transfer") || normalized.includes("deposit") || normalized.includes("withdrawal")) {
    return { type: netAmount >= 0 ? "DEPOSIT" : "WITHDRAWAL" };
  }
  if (normalized.includes("buy")) return { type: "BUY", isTrade: true };
  if (normalized.includes("sell")) return { type: "SELL", isTrade: true };
  return null;
}

export function parseIbkrTransactionHistory(text: string): { rows: ProposedRow[]; warnings: string[] } {
  const table = parseCsv(text);
  const baseCurrency = findBaseCurrency(table);
  const rows: ProposedRow[] = [];
  const warnings: string[] = [];
  let headers: string[] | null = null;
  let index = 0;

  for (const line of table) {
    if (line[0]?.trim() !== "Transaction History") continue;
    const kind = line[1]?.trim();
    if (kind === "Header") {
      headers = line.slice(2).map((h) => h.trim());
      continue;
    }
    if (kind !== "Data" || !headers) continue;

    const values = line.slice(2);
    const fieldMap: Record<string, string> = {};
    headers.forEach((h, i) => (fieldMap[h] = values[i] ?? ""));

    index += 1;
    const rawType = get(fieldMap, "Transaction Type") ?? "";
    const netAmount = toNumber(get(fieldMap, "Net Amount"));
    const grossAmount = toNumber(get(fieldMap, "Gross Amount"));
    const commission = Math.abs(toNumber(get(fieldMap, "Commission")) ?? 0);
    const date = (get(fieldMap, "Date") ?? "").trim().split(/[,;]/)[0].trim();
    const ticker = (get(fieldMap, "Symbol") ?? "").trim().toUpperCase();
    const description = get(fieldMap, "Description") ?? "";
    const amount = netAmount ?? grossAmount;

    if (!date || amount == null) {
      warnings.push(`Transaction History: fila ${index} incompleta, se omite.`);
      continue;
    }

    const mapping = classifyType(rawType, amount);
    if (!mapping) {
      warnings.push(`Transaction History: tipo "${rawType}" (fila ${index}) no reconocido todavía, se omite.`);
      continue;
    }

    const key = `ibkr-th-${index}`;

    if (mapping.isTrade) {
      const quantity = toNumber(get(fieldMap, "Quantity"));
      const price = toNumber(get(fieldMap, "Price"));
      const priceCurrency = (get(fieldMap, "Price Currency") ?? baseCurrency).trim().toUpperCase();
      if (quantity == null || price == null || !ticker) {
        warnings.push(`Transaction History: operación en fila ${index} incompleta, se omite.`);
        continue;
      }
      rows.push({
        key,
        type: mapping.type,
        date,
        ticker,
        currencyCode: priceCurrency,
        quantity: Math.abs(quantity),
        price,
        amount: null,
        commission,
        notes: description || "Importado de IBKR (Transaction History)",
        sourceSection: "IBKR: Historial de transacciones",
      });
      continue;
    }

    const finalType = mapping.signDependent
      ? amount >= 0
        ? mapping.signDependent.positive
        : mapping.signDependent.negative
      : mapping.type;

    const isAssetLinked = finalType === "DIVIDEND" || finalType === "FEE";
    // Los dividendos pueden traer reversiones/correcciones en negativo (ej.
    // "Payment in Lieu" pagado de más y corregido al día siguiente); ahí
    // preservamos el signo para que se resten. El resto de los tipos usa la
    // convención de nuestro motor (monto siempre positivo, con el signo ya
    // reflejado en el tipo de transacción elegido más arriba).
    rows.push({
      key,
      type: finalType,
      date,
      ticker: isAssetLinked && ticker ? ticker : null,
      currencyCode: currencyFromDescription(description, baseCurrency),
      quantity: null,
      price: null,
      amount: finalType === "DIVIDEND" ? amount : Math.abs(amount),
      commission: 0,
      notes: description || `Importado de IBKR (${rawType})`,
      sourceSection: "IBKR: Historial de transacciones",
    });
  }

  return { rows, warnings };
}
