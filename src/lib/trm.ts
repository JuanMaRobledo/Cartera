// TRM (Tasa Representativa del Mercado): tipo de cambio oficial USD/COP que
// certifica diariamente la Superintendencia Financiera de Colombia. Se
// publica en el portal de datos abiertos del gobierno colombiano.
const TRM_URL = "https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1";
const FETCH_TIMEOUT_MS = 8000;

interface TrmApiRow {
  valor: string;
  vigenciadesde: string;
  vigenciahasta: string;
}

export interface TrmResult {
  value: number;
  validFrom: string;
  validUntil: string;
}

/** Extrae el valor de la TRM vigente de la respuesta cruda de datos.gov.co. */
export function parseTrmResponse(rows: unknown): TrmResult | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0] as Partial<TrmApiRow>;
  const value = Number(row.valor);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, validFrom: row.vigenciadesde ?? "", validUntil: row.vigenciahasta ?? "" };
}

/**
 * La TRM se cotiza como "1 USD = value COP". El FxRate de la app se guarda
 * como "1 unidad de currencyCode = rate unidades de la moneda base", así que
 * la dirección depende de cuál de las dos monedas sea la base configurada.
 * Con cualquier otra moneda base, la TRM no alcanza para completar el FxRate
 * (haría falta una tasa cruzada) así que no hay nada para actualizar.
 */
export function computeFxRateFromTrm(baseCurrency: string, trmValue: number): { currencyCode: string; rate: number } | null {
  if (baseCurrency === "USD") return { currencyCode: "COP", rate: 1 / trmValue };
  if (baseCurrency === "COP") return { currencyCode: "USD", rate: trmValue };
  return null;
}

export async function fetchTrm(): Promise<TrmResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(TRM_URL, { signal: controller.signal });
    if (!res.ok) return null;
    const rows = await res.json();
    return parseTrmResponse(rows);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
