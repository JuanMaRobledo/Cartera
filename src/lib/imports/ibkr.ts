// Parser del "Activity Statement" de Interactive Brokers exportado como CSV.
// Ese archivo trae varias secciones concatenadas (Trades, Dividends,
// Deposits & Withdrawals, Interest, Fees…), cada una con su propia fila de
// encabezado ("Header") seguida de filas de datos ("Data"). Leemos los
// nombres de columna desde el propio archivo en lugar de asumir posiciones
// fijas, porque IBKR permite configurar qué columnas incluye cada sección
// (Flex Queries).
import { parseCsv } from "./csv";
import type { ProposedRow } from "./types";

const RECOGNIZED_SECTIONS = [
  "Trades",
  "Dividends",
  "Withholding Tax",
  "Deposits & Withdrawals",
  "Interest",
  "Fees",
  "Other Fees",
];

function get(fieldMap: Record<string, string>, ...names: string[]): string | undefined {
  for (const name of names) {
    for (const key of Object.keys(fieldMap)) {
      if (key.toLowerCase() === name.toLowerCase()) return fieldMap[key];
    }
  }
  return undefined;
}

function toNumber(v: string | undefined): number | null {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw: string | undefined): string {
  if (!raw) return "";
  const datePart = raw.trim().split(/[,;]/)[0].trim();
  if (/^\d{8}$/.test(datePart)) {
    return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
  }
  return datePart;
}

function extractTickerFromDescription(desc: string | undefined): string | null {
  if (!desc) return null;
  const m = desc.match(/^([A-Z][A-Z0-9.]{0,9})\s*\(/);
  return m ? m[1] : null;
}

export function isIbkrActivityStatement(text: string): boolean {
  return new RegExp(`^(${RECOGNIZED_SECTIONS.join("|")}),Header,`, "m").test(text);
}

export function parseIbkrStatement(text: string): { rows: ProposedRow[]; warnings: string[] } {
  const table = parseCsv(text);
  const headersBySection = new Map<string, string[]>();
  const rows: ProposedRow[] = [];
  const warnings: string[] = [];
  let index = 0;

  for (const line of table) {
    if (line.length < 2) continue;
    const section = line[0]?.trim();
    const kind = line[1]?.trim();
    if (!section || !RECOGNIZED_SECTIONS.includes(section)) continue;

    if (kind === "Header") {
      headersBySection.set(section, line.slice(2).map((h) => h.trim()));
      continue;
    }
    if (kind !== "Data") continue;

    const headers = headersBySection.get(section);
    if (!headers) continue;
    const values = line.slice(2);
    const fieldMap: Record<string, string> = {};
    headers.forEach((h, i) => (fieldMap[h] = values[i] ?? ""));

    index += 1;
    const currencyCode = (get(fieldMap, "Currency") ?? "").toUpperCase().trim();
    if (!currencyCode || currencyCode === "BASE" || currencyCode === "BASE_SUMMARY") continue;

    const key = `ibkr-${index}`;

    if (section === "Trades") {
      const rawQty = toNumber(get(fieldMap, "Quantity"));
      const price = toNumber(get(fieldMap, "T. Price", "TradePrice", "Price"));
      const commission = Math.abs(toNumber(get(fieldMap, "Comm/Fee", "Commission", "Comm in USD")) ?? 0);
      const date = normalizeDate(get(fieldMap, "Date/Time", "Trade Date", "Date"));
      const ticker = (get(fieldMap, "Symbol") ?? "").toUpperCase().trim();
      if (rawQty == null || price == null || !ticker || !date) {
        warnings.push(`Trades: fila ${index} incompleta, se omite.`);
        continue;
      }
      rows.push({
        key,
        type: rawQty >= 0 ? "BUY" : "SELL",
        date,
        ticker,
        currencyCode,
        quantity: Math.abs(rawQty),
        price,
        amount: null,
        commission,
        notes: "Importado de IBKR (Operaciones)",
        sourceSection: "IBKR: Operaciones",
      });
    } else if (section === "Dividends" || section === "Withholding Tax") {
      const amountRaw = toNumber(get(fieldMap, "Amount"));
      const date = normalizeDate(get(fieldMap, "Date"));
      const description = get(fieldMap, "Description") ?? "";
      const ticker = extractTickerFromDescription(description);
      if (amountRaw == null || !date) {
        warnings.push(`${section}: fila ${index} incompleta, se omite.`);
        continue;
      }
      if (section === "Dividends") {
        rows.push({
          key,
          type: "DIVIDEND",
          date,
          ticker,
          currencyCode,
          quantity: null,
          price: null,
          amount: Math.abs(amountRaw),
          commission: 0,
          notes: description || "Importado de IBKR (Dividendos)",
          sourceSection: "IBKR: Dividendos",
        });
      } else {
        rows.push({
          key,
          type: "FEE",
          date,
          ticker,
          currencyCode,
          quantity: null,
          price: null,
          amount: Math.abs(amountRaw),
          commission: 0,
          notes: description || "Retención de impuestos (IBKR)",
          sourceSection: "IBKR: Retención de impuestos",
        });
      }
    } else if (section === "Deposits & Withdrawals") {
      const amountRaw = toNumber(get(fieldMap, "Amount"));
      const date = normalizeDate(get(fieldMap, "Settle Date", "Date"));
      const description = get(fieldMap, "Description") ?? "";
      if (amountRaw == null || !date) {
        warnings.push(`Deposits & Withdrawals: fila ${index} incompleta, se omite.`);
        continue;
      }
      rows.push({
        key,
        type: amountRaw >= 0 ? "DEPOSIT" : "WITHDRAWAL",
        date,
        ticker: null,
        currencyCode,
        quantity: null,
        price: null,
        amount: Math.abs(amountRaw),
        commission: 0,
        notes: description || "Importado de IBKR",
        sourceSection: "IBKR: Depósitos y retiros",
      });
    } else if (section === "Interest") {
      const amountRaw = toNumber(get(fieldMap, "Amount"));
      const date = normalizeDate(get(fieldMap, "Date"));
      const description = get(fieldMap, "Description") ?? "";
      if (amountRaw == null || !date) {
        warnings.push(`Interest: fila ${index} incompleta, se omite.`);
        continue;
      }
      rows.push({
        key,
        type: amountRaw >= 0 ? "INTEREST" : "FEE",
        date,
        ticker: null,
        currencyCode,
        quantity: null,
        price: null,
        amount: Math.abs(amountRaw),
        commission: 0,
        notes: description || "Interés (IBKR)",
        sourceSection: "IBKR: Intereses",
      });
    } else if (section === "Fees" || section === "Other Fees") {
      const amountRaw = toNumber(get(fieldMap, "Amount"));
      const date = normalizeDate(get(fieldMap, "Date"));
      const description = get(fieldMap, "Description") ?? "";
      if (amountRaw == null || !date) {
        warnings.push(`${section}: fila ${index} incompleta, se omite.`);
        continue;
      }
      rows.push({
        key,
        type: "FEE",
        date,
        ticker: null,
        currencyCode,
        quantity: null,
        price: null,
        amount: Math.abs(amountRaw),
        commission: 0,
        notes: description || "Gasto (IBKR)",
        sourceSection: "IBKR: Comisiones y gastos",
      });
    }
  }

  return { rows, warnings };
}
