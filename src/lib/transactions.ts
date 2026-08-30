import { prisma } from "./prisma";
import { TRANSACTION_TYPES, type TransactionType } from "./enums";
import { getFxRateNear } from "./data";

export interface TransactionInput {
  accountId: string;
  assetId?: string | null;
  type: TransactionType;
  date: Date;
  quantity?: number | null;
  price?: number | null;
  currencyCode: string;
  fxRateToBase?: number | null;
  amount?: number | null;
  commission?: number | null;
  commissionCurrency?: string | null;
  fxFromCurrency?: string | null;
  fxFromAmount?: number | null;
  fxToCurrency?: string | null;
  fxToAmount?: number | null;
  notes?: string | null;
}

export class TransactionValidationError extends Error {}

/**
 * Valida una transacción, resuelve el tipo de cambio a moneda base cuando no
 * viene dado (usando el más cercano cargado en FxRate) y la crea. Usado
 * tanto por el alta manual de transacciones como por el importador masivo,
 * para que ambos caminos apliquen exactamente las mismas reglas.
 */
export async function resolveAndCreateTransaction(input: TransactionInput) {
  if (!TRANSACTION_TYPES.includes(input.type)) {
    throw new TransactionValidationError(`type inválido: ${input.type}`);
  }
  if ((input.type === "BUY" || input.type === "SELL") && !input.assetId) {
    throw new TransactionValidationError(`${input.type} requiere assetId`);
  }
  if ((input.type === "BUY" || input.type === "SELL") && (input.quantity == null || input.price == null)) {
    throw new TransactionValidationError(`${input.type} requiere quantity y price`);
  }
  if (
    input.type === "FX_CONVERT" &&
    (!input.fxFromCurrency || input.fxFromAmount == null || !input.fxToCurrency || input.fxToAmount == null)
  ) {
    throw new TransactionValidationError(
      "FX_CONVERT requiere fxFromCurrency, fxFromAmount, fxToCurrency y fxToAmount",
    );
  }

  const resolvedFxRate = input.fxRateToBase ?? (await getFxRateNear(input.currencyCode, input.date));
  if (resolvedFxRate == null) {
    throw new TransactionValidationError(
      `No hay tipo de cambio para ${input.currencyCode} cerca de ${input.date.toISOString().slice(0, 10)}`,
    );
  }

  return prisma.transaction.create({
    data: {
      accountId: input.accountId,
      assetId: input.assetId || null,
      type: input.type,
      date: input.date,
      quantity: input.quantity ?? null,
      price: input.price ?? null,
      currencyCode: input.currencyCode,
      fxRateToBase: resolvedFxRate,
      amount: input.amount ?? null,
      commission: input.commission ?? 0,
      commissionCurrency: input.commissionCurrency || null,
      fxFromCurrency: input.fxFromCurrency || null,
      fxFromAmount: input.fxFromAmount ?? null,
      fxToCurrency: input.fxToCurrency || null,
      fxToAmount: input.fxToAmount ?? null,
      notes: input.notes || null,
    },
  });
}
