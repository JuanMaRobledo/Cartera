import type { TransactionType } from "../enums";

/** Una transacción propuesta a partir de un archivo importado, antes de tocar la base de datos. */
export interface ProposedRow {
  key: string;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  ticker: string | null;
  currencyCode: string;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  commission: number;
  notes: string;
  sourceSection: string;
}
