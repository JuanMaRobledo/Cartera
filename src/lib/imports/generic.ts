// Parser de la plantilla CSV propia de Cartera, para brokers que no son IBKR:
// type,date,ticker,quantity,price,currency,amount,commission,notes
import { parseCsv } from "./csv";
import type { ProposedRow } from "./types";
import { TRANSACTION_TYPES, type TransactionType } from "../enums";

const REQUIRED_HEADERS = ["type", "date", "currency"];

export function isGenericTemplate(text: string): boolean {
  const firstLine = (parseCsv(text)[0] ?? []).map((h) => h.trim().toLowerCase());
  return REQUIRED_HEADERS.every((h) => firstLine.includes(h));
}

export function parseGenericTemplate(text: string): { rows: ProposedRow[]; warnings: string[] } {
  const table = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  const warnings: string[] = [];
  const rows: ProposedRow[] = [];
  if (table.length === 0) return { rows, warnings: ["El archivo está vacío."] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const idx = {
    type: col("type"),
    date: col("date"),
    ticker: col("ticker"),
    quantity: col("quantity"),
    price: col("price"),
    currency: col("currency"),
    amount: col("amount"),
    commission: col("commission"),
    notes: col("notes"),
  };
  if (idx.type === -1 || idx.date === -1 || idx.currency === -1) {
    return {
      rows,
      warnings: ["El CSV no tiene las columnas esperadas (al menos: type, date, currency)."],
    };
  }

  const num = (line: string[], i: number): number | null => {
    if (i === -1) return null;
    const raw = (line[i] ?? "").trim();
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  table.slice(1).forEach((line, i) => {
    const rowNum = i + 2;
    const type = (line[idx.type] ?? "").trim().toUpperCase();
    if (!TRANSACTION_TYPES.includes(type as TransactionType)) {
      warnings.push(`Fila ${rowNum}: tipo "${type}" desconocido, se omite.`);
      return;
    }
    const date = (line[idx.date] ?? "").trim();
    const currencyCode = (line[idx.currency] ?? "").trim().toUpperCase();
    if (!date || !currencyCode) {
      warnings.push(`Fila ${rowNum}: falta fecha o moneda, se omite.`);
      return;
    }

    rows.push({
      key: `generic-${rowNum}`,
      type: type as TransactionType,
      date,
      ticker: idx.ticker !== -1 ? (line[idx.ticker] || "").trim().toUpperCase() || null : null,
      currencyCode,
      quantity: num(line, idx.quantity),
      price: num(line, idx.price),
      amount: num(line, idx.amount),
      commission: num(line, idx.commission) ?? 0,
      notes: idx.notes !== -1 ? (line[idx.notes] ?? "").trim() : "",
      sourceSection: "Plantilla Cartera",
    });
  });

  return { rows, warnings };
}
