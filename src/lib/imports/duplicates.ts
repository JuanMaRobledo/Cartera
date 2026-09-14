// Detección de transacciones duplicadas al importar: si volvés a subir un
// archivo que se superpone en el tiempo con datos ya cargados en la misma
// cuenta (algo común cuando distintos trackers exportan el mismo período),
// esto evita contar la misma operación dos veces.
import type { TransactionType } from "../enums";

interface SignatureInput {
  type: TransactionType;
  ticker: string | null;
  date: string; // YYYY-MM-DD
  quantity: number | null;
  price: number | null;
  amount: number | null;
}

function fmt(n: number | null): string {
  return n == null ? "" : n.toFixed(6);
}

export function transactionSignature(input: SignatureInput): string {
  const dateOnly = input.date.slice(0, 10);
  return [input.type, input.ticker?.toUpperCase() ?? "", dateOnly, fmt(input.quantity), fmt(input.price), fmt(input.amount)].join(
    "|",
  );
}

export interface ExistingTransactionForDedupe {
  type: string;
  date: Date;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  ticker: string | null;
}

export function buildExistingSignatures(existing: ExistingTransactionForDedupe[]): Set<string> {
  const set = new Set<string>();
  for (const tx of existing) {
    set.add(
      transactionSignature({
        type: tx.type as TransactionType,
        ticker: tx.ticker,
        date: tx.date.toISOString(),
        quantity: tx.quantity,
        price: tx.price,
        amount: tx.amount,
      }),
    );
  }
  return set;
}
