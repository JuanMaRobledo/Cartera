// Parser para el CSV de seguimiento de portafolio con columnas
// Symbol,Current Price,Date,Time,Change,Open,High,Low,Volume,Trade Date,
// Purchase Price,Quantity,Commission,High Limit,Low Limit,Comment,Transaction Type
// (formato usado por varias apps de seguimiento de portafolio, con
// "$$CASH_TX" como símbolo especial para movimientos de efectivo).
//
// El archivo no trae columna de moneda: asumimos USD, que es la convención
// de estas apps para tickers de EE.UU. y cripto (ej. BTC-USD). Si tenés
// activos en otra moneda cargados ahí, vas a tener que ajustarlos a mano
// después de importar.
import { parseCsv } from "./csv";
import { normalizeDate } from "./dates";
import type { ProposedRow } from "./types";
import type { TransactionType } from "../enums";

const ASSUMED_CURRENCY = "USD";
const CASH_SYMBOL = "$$CASH_TX";

const CASH_TYPE_MAP: Record<string, TransactionType> = {
  deposit: "DEPOSIT",
  withdrawal: "WITHDRAWAL",
  fee: "FEE",
  dividend: "DIVIDEND",
  interest: "INTEREST",
};

function toNumber(v: string | undefined): number | null {
  if (v == null) return null;
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function isYahooPortfolio(text: string): boolean {
  const firstLine = (parseCsv(text)[0] ?? []).join(",");
  return firstLine.includes("Trade Date") && firstLine.includes("Purchase Price") && firstLine.includes("Transaction Type");
}

export function parseYahooPortfolio(text: string): { rows: ProposedRow[]; warnings: string[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], warnings: ["El archivo está vacío."] };

  const header = table[0].map((h) => h.trim());
  const idx = {
    symbol: header.indexOf("Symbol"),
    tradeDate: header.indexOf("Trade Date"),
    price: header.indexOf("Purchase Price"),
    quantity: header.indexOf("Quantity"),
    commission: header.indexOf("Commission"),
    type: header.indexOf("Transaction Type"),
  };
  if (Object.values(idx).some((i) => i === -1)) {
    return { rows: [], warnings: ["Faltan columnas esperadas (Symbol, Trade Date, Purchase Price, Quantity, Transaction Type)."] };
  }

  const rows: ProposedRow[] = [];
  const warnings: string[] = [];

  table.slice(1).forEach((line, i) => {
    const rowNum = i + 2;
    const symbol = (line[idx.symbol] ?? "").trim().toUpperCase();
    const rawType = (line[idx.type] ?? "").trim().toUpperCase();
    const date = normalizeDate(line[idx.tradeDate]);
    const quantity = toNumber(line[idx.quantity]);
    const commission = toNumber(line[idx.commission]) ?? 0;

    if (!date) {
      warnings.push(`Fila ${rowNum}: sin fecha, se omite.`);
      return;
    }

    if (symbol === CASH_SYMBOL) {
      const type = CASH_TYPE_MAP[rawType.toLowerCase()];
      if (!type) {
        warnings.push(`Fila ${rowNum}: movimiento de efectivo de tipo "${rawType}" no reconocido, se omite.`);
        return;
      }
      if (quantity == null) {
        warnings.push(`Fila ${rowNum}: movimiento de efectivo sin monto, se omite.`);
        return;
      }
      rows.push({
        key: `yahoo-${rowNum}`,
        type,
        date,
        ticker: null,
        currencyCode: ASSUMED_CURRENCY,
        quantity: null,
        price: null,
        amount: Math.abs(quantity),
        commission: 0,
        notes: "Importado de portafolio (efectivo)",
        sourceSection: "Portafolio: efectivo",
      });
      return;
    }

    if (rawType !== "BUY" && rawType !== "SELL") {
      warnings.push(`Fila ${rowNum}: tipo de transacción "${rawType}" no reconocido para ${symbol}, se omite.`);
      return;
    }
    const price = toNumber(line[idx.price]);
    if (!symbol || quantity == null || price == null) {
      warnings.push(`Fila ${rowNum}: operación de ${symbol || "?"} incompleta, se omite.`);
      return;
    }
    rows.push({
      key: `yahoo-${rowNum}`,
      type: rawType,
      date,
      ticker: symbol,
      currencyCode: ASSUMED_CURRENCY,
      quantity: Math.abs(quantity),
      price,
      amount: null,
      commission: Math.abs(commission),
      notes: "Importado de portafolio",
      sourceSection: "Portafolio: operaciones",
    });
  });

  return { rows, warnings };
}
