export const ACCOUNT_KINDS = ["BROKERAGE", "BANK", "EXCHANGE", "OTHER"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const ASSET_TYPES = ["STOCK", "ETF", "BOND", "CRYPTO", "FUND", "CASH", "OTHER"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const TRANSACTION_TYPES = [
  "BUY",
  "SELL",
  "DIVIDEND",
  "INTEREST",
  "FEE",
  "DEPOSIT",
  "WITHDRAWAL",
  "FX_CONVERT",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: "Compra",
  SELL: "Venta",
  DIVIDEND: "Dividendo",
  INTEREST: "Interés",
  FEE: "Comisión / gasto",
  DEPOSIT: "Depósito",
  WITHDRAWAL: "Retiro",
  FX_CONVERT: "Cambio de moneda",
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  STOCK: "Acción",
  ETF: "ETF",
  BOND: "Bono",
  CRYPTO: "Cripto",
  FUND: "Fondo",
  CASH: "Efectivo",
  OTHER: "Otro",
};
