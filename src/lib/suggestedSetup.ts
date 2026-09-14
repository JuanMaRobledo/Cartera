// Estructura de cuentas/monedas sugerida para la cartera descripta por el usuario:
// IBKR y Hapi (acciones EE.UU.), Binance (cripto), Trii (BVC), y una fiducuenta
// para la liquidez en COP. Se usa para poblar la app de un solo click, sin pisar
// nada que el usuario ya haya creado a mano.
import type { AccountKind } from "./enums";

export interface SuggestedCurrency {
  code: string;
  name: string;
  symbol: string;
}

export interface SuggestedAccount {
  name: string;
  broker: string | null;
  kind: AccountKind;
}

export const SUGGESTED_CURRENCIES: SuggestedCurrency[] = [
  { code: "USD", name: "Dólar estadounidense", symbol: "US$" },
  { code: "COP", name: "Peso colombiano", symbol: "$" },
];

export const SUGGESTED_ACCOUNTS: SuggestedAccount[] = [
  { name: "Interactive Brokers", broker: "Interactive Brokers", kind: "BROKERAGE" },
  { name: "Hapi", broker: "Hapi", kind: "BROKERAGE" },
  { name: "Binance", broker: "Binance", kind: "EXCHANGE" },
  { name: "Trii Colombia", broker: "Trii", kind: "BROKERAGE" },
  { name: "Fiducuenta", broker: null, kind: "BANK" },
];
